"""
FLUX.1 Schnell Model Implementation

Provides FLUX.1 Schnell fp8 model wrapper with optimized loading, inference,
and memory management for text-to-image generation.
"""

import logging
import torch
from typing import Dict, Any, Optional, Union, Tuple
from pathlib import Path
from datetime import datetime
import gc
from diffusers import FluxPipeline
from diffusers.utils import logging as diffusers_logging
import numpy as np

try:
    from .base_model import BaseModel
    from ..utils.exceptions import ModelLoadError, InferenceError, ValidationError
    from ..utils.image_utils import ImageProcessor
    from ..utils.config import config
except ImportError:
    from src.models.base_model import BaseModel
    from src.utils.exceptions import ModelLoadError, InferenceError, ValidationError
    from src.utils.image_utils import ImageProcessor
    from src.utils.config import config

logger = logging.getLogger(__name__)

# Reduce diffusers logging noise
diffusers_logging.set_verbosity_error()


class FluxModel(BaseModel):
    """
    FLUX.1 Schnell fp8 model implementation for text-to-image generation.

    Optimized for memory efficiency using fp8 quantization while maintaining
    high-quality output and fast inference times.
    """

    # Model configuration
    MODEL_ID = "black-forest-labs/FLUX.1-schnell"
    MODEL_VARIANT = "fp8"  # Use fp8 quantized version
    TARGET_MEMORY_MB = 14000  # Target memory usage

    # Default inference parameters
    DEFAULT_STEPS = 4
    DEFAULT_GUIDANCE = 0.0  # FLUX Schnell uses guidance_scale=0.0

    # Input validation limits
    MIN_STEPS = 1
    MAX_STEPS = 50
    MIN_DIMENSION = 256
    MAX_DIMENSION = 2048

    def __init__(
        self,
        model_name: str = "flux-1-schnell-fp8",
        model_path: Optional[Path] = None,
        priority: int = 75,  # High priority for primary image model
        device: str = "cuda",
        enable_cpu_offload: bool = True,
        enable_attention_slicing: bool = True
    ):
        """
        Initialize FLUX.1 Schnell model.

        Args:
            model_name: Unique identifier for this model instance
            model_path: Local path to model files (if None, downloads from HF)
            priority: Priority for eviction (0-100, higher = keep longer)
            device: Device to load model on
            enable_cpu_offload: Enable CPU offload for memory efficiency
            enable_attention_slicing: Enable attention slicing for memory efficiency
        """
        super().__init__(model_name, model_path or Path(self.MODEL_ID), priority, device)

        # FLUX.1 specific configuration
        self.enable_cpu_offload = enable_cpu_offload
        self.enable_attention_slicing = enable_attention_slicing
        self.pipeline: Optional[FluxPipeline] = None

        # Performance tracking
        self.inference_count = 0
        self.total_inference_time = 0.0
        self.average_inference_time = 0.0

        logger.info(f"Initialized FLUX.1 Schnell model: {model_name}")

    def load(self) -> None:
        """
        Load FLUX.1 Schnell pipeline with fp8 optimization.

        Raises:
            ModelLoadError: If model loading fails
            MemoryError: If insufficient GPU memory
        """
        if self.is_loaded:
            logger.warning(f"Model {self.model_name} is already loaded")
            return

        try:
            logger.info(f"Loading FLUX.1 Schnell model: {self.model_name}")
            load_start = datetime.now()

            # Clear GPU cache before loading
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                gc.collect()

            # Load pipeline with optimizations
            load_kwargs = {
                'torch_dtype': torch.bfloat16,  # Use bfloat16 for fp8 variant
                'variant': self.MODEL_VARIANT,  # Load fp8 variant
                'use_safetensors': True,
                'device_map': 'auto' if self.enable_cpu_offload else None
            }

            # Handle local vs HuggingFace loading
            if self.model_path.exists() and self.model_path.is_dir():
                # Load from local path
                logger.info(f"Loading from local path: {self.model_path}")
                self.pipeline = FluxPipeline.from_pretrained(
                    str(self.model_path),
                    **load_kwargs
                )
            else:
                # Load from HuggingFace Hub
                logger.info(f"Loading from HuggingFace Hub: {self.MODEL_ID}")
                self.pipeline = FluxPipeline.from_pretrained(
                    self.MODEL_ID,
                    **load_kwargs
                )

            # Move to specified device if not using CPU offload
            if not self.enable_cpu_offload:
                self.pipeline = self.pipeline.to(self.device)

            # Apply memory optimizations
            if self.enable_attention_slicing:
                self.pipeline.enable_attention_slicing()

            if self.enable_cpu_offload:
                # Enable CPU offload for components
                self.pipeline.enable_model_cpu_offload()

            # Enable memory efficient attention if available
            if hasattr(self.pipeline, 'enable_xformers_memory_efficient_attention'):
                try:
                    self.pipeline.enable_xformers_memory_efficient_attention()
                    logger.info("Enabled xformers memory efficient attention")
                except Exception as e:
                    logger.warning(f"Could not enable xformers attention: {e}")

            # Update model state
            self._model = self.pipeline
            self.is_loaded = True
            self.load_time = datetime.now()
            self.memory_usage_mb = self._estimate_memory_usage()

            load_duration = (self.load_time - load_start).total_seconds()
            logger.info(f"FLUX.1 model loaded successfully in {load_duration:.2f}s, "
                       f"estimated memory: {self.memory_usage_mb}MB")

        except Exception as e:
            logger.error(f"Failed to load FLUX.1 model: {e}")
            self._cleanup()
            if "out of memory" in str(e).lower():
                raise MemoryError(f"Insufficient GPU memory to load FLUX.1 model: {e}")
            else:
                raise ModelLoadError(self.model_name, str(e))

    def unload(self) -> None:
        """
        Unload FLUX.1 pipeline and free memory.
        """
        if not self.is_loaded:
            logger.warning(f"Model {self.model_name} is not loaded")
            return

        logger.info(f"Unloading FLUX.1 model: {self.model_name}")

        try:
            self._cleanup()

            # Clear GPU cache
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                gc.collect()

            logger.info(f"FLUX.1 model unloaded successfully: {self.model_name}")

        except Exception as e:
            logger.error(f"Error during FLUX.1 model unload: {e}")

    def _cleanup(self) -> None:
        """Clean up model resources."""
        if self.pipeline is not None:
            # Move components to CPU to free GPU memory
            if hasattr(self.pipeline, 'to'):
                try:
                    self.pipeline = self.pipeline.to('cpu')
                except:
                    pass

            del self.pipeline
            self.pipeline = None

        self._model = None
        self.is_loaded = False
        self.memory_usage_mb = 0

        # Force garbage collection
        gc.collect()

    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """
        Validate FLUX.1 inference inputs.

        Args:
            inputs: Input parameters to validate

        Returns:
            True if inputs are valid

        Raises:
            ValidationError: If inputs are invalid
        """
        required_fields = ['prompt']

        # Check required fields
        for field in required_fields:
            if field not in inputs:
                raise ValidationError(field, str(inputs.keys()), f"Missing required field: {field}")

        # Validate prompt
        prompt = inputs.get('prompt', '')
        if not isinstance(prompt, str) or len(prompt.strip()) == 0:
            raise ValidationError("prompt", str(prompt), "Prompt must be a non-empty string")

        if len(prompt) > 2000:
            raise ValidationError("prompt", str(len(prompt)), "Prompt too long (max 2000 characters)")

        # Validate dimensions
        width = inputs.get('width', 1024)
        height = inputs.get('height', 1024)

        if not isinstance(width, int) or not isinstance(height, int):
            raise ValidationError("dimensions", f"width:{type(width).__name__}, height:{type(height).__name__}", "Width and height must be integers")

        if width < self.MIN_DIMENSION or width > self.MAX_DIMENSION:
            raise ValidationError("width", str(width), f"Width must be between {self.MIN_DIMENSION} and {self.MAX_DIMENSION}")

        if height < self.MIN_DIMENSION or height > self.MAX_DIMENSION:
            raise ValidationError("height", str(height), f"Height must be between {self.MIN_DIMENSION} and {self.MAX_DIMENSION}")

        if width % 8 != 0 or height % 8 != 0:
            raise ValidationError("dimensions", f"{width}x{height}", "Width and height must be multiples of 8")

        # Validate steps
        steps = inputs.get('num_inference_steps', self.DEFAULT_STEPS)
        if not isinstance(steps, int) or steps < self.MIN_STEPS or steps > self.MAX_STEPS:
            raise ValidationError("num_inference_steps", str(steps), f"num_inference_steps must be between {self.MIN_STEPS} and {self.MAX_STEPS}")

        # Validate guidance scale (should be 0.0 for Schnell)
        guidance = inputs.get('guidance_scale', self.DEFAULT_GUIDANCE)
        if not isinstance(guidance, (int, float)):
            raise ValidationError("guidance_scale", str(type(guidance).__name__), "guidance_scale must be a number")

        if guidance < 0.0 or guidance > 20.0:
            raise ValidationError("guidance_scale", str(guidance), "guidance_scale must be between 0.0 and 20.0")

        # Validate seed
        seed = inputs.get('seed')
        if seed is not None:
            if not isinstance(seed, int) or seed < 0 or seed >= 2**32:
                raise ValidationError("seed", str(seed), "seed must be an integer between 0 and 2^32-1")

        return True

    def infer(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform FLUX.1 text-to-image inference.

        Args:
            inputs: Dictionary containing inference parameters:
                - prompt (str): Text description
                - width (int): Image width (default: 1024)
                - height (int): Image height (default: 1024)
                - num_inference_steps (int): Number of steps (default: 4)
                - guidance_scale (float): Guidance scale (default: 0.0)
                - seed (int, optional): Random seed

        Returns:
            Dictionary containing inference results

        Raises:
            InferenceError: If inference fails
            ValidationError: If inputs are invalid
        """
        if not self.is_loaded or self.pipeline is None:
            raise InferenceError("Model not loaded")

        # Validate inputs
        self.validate_inputs(inputs)

        # Mark model as used
        self.mark_used()

        try:
            inference_start = datetime.now()

            # Extract parameters
            prompt = inputs['prompt'].strip()
            width = inputs.get('width', 1024)
            height = inputs.get('height', 1024)
            num_inference_steps = inputs.get('num_inference_steps', self.DEFAULT_STEPS)
            guidance_scale = inputs.get('guidance_scale', self.DEFAULT_GUIDANCE)
            seed = inputs.get('seed')

            # Set up generator for reproducibility
            generator = None
            if seed is not None:
                generator = torch.Generator(device=self.device).manual_seed(seed)

            logger.info(f"Starting FLUX.1 inference: {width}x{height}, {num_inference_steps} steps")

            # Monitor memory before inference
            initial_memory = self._get_gpu_memory_mb()

            # Perform inference
            with torch.inference_mode():
                result = self.pipeline(
                    prompt=prompt,
                    width=width,
                    height=height,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    generator=generator,
                    return_dict=True
                )

            # Monitor memory after inference
            peak_memory = self._get_gpu_memory_mb()

            inference_end = datetime.now()
            inference_time = (inference_end - inference_start).total_seconds()

            # Update performance tracking
            self.inference_count += 1
            self.total_inference_time += inference_time
            self.average_inference_time = self.total_inference_time / self.inference_count

            # Extract generated image
            if hasattr(result, 'images') and len(result.images) > 0:
                generated_image = result.images[0]
            else:
                raise InferenceError("No image generated")

            logger.info(f"FLUX.1 inference completed in {inference_time:.2f}s, "
                       f"memory usage: {peak_memory - initial_memory:.1f}MB")

            return {
                'image': generated_image,
                'inference_time': inference_time,
                'parameters': {
                    'prompt': prompt,
                    'width': width,
                    'height': height,
                    'num_inference_steps': num_inference_steps,
                    'guidance_scale': guidance_scale,
                    'seed': seed
                },
                'memory_usage_mb': peak_memory - initial_memory,
                'model_info': {
                    'name': 'FLUX.1-schnell-fp8',
                    'variant': self.MODEL_VARIANT,
                    'inference_count': self.inference_count,
                    'average_time': self.average_inference_time
                }
            }

        except Exception as e:
            logger.error(f"FLUX.1 inference failed: {e}")
            if "out of memory" in str(e).lower():
                raise InferenceError(f"GPU out of memory during inference: {e}")
            else:
                raise InferenceError(f"FLUX.1 inference failed: {e}")

    def get_memory_usage(self) -> int:
        """Get current memory usage in MB."""
        if not self.is_loaded:
            return 0
        return self.memory_usage_mb

    def _estimate_memory_usage(self) -> int:
        """Estimate memory usage of loaded model."""
        if not self.is_loaded or self.pipeline is None:
            return 0

        try:
            # Try to get actual GPU memory usage
            if torch.cuda.is_available():
                return self._get_gpu_memory_mb()
            else:
                # Fallback estimate for FLUX.1 Schnell fp8
                return self.TARGET_MEMORY_MB
        except:
            return self.TARGET_MEMORY_MB

    def _get_gpu_memory_mb(self) -> int:
        """Get current GPU memory usage in MB."""
        if torch.cuda.is_available():
            return int(torch.cuda.memory_allocated() / 1024 / 1024)
        return 0

    def get_model_info(self) -> Dict[str, Any]:
        """Get comprehensive model information."""
        return {
            'model_name': self.model_name,
            'model_id': self.MODEL_ID,
            'variant': self.MODEL_VARIANT,
            'is_loaded': self.is_loaded,
            'device': self.device,
            'memory_usage_mb': self.memory_usage_mb,
            'load_time': self.load_time.isoformat() if self.load_time else None,
            'last_used': self.last_used.isoformat() if self.last_used else None,
            'use_count': self.use_count,
            'inference_count': self.inference_count,
            'average_inference_time': self.average_inference_time,
            'optimizations': {
                'cpu_offload': self.enable_cpu_offload,
                'attention_slicing': self.enable_attention_slicing,
                'fp8_quantization': True
            }
        }

    def warmup(self, prompt: str = "A simple test image") -> float:
        """
        Warm up the model with a simple inference.

        Args:
            prompt: Simple prompt for warmup

        Returns:
            Warmup inference time in seconds
        """
        if not self.is_loaded:
            raise InferenceError("Model not loaded")

        logger.info(f"Warming up FLUX.1 model: {self.model_name}")

        warmup_inputs = {
            'prompt': prompt,
            'width': 512,  # Smaller for faster warmup
            'height': 512,
            'num_inference_steps': 2,  # Fewer steps for warmup
            'guidance_scale': 0.0
        }

        try:
            result = self.infer(warmup_inputs)
            warmup_time = result['inference_time']
            logger.info(f"FLUX.1 warmup completed in {warmup_time:.2f}s")
            return warmup_time
        except Exception as e:
            logger.warning(f"FLUX.1 warmup failed: {e}")
            raise InferenceError(f"Model warmup failed: {e}")