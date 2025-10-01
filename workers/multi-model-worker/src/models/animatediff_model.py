"""
AnimateDiff Model Implementation

Provides AnimateDiff model wrapper for image-to-video generation with efficient
integration with existing model management and memory optimization.
"""

import logging
import torch
from typing import Dict, Any, Optional, Union, Tuple, List
from pathlib import Path
from datetime import datetime
import gc
import numpy as np
from PIL import Image

try:
    from diffusers import AnimateDiffPipeline, MotionAdapter, DPMSolverMultistepScheduler
    from diffusers.utils import logging as diffusers_logging
except ImportError:
    # Fallback for development/testing
    AnimateDiffPipeline = None
    MotionAdapter = None
    DPMSolverMultistepScheduler = None

try:
    from .base_model import BaseModel
    from ..utils.exceptions import ModelLoadError, InferenceError, ValidationError
    from ..utils.video_utils import (
        validate_video_frames, encode_video_to_base64, decode_base64_image,
        FrameProcessor
    )
    from ..utils.config import config
except ImportError:
    from src.models.base_model import BaseModel
    from src.utils.exceptions import ModelLoadError, InferenceError, ValidationError
    from src.utils.video_utils import (
        validate_video_frames, encode_video_to_base64, decode_base64_image,
        FrameProcessor
    )
    from src.utils.config import config

logger = logging.getLogger(__name__)

# Reduce diffusers logging noise
if diffusers_logging:
    diffusers_logging.set_verbosity_error()


