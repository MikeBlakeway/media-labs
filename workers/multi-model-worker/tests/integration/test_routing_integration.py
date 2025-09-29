"""
Integration tests for MMI-004 routing infrastructure.

Tests cover end-to-end request routing, RunPod compatibility,
and integration between all routing system components.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
import json
import time
from typing import Dict, Any, List

# Import the classes to test
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from handlers.multi_modal_handler import MultiModalHandler
from handlers.base_handler import BaseHandler
from models.model_manager import ModelManager
from utils.logging_config import LoggingConfig, RequestContext
from utils.response_formatter import ResponseFormatter, ErrorType
from utils.request_validator import RequestValidator


class MockTextToImageHandler(BaseHandler):
    """Mock text-to-image handler for integration testing."""

    def __init__(self, processing_time_ms: float = 1500):
        self.processing_time_ms = processing_time_ms
        self.validation_calls = []
        self.model_loading_calls = []
        self.inference_calls = []
        self.formatting_calls = []

    def validate_request(self, request_data: Dict[str, Any], request_id: str) -> bool:
        self.validation_calls.append((request_data, request_id))

        # Validate required parameters
        if not request_data.get("prompt"):
            raise ValueError("Missing required parameter: prompt")

        steps = request_data.get("steps", 4)
        if not isinstance(steps, int) or steps < 1 or steps > 50:
            raise ValueError("Steps must be between 1 and 50")

        return True

    def load_models(self, request_data: Dict[str, Any], request_id: str) -> List[str]:
        self.model_loading_calls.append((request_data, request_id))

        # Simulate model selection based on request
        models = ["flux-1-schnell"]
        if request_data.get("high_quality", False):
            models.append("flux-1-dev")

        return models

    def process_inference(self, request_data: Dict[str, Any], models: List[str], request_id: str) -> Any:
        self.inference_calls.append((request_data, models, request_id))

        # Simulate processing time
        time.sleep(self.processing_time_ms / 1000.0)

        return {
            "image_url": f"https://example.com/generated/{request_id}.jpg",
            "metadata": {
                "prompt": request_data["prompt"],
                "steps": request_data.get("steps", 4),
                "models_used": models,
                "generation_time_ms": self.processing_time_ms
            }
        }

    def format_response(self, output: Any, processing_time_ms: float, models_used: List[str], request_id: str) -> Dict[str, Any]:
        self.formatting_calls.append((output, processing_time_ms, models_used, request_id))

        return {
            "status": "success",
            "output": output,
            "metadata": {
                "request_id": request_id,
                "processing_time_ms": processing_time_ms,
                "models_used": models_used,
                "inference_time_ms": output.get("metadata", {}).get("generation_time_ms", 0)
            }
        }


class MockImageToVideoHandler(BaseHandler):
    """Mock image-to-video handler for integration testing."""

    def validate_request(self, request_data: Dict[str, Any], request_id: str) -> bool:
        if not request_data.get("image_url"):
            raise ValueError("Missing required parameter: image_url")
        return True

    def load_models(self, request_data: Dict[str, Any], request_id: str) -> List[str]:
        return ["stable-video-diffusion"]

    def process_inference(self, request_data: Dict[str, Any], models: List[str], request_id: str) -> Any:
        return {
            "video_url": f"https://example.com/generated/{request_id}.mp4",
            "metadata": {
                "source_image": request_data["image_url"],
                "duration_seconds": 4,
                "models_used": models
            }
        }

    def format_response(self, output: Any, processing_time_ms: float, models_used: List[str], request_id: str) -> Dict[str, Any]:
        return {
            "status": "success",
            "output": output,
            "metadata": {
                "request_id": request_id,
                "processing_time_ms": processing_time_ms,
                "models_used": models_used
            }
        }


class TestMMIRoutingIntegration:
    """Integration tests for complete routing system."""

    def setup_method(self):
        """Setup test fixtures."""
        LoggingConfig.setup_logging(log_level="DEBUG")

        # Setup model manager mock
        self.mock_model_manager = Mock(spec=ModelManager)
        self.mock_model_manager.get_memory_stats.return_value = {
            "available_vram_gb": 16.0,
            "total_vram_gb": 24.0,
            "gpu_utilization": 25.5
        }

        # Create multi-modal handler
        self.handler = MultiModalHandler(self.mock_model_manager)

        # Register handlers
        self.text_to_image_handler = MockTextToImageHandler()
        self.image_to_video_handler = MockImageToVideoHandler()

        self.handler.register_handler("text-to-image", self.text_to_image_handler)
        self.handler.register_handler("image-to-video", self.image_to_video_handler)

    def test_complete_text_to_image_workflow(self):
        """Test complete text-to-image workflow from request to response."""
        request_data = {
            "prompt": "A beautiful sunset over mountains",
            "steps": 4,
            "guidance_scale": 1.0,
            "width": 1024,
            "height": 1024
        }

        # Process request
        response = self.handler.process_request(request_data)

        # Verify response structure
        assert response["status"] == "success"
        assert "output" in response
        assert "metadata" in response

        # Verify output content
        output = response["output"]
        assert "image_url" in output
        assert output["image_url"].endswith(".jpg")
        assert output["metadata"]["prompt"] == request_data["prompt"]
        assert output["metadata"]["steps"] == 4

        # Verify metadata
        metadata = response["metadata"]
        assert "request_id" in metadata
        assert "processing_time_ms" in metadata
        assert "models_used" in metadata
        assert metadata["models_used"] == ["flux-1-schnell"]

        # Verify handler was called correctly
        assert len(self.text_to_image_handler.validation_calls) == 1
        assert len(self.text_to_image_handler.model_loading_calls) == 1
        assert len(self.text_to_image_handler.inference_calls) == 1
        assert len(self.text_to_image_handler.formatting_calls) == 1

    def test_complete_image_to_video_workflow(self):
        """Test complete image-to-video workflow from request to response."""
        request_data = {
            "image_url": "https://example.com/input.jpg",
            "duration": 4,
            "fps": 24
        }

        # Process request with explicit modality
        request_data["modality"] = "image-to-video"
        response = self.handler.process_request(request_data)

        # Verify response
        assert response["status"] == "success"
        assert "output" in response

        output = response["output"]
        assert "video_url" in output
        assert output["video_url"].endswith(".mp4")
        assert output["metadata"]["source_image"] == request_data["image_url"]

    def test_automatic_modality_detection_text_to_image(self):
        """Test automatic modality detection for text-to-image requests."""
        request_data = {
            "prompt": "A serene lake at dawn",
            "steps": 4,
            "guidance_scale": 1.0
            # No explicit modality specified
        }

        response = self.handler.process_request(request_data)

        # Should automatically detect and route to text-to-image
        assert response["status"] == "success"
        assert len(self.text_to_image_handler.validation_calls) == 1
        assert len(self.image_to_video_handler.validation_calls) == 0

    def test_automatic_modality_detection_image_to_video(self):
        """Test automatic modality detection for image-to-video requests."""
        request_data = {
            "image_url": "https://example.com/sunset.jpg",
            "duration": 4
            # No explicit modality specified
        }

        response = self.handler.process_request(request_data)

        # Should automatically detect and route to image-to-video
        assert response["status"] == "success"
        assert len(self.image_to_video_handler.validation_calls) == 1
        assert len(self.text_to_image_handler.validation_calls) == 0

    def test_validation_error_handling(self):
        """Test validation error handling across components."""
        # Invalid request - missing prompt
        request_data = {
            "steps": 4,
            "guidance_scale": 1.0
            # Missing required prompt
        }

        response = self.handler.process_request(request_data)

        # Should return validation error
        assert response["status"] == "error"
        assert response["error"]["type"] == ErrorType.VALIDATION_ERROR.value
        assert "prompt" in response["error"]["message"]

        # Handler validation should have been called and failed
        assert len(self.text_to_image_handler.validation_calls) == 1
        assert len(self.text_to_image_handler.inference_calls) == 0

    def test_parameter_validation_error(self):
        """Test parameter validation error handling."""
        request_data = {
            "prompt": "Test prompt",
            "steps": 100,  # Out of valid range
            "guidance_scale": 1.0
        }

        response = self.handler.process_request(request_data)

        # Should return validation error for steps parameter
        assert response["status"] == "error"
        assert "steps" in response["error"]["message"] or "Steps" in response["error"]["message"]

    def test_unsupported_modality_handling(self):
        """Test handling of unsupported modality requests."""
        request_data = {
            "modality": "text-to-3d",  # Unsupported modality
            "text": "Create a 3D model of a car"
        }

        response = self.handler.process_request(request_data)

        # Should return modality not supported error
        assert response["status"] == "error"
        assert "not currently supported" in response["error"]["message"]

    def test_performance_tracking_integration(self):
        """Test that performance is tracked throughout the workflow."""
        request_data = {
            "prompt": "Performance test image",
            "steps": 4
        }

        # Mock processing to be faster for test
        fast_handler = MockTextToImageHandler(processing_time_ms=100)
        self.handler.register_handler("text-to-image", fast_handler)

        initial_count = self.handler.request_count
        initial_time = self.handler.total_processing_time

        response = self.handler.process_request(request_data)

        # Verify performance tracking
        assert response["status"] == "success"
        assert self.handler.request_count == initial_count + 1
        assert self.handler.total_processing_time > initial_time

        # Verify timing metadata
        assert response["metadata"]["processing_time_ms"] > 0

    def test_system_status_integration(self):
        """Test system status with real handlers and requests."""
        # Process some requests first
        self.handler.process_request({
            "prompt": "Test 1",
            "steps": 4
        })
        self.handler.process_request({
            "image_url": "https://example.com/test.jpg"
        })

        status = self.handler.get_system_status()

        # Verify system status
        assert status["service"] == "multi-modal-inference-worker"
        assert status["status"] == "healthy"
        assert len(status["supported_modalities"]) == 2
        assert "text-to-image" in status["supported_modalities"]
        assert "image-to-video" in status["supported_modalities"]

        # Verify statistics
        stats = status["statistics"]
        assert stats["total_requests"] == 2
        assert stats["average_processing_time_ms"] > 0

        # Verify system information
        system = status["system"]
        assert "memory" in system
        assert system["memory"]["available_vram_gb"] == 16.0


class TestRunPodCompatibility:
    """Test RunPod serverless compatibility."""

    def setup_method(self):
        """Setup test fixtures."""
        LoggingConfig.setup_logging()
        self.mock_model_manager = Mock(spec=ModelManager)
        self.handler = MultiModalHandler(self.mock_model_manager)
        self.handler.register_handler("text-to-image", MockTextToImageHandler())

    def test_runpod_request_format_compatibility(self):
        """Test compatibility with RunPod request format."""
        # RunPod typically sends requests in this format
        runpod_request = {
            "input": {
                "prompt": "A majestic eagle soaring through clouds",
                "steps": 4,
                "guidance_scale": 1.0
            }
        }

        # Extract input for processing
        response = self.handler.process_request(runpod_request["input"])

        # Should process successfully
        assert response["status"] == "success"
        assert "output" in response
        assert "metadata" in response

    def test_runpod_response_format_compatibility(self):
        """Test that responses are compatible with RunPod format."""
        request_data = {
            "prompt": "RunPod compatibility test",
            "steps": 4
        }

        response = self.handler.process_request(request_data)

        # Verify RunPod-compatible response structure
        assert "status" in response
        assert response["status"] in ["success", "error"]

        if response["status"] == "success":
            assert "output" in response
            assert isinstance(response["output"], dict)
        else:
            assert "error" in response
            assert isinstance(response["error"], dict)

    def test_runpod_error_format_compatibility(self):
        """Test that error responses are RunPod compatible."""
        # Invalid request
        invalid_request = {
            "steps": 4
            # Missing prompt
        }

        response = self.handler.process_request(invalid_request)

        # Verify error format
        assert response["status"] == "error"
        assert "error" in response
        assert "message" in response["error"]
        assert "type" in response["error"]

    def test_health_check_runpod_format(self):
        """Test health check returns RunPod-compatible format."""
        response = self.handler.health_check()

        # Should match RunPod health check format
        assert response["status"] == "success"
        assert "output" in response

        output = response["output"]
        assert "system_status" in output
        assert output["system_status"] == "healthy"

    def test_large_response_handling(self):
        """Test handling of large responses (RunPod has size limits)."""
        # Create handler that returns large response
        class LargeResponseHandler(MockTextToImageHandler):
            def process_inference(self, request_data, models, request_id):
                return {
                    "image_url": f"https://example.com/large/{request_id}.jpg",
                    "large_data": "x" * 10000,  # Large data payload
                    "metadata": {
                        "prompt": request_data["prompt"],
                        "models_used": models
                    }
                }

        large_handler = LargeResponseHandler()
        self.handler.register_handler("text-to-image", large_handler)

        request_data = {
            "prompt": "Large response test",
            "steps": 4
        }

        response = self.handler.process_request(request_data)

        # Should handle large responses gracefully
        assert response["status"] == "success"
        assert len(str(response)) > 10000


class TestEndToEndScenarios:
    """Test realistic end-to-end scenarios."""

    def setup_method(self):
        """Setup test fixtures."""
        LoggingConfig.setup_logging()
        self.mock_model_manager = Mock(spec=ModelManager)
        self.handler = MultiModalHandler(self.mock_model_manager)

        # Register multiple handlers
        self.handler.register_handler("text-to-image", MockTextToImageHandler())
        self.handler.register_handler("image-to-video", MockImageToVideoHandler())

    def test_high_quality_text_to_image_workflow(self):
        """Test high-quality text-to-image generation workflow."""
        request_data = {
            "prompt": "Ultra-realistic portrait of a wise old wizard with a flowing beard",
            "steps": 20,
            "guidance_scale": 7.5,
            "width": 1024,
            "height": 1024,
            "high_quality": True
        }

        response = self.handler.process_request(request_data)

        assert response["status"] == "success"
        assert "flux-1-dev" in response["metadata"]["models_used"]  # High quality model used

    def test_batch_processing_simulation(self):
        """Test processing multiple requests sequentially."""
        requests = [
            {"prompt": "A sunset over the ocean", "steps": 4},
            {"prompt": "A mountain landscape in winter", "steps": 4},
            {"prompt": "A futuristic city skyline", "steps": 4}
        ]

        responses = []
        for i, request in enumerate(requests):
            response = self.handler.process_request(request)
            responses.append(response)

            # All should succeed
            assert response["status"] == "success"
            assert f"generated/test-request-{i}" in response["output"]["image_url"] or \
                   "generated/" in response["output"]["image_url"]

        # Verify performance tracking
        assert self.handler.request_count == len(requests)
        assert self.handler.total_processing_time > 0

    def test_mixed_modality_workflow(self):
        """Test processing requests for different modalities."""
        # First request: text-to-image
        text_request = {
            "prompt": "A serene forest scene",
            "steps": 4
        }

        text_response = self.handler.process_request(text_request)
        assert text_response["status"] == "success"

        # Second request: image-to-video using result from first
        video_request = {
            "image_url": text_response["output"]["image_url"],
            "duration": 4
        }

        video_response = self.handler.process_request(video_request)
        assert video_response["status"] == "success"
        assert video_response["output"]["metadata"]["source_image"] == text_response["output"]["image_url"]

    def test_error_recovery_workflow(self):
        """Test system recovery after errors."""
        # First request: invalid (should fail)
        invalid_request = {"steps": 4}  # Missing prompt

        error_response = self.handler.process_request(invalid_request)
        assert error_response["status"] == "error"

        # Second request: valid (should succeed)
        valid_request = {
            "prompt": "Recovery test image",
            "steps": 4
        }

        success_response = self.handler.process_request(valid_request)
        assert success_response["status"] == "success"

        # System should still be healthy
        status = self.handler.get_system_status()
        assert status["status"] == "healthy"

    @patch('time.time')
    def test_performance_monitoring_scenario(self, mock_time):
        """Test comprehensive performance monitoring."""
        # Mock time to control timing
        mock_time.side_effect = [0, 1.5, 3.0, 4.2]  # Multiple time points

        with RequestContext("perf-monitor-test") as context:
            # Simulate processing steps
            context.add_performance_metric("validation", 100)
            context.add_performance_metric("model_loading", 800)

            request_data = {
                "prompt": "Performance monitoring test",
                "steps": 4
            }

            response = self.handler.process_request(request_data)

            context.add_performance_metric("post_processing", 200)

        assert response["status"] == "success"
        assert context.get_total_time_ms() == 4200.0  # 4.2 seconds
        assert len(context.performance_data) == 3


if __name__ == '__main__':
    pytest.main([__file__])