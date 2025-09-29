"""
Request Validation and Modality Detection

Provides utilities for validating incoming requests and determining
the appropriate modality type based on request parameters.
"""

import re
from typing import Dict, Any, List, Optional, Tuple
import logging

try:
    # Try relative imports first (when running as package)
    from . import ValidationError
except ImportError:
    # Fall back to absolute imports (when running as script or in tests)
    from src.utils import ValidationError

logger = logging.getLogger(__name__)


class ModalityDetector:
    """
    Detects the intended modality based on request parameters.

    Uses a combination of explicit modality specification and
    parameter pattern matching to determine the target modality.
    """

    # Modality signatures - parameters that strongly indicate a specific modality
    MODALITY_SIGNATURES = {
        'text-to-image': {
            'required_any': ['prompt', 'text'],
            'forbidden': ['image', 'video', 'init_image'],
            'indicators': ['steps', 'guidance_scale', 'width', 'height', 'seed']
        },
        'image-to-video': {
            'required_any': ['image', 'init_image'],
            'forbidden': ['video'],
            'indicators': ['motion_strength', 'fps', 'duration', 'frames']
        },
        'text-to-video': {
            'required_any': ['prompt', 'text'],
            'forbidden': ['image', 'init_image'],
            'indicators': ['motion_strength', 'fps', 'duration', 'frames', 'video']
        },
        'control-net': {
            'required_any': ['control_image', 'control_net_type'],
            'forbidden': [],
            'indicators': ['conditioning_scale', 'control_net']
        },
        'inpainting': {
            'required_any': ['image', 'mask'],
            'forbidden': ['video'],
            'indicators': ['inpaint', 'mask_image', 'init_image']
        },
        'camera-control': {
            'required_any': ['camera_pose', 'camera_trajectory'],
            'forbidden': [],
            'indicators': ['pose', 'trajectory', 'camera']
        }
    }

    @classmethod
    def detect_modality(cls, request_data: Dict[str, Any]) -> str:
        """
        Detect the intended modality from request parameters.

        Args:
            request_data: Raw request data

        Returns:
            Detected modality type

        Raises:
            ValidationError: If no modality can be determined
        """
        # Check for explicit modality specification
        explicit_modality = request_data.get('modality')
        if explicit_modality:
            if explicit_modality in cls.MODALITY_SIGNATURES:
                logger.debug(f"Explicit modality specified: {explicit_modality}")
                return explicit_modality
            else:
                raise ValidationError(
                    'modality',
                    explicit_modality,
                    f"Unsupported modality. Supported: {list(cls.MODALITY_SIGNATURES.keys())}"
                )

        # Attempt automatic detection based on parameter patterns
        scores = {}
        for modality, signature in cls.MODALITY_SIGNATURES.items():
            score = cls._calculate_modality_score(request_data, signature)
            if score > 0:
                scores[modality] = score

        if not scores:
            available_modalities = list(cls.MODALITY_SIGNATURES.keys())
            raise ValidationError(
                'request',
                str(request_data.keys()),
                f"Could not detect modality from parameters. "
                f"Please specify 'modality' field or use parameters for: {available_modalities}"
            )

        # Return the modality with highest confidence score
        detected_modality = max(scores.items(), key=lambda x: x[1])[0]
        logger.info(f"Auto-detected modality: {detected_modality} (confidence scores: {scores})")
        return detected_modality

    @classmethod
    def _calculate_modality_score(cls, request_data: Dict[str, Any], signature: Dict[str, List[str]]) -> int:
        """Calculate confidence score for a specific modality signature."""
        score = 0

        # Check if any required parameters are present
        required_any = signature.get('required_any', [])
        if required_any:
            has_required = any(param in request_data for param in required_any)
            if not has_required:
                return 0  # Cannot be this modality
            score += 3  # Strong positive signal

        # Check for forbidden parameters
        forbidden = signature.get('forbidden', [])
        for param in forbidden:
            if param in request_data:
                return 0  # Cannot be this modality

        # Count indicator parameters
        indicators = signature.get('indicators', [])
        for indicator in indicators:
            if indicator in request_data:
                score += 1

        return score


