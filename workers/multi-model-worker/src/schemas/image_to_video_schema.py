"""
Image-to-Video Request and Response Schemas

Defines the data structures for AnimateDiff image-to-video generation requests
and responses, including motion parameters and video output specifications.
"""

from typing import Optional, Dict, Any, List, Literal, Union
from pydantic import BaseModel, Field, field_validator, ConfigDict
import base64


class ImageToVideoRequest(BaseModel):
    """Request schema for AnimateDiff image-to-video generation."""

    model_config = ConfigDict(protected_namespaces=())

    # Required parameters
    input_image: str = Field(
        ...,
        description="Base64-encoded input image to animate"
    )

    motion_prompt: Optional[str] = Field(
        default="gentle motion, smooth animation",
        min_length=1,
        max_length=1000,
        description="Text description of desired motion and animation style"
    )

    # Video parameters
    num_frames: int = Field(
        default=16,
        ge=8,
        le=32,
        description="Number of frames to generate (affects video length)"
    )

    fps: int = Field(
        default=8,
        ge=6,
        le=30,
        description="Frames per second for output video"
    )

    # Generation parameters
    num_inference_steps: int = Field(
        default=25,
        ge=10,
        le=50,
        description="Number of denoising steps during generation"
    )

    guidance_scale: float = Field(
        default=7.5,
        ge=1.0,
        le=20.0,
        description="How closely to follow the motion prompt"
    )

    motion_strength: float = Field(
        default=0.7,
        ge=0.1,
        le=1.0,
        description="Strength of motion applied to the input image"
    )

    # Optional parameters
    seed: Optional[int] = Field(
        default=None,
        ge=0,
        le=2**32 - 1,
        description="Random seed for reproducible generation"
    )

    context_batch_size: int = Field(
        default=16,
        ge=8,
        le=32,
        description="Context batch size for temporal consistency"
    )

    # Advanced options
    enable_loop: bool = Field(
        default=False,
        description="Create seamless looping animation"
    )

    enable_smooth: bool = Field(
        default=True,
        description="Apply frame interpolation for smoother motion"
    )

    @field_validator('input_image')
    @classmethod
    def validate_input_image(cls, v: str) -> str:
        """Validate base64 encoded input image."""
        if not v:
            raise ValueError("Input image cannot be empty")

        try:
            # Check if it's valid base64
            base64.b64decode(v, validate=True)
        except Exception:
            raise ValueError("Input image must be valid base64 encoded data")

        return v

    @field_validator('motion_prompt')
    @classmethod
    def validate_motion_prompt(cls, v: Optional[str]) -> Optional[str]:
        """Validate motion prompt content."""
        if v is not None and len(v.strip()) == 0:
            return None
        return v


class VideoInfo(BaseModel):
    """Information about the generated video."""

    model_config = ConfigDict(protected_namespaces=())

    width: int = Field(..., description="Video width in pixels")
    height: int = Field(..., description="Video height in pixels")
    fps: int = Field(..., description="Frames per second")
    num_frames: int = Field(..., description="Total number of frames")
    duration: float = Field(..., description="Video duration in seconds")
    format: str = Field(..., description="Video format (e.g., 'mp4')")
    size_bytes: int = Field(..., description="Video file size in bytes")


class ImageToVideoOutput(BaseModel):
    """Output data for successful image-to-video generation."""

    model_config = ConfigDict(protected_namespaces=())

    video_base64: str = Field(
        ...,
        description="Base64-encoded generated video file"
    )

    video_info: VideoInfo = Field(
        ...,
        description="Information about the generated video"
    )

    generation_params: Dict[str, Any] = Field(
        ...,
        description="Parameters used for generation"
    )


class ImageToVideoResponse(BaseModel):
    """Response schema for AnimateDiff image-to-video generation."""

    model_config = ConfigDict(protected_namespaces=())

    success: bool = Field(..., description="Whether generation was successful")

    # Success response fields
    output: Optional[ImageToVideoOutput] = Field(
        default=None,
        description="Generated video data (present when success=True)"
    )

    # Performance metrics
    inference_time: Optional[float] = Field(
        default=None,
        description="Time taken for inference in seconds"
    )

    model_load_time_ms: Optional[float] = Field(
        default=None,
        description="Model loading time in milliseconds"
    )

    # Error response fields
    error: Optional[str] = Field(
        default=None,
        description="Error message (present when success=False)"
    )

    error_code: Optional[str] = Field(
        default=None,
        description="Error code for programmatic handling"
    )

    # Request tracking
    request_id: str = Field(..., description="Unique request identifier")
    timestamp: str = Field(..., description="Response timestamp")


class ImageToVideoError(BaseModel):
    """Error response schema for image-to-video generation failures."""

    model_config = ConfigDict(protected_namespaces=())

    success: bool = Field(default=False, description="Always False for error responses")
    error: str = Field(..., description="Error message")
    error_code: str = Field(..., description="Error code")
    request_id: str = Field(..., description="Request identifier")
    timestamp: str = Field(..., description="Error timestamp")


# Validation functions
def validate_image_to_video_request(request_data: Dict[str, Any]) -> ImageToVideoRequest:
    """
    Validate and parse image-to-video request data.

    Args:
        request_data: Raw request data dictionary

    Returns:
        Validated ImageToVideoRequest object

    Raises:
        ValidationError: If request data is invalid
    """
    try:
        return ImageToVideoRequest.model_validate(request_data)
    except Exception as e:
        from ..utils.exceptions import ValidationError
        raise ValidationError(f"Invalid image-to-video request: {str(e)}")


# Response creation helpers
def create_success_response(
    video_base64: str,
    video_info: VideoInfo,
    generation_params: Dict[str, Any],
    inference_time: float,
    model_load_time_ms: float,
    request_id: str
) -> ImageToVideoResponse:
    """Create a success response for image-to-video generation."""
    from datetime import datetime

    output = ImageToVideoOutput(
        video_base64=video_base64,
        video_info=video_info,
        generation_params=generation_params
    )

    return ImageToVideoResponse(
        success=True,
        output=output,
        inference_time=inference_time,
        model_load_time_ms=model_load_time_ms,
        request_id=request_id,
        timestamp=datetime.utcnow().isoformat()
    )


def create_error_response(
    error_message: str,
    error_code: str,
    request_id: str
) -> ImageToVideoResponse:
    """Create an error response for image-to-video generation."""
    from datetime import datetime

    return ImageToVideoResponse(
        success=False,
        error=error_message,
        error_code=error_code,
        request_id=request_id,
        timestamp=datetime.utcnow().isoformat()
    )