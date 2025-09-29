# AGENTS.md – MVP Worker Requirements

## **MANDATORY AI ASSISTANT PROCESS CHECKLISTS FOR STORY WORK**

### **Pre-Session Checklist** - MUST COMPLETE BEFORE STARTING ANY STORY WORK

- [ ] Read and understand the complete story document including all acceptance criteria
- [ ] Identify all checklist items that will be addressed in this session
- [ ] Commit to updating documentation throughout the session (not just at the end)
- [ ] Plan the comprehensive work summary structure required at session end
- [ ] Verify understanding of all Definition of Done criteria

### **Session End Checklist** - MUST COMPLETE BEFORE ENDING ANY STORY SESSION

- [ ] All completed work is marked with `[x]` in story checklists
- [ ] Comprehensive work summary added with all required sections (Overview, Implementation Details, Key Highlights, Test Results, Architectural Alignment, Foundation for Next Phases, Quality Metrics, Deliverables Summary)
- [ ] All acceptance criteria explicitly addressed and confirmed complete
- [ ] All Definition of Done items verified and marked complete
- [ ] Agentic documents (AGENTS.md, copilot-instructions.md) updated with new patterns
- [ ] Status clearly marked as **COMPLETE** ✅ with next phase identified

### **Process Violation Recovery** - IMMEDIATE ACTION REQUIRED IF CHECKLIST MISSED

- [ ] **If story checklist not updated**: STOP all work, update immediately before proceeding
- [ ] **If work summary missing**: Session CANNOT end until comprehensive summary added
- [ ] **If agentic docs not updated**: All new patterns MUST be documented before session close
- [ ] **Acknowledge violation**: Add explicit note about process improvement for future sessions

**⚠️ CRITICAL**: Story documentation is as important as code implementation. NO EXCEPTIONS.

---

This document defines the **MVP requirements** for our bespoke RunPod worker. It is written to inform AI agents of the scope, constraints, and objectives.

---

## Project Goal

Create a proof-of-concept worker on RunPod that supports **multi-modal AI inference** with a compact model footprint. This MVP should:

- Cover **all required endpoint types** (text-to-image, image-to-image, text-to-video, image-to-video, video-to-video, inpainting, ControlNet, camera control).
- Stay **below 80 GB** in model storage.
- Demonstrate **end-to-end functionality** across modalities with minimal latency and manageable cost.

---

## MVP Requirements

### Modalities

- **Text→Image / Image→Image**

  - Model: `FLUX.1 [schnell] (fp8)` (~12–15 GB)

- **Control**

  - Models: `ControlNet (canny + depth only)` (~3–4 GB)

- **Image→Video**

  - Model: `AnimateDiff (1 motion adapter)` (~2 GB)

- **Text→Video**

  - Model: `LTX-Video 2B (distilled)` (~6–10 GB)

- **Video→Video**

  - Lightweight editor placeholder (optional for MVP)

- **Inpainting**

  - Model: `SDXL Inpainting` (~6–8 GB)

- **Camera Control**

  - Module: `CameraCtrl` (code + tiny weights, <1 GB)

### Total Footprint

- Expected usage: **~30–40 GB**
- Hard cap: **≤ 80 GB**

---

## Infrastructure Notes

- **Deployment Target:** RunPod (serverless for MVP)
- **Storage:** RunPod **Network Volume** (shared, avoids re-downloads)
- **Startup:** Enable **FlashBoot** to minimize cold-starts
- **Cache:** Centralize Hugging Face cache in `/workspace/cache/hf` and prune regularly

---

## Scaling Path (NOT REQUIRED CURRENTLY)

- **Beta (≤ 150 GB)**: Add `SD3-Medium`, expand ControlNets, upgrade Text→Video to LTX-13B fp8, optionally add `HunyuanVideo`.
- **Production (300+ GB)**: Add WAN 2.2 AIO, multiple backbones, full ControlNet suite, multiple AnimateDiff modules, upscalers, and advanced V2V editors.

---

## Rules for AI Agents

1. Always verify **disk usage** before pulling new models.
2. Do not exceed **80 GB** total in MVP stage.
3. Ensure **all endpoints** remain functional.
4. Favor **fp8/distilled** weights where possible.
5. Prefer **pods** only if GPU utilization exceeds 40%; otherwise stay serverless.
6. Use the **directory layout** defined in `Runpod Worker Model Plan`.
7. Follow the **established repository structure** - all code in `src/`, tests in `tests/`, Docker config in `docker/`.
8. Use the **MultiModalHandler** class as the entry point for all modality implementations.
9. Create **modality-specific handlers** in `src/handlers/` directory following the established pattern.
10. Implement **comprehensive tests** for each new modality in both `tests/unit/` and `tests/integration/`.
11. Update **API documentation** in `docs/api.md` when adding new endpoints or modifying schemas.

---

## Key Directory Structure (MVP)

```bash
/workspace/models/
  flux/
    flux1-schnell-fp8.safetensors
  controlnet/
    canny.safetensors
    depth.safetensors
  animatediff/
    motion_adapter.safetensors
  video_backbones/
    ltx-2b-distilled/
  inpaint/
    sdxl-inpaint.safetensors
  camera/
    camctrllib/
```

---

## Success Criteria