class RequestValidator:
    """
    Validates request parameters for completeness and correctness.

    Provides both general validation and modality-specific validation
    based on detected or specified modality type.
    """

    # Common validation rules
    COMMON_VALIDATIONS = {
        'prompt': {
            'type': str,
            'min_length': 1,
            'max_length': 2000,
            'required': False
        },
        'seed': {
            'type': int,
            'min_value': 0,
            'max_value': 2**32 - 1,
            'required': False
        },
        'steps': {
            'type': int,
            'min_value': 1,
            'max_value': 100,
            'required': False
        },
        'guidance_scale': {
            'type': (int, float),
            'min_value': 0.1,
            'max_value': 20.0,
            'required': False
        },
        'width': {
            'type': int,
            'min_value': 64,
            'max_value': 2048,
            'multiple_of': 8,
            'required': False
        },
        'height': {
            'type': int,
            'min_value': 64,
            'max_value': 2048,
            'multiple_of': 8,
            'required': False
        }
    }

    @classmethod
    def validate_request_format(cls, request_data: Any) -> Dict[str, Any]:
        """
        Validate basic request format and structure.

        Args:
            request_data: Raw request data

        Returns:
            Validated request data dictionary

        Raises:
            ValidationError: If request format is invalid
        """
        if not isinstance(request_data, dict):
            raise ValidationError(
                'request',
                type(request_data).__name__,
                "Request must be a JSON object/dictionary"
            )

        if not request_data:
            raise ValidationError(
                'request',
                {},
                "Request cannot be empty"
            )

        return request_data

    @classmethod
    def validate_parameters(cls, request_data: Dict[str, Any], modality: str) -> Dict[str, Any]:
        """
        Validate individual parameters according to their rules.

        Args:
            request_data: Request data to validate
            modality: Detected modality for context

        Returns:
            Validated and normalized request data

        Raises:
            ValidationError: If any parameter is invalid
        """
        validated_data = {}

        for param_name, value in request_data.items():
            # Skip validation for unknown parameters (pass-through)
            if param_name not in cls.COMMON_VALIDATIONS:
                validated_data[param_name] = value
                continue

            validation_rule = cls.COMMON_VALIDATIONS[param_name]
            validated_value = cls._validate_parameter(param_name, value, validation_rule)
            validated_data[param_name] = validated_value

        return validated_data

    @classmethod
    def _validate_parameter(cls, param_name: str, value: Any, rule: Dict[str, Any]) -> Any:
        """Validate a single parameter against its rule."""

        # Type validation
        expected_type = rule.get('type')
        if expected_type and not isinstance(value, expected_type):
            raise ValidationError(
                param_name,
                value,
                f"Expected type {expected_type.__name__}, got {type(value).__name__}"
            )

        # String validations
        if isinstance(value, str):
            min_length = rule.get('min_length')
            if min_length and len(value) < min_length:
                raise ValidationError(
                    param_name,
                    value,
                    f"Must be at least {min_length} characters long"
                )

            max_length = rule.get('max_length')
            if max_length and len(value) > max_length:
                raise ValidationError(
                    param_name,
                    value,
                    f"Must be no more than {max_length} characters long"
                )

        # Numeric validations
        if isinstance(value, (int, float)):
            min_value = rule.get('min_value')
            if min_value is not None and value < min_value:
                raise ValidationError(
                    param_name,
                    value,
                    f"Must be at least {min_value}"
                )

            max_value = rule.get('max_value')
            if max_value is not None and value > max_value:
                raise ValidationError(
                    param_name,
                    value,
                    f"Must be no more than {max_value}"
                )

            multiple_of = rule.get('multiple_of')
            if multiple_of and value % multiple_of != 0:
                raise ValidationError(
                    param_name,
                    value,
                    f"Must be a multiple of {multiple_of}"
                )

        return value

    @classmethod
    def validate_full_request(cls, request_data: Any) -> Tuple[str, Dict[str, Any]]:
        """
        Perform complete request validation including modality detection.

        Args:
            request_data: Raw request data

        Returns:
            Tuple of (detected_modality, validated_request_data)

        Raises:
            ValidationError: If validation fails at any stage
        """
        # Step 1: Basic format validation
        validated_request = cls.validate_request_format(request_data)

        # Step 2: Modality detection
        detected_modality = ModalityDetector.detect_modality(validated_request)

        # Step 3: Parameter validation
        validated_request = cls.validate_parameters(validated_request, detected_modality)

        logger.info(f"Request validation complete - modality: {detected_modality}")
        return detected_modality, validated_request