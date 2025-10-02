"""
LTX-Video Text-to-Video Model Implementation.

Provides a wrapper around the Lightricks LTX-Video model for text-to-video generation
using the Diffusers library. Supports high-quality video generation with real-time
performance capabilities and integrates with the multi-modal worker architecture.
"""

import logging
import torch
from typing import Dict, Any, List, Tuple, Optional, Union
from datetime import datetime
from pathlib import Path
from PIL import Image
import numpy as np

from diffusers import LTXPipeline
from src.models.base_model import BaseModel
from src.utils.exceptions import ModelLoadError, InferenceError, ValidationError
from src.utils.video_utils import encode_video_to_base64, validate_video_frames

logger = logging.getLogger(__name__)


class LTXVideoModel(BaseModel):
    """
    LTX-Video model wrapper for text-to-video generation.

    Provides a unified interface for the Lightricks LTX-Video model with
    memory management, parameter optimization, and video processing capabilities.
    Designed for <45 second inference times with 6-10GB memory footprint.
    """

    # Model configuration constants
    MODEL_ID = "Lightricks/LTX-Video"
    MODEL_TYPE = "text-to-video"

    # Default parameters optimized for LTX-Video performance
    DEFAULT_PARAMS = {
        'width': 704,  # Divisible by 32, close to 720p width
        'height': 704,  # Divisible by 32, square aspect ratio for efficiency
        'num_frames': 25,  # (8*3)+1 - LTX-Video frame pattern requirement
        'num_inference_steps': 20,  # Balanced quality/speed
        'guidance_scale': 7.5,  # Optimal for LTX-Video
        'fps': 8,  # Standard video frame rate
        'decode_timestep': 0.03,  # LTX-Video decode optimization
        'decode_noise_scale': 0.025,  # Noise scale for decoding
    }

    def __init__(
        self,
        device: str = "cuda",
        torch_dtype: torch.dtype = torch.float16,
        model_name: str = None,
        model_path: Path = None,
        **kwargs
    ):
        """
        Initialize LTX-Video model wrapper.

        Args:
            device: Target device ('cuda' or 'cpu')
            torch_dtype: PyTorch data type for model weights
            model_name: Unique identifier for this model
            model_path: Path to model files on disk
            **kwargs: Additional arguments passed to BaseModel
        """
        # Set defaults for BaseModel
        if model_name is None:
            model_name = "ltx-video-model"
        if model_path is None:
            model_path = Path("./models/ltx-video")

        super().__init__(model_name=model_name, model_path=model_path, device=device, **kwargs)

        # Model configuration
        self.torch_dtype = torch_dtype
        self.model_id = self.MODEL_ID
        self.model_type = self.MODEL_TYPE

        # Pipeline and state
        self.pipeline: Optional[LTXPipeline] = None
        self.is_loaded = False
        self.load_time: Optional[datetime] = None

        # Performance tracking
        self.inference_count = 0
        self.total_inference_time = 0.0

        # Memory tracking
        self._current_memory_mb = 0.0
        self._peak_memory_mb = 0.0

        logger.info(f"Initialized LTX-Video model wrapper for {device} with {torch_dtype}")

    def load_model(self) -> None:
        """
        Load the LTX-Video model and pipeline.

        Loads the Lightricks LTX-Video model using Diffusers with memory
        optimizations and device placement. Enables attention slicing and
        VAE slicing for memory efficiency.

        Raises:
            ModelLoadError: If model loading fails
        """
        if self.is_loaded:
            logger.info("LTX-Video model already loaded")
            return

        try:
            start_time = datetime.now()
            logger.info(f"Loading LTX-Video model: {self.MODEL_ID}")

            # Load LTX Pipeline from pretrained model
            self.pipeline = LTXPipeline.from_pretrained(
                self.MODEL_ID,
                torch_dtype=self.torch_dtype
            )

            # Move to target device
            self.pipeline = self.pipeline.to(self.device)

            # Enable memory efficient attention if available
            if hasattr(self.pipeline, "enable_attention_slicing"):
                self.pipeline.enable_attention_slicing()

            if hasattr(self.pipeline, "enable_vae_slicing"):
                self.pipeline.enable_vae_slicing()

            # Track memory usage
            self._update_memory_stats()

            # Mark as loaded and track load time
            self.is_loaded = True
            self.load_time = start_time

            # Update BaseModel memory usage
            self.memory_usage_mb = int(self._current_memory_mb)

            load_duration = (datetime.now() - start_time).total_seconds()
            logger.info(f"LTX-Video model loaded in {load_duration:.2f}s")
            logger.info(f"Memory usage: {self._current_memory_mb:.1f}MB")

        except Exception as e:
            logger.error(f"Failed to load LTX-Video model: {e}")
            raise ModelLoadError("ltx-video-model", f"Failed to load LTX-Video model: {e}")

    def unload_model(self) -> None:
        """Unload model components to free memory."""
        logger.info("Unloading LTX-Video model")

        if self.pipeline is not None:
            del self.pipeline
            self.pipeline = None

        # Clear GPU cache
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        # Reset state
        self.is_loaded = False
        self._current_memory_mb = 0.0
        self.memory_usage_mb = 0

        logger.info("LTX-Video model unloaded successfully")

    def generate_video(
        self,
        prompt: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
        num_frames: Optional[int] = None,
        num_inference_steps: Optional[int] = None,
        guidance_scale: Optional[float] = None,
        seed: Optional[int] = None,
        fps: Optional[int] = None,
        negative_prompt: Optional[str] = None,
        decode_timestep: Optional[float] = None,
        decode_noise_scale: Optional[float] = None,
        **kwargs
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Generate video from text prompt using LTX-Video.

        Args:
            prompt: Text description of desired video content
            width: Video width in pixels (default: 704)
            height: Video height in pixels (default: 704)
            num_frames: Number of video frames (default: 25)
            num_inference_steps: Number of denoising steps (default: 20)
            guidance_scale: Prompt adherence strength (default: 7.5)
            seed: Random seed for reproducibility
            fps: Frames per second for output video (default: 8)
            negative_prompt: What to avoid in generation
            decode_timestep: LTX decode timestep (default: 0.03)
            decode_noise_scale: LTX decode noise scale (default: 0.025)
            **kwargs: Additional pipeline parameters

        Returns:
            Tuple of (base64_video_string, generation_info_dict)

        Raises:
            InferenceError: If generation fails
        """
        if not self.is_loaded:
            raise InferenceError("Model not loaded. Call load_model() first.")

        try:
            start_time = datetime.now()

            # Preprocess parameters for LTX-Video compatibility
            params = self._preprocess_params(
                width=width or self.DEFAULT_PARAMS['width'],
                height=height or self.DEFAULT_PARAMS['height'],
                num_frames=num_frames or self.DEFAULT_PARAMS['num_frames']
            )

            # Validate and set parameters
            if not self._validate_prompt(prompt):
                raise ValidationError("prompt", prompt, "Empty or invalid prompt")

            # Set random seed if provided
            if seed is not None:
                torch.manual_seed(seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed(seed)

            # Generate video using LTX Pipeline
            logger.info(f"Generating {params['num_frames']} frames for prompt: '{prompt[:50]}...'")

            with torch.no_grad():
                result = self.pipeline(
                    prompt=prompt,
                    negative_prompt=negative_prompt or "worst quality, inconsistent motion, blurry, jittery, distorted",
                    width=params['width'],
                    height=params['height'],
                    num_frames=params['num_frames'],
                    num_inference_steps=num_inference_steps or self.DEFAULT_PARAMS['num_inference_steps'],
                    guidance_scale=guidance_scale or self.DEFAULT_PARAMS['guidance_scale'],
                    decode_timestep=decode_timestep or self.DEFAULT_PARAMS['decode_timestep'],
                    decode_noise_scale=decode_noise_scale or self.DEFAULT_PARAMS['decode_noise_scale'],
                    generator=self._create_generator(seed) if seed else None,
                    **kwargs
                )

            # Extract frames from result
            frames = result.frames[0]  # LTX returns list of frame sequences

            # Convert PIL Images to numpy arrays for validation
            frame_arrays = []
            for frame in frames:
                if isinstance(frame, Image.Image):
                    frame_array = np.array(frame)
                else:
                    frame_array = frame
                frame_arrays.append(frame_array)

            # Validate video frames
            validate_video_frames(frame_arrays)

            # Encode video to base64
            video_data, video_info = encode_video_to_base64(
                frame_arrays,
                fps=fps or self.DEFAULT_PARAMS['fps'],
                output_format='mp4'
            )

            # Calculate inference time and update statistics
            inference_time = (datetime.now() - start_time).total_seconds()
            self.inference_count += 1
            self.total_inference_time += inference_time

            # Build generation info
            generation_info = {
                'inference_time': inference_time,
                'frames_generated': len(frame_arrays),
                'width': params['width'],
                'height': params['height'],
                'fps': fps or self.DEFAULT_PARAMS['fps'],
                'prompt': prompt,
                'negative_prompt': negative_prompt,
                'num_inference_steps': num_inference_steps or self.DEFAULT_PARAMS['num_inference_steps'],
                'guidance_scale': guidance_scale or self.DEFAULT_PARAMS['guidance_scale'],
                'seed': seed,
                **video_info
            }

            logger.info(f"Video generated in {inference_time:.2f}s with {len(frame_arrays)} frames")

            return video_data, generation_info

        except Exception as e:
            logger.error(f"Video generation failed: {e}")
            raise InferenceError(f"Video generation failed: {e}")

    def _preprocess_params(
        self,
        width: int,
        height: int,
        num_frames: int
    ) -> Dict[str, int]:
        """
        Preprocess parameters for LTX-Video compatibility.

        Ensures dimensions are divisible by 32 and frame count follows
        the (8*n)+1 pattern required by LTX-Video.

        Args:
            width: Desired video width
            height: Desired video height
            num_frames: Desired number of frames

        Returns:
            Dictionary with adjusted parameters
        """
        # Adjust resolution to nearest divisible by 32
        adjusted_width, adjusted_height = self._optimize_resolution(width, height)

        # Adjust frame count to (8*n)+1 pattern
        if (num_frames - 1) % 8 != 0:
            # Find nearest valid frame count
            base = (num_frames - 1) // 8
            option1 = (base * 8) + 1
            option2 = ((base + 1) * 8) + 1

            # Choose closer option
            if abs(num_frames - option1) <= abs(num_frames - option2):
                adjusted_frames = option1
            else:
                adjusted_frames = option2
        else:
            adjusted_frames = num_frames

        return {
            'width': adjusted_width,
            'height': adjusted_height,
            'num_frames': adjusted_frames
        }

    def _optimize_resolution(self, width: int, height: int) -> Tuple[int, int]:
        """
        Optimize resolution to be divisible by 32.

        Args:
            width: Desired width
            height: Desired height

        Returns:
            Tuple of (optimized_width, optimized_height)
        """
        # Round to nearest multiple of 32
        opt_width = ((width + 15) // 32) * 32
        opt_height = ((height + 15) // 32) * 32

        return opt_width, opt_height

    def _create_generator(self, seed: int) -> torch.Generator:
        """
        Create a PyTorch generator with proper device handling.

        Args:
            seed: Random seed to set

        Returns:
            Configured torch.Generator
        """
        try:
            if self.device == "cuda" and torch.cuda.is_available():
                generator = torch.Generator(device=self.device)
            else:
                # Fallback to CPU generator
                generator = torch.Generator()
            return generator.manual_seed(seed)
        except Exception:
            # Ultimate fallback - CPU generator
            return torch.Generator().manual_seed(seed)

    def _validate_prompt(self, prompt: str) -> bool:
        """
        Validate text prompt for LTX-Video requirements.

        Args:
            prompt: Text prompt to validate

        Returns:
            True if prompt is valid

        Raises:
            ValidationError: If prompt is invalid
        """
        if not prompt or not prompt.strip():
            raise ValidationError("prompt", prompt or "", "Empty or invalid prompt")

        # Check prompt length (reasonable limit for LTX-Video)
        if len(prompt) > 500:
            raise ValidationError("prompt", prompt, "Prompt too long (>500 characters)")

        return True

    def perform_inference(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform inference for BaseModel compatibility.

        Args:
            inputs: Dictionary containing inference parameters

        Returns:
            Dictionary containing inference results
        """
        if not self.is_loaded:
            raise InferenceError("Model not loaded. Call load_model() first.")

        try:
            # Extract parameters from inputs
            prompt = inputs.get('prompt', '')
            width = inputs.get('width')
            height = inputs.get('height')
            num_frames = inputs.get('num_frames')
            seed = inputs.get('seed')
            fps = inputs.get('fps')

            # Generate video
            video_data, generation_info = self.generate_video(
                prompt=prompt,
                width=width,
                height=height,
                num_frames=num_frames,
                seed=seed,
                fps=fps
            )

            # Note: inference_count is already updated in generate_video method

            return {
                'video_data': video_data,
                **generation_info
            }

        except Exception as e:
            logger.error(f"LTX-Video inference failed: {str(e)}")
            raise InferenceError(f"Inference failed: {str(e)}")

    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """
        Validate inference inputs for LTX-Video requirements.

        Args:
            inputs: Input parameters to validate

        Returns:
            True if inputs are valid
        """
        try:
            # Check required parameters
            if 'prompt' not in inputs or not inputs['prompt']:
                logger.error("Missing required parameter: prompt")
                return False

            # Validate prompt
            if not self._validate_prompt(inputs['prompt']):
                logger.error("Invalid prompt")
                return False

            # Validate optional parameters
            if 'width' in inputs:
                width = inputs['width']
                if not isinstance(width, int) or width < 256 or width > 2048:
                    logger.error(f"Invalid width: {width}. Must be int between 256-2048")
                    return False

            if 'height' in inputs:
                height = inputs['height']
                if not isinstance(height, int) or height < 256 or height > 2048:
                    logger.error(f"Invalid height: {height}. Must be int between 256-2048")
                    return False

            if 'num_frames' in inputs:
                num_frames = inputs['num_frames']
                if not isinstance(num_frames, int) or num_frames < 9 or num_frames > 161:
                    logger.error(f"Invalid num_frames: {num_frames}. Must be int between 9-161")
                    return False
                # For strict validation, reject frames that don't match (8*n)+1 pattern
                # In practice, our preprocessing will adjust them, but tests expect validation
                if (num_frames - 1) % 8 != 0:
                    logger.error(f"Invalid num_frames: {num_frames}. Must follow (8*n)+1 pattern")
                    return False

            if 'fps' in inputs:
                fps = inputs['fps']
                if not isinstance(fps, (int, float)) or fps < 1 or fps > 30:
                    logger.error(f"Invalid fps: {fps}. Must be between 1-30")
                    return False

            return True

        except Exception as e:
            logger.error(f"Input validation error: {str(e)}")
            return False

    def get_default_params(self) -> Dict[str, Any]:
        """
        Get default parameters for LTX-Video model.

        Returns:
            Dictionary of default parameters
        """
        return self.DEFAULT_PARAMS.copy()

    def _update_memory_stats(self) -> None:
        """Update memory usage statistics."""
        if torch.cuda.is_available() and self.device == "cuda":
            current_memory = torch.cuda.memory_allocated() / (1024 ** 2)  # MB
        else:
            # Estimate memory usage for CPU or when CUDA not available
            current_memory = 8000.0 if self.is_loaded else 0.0  # ~8GB estimate for LTX-Video

        self._current_memory_mb = current_memory

        if current_memory > self._peak_memory_mb:
            self._peak_memory_mb = current_memory

    def get_memory_usage(self) -> int:
        """
        Get current memory usage in MB.

        Returns:
            Memory usage in megabytes
        """
        if self.is_loaded:
            self._update_memory_stats()
            return int(self._current_memory_mb)
        else:
            return 0

    def get_model_info(self) -> Dict[str, Any]:
        """
        Get comprehensive model information.

        Returns:
            Dictionary containing model details and statistics
        """
        avg_inference_time = (
            self.total_inference_time / self.inference_count
            if self.inference_count > 0 else 0.0
        )

        return {
            'model_id': self.model_id,
            'model_type': self.model_type,
            'device': self.device,
            'torch_dtype': str(self.torch_dtype),
            'is_loaded': self.is_loaded,
            'load_time': self.load_time.isoformat() if self.load_time else None,
            'inference_count': self.inference_count,
            'total_inference_time': self.total_inference_time,
            'avg_inference_time': avg_inference_time,
            'current_memory_mb': self._current_memory_mb,
            'peak_memory_mb': self._peak_memory_mb,
            'default_params': self.get_default_params()
        }

    def __repr__(self) -> str:
        """String representation of the model."""
        status = "loaded" if self.is_loaded else "unloaded"
        return f"LTXVideoModel(model_id='{self.model_id}', status='{status}', device='{self.device}')"

    # Abstract method implementations required by BaseModel
    def load(self) -> None:
        """Load the model into memory (delegates to load_model)."""
        self.load_model()

    def unload(self) -> None:
        """Unload the model from memory (delegates to unload_model)."""
        self.unload_model()

    def infer(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform inference with the model (delegates to perform_inference).

        Args:
            inputs: Input parameters for inference

        Returns:
            Dictionary containing inference results
        """
        return self.perform_inference(inputs)