- Worker can:

  - Generate an image from text (T2I)
  - Apply ControlNet guidance
  - Animate an image into video (I2V)
  - Generate a video from text (T2V)
  - Perform inpainting
  - Demonstrate camera control in video

- Total disk ≤ 80 GB
- Runs cost-effectively in serverless mode

---

## Development Guidelines for AI Agents

### Repository Structure (Implemented)

The foundation has been established following Python best practices:

```bash
workers/multi-model-worker/
├── src/                           # Source code directory
│   ├── __init__.py               # Package exports
│   ├── main.py                   # MultiModalHandler entry point
│   ├── handlers/                 # Modality-specific handlers
│   │   └── __init__.py          # Handler imports
│   ├── models/                   # Model wrapper classes
│   │   └── __init__.py          # Model imports
│   └── utils/                    # Shared utilities
│       └── __init__.py          # Utility imports
├── docker/                       # Docker configuration
│   ├── Dockerfile               # Multi-stage build
│   └── requirements.txt         # Python dependencies
├── tests/                        # Test suite
│   ├── unit/                    # Unit tests
│   └── integration/             # Integration tests
└── docs/                        # Documentation
    ├── api.md                   # API reference
    └── deployment.md            # Deployment guide
```

### Implementation Patterns

#### Handler Implementation Pattern

When implementing new modality handlers, follow this structure:

```python
# src/handlers/{modality}_handler.py
class {Modality}Handler:
    def __init__(self, model_cache_dir: str):
        self.model_cache_dir = model_cache_dir
        self.model = None

    def load_model(self):
        """Load the required model for this modality"""
        pass

    def process(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process inference request for this modality"""
        pass

    def unload_model(self):
        """Free model memory when not in use"""
        pass
```

#### Model Wrapper Pattern

Create model wrappers in `src/models/` for shared functionality:

```python
# src/models/{model}_model.py
class {Model}Model:
    def __init__(self, model_path: str, device: str = "cuda"):
        self.model_path = model_path
        self.device = device
        self.model = None

    def load(self):
        """Load model with optimization"""
        pass

    def generate(self, **kwargs):
        """Generate output with model"""
        pass

    def optimize_memory(self):
        """Apply memory optimizations"""
        pass
```

#### Test Implementation Requirements

For each new modality, implement both unit and integration tests:

```python
# tests/unit/test_{modality}_handler.py
class Test{Modality}Handler(unittest.TestCase):
    def test_handler_initialization(self):
        pass

    def test_model_loading(self):
        pass

    def test_inference_processing(self):
        pass

# tests/integration/test_{modality}_integration.py
class Test{Modality}Integration(unittest.TestCase):
    def test_end_to_end_workflow(self):
        pass

    def test_error_handling(self):
        pass
```

### Development Workflow

1. **Phase-Based Implementation**: Follow the MMI story sequence (MMI-001 through MMI-012)
2. **Test-Driven Development**: Write tests before implementing functionality
3. **Memory Management**: Implement smart model loading/unloading for GPU memory optimization
4. **Documentation Updates**: Update `docs/api.md` with new endpoints and schemas
5. **Docker Optimization**: Update `docker/requirements.txt` as needed for new dependencies
6. **Story Progress Tracking**: Always update story document checklists as tasks are completed
7. **Comprehensive Documentation**: Add detailed work summaries to story documents upon completion

### Story Management Requirements

#### Mandatory Story Documentation Process

When working on any MMI story, AI assistants must:

1. **Update Story Checklists**: Mark each completed task with `[x]` in the story document
2. **Track Progress**: Update "Inspect and modify", "Tests", and "General" sections
3. **Complete Work Summaries**: Add comprehensive "Summary of Work Completed" sections
4. **Document Implementation**: Include directory structures, files, test results, and architectural notes
5. **Validate Deliverables**: Ensure all acceptance criteria and Definition of Done items are satisfied

#### Work Summary Structure

```markdown
## Summary of Work Completed

### Overview

[Brief summary with completion date]

### [Component] Implementation

[Detailed breakdown of major components]

### Key Implementation Highlights

[Technical achievements and important details]

### Test Results / Validation

[Test results and functionality verification]

### Architectural Alignment

[Integration notes and system alignment]

### Deliverables Summary

[Final checklist of completed items]

**Status**: **COMPLETE** ✅
**Next Phase**: [Follow-up work identification]
```

### Quality Standards

- **Test Coverage**: Minimum 90% coverage for all new code
- **Documentation**: All public methods must have docstrings
- **Error Handling**: Comprehensive error handling with proper logging
- **Memory Efficiency**: Implement model eviction when GPU memory is constrained
- **Performance**: Meet target inference times specified in strategy document

### Integration Points

- **Frontend Integration**: Handler responses must be compatible with Media Labs hooks architecture
- **RunPod Integration**: Follow RunPod serverless handler patterns in `main.py`
- **Model Storage**: Use established `/workspace/models/` directory structure
- **Logging**: Use structured logging consistent with existing patterns

### Current Status (Phase 1 Complete)

✅ **MMI-001 Complete**: Repository structure and foundation established
🔄 **Next**: MMI-002 FLUX.1 Text-to-Image Implementation

The foundation is production-ready and all tests are passing. Ready for modality implementation phases.
