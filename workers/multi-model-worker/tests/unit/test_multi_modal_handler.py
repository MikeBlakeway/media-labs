"""
Unit tests for MultiModalHandler class.

Tests cover request routing, handler registration, system monitoring,
and integration with validation and response formatting systems.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from typing import Dict, Any, List
import uuid

# Import the classes to test
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from handlers.multi_modal_handler import MultiModalHandler
from handlers.base_handler import BaseHandler
from models.model_manager import ModelManager
from utils.response_formatter import ResponseFormatter, ErrorType
from utils.request_validator import RequestValidator
from utils.exceptions import ValidationError, InferenceError


class MockBaseHandler(BaseHandler):
    """Mock implementation of BaseHandler for testing."""

    def __init__(self, modality: str):
        self.modality = modality
        self.validate_called = False
        self.load_models_called = False
        self.process_inference_called = False
        self.format_response_called = False

    def validate_request(self, request_data: Dict[str, Any], request_id: str) -> bool:
        self.validate_called = True
        return True

    def load_models(self, request_data: Dict[str, Any], request_id: str) -> List[str]:
        self.load_models_called = True
        return [f"{self.modality}-model"]

    def process_inference(self, request_data: Dict[str, Any], models: List[str], request_id: str) -> Any:
        self.process_inference_called = True
        return {"result": f"{self.modality}-output"}

    def format_response(self, output: Any, processing_time_ms: float, models_used: List[str], request_id: str) -> Dict[str, Any]:
        self.format_response_called = True
        return {
            "status": "success",
            "output": output,
            "metadata": {
                "request_id": request_id,
                "processing_time_ms": processing_time_ms,
                "models_used": models_used
            }
        }


class TestMultiModalHandler:
    """Test cases for MultiModalHandler routing system."""

    def setup_method(self):
        """Setup test fixtures."""
        self.mock_model_manager = Mock(spec=ModelManager)
        self.mock_model_manager.get_memory_stats.return_value = {
            "available_vram_gb": 16.0,
            "total_vram_gb": 24.0,
            "gpu_utilization": 45.2
        }

        self.handler = MultiModalHandler(self.mock_model_manager)

        # Setup mock handlers for testing
        self.mock_text_to_image_handler = MockBaseHandler("text-to-image")
        self.mock_image_to_video_handler = MockBaseHandler("image-to-video")

    def test_initialization(self):
        """Test MultiModalHandler initialization."""
        assert self.handler.model_manager == self.mock_model_manager
        assert isinstance(self.handler.request_validator, RequestValidator)
        assert isinstance(self.handler.response_formatter, ResponseFormatter)
        assert self.handler.handlers == {}
        assert self.handler.supported_modalities == []
        assert self.handler.request_count == 0
        assert self.handler.total_processing_time == 0.0

    def test_register_handler(self):
        """Test handler registration functionality."""
        # Register a handler
        self.handler.register_handler("text-to-image", self.mock_text_to_image_handler)

        assert "text-to-image" in self.handler.handlers
        assert self.handler.handlers["text-to-image"] == self.mock_text_to_image_handler
        assert "text-to-image" in self.handler.supported_modalities

    def test_register_multiple_handlers(self):
        """Test registration of multiple handlers."""
        self.handler.register_handler("text-to-image", self.mock_text_to_image_handler)
        self.handler.register_handler("image-to-video", self.mock_image_to_video_handler)

        assert len(self.handler.handlers) == 2
        assert len(self.handler.supported_modalities) == 2
        assert "text-to-image" in self.handler.supported_modalities
        assert "image-to-video" in self.handler.supported_modalities

    def test_get_supported_modalities(self):
        """Test getting list of supported modalities."""
        # Initially empty
        modalities = self.handler.get_supported_modalities()
        assert modalities == []

        # After registering handlers
        self.handler.register_handler("text-to-image", self.mock_text_to_image_handler)
        self.handler.register_handler("image-to-video", self.mock_image_to_video_handler)

        modalities = self.handler.get_supported_modalities()
        assert len(modalities) == 2
        assert "text-to-image" in modalities
        assert "image-to-video" in modalities

        # Should return a copy, not the original list
        modalities.append("test-modality")
        assert len(self.handler.get_supported_modalities()) == 2

    @patch('uuid.uuid4')
    def test_process_request_with_explicit_modality(self, mock_uuid):
        """Test processing request with explicit modality specification."""
        mock_uuid.return_value = "test-request-123"

        # Register handler
        self.handler.register_handler("text-to-image", self.mock_text_to_image_handler)

        # Mock validation to pass
        with patch.object(self.handler.request_validator, 'validate_full_request', return_value=None):
            request_data = {
                "modality": "text-to-image",
                "prompt": "A beautiful sunset",
                "steps": 4
            }

            response = self.handler.process_request(request_data)

            # Verify handler was called
            assert self.mock_text_to_image_handler.validate_called
            assert self.mock_text_to_image_handler.load_models_called
            assert self.mock_text_to_image_handler.process_inference_called
            assert self.mock_text_to_image_handler.format_response_called

            # Verify request count updated
            assert self.handler.request_count == 1

    @patch('uuid.uuid4')
    def test_process_request_with_auto_detection(self, mock_uuid):
        """Test processing request with automatic modality detection."""
        mock_uuid.return_value = "test-request-456"

        # Register handler
        self.handler.register_handler("text-to-image", self.mock_text_to_image_handler)

        # Mock modality detection and validation
        with patch.object(self.handler.modality_detector, 'detect_modality', return_value="text-to-image"):
            with patch.object(self.handler.request_validator, 'validate_full_request', return_value=None):
                request_data = {
                    "prompt": "A beautiful sunset",
                    "steps": 4,
                    "guidance_scale": 1.0
                }

                response = self.handler.process_request(request_data)

                # Verify handler was called
                assert self.mock_text_to_image_handler.validate_called

    @patch('uuid.uuid4')
    def test_process_request_modality_detection_failure(self, mock_uuid):
        """Test handling when modality detection fails."""
        mock_uuid.return_value = "test-request-789"

        # Mock modality detection to fail
        with patch.object(self.handler.modality_detector, 'detect_modality', return_value=None):
            request_data = {
                "unknown_param": "value"
            }

            response = self.handler.process_request(request_data)

            # Should return error response
            assert response['status'] == 'error'
            assert 'error' in response
            assert 'Could not determine request modality' in response['error']['message']

    @patch('uuid.uuid4')
    def test_process_request_unsupported_modality(self, mock_uuid):
        """Test handling of requests for unsupported modalities."""
        mock_uuid.return_value = "test-request-unsupported"

        # Don't register any handlers, but mock detection to return unsupported modality
        with patch.object(self.handler.modality_detector, 'detect_modality', return_value="unsupported-modality"):
            request_data = {
                "modality": "unsupported-modality",
                "param": "value"
            }

            response = self.handler.process_request(request_data)

            # Should return modality not supported error
            assert response['status'] == 'error'
            assert 'not currently supported' in response['error']['message']

    @patch('uuid.uuid4')
    def test_process_request_validation_failure(self, mock_uuid):
        """Test handling of validation failures."""
        mock_uuid.return_value = "test-request-validation-fail"

        # Register handler
        self.handler.register_handler("text-to-image", self.mock_text_to_image_handler)

        # Mock validation to fail
        validation_error = {
            'field': 'steps',
            'value': 100,
            'message': 'Value must be between 1 and 50'
        }

        with patch.object(self.handler.modality_detector, 'detect_modality', return_value="text-to-image"):
            with patch.object(self.handler.request_validator, 'validate_full_request', return_value=validation_error):
                request_data = {
                    "prompt": "Test",
                    "steps": 100
                }

                response = self.handler.process_request(request_data)

                # Should return validation error
                assert response['status'] == 'error'
                assert 'Validation failed' in response['error']['message']
                assert response['error']['type'] == ErrorType.VALIDATION_ERROR.value

    @patch('uuid.uuid4')
    def test_process_request_handler_exception(self, mock_uuid):
        """Test handling of exceptions raised by handlers."""
        mock_uuid.return_value = "test-request-exception"

        # Create handler that raises exception
        failing_handler = MockBaseHandler("text-to-image")
        failing_handler.process_inference = Mock(side_effect=Exception("Handler failed"))

        self.handler.register_handler("text-to-image", failing_handler)

        with patch.object(self.handler.modality_detector, 'detect_modality', return_value="text-to-image"):
            with patch.object(self.handler.request_validator, 'validate_full_request', return_value=None):
                request_data = {
                    "prompt": "Test",
                    "steps": 4
                }

                response = self.handler.process_request(request_data)

                # Should return error response
                assert response['status'] == 'error'
                assert 'Processing failed' in response['error']['message']
                assert response['error']['type'] == ErrorType.INFERENCE_ERROR.value

    @patch('uuid.uuid4')
    def test_process_request_unexpected_exception(self, mock_uuid):
        """Test handling of unexpected exceptions during processing."""
        mock_uuid.return_value = "test-request-unexpected"

        # Mock modality detection to raise exception
        with patch.object(self.handler.modality_detector, 'detect_modality', side_effect=Exception("Unexpected error")):
            request_data = {
                "prompt": "Test"
            }

            response = self.handler.process_request(request_data)

            # Should return internal error response
            assert response['status'] == 'error'
            assert 'Internal processing error' in response['error']['message']
            assert response['error']['type'] == ErrorType.INTERNAL_ERROR.value

    def test_get_system_status(self):
        """Test system status reporting."""
        # Register some handlers
        self.handler.register_handler("text-to-image", self.mock_text_to_image_handler)
        self.handler.register_handler("image-to-video", self.mock_image_to_video_handler)

        # Simulate some processing history
        self.handler.request_count = 10
        self.handler.total_processing_time = 15000.0  # 15 seconds total

        # Mock model manager loaded models
        self.handler.model_manager._loaded_models = {"model1": Mock(), "model2": Mock()}

        status = self.handler.get_system_status()

        # Validate status structure
        assert status['service'] == 'multi-modal-inference-worker'
        assert status['status'] == 'healthy'
        assert status['supported_modalities'] == ["text-to-image", "image-to-video"]

        # Validate statistics
        stats = status['statistics']
        assert stats['total_requests'] == 10
        assert stats['average_processing_time_ms'] == 1500.0  # 15000 / 10

        # Validate system info
        system_info = status['system']
        assert 'memory' in system_info
        assert 'models' in system_info
        assert system_info['models']['loaded_models'] == 2

    def test_health_check(self):
        """Test health check functionality."""
        with patch('time.time', return_value=1234567890):
            response = self.handler.health_check()

            assert response['status'] == 'success'
            assert 'output' in response
            output = response['output']
            assert output['system_status'] == 'healthy'
            assert 'supported_modalities' in output
            assert 'system_stats' in output

    def test_performance_tracking(self):
        """Test that performance metrics are tracked correctly."""
        initial_count = self.handler.request_count
        initial_time = self.handler.total_processing_time

        # Register handler
        self.handler.register_handler("text-to-image", self.mock_text_to_image_handler)

        # Process a request
        with patch.object(self.handler.modality_detector, 'detect_modality', return_value="text-to-image"):
            with patch.object(self.handler.request_validator, 'validate_full_request', return_value=None):
                with patch('time.time', side_effect=[0, 1.5]):  # 1.5 second processing time
                    request_data = {"prompt": "Test"}
                    self.handler.process_request(request_data)

        # Verify metrics updated
        assert self.handler.request_count == initial_count + 1
        assert self.handler.total_processing_time > initial_time

    def test_concurrent_request_independence(self):
        """Test that concurrent requests are handled independently."""
        # This test verifies that request processing doesn't interfere with each other
        # In practice, this would require threading, but we can test the structure

        self.handler.register_handler("text-to-image", self.mock_text_to_image_handler)

        # Process multiple requests
        with patch.object(self.handler.modality_detector, 'detect_modality', return_value="text-to-image"):
            with patch.object(self.handler.request_validator, 'validate_full_request', return_value=None):
                request1 = {"prompt": "Request 1"}
                request2 = {"prompt": "Request 2"}

                response1 = self.handler.process_request(request1)
                response2 = self.handler.process_request(request2)

                # Both should succeed independently
                assert response1['status'] == 'success'
                assert response2['status'] == 'success'
                assert self.handler.request_count == 2


class TestMultiModalHandlerEdgeCases:
    """Test edge cases and boundary conditions for MultiModalHandler."""

    def setup_method(self):
        """Setup test fixtures."""
        self.mock_model_manager = Mock(spec=ModelManager)
        self.handler = MultiModalHandler(self.mock_model_manager)

    def test_empty_request_data(self):
        """Test handling of empty request data."""
        response = self.handler.process_request({})

        assert response['status'] == 'error'
        assert 'Could not determine request modality' in response['error']['message']

    def test_none_request_data(self):
        """Test handling of None request data."""
        # This should be handled gracefully
        with pytest.raises(Exception):
            self.handler.process_request(None)

    def test_very_large_request_data(self):
        """Test handling of very large request data."""
        large_request = {
            "prompt": "x" * 10000,  # Very long prompt
            "modality": "text-to-image",
            "large_data": list(range(1000))  # Large data structure
        }

        # Should still process (though may fail validation)
        response = self.handler.process_request(large_request)
        assert 'status' in response

    def test_system_status_with_no_requests(self):
        """Test system status when no requests have been processed."""
        status = self.handler.get_system_status()

        stats = status['statistics']
        assert stats['total_requests'] == 0
        assert stats['average_processing_time_ms'] == 0.0

    def test_overwrite_handler_registration(self):
        """Test behavior when overwriting an existing handler registration."""
        handler1 = MockBaseHandler("text-to-image")
        handler2 = MockBaseHandler("text-to-image")

        # Register first handler
        self.handler.register_handler("text-to-image", handler1)
        assert self.handler.handlers["text-to-image"] == handler1

        # Register second handler (should overwrite)
        self.handler.register_handler("text-to-image", handler2)
        assert self.handler.handlers["text-to-image"] == handler2

        # Should still have only one modality in supported list
        assert len(self.handler.supported_modalities) == 1

    @patch('uuid.uuid4')
    def test_request_id_generation(self, mock_uuid):
        """Test that unique request IDs are generated."""
        mock_uuid.side_effect = ["request-1", "request-2", "request-3"]

        self.handler.register_handler("text-to-image", MockBaseHandler("text-to-image"))

        with patch.object(self.handler.modality_detector, 'detect_modality', return_value="text-to-image"):
            with patch.object(self.handler.request_validator, 'validate_full_request', return_value=None):
                # Process multiple requests
                self.handler.process_request({"prompt": "Test 1"})
                self.handler.process_request({"prompt": "Test 2"})
                self.handler.process_request({"prompt": "Test 3"})

                # Verify UUID was called for each request
                assert mock_uuid.call_count == 3


class TestMultiModalHandlerIntegration:
    """Integration tests for MultiModalHandler with real components."""

    def setup_method(self):
        """Setup test fixtures with real components."""
        self.mock_model_manager = Mock(spec=ModelManager)
        self.mock_model_manager.get_memory_stats.return_value = {
            "available_vram_gb": 16.0,
            "total_vram_gb": 24.0
        }
        self.handler = MultiModalHandler(self.mock_model_manager)

    def test_full_request_flow_with_real_validator(self):
        """Test complete request flow with actual RequestValidator."""
        # Register mock handler
        mock_handler = MockBaseHandler("text-to-image")
        self.handler.register_handler("text-to-image", mock_handler)

        # Process request with valid text-to-image parameters
        request_data = {
            "prompt": "A beautiful sunset over mountains",
            "steps": 4,
            "guidance_scale": 1.0
        }

        response = self.handler.process_request(request_data)

        # Should successfully process
        assert response['status'] == 'success'
        assert mock_handler.validate_called
        assert mock_handler.process_inference_called

    def test_full_request_flow_with_validation_error(self):
        """Test complete request flow with validation error."""
        mock_handler = MockBaseHandler("text-to-image")
        self.handler.register_handler("text-to-image", mock_handler)

        # Process request with invalid parameters
        request_data = {
            "prompt": "",  # Empty prompt should fail validation
            "steps": 100,  # Out of range
            "guidance_scale": 1.0
        }

        response = self.handler.process_request(request_data)

        # Should fail validation
        assert response['status'] == 'error'
        assert response['error']['type'] == ErrorType.VALIDATION_ERROR.value


if __name__ == '__main__':
    pytest.main([__file__])