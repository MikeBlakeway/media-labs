"""
Multi-Modal Inference Worker Entry Point

RunPod serverless worker that provides multi-modal AI inference capabilities.
Supports text-to-image, image-to-video, text-to-video, inpainting,
ControlNet guidance, and camera control functionality.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from enum import Enum

try:
    # Try relative imports first (when running as package)
    from .models import model_manager, BaseModel
    from .utils import config, UnsupportedModalityError, ValidationError, InferenceError
except ImportError:
    # Fall back to absolute imports (when running as script or in tests)
    from src.models import model_manager, BaseModel
    from src.utils import config, UnsupportedModalityError, ValidationError, InferenceError

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class ModalityType(Enum):
    """Supported modality types for multi-modal inference."""
    TEXT_TO_IMAGE = "text-to-image"
    IMAGE_TO_VIDEO = "image-to-video"
    TEXT_TO_VIDEO = "text-to-video"
    CONTROL_NET = "control-net"
    INPAINTING = "inpainting"
    CAMERA_CONTROL = "camera-control"


class MultiModalHandler:
    """
    Main handler class for multi-modal AI inference.

    Provides unified interface for all supported modalities while managing
    model loading, memory optimization, and inference execution.
    """

    def __init__(self, model_cache_dir: str = None):
        """
        Initialize the multi-modal handler.

        Args:
            model_cache_dir: Directory containing cached model files (uses config default if None)
        """
        # Use configuration management
        if model_cache_dir is None:
            self.model_cache_dir = config.model_cache_dir
        else:
            self.model_cache_dir = model_cache_dir

        # Use the global model manager for all model operations
        self.model_manager = model_manager

        logger.info(f"Initializing MultiModalHandler with cache dir: {self.model_cache_dir}")
        logger.info(f"Model management configuration: {config.to_dict()}")

        # Verify model cache directory exists
        if not os.path.exists(self.model_cache_dir):
            logger.warning(f"Model cache directory does not exist: {self.model_cache_dir}")

        # Register available models (this would be done by specific modality implementations)
        # For now, this is just a placeholder for the framework
        self._register_available_models()

    def _register_available_models(self) -> None:
        """
        Register available models with the model manager.

        This is a placeholder that would be replaced by actual model discovery
        and registration logic in specific modality implementations.
        """
        logger.info("Registering available models...")

        # TODO: This will be implemented in specific modality stories (MMI-004, etc.)
        # For now, just log that the framework is ready
        logger.info("Model management framework ready - awaiting modality implementations")

    def get_model_for_modality(self, modality: ModalityType, model_name: str = None) -> BaseModel:
        """
        Get the appropriate model for a given modality.

        Args:
            modality: The requested modality type
            model_name: Optional specific model name (uses default if not provided)

        Returns:
            Loaded model instance

        Raises:
            UnsupportedModalityError: If modality is not supported
            ModelLoadError: If model loading fails
        """
        # TODO: This will be implemented in specific modality stories
        # For now, raise unsupported error
        raise UnsupportedModalityError(
            modality.value,
            ["Framework ready - awaiting modality implementations"]
        )

    def get_manager_status(self) -> Dict[str, Any]:
        """Get comprehensive status of the model management system."""
        return self.model_manager.get_manager_status()

    def handler(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """
        RunPod serverless handler function.

        Args:
            event: RunPod event containing input parameters

        Returns:
            Dict containing inference results or error information
        """
        try:
            logger.info(f"Processing request: {event.get('id', 'unknown')}")

            # Extract input data
            input_data = event.get("input", {})
            modality = input_data.get("modality")

            if not modality:
                return {
                    "error": "Missing required parameter: modality",
                    "supported_modalities": [m.value for m in ModalityType]
                }

            # Validate modality type
            try:
                modality_enum = ModalityType(modality)
            except ValueError:
                return {
                    "error": f"Unsupported modality: {modality}",
                    "supported_modalities": [m.value for m in ModalityType]
                }

            # Special handling for status requests
            if modality == "status":
                return {
                    "status": "ready",
                    "manager_status": self.get_manager_status(),
                    "supported_modalities": [m.value for m in ModalityType]
                }

            # Get model for the requested modality
            try:
                model = self.get_model_for_modality(modality_enum, input_data.get("model_name"))

                # Validate inputs
                if not model.validate_inputs(input_data):
                    return {"error": "Invalid input parameters"}

                # Perform inference
                results = model.infer(input_data)

                return {
                    "status": "success",
                    "results": results,
                    "model_info": {
                        "name": model.model_name,
                        "memory_usage_mb": model.memory_usage_mb,
                    }
                }

            except UnsupportedModalityError as e:
                return {
                    "error": str(e),
                    "supported_modalities": e.supported_modalities
                }
            except ValidationError as e:
                return {
                    "error": f"Validation error: {str(e)}",
                    "field": e.field,
                    "value": e.value
                }
            except InferenceError as e:
                return {
                    "error": f"Inference error: {str(e)}"
                }

        except Exception as e:
            logger.error(f"Handler error: {str(e)}", exc_info=True)
            return {
                "error": f"Internal server error: {str(e)}",
                "status": "error"
            }


def runpod_handler(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    RunPod entry point function.

    This function is called by RunPod for each inference request.
    """
    handler = MultiModalHandler()
    return handler.handler(event)


if __name__ == "__main__":
    # For local testing
    test_event = {
        "id": "test-request",
        "input": {
            "modality": "text-to-image",
            "prompt": "A beautiful sunset over mountains",
            "steps": 4,
            "guidance_scale": 1.0
        }
    }

    result = runpod_handler(test_event)
    print(json.dumps(result, indent=2))