#!/usr/bin/env python3
"""
Download models from HuggingFace Hub to RunPod S3 volume.
This script downloads models at runtime instead of baking them into the Docker image.
"""

import os
import sys
import boto3
import requests
from pathlib import Path
from urllib.parse import urlparse
from huggingface_hub import hf_hub_download, login
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Model configurations
MODEL_CONFIGS = {
    "flux1-dev-fp8": [
        {
            "repo_id": "Comfy-Org/flux1-dev",
            "filename": "flux1-dev-fp8.safetensors",
            "s3_key": "models/checkpoints/flux1-dev-fp8.safetensors",
            "requires_auth": False
        }
    ],
    "flux1-dev": [
        {
            "repo_id": "black-forest-labs/FLUX.1-dev",
            "filename": "flux1-dev.safetensors",
            "s3_key": "models/unet/flux1-dev.safetensors",
            "requires_auth": True
        },
        {
            "repo_id": "comfyanonymous/flux_text_encoders",
            "filename": "clip_l.safetensors",
            "s3_key": "models/clip/clip_l.safetensors",
            "requires_auth": False
        },
        {
            "repo_id": "comfyanonymous/flux_text_encoders",
            "filename": "t5xxl_fp8_e4m3fn.safetensors",
            "s3_key": "models/clip/t5xxl_fp8_e4m3fn.safetensors",
            "requires_auth": False
        },
        {
            "repo_id": "black-forest-labs/FLUX.1-dev",
            "filename": "ae.safetensors",
            "s3_key": "models/vae/ae.safetensors",
            "requires_auth": True
        }
    ],
    "flux1-schnell": [
        {
            "repo_id": "black-forest-labs/FLUX.1-schnell",
            "filename": "flux1-schnell.safetensors",
            "s3_key": "models/unet/flux1-schnell.safetensors",
            "requires_auth": True
        },
        {
            "repo_id": "comfyanonymous/flux_text_encoders",
            "filename": "clip_l.safetensors",
            "s3_key": "models/clip/clip_l.safetensors",
            "requires_auth": False
        },
        {
            "repo_id": "comfyanonymous/flux_text_encoders",
            "filename": "t5xxl_fp8_e4m3fn.safetensors",
            "s3_key": "models/clip/t5xxl_fp8_e4m3fn.safetensors",
            "requires_auth": False
        },
        {
            "repo_id": "black-forest-labs/FLUX.1-schnell",
            "filename": "ae.safetensors",
            "s3_key": "models/vae/ae.safetensors",
            "requires_auth": True
        }
    ],
    "sdxl": [
        {
            "repo_id": "stabilityai/stable-diffusion-xl-base-1.0",
            "filename": "sd_xl_base_1.0.safetensors",
            "s3_key": "models/checkpoints/sd_xl_base_1.0.safetensors",
            "requires_auth": False
        },
        {
            "repo_id": "stabilityai/sdxl-vae",
            "filename": "sdxl_vae.safetensors",
            "s3_key": "models/vae/sdxl_vae.safetensors",
            "requires_auth": False
        },
        {
            "repo_id": "madebyollin/sdxl-vae-fp16-fix",
            "filename": "sdxl_vae.safetensors",
            "s3_key": "models/vae/sdxl-vae-fp16-fix.safetensors",
            "requires_auth": False
        }
    ],
    "sd3": [
        {
            "repo_id": "stabilityai/stable-diffusion-3-medium",
            "filename": "sd3_medium_incl_clips_t5xxlfp8.safetensors",
            "s3_key": "models/checkpoints/sd3_medium_incl_clips_t5xxlfp8.safetensors",
            "requires_auth": True
        }
    ]
}

def get_s3_client():
    """Initialize S3 client for RunPod volume."""
    return boto3.client(
        's3',
        endpoint_url=os.environ.get('RUNPOD_S3_ENDPOINT'),
        region_name=os.environ.get('RUNPOD_S3_REGION'),
        aws_access_key_id=os.environ.get('RUNPOD_S3_ACCESS_KEY_ID'),
        aws_secret_access_key=os.environ.get('RUNPOD_S3_SECRET_ACCESS_KEY')
    )

def model_exists_in_s3(s3_client, bucket, key):
    """Check if model already exists in S3."""
    try:
        s3_client.head_object(Bucket=bucket, Key=key)
        return True
    except s3_client.exceptions.NoSuchKey:
        return False
    except Exception as e:
        logger.warning(f"Error checking if {key} exists: {e}")
        return False

def download_and_upload_model(s3_client, bucket, model_config):
    """Download model from HuggingFace and upload to S3."""
    repo_id = model_config["repo_id"]
    filename = model_config["filename"]
    s3_key = model_config["s3_key"]
    requires_auth = model_config["requires_auth"]

    logger.info(f"Downloading {repo_id}/{filename} to S3 key {s3_key}")

    try:
        # Download to temporary local file
        local_path = hf_hub_download(
            repo_id=repo_id,
            filename=filename,
            local_dir="/tmp/models",
            local_dir_use_symlinks=False
        )

        # Upload to S3
        with open(local_path, 'rb') as f:
            s3_client.upload_fileobj(f, bucket, s3_key)

        # Clean up local file
        os.remove(local_path)
        logger.info(f"Successfully uploaded {s3_key}")

    except Exception as e:
        logger.error(f"Failed to download/upload {repo_id}/{filename}: {e}")
        raise

def main():
    """Main function to download models."""
    # Get configuration from environment
    model_type = os.environ.get('MODEL_TYPE', 'flux1-dev-fp8')
    bucket = os.environ.get('RUNPOD_VOLUME_ID')
    hf_token = os.environ.get('HUGGINGFACE_ACCESS_TOKEN')

    if not bucket:
        logger.error("RUNPOD_VOLUME_ID environment variable is required")
        sys.exit(1)

    # Login to HuggingFace if token is provided
    if hf_token:
        logger.info("Logging in to HuggingFace Hub")
        login(token=hf_token)

    # Get model configuration
    if model_type not in MODEL_CONFIGS:
        logger.error(f"Unknown model type: {model_type}")
        logger.info(f"Available types: {list(MODEL_CONFIGS.keys())}")
        sys.exit(1)

    models = MODEL_CONFIGS[model_type]
    s3_client = get_s3_client()

    logger.info(f"Downloading {len(models)} models for type: {model_type}")

    # Download each model
    for model_config in models:
        s3_key = model_config["s3_key"]

        # Check if model already exists
        if model_exists_in_s3(s3_client, bucket, s3_key):
            logger.info(f"Model {s3_key} already exists, skipping")
            continue

        # Download and upload
        download_and_upload_model(s3_client, bucket, model_config)

    logger.info("Model download complete!")

if __name__ == "__main__":
    main()