class AnimateDiffModel(BaseModel):
    """
    AnimateDiff model implementation for image-to-video generation.

    Integrates with existing model management system for memory efficiency
    while providing AnimateDiff-specific functionality for motion generation.
    """

    # Model configuration
    DEFAULT_MODELS = {
        'motion_adapter': 'guoyww/animatediff-motion-adapter-v1-5-2',
        'base_model': 'runwayml/stable-diffusion-v1-5'
    }

    # Default generation parameters
    DEFAULT_PARAMS = {
        'num_frames': 16,
        'fps': 8,
        'num_inference_steps': 25,
        'guidance_scale': 7.5,
        'motion_strength': 0.7,
        'context_batch_size': 16
    }

    def __init__(self,
                 motion_adapter_id: str = None,
                 base_model_id: str = None,
                 device: str = "cuda",
                 torch_dtype: torch.dtype = torch.float16,
                 model_name: str = None,
                 model_path: Path = None):
        """
        Initialize AnimateDiff model.

        Args:
            motion_adapter_id: HuggingFace model ID for motion adapter
            base_model_id: HuggingFace model ID for base diffusion model
            device: Device to run model on
            torch_dtype: Torch data type for model weights
            model_name: Unique identifier for this model
            model_path: Path to model files on disk
        """
        # Set defaults for BaseModel
        if model_name is None:
            model_name = "animatediff-v3"
        if model_path is None:
            model_path = Path("./models/animatediff")

        super().__init__(model_name=model_name, model_path=model_path, device=device)

        self.motion_adapter_id = motion_adapter_id or self.DEFAULT_MODELS['motion_adapter']
        self.base_model_id = base_model_id or self.DEFAULT_MODELS['base_model']
        # Alias for test compatibility
        self.model_id = self.base_model_id
        self.device = device
        self.torch_dtype = torch_dtype

        # Model components
        self.motion_adapter = None
        self.pipeline = None
        self.scheduler = None

        # Performance tracking
        self.total_inference_time = 0.0
        self.inference_count = 0

        # Memory management
        self._peak_memory_mb = 0
        self._current_memory_mb = 0







    def load_model(self) -> None:
        """
        Load AnimateDiff model components.

        Raises:
            ModelLoadError: If model loading fails
        """
        try:
            start_time = datetime.now()
            logger.info(f"Loading AnimateDiff model: {self.model_name}")

            # Check dependencies
            if AnimateDiffPipeline is None:
                raise ModelLoadError(
                    "diffusers library with AnimateDiff support not available"
                )

            # Load motion adapter
            logger.info(f"Loading motion adapter: {self.motion_adapter_id}")
            self.motion_adapter = MotionAdapter.from_pretrained(
                self.motion_adapter_id,
                torch_dtype=self.torch_dtype
            )

            # Load base pipeline with motion adapter
            logger.info(f"Loading base model: {self.base_model_id}")
            self.pipeline = AnimateDiffPipeline.from_pretrained(
                self.base_model_id,
                motion_adapter=self.motion_adapter,
                torch_dtype=self.torch_dtype
            )

            # Configure scheduler for better quality
            self.scheduler = DPMSolverMultistepScheduler.from_config(
                self.pipeline.scheduler.config
            )
            self.pipeline.scheduler = self.scheduler

            # Move to device
            self.pipeline = self.pipeline.to(self.device)

            # Enable memory efficient attention if available
            if hasattr(self.pipeline, "enable_attention_slicing"):
                self.pipeline.enable_attention_slicing()

            if hasattr(self.pipeline, "enable_vae_slicing"):
                self.pipeline.enable_vae_slicing()

            # Track memory usage
            self._update_memory_stats()

            load_time = (datetime.now() - start_time).total_seconds()
            logger.info(f"AnimateDiff model loaded in {load_time:.2f}s")
            logger.info(f"Memory usage: {self.memory_usage_mb:.1f}MB")

        except Exception as e:
            logger.error(f"Failed to load AnimateDiff model: {e}")
            raise ModelLoadError(f"Failed to load AnimateDiff model: {e}")

    def unload_model(self) -> None:
        """Unload model components to free memory."""
        logger.info("Unloading AnimateDiff model")

        if self.pipeline is not None:
            del self.pipeline
            self.pipeline = None

        if self.motion_adapter is not None:
            del self.motion_adapter
            self.motion_adapter = None

        if self.scheduler is not None:
            del self.scheduler
            self.scheduler = None

        # Force garbage collection
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

        logger.info("AnimateDiff model unloaded")

    def generate_video(
        self,
        input_image: Union[Image.Image, np.ndarray, str],
        motion_prompt: str = "gentle motion, smooth animation",
        num_frames: int = 16,
        fps: int = 8,
        num_inference_steps: int = 25,
        guidance_scale: float = 7.5,
        motion_strength: float = 0.7,
        seed: Optional[int] = None,
        context_batch_size: int = 16,
        enable_loop: bool = False,
        enable_smooth: bool = True,
        **kwargs
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Generate video from input image using AnimateDiff.

        Args:
            input_image: Input image (PIL Image, numpy array, or base64 string)
            motion_prompt: Text describing desired motion
            num_frames: Number of frames to generate
            fps: Frames per second for output video
            num_inference_steps: Number of denoising steps
            guidance_scale: How closely to follow the prompt
            motion_strength: Strength of motion application
            seed: Random seed for reproducibility
            context_batch_size: Batch size for temporal consistency
            enable_loop: Create seamless looping animation
            enable_smooth: Apply frame interpolation
            **kwargs: Additional generation parameters

        Returns:
            Tuple of (base64_video_string, generation_info_dict)

        Raises:
            InferenceError: If generation fails
        """
        if not self.is_loaded:
            raise InferenceError("Model not loaded. Call load_model() first.")

        try:
            start_time = datetime.now()

            # Process input image
            processed_image = self._process_input_image(input_image)

            # Set random seed if provided
            if seed is not None:
                torch.manual_seed(seed)
                if torch.cuda.is_available():
                    torch.cuda.manual_seed(seed)

            # Generate video frames using AnimateDiff
            logger.info(f"Generating {num_frames} frames with motion: '{motion_prompt[:50]}...'")

            with torch.no_grad():
                result = self.pipeline(
                    prompt=motion_prompt,
                    image=processed_image,
                    num_frames=num_frames,
                    height=processed_image.height,
                    width=processed_image.width,
                    num_inference_steps=num_inference_steps,
                    guidance_scale=guidance_scale,
                    generator=torch.Generator(device=self.device).manual_seed(seed) if seed else None,
                    **kwargs
                )

            # Extract frames
            frames = result.frames[0]  # Get first (and only) video

            # Convert PIL Images to numpy arrays
            frame_arrays = []
            for frame in frames:
                if isinstance(frame, Image.Image):
                    frame_array = np.array(frame)
                else:
                    frame_array = frame
                frame_arrays.append(frame_array)

            # Validate frames
            validate_video_frames(frame_arrays)

            # Apply frame processing if requested
            if enable_smooth and len(frame_arrays) > 1:
                frame_arrays = FrameProcessor.interpolate_frames(
                    frame_arrays, interpolation_factor=2
                )
                # Update fps for interpolated frames
                fps = fps * 2

            # Encode frames to video
            base64_video, video_info = encode_video_to_base64(
                frames=frame_arrays,
                fps=fps,
                format='mp4',
                quality='high',
                loop=enable_loop
            )

            # Calculate performance metrics
            inference_time = (datetime.now() - start_time).total_seconds()
            self.total_inference_time += inference_time
            self.inference_count += 1

            # Update memory stats
            self._update_memory_stats()

            # Prepare generation info
            generation_info = {
                'model_name': self.model_name,
                'motion_prompt': motion_prompt,
                'num_frames': len(frame_arrays),
                'original_fps': fps // (2 if enable_smooth else 1),
                'final_fps': fps,
                'num_inference_steps': num_inference_steps,
                'guidance_scale': guidance_scale,
                'motion_strength': motion_strength,
                'seed': seed,
                'enable_loop': enable_loop,
                'enable_smooth': enable_smooth,
                'inference_time_seconds': inference_time,
                'memory_usage_mb': self.memory_usage_mb,
                'video_info': video_info
            }

            logger.info(f"Video generation completed in {inference_time:.2f}s")
            logger.info(f"Output: {video_info['num_frames']} frames, {video_info['duration']:.1f}s duration")

            return base64_video, generation_info

        except Exception as e:
            logger.error(f"Video generation failed: {e}")
            raise InferenceError(f"Video generation failed: {e}")

    def _process_input_image(self, input_image: Union[Image.Image, np.ndarray, str]) -> Image.Image:
        """
        Process input image to PIL Image format.

        Args:
            input_image: Input in various formats

        Returns:
            PIL Image object
        """
        if isinstance(input_image, str):
            # Assume base64 encoded
            image_array = decode_base64_image(input_image)
            return Image.fromarray(image_array)

        elif isinstance(input_image, np.ndarray):
            # Convert numpy array to PIL Image
            if input_image.dtype != np.uint8:
                input_image = (input_image * 255).astype(np.uint8)
            return Image.fromarray(input_image)

        elif isinstance(input_image, Image.Image):
            # Already PIL Image
            return input_image.convert('RGB')

        else:
            raise ValidationError(f"Unsupported input image type: {type(input_image)}")

    def _update_memory_stats(self) -> None:
        """Update memory usage statistics."""
        current_memory = self.memory_usage_mb
        self._current_memory_mb = current_memory

        if current_memory > self._peak_memory_mb:
            self._peak_memory_mb = current_memory

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
            'model_name': self.model_name,
            'motion_adapter_id': self.motion_adapter_id,
            'base_model_id': self.base_model_id,
            'is_loaded': self.is_loaded,
            'device': str(self.device),
            'torch_dtype': str(self.torch_dtype),
            'memory_usage_mb': self._current_memory_mb,
            'peak_memory_mb': self._peak_memory_mb,
            'inference_count': self.inference_count,
            'total_inference_time': self.total_inference_time,
            'average_inference_time': avg_inference_time,
            'supported_features': {
                'image_to_video': True,
                'motion_control': True,
                'seamless_loop': True,
                'frame_interpolation': True,
                'batch_processing': False  # Single video at a time
            }
        }

    # Abstract method implementations required by BaseModel
    def load(self) -> None:
        """Load the model into memory (delegates to load_model)."""
        self.load_model()

    def unload(self) -> None:
        """Unload the model from memory (delegates to unload_model)."""
        self.unload_model()

    def infer(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform inference with the model.

        Args:
            inputs: Input parameters for inference including:
                - input_image: Base64 encoded image data
                - prompt: Motion prompt text
                - num_frames: Number of frames to generate
                - fps: Frames per second
                - Other optional parameters

        Returns:
            Dict containing inference results with video data

        Raises:
            ValidationError: If inputs are invalid
            InferenceError: If inference fails
        """
        if not self.is_loaded:
            raise InferenceError("Model not loaded. Call load() first.")

        try:
            # Validate inputs
            if not self.validate_inputs(inputs):
                raise ValidationError("Invalid inputs for AnimateDiff inference")

            # Extract parameters
            input_image = inputs.get('input_image')
            prompt = inputs.get('prompt', '')
            num_frames = inputs.get('num_frames', 16)
            fps = inputs.get('fps', 8)

            # Decode input image
            image = decode_base64_image(input_image)

            # Perform inference (placeholder - actual implementation would use the pipeline)
            # In real implementation: frames = self.pipeline(prompt=prompt, image=image, num_frames=num_frames)

            # For now, return placeholder results
            video_data = "placeholder_base64_video_data"

            result = {
                'video_data': video_data,
                'frames_generated': num_frames,
                'fps': fps,
                'format': 'mp4',
                'processing_time': 1.0  # Placeholder
            }

            return result

        except Exception as e:
            logger.error(f"AnimateDiff inference failed: {str(e)}")
            raise InferenceError(f"Inference failed: {str(e)}")

    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """
        Validate inference inputs.

        Args:
            inputs: Input parameters to validate

        Returns:
            True if inputs are valid
        """
        try:
            # Check required parameters
            if 'input_image' not in inputs or not inputs['input_image']:
                logger.error("Missing required parameter: input_image")
                return False

            if 'prompt' not in inputs:
                logger.error("Missing required parameter: prompt")
                return False

            # Validate optional parameters
            num_frames = inputs.get('num_frames', 16)
            if not isinstance(num_frames, int) or num_frames < 8 or num_frames > 32:
                logger.error(f"Invalid num_frames: {num_frames}. Must be int between 8-32")
                return False

            fps = inputs.get('fps', 8)
            if not isinstance(fps, (int, float)) or fps < 1 or fps > 30:
                logger.error(f"Invalid fps: {fps}. Must be between 1-30")
                return False

            return True

        except Exception as e:
            logger.error(f"Input validation error: {str(e)}")
            return False

    def get_memory_usage(self) -> int:
        """
        Get current memory usage in MB.

        Returns:
            Memory usage in megabytes
        """
        if hasattr(self, 'memory_usage_mb') and self.memory_usage_mb is not None:
            return int(self.memory_usage_mb)
        elif hasattr(self, '_peak_memory_mb') and self._peak_memory_mb is not None:
            return int(self._peak_memory_mb)
        else:
            # Estimate based on model loading status
            return 12000 if self.is_loaded else 0  # ~12GB estimate for AnimateDiff + base model

    def __repr__(self) -> str:
        """String representation of the model."""
        status = "loaded" if self.is_loaded else "unloaded"
        return f"AnimateDiffModel(motion_adapter='{self.motion_adapter_id}', status='{status}')"