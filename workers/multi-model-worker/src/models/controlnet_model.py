"""
ControlNet Model Implementation

Provides ControlNet model wrapper with efficient integration with FLUX.1 base model
for guided image generation using Canny edge detection and depth estimation.
"""

import logging
import torch
from typing import Dict, Any, Optional, Union, Tuple, List
from pathlib import Path
from datetime import datetime
import gc
from diffusers import StableDiffusionControlNetPipeline, ControlNetModel
from diffusers.utils import logging as diffusers_logging
import numpy as np
from PIL import Image

try:
    from .base_model import BaseModel
    from .flux_model import FluxModel  # For base model sharing
    from ..utils.exceptions import ModelLoadError, InferenceError, ValidationError
    from ..utils.image_utils import ImageProcessor
    from ..utils.control_processors import process_control_image, ControlProcessorFactory
    from ..utils.config import config
except ImportError:
    from src.models.base_model import BaseModel
    from src.models.flux_model import FluxModel  # For base model sharing
    from src.utils.exceptions import ModelLoadError, InferenceError, ValidationError
    from src.utils.image_utils import ImageProcessor
    from src.utils.control_processors import process_control_image, ControlProcessorFactory
    from src.utils.config import config

logger = logging.getLogger(__name__)

# Reduce diffusers logging noise
diffusers_logging.set_verbosity_error()


class ControlNetModel(BaseModel):
    """
    ControlNet model implementation for guided image generation.

    Integrates with FLUX.1 base model components for memory efficiency
    while providing ControlNet-specific functionality for structured guidance.
    """

    # Model configuration
    CONTROLNET_MODELS = {
        'canny': 'lllyasviel/sd-controlnet-canny',
        'depth': 'lllyasviel/sd-controlnet-depth'
    }

    BASE_MODEL_ID = "runwayml/stable-diffusion-v1-5"  # Compatible with ControlNet
    TARGET_MEMORY_MB = 16000  # Target memory usage including ControlNet

    # Default inference parameters
    DEFAULT_STEPS = 20
    DEFAULT_GUIDANCE = 7.5
    DEFAULT_CONTROL_STRENGTH = 1.0

    def __init__(self, control_types: Optional[List[str]] = None):
        """
        Initialize ControlNet model.

        Args:
            control_types: List of control types to load ('canny', 'depth').
                          If None, loads all supported types.
        """
        super().__init__("controlnet")

        # Configuration
        self.control_types = control_types or list(self.CONTROLNET_MODELS.keys())
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        # Model components
        self.pipelines: Dict[str, StableDiffusionControlNetPipeline] = {}
        self.controlnets: Dict[str, ControlNetModel] = {}

        # Shared components (for memory efficiency)
        self._shared_vae = None
        self._shared_text_encoder = None
        self._shared_tokenizer = None
        self._shared_scheduler = None

        # Image processing
        self.image_processor = ImageProcessor()

        # Performance tracking
        self.load_times = {}
        self.inference_times = []

        logger.info(f"Initialized ControlNet model for types: {self.control_types}")

    @property
    def model_size_mb(self) -> float:
        """Estimate total model size in MB."""
        if not self.is_loaded:
            return 0.0

        total_size = 0.0

        # Estimate ControlNet sizes (roughly 1.4GB each)
        total_size += len(self.controlnets) * 1400

        # Shared base model components (roughly 3.4GB total)
        if self._shared_vae is not None:
            total_size += 350  # VAE
        if self._shared_text_encoder is not None:
            total_size += 250  # Text encoder
        if any(self.pipelines.values()):
            total_size += 1700  # UNet (shared across ControlNets)

        return total_size

    @property
    def is_loaded(self) -> bool:
        """Check if any ControlNet models are loaded."""
        return len(self.controlnets) > 0 and any(
            pipeline is not None for pipeline in self.pipelines.values()
        )

    @property
    def supported_control_types(self) -> List[str]:
        """Get list of supported control types."""
        return list(self.CONTROLNET_MODELS.keys())

    def load(self, **kwargs) -> bool:
        """
        Load ControlNet models and initialize pipelines.

        Returns:
            True if loading successful, False otherwise
        """
        if self.is_loaded:
            logger.debug("ControlNet models already loaded")
            return True

        try:
            start_time = datetime.now()
            logger.info(f"Loading ControlNet models for types: {self.control_types}")

            # Load ControlNet models first
            for control_type in self.control_types:
                if control_type not in self.CONTROLNET_MODELS:
                    logger.warning(f"Unsupported control type: {control_type}")
                    continue

                logger.info(f"Loading ControlNet model: {control_type}")
                controlnet_model_id = self.CONTROLNET_MODELS[control_type]

                try:
                    controlnet = ControlNetModel.from_pretrained(
                        controlnet_model_id,
                        torch_dtype=torch.float16 if self.device.type == 'cuda' else torch.float32,
                        use_safetensors=True
                    )
                    self.controlnets[control_type] = controlnet
                    logger.info(f"Successfully loaded ControlNet: {control_type}")

                except Exception as e:
                    logger.error(f"Failed to load ControlNet {control_type}: {e}")
                    continue

            if not self.controlnets:
                raise ModelLoadError("No ControlNet models were successfully loaded")

            # Load shared pipeline components for memory efficiency
            self._load_shared_components()

            # Create pipelines for each loaded ControlNet
            for control_type, controlnet in self.controlnets.items():
                try:
                    pipeline = StableDiffusionControlNetPipeline.from_pretrained(
                        self.BASE_MODEL_ID,
                        controlnet=controlnet,
                        vae=self._shared_vae,
                        text_encoder=self._shared_text_encoder,
                        tokenizer=self._shared_tokenizer,
                        scheduler=self._shared_scheduler,
                        torch_dtype=torch.float16 if self.device.type == 'cuda' else torch.float32,
                        safety_checker=None,  # Disable safety checker for performance
                        requires_safety_checker=False
                    )

                    # Move to device
                    pipeline = pipeline.to(self.device)

                    # Enable memory optimizations
                    if self.device.type == 'cuda':
                        pipeline.enable_attention_slicing()
                        pipeline.enable_model_cpu_offload()

                        # Try to enable xformers if available
                        try:
                            pipeline.enable_xformers_memory_efficient_attention()
                            logger.debug(f"Enabled xformers for {control_type}")
                        except Exception:
                            logger.debug(f"xformers not available for {control_type}")

                    self.pipelines[control_type] = pipeline
                    logger.info(f"Successfully created pipeline for {control_type}")

                except Exception as e:
                    logger.error(f"Failed to create pipeline for {control_type}: {e}")
                    continue

            if not self.pipelines:
                raise ModelLoadError("No ControlNet pipelines were successfully created")

            # Update load time tracking
            load_time = (datetime.now() - start_time).total_seconds()
            for control_type in self.pipelines.keys():
                self.load_times[control_type] = load_time

            # Update base class state
            self.last_loaded = datetime.now()
            self.load_count += 1

            logger.info(f"ControlNet models loaded in {load_time:.2f}s. "
                       f"Memory usage: ~{self.model_size_mb:.0f}MB")

            return True

        except Exception as e:
            logger.error(f"Failed to load ControlNet models: {e}")
            self._cleanup_failed_load()
            raise ModelLoadError(f"ControlNet model loading failed: {str(e)}")

    def _load_shared_components(self):
        """Load shared pipeline components for memory efficiency."""
        try:
            from diffusers import AutoencoderKL, CLIPTextModel, CLIPTokenizer
            from diffusers import PNDMScheduler

            logger.info("Loading shared pipeline components")

            # Load VAE
            self._shared_vae = AutoencoderKL.from_pretrained(
                self.BASE_MODEL_ID,
                subfolder="vae",
                torch_dtype=torch.float16 if self.device.type == 'cuda' else torch.float32
            )

            # Load text encoder
            self._shared_text_encoder = CLIPTextModel.from_pretrained(
                self.BASE_MODEL_ID,
                subfolder="text_encoder",
                torch_dtype=torch.float16 if self.device.type == 'cuda' else torch.float32
            )

            # Load tokenizer
            self._shared_tokenizer = CLIPTokenizer.from_pretrained(
                self.BASE_MODEL_ID,
                subfolder="tokenizer"
            )

            # Load scheduler
            self._shared_scheduler = PNDMScheduler.from_pretrained(
                self.BASE_MODEL_ID,
                subfolder="scheduler"
            )

            logger.info("Shared components loaded successfully")

        except Exception as e:
            logger.error(f"Failed to load shared components: {e}")
            raise ModelLoadError(f"Failed to load shared components: {str(e)}")

    def unload(self) -> bool:
        """
        Unload ControlNet models and free memory.

        Returns:
            True if unloading successful
        """
        try:
            logger.info("Unloading ControlNet models")

            # Clear pipelines
            for control_type in list(self.pipelines.keys()):
                if self.pipelines[control_type] is not None:
                    del self.pipelines[control_type]
                    self.pipelines[control_type] = None
            self.pipelines.clear()

            # Clear ControlNet models
            for control_type in list(self.controlnets.keys()):
                if self.controlnets[control_type] is not None:
                    del self.controlnets[control_type]
                    self.controlnets[control_type] = None
            self.controlnets.clear()

            # Clear shared components
            if self._shared_vae is not None:
                del self._shared_vae
                self._shared_vae = None
            if self._shared_text_encoder is not None:
                del self._shared_text_encoder
                self._shared_text_encoder = None
            if self._shared_tokenizer is not None:
                del self._shared_tokenizer
                self._shared_tokenizer = None
            if self._shared_scheduler is not None:
                del self._shared_scheduler
                self._shared_scheduler = None

            # Force garbage collection
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            gc.collect()

            logger.info("ControlNet models unloaded successfully")
            return True

        except Exception as e:
            logger.error(f"Error during ControlNet model unloading: {e}")
            return False

    def _cleanup_failed_load(self):
        """Clean up partial state after failed loading."""
        try:
            self.unload()
        except Exception as e:
            logger.error(f"Error during cleanup: {e}")

    def generate_image(
        self,
        prompt: str,
        control_image: Union[Image.Image, str],
        control_type: str,
        negative_prompt: Optional[str] = None,
        num_inference_steps: int = DEFAULT_STEPS,
        guidance_scale: float = DEFAULT_GUIDANCE,
        control_strength: float = DEFAULT_CONTROL_STRENGTH,
        control_guidance_start: float = 0.0,
        control_guidance_end: float = 1.0,
        width: int = 512,
        height: int = 512,
        seed: Optional[int] = None,
        **control_params
    ) -> Tuple[Image.Image, Dict[str, Any]]:
        """
        Generate image using ControlNet guidance.

        Args:
            prompt: Text description of image to generate
            control_image: Control image for structural guidance
            control_type: Type of control ('canny', 'depth')
            negative_prompt: Negative prompt
            num_inference_steps: Number of denoising steps
            guidance_scale: Classifier-free guidance scale
            control_strength: Strength of control guidance
            control_guidance_start: Fraction to start control guidance
            control_guidance_end: Fraction to end control guidance
            width: Output image width
            height: Output image height
            seed: Random seed for reproducibility
            **control_params: Additional control processing parameters

        Returns:
            Tuple of (generated_image, generation_info)

        Raises:
            ValidationError: If parameters are invalid
            InferenceError: If generation fails
            ModelLoadError: If required models are not loaded
        """
        if not self.is_loaded:
            raise ModelLoadError("ControlNet models not loaded")

        if control_type not in self.pipelines:
            available = ', '.join(self.pipelines.keys())
            raise ValidationError(f"Control type '{control_type}' not available. "
                                f"Available: {available}")

        try:
            start_time = datetime.now()

            # Process control image
            logger.debug(f"Processing control image for {control_type}")
            processed_control, control_info = process_control_image(
                control_image, control_type, **control_params
            )

            # Resize control image to match output dimensions
            if processed_control.size != (width, height):
                processed_control = processed_control.resize((width, height), Image.Resampling.LANCZOS)

            # Set random seed if provided
            if seed is not None:
                torch.manual_seed(seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed_all(seed)

            # Get pipeline
            pipeline = self.pipelines[control_type]

            # Generate image
            logger.debug(f"Starting ControlNet inference for {control_type}")

            result = pipeline(
                prompt=prompt,
                image=processed_control,
                negative_prompt=negative_prompt,
                num_inference_steps=num_inference_steps,
                guidance_scale=guidance_scale,
                controlnet_conditioning_scale=control_strength,
                control_guidance_start=control_guidance_start,
                control_guidance_end=control_guidance_end,
                width=width,
                height=height,
                generator=torch.Generator().manual_seed(seed) if seed is not None else None
            )

            generated_image = result.images[0]

            # Calculate timing
            inference_time = (datetime.now() - start_time).total_seconds()
            self.inference_times.append(inference_time)

            # Update usage statistics
            self.inference_count += 1
            self.last_used = datetime.now()

            generation_info = {
                'control_type': control_type,
                'control_info': control_info,
                'inference_time_s': inference_time,
                'num_inference_steps': num_inference_steps,
                'guidance_scale': guidance_scale,
                'control_strength': control_strength,
                'control_guidance_start': control_guidance_start,
                'control_guidance_end': control_guidance_end,
                'seed': seed,
                'model_memory_mb': self.model_size_mb
            }

            logger.info(f"ControlNet generation completed in {inference_time:.2f}s "
                       f"({control_type})")

            return generated_image, generation_info

        except Exception as e:
            if isinstance(e, (ValidationError, ModelLoadError)):
                raise
            logger.error(f"ControlNet inference failed: {e}")
            raise InferenceError(f"ControlNet generation failed: {str(e)}")

    def get_memory_usage(self) -> Dict[str, float]:
        """
        Get detailed memory usage information.

        Returns:
            Dictionary with memory usage details
        """
        memory_info = {
            'total_model_size_mb': self.model_size_mb,
            'controlnet_count': len(self.controlnets),
            'pipeline_count': len(self.pipelines),
            'shared_components_loaded': all([
                self._shared_vae is not None,
                self._shared_text_encoder is not None,
                self._shared_tokenizer is not None,
                self._shared_scheduler is not None
            ])
        }

        if torch.cuda.is_available():
            memory_info.update({
                'gpu_memory_allocated_mb': torch.cuda.memory_allocated() / 1024 / 1024,
                'gpu_memory_reserved_mb': torch.cuda.memory_reserved() / 1024 / 1024
            })

        return memory_info

    def get_performance_stats(self) -> Dict[str, Any]:
        """
        Get performance statistics.

        Returns:
            Dictionary with performance metrics
        """
        stats = {
            'inference_count': self.inference_count,
            'load_count': self.load_count,
            'control_types_loaded': list(self.pipelines.keys()),
            'load_times': self.load_times.copy()
        }

        if self.inference_times:
            times = self.inference_times
            stats.update({
                'avg_inference_time_s': sum(times) / len(times),
                'min_inference_time_s': min(times),
                'max_inference_time_s': max(times),
                'recent_inference_times_s': times[-10:] if len(times) > 10 else times
            })

        return stats