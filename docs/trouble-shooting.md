# Troubleshooting Guide

## Overview

This document catalogues known gotchas, common issues, and their solutions encountered during Media Labs development. Each entry includes the problem description, root cause analysis, solution steps, and links to relevant external documentation.

## Table of Contents

- [Pydantic V2 Issues](#pydantic-v2-issues)
- [Next.js & React Issues](#nextjs--react-issues)
- [RunPod Integration Issues](#runpod-integration-issues)
- [Docker & Container Issues](#docker--container-issues)
- [S3 & Storage Issues](#s3--storage-issues)
- [Testing Issues](#testing-issues)
- [Build & Deployment Issues](#build--deployment-issues)

---

## Pydantic V2 Issues

### Protected Namespace Warnings in Tests

**Problem**: Pytest shows UserWarnings about field names conflicting with protected namespaces:

```text
UserWarning: Field "model_info" has conflict with a protected namespace "model_"
UserWarning: Field "model_load_time_ms" has conflict with a protected namespace "model_"
```

**Root Cause**: Pydantic V2 protects certain namespace prefixes (like `model_`) to prevent conflicts with internal methods. Fields starting with these prefixes trigger warnings.

**Solution**: Configure the model to disable protected namespace validation:

```python
from pydantic import BaseModel, ConfigDict

class MyResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    model_info: str  # This field would normally trigger a warning
    model_load_time_ms: float
```

**Alternative Solution**: Use pytest warning filters if you can't modify the schema:

```ini
# pytest.ini
[tool:pytest]
filterwarnings =
    ignore:Field.*has conflict with protected namespace.*:UserWarning
```

**External References**:

- [Pydantic V2 Protected Namespaces](https://docs.pydantic.dev/latest/concepts/config/#protected-namespaces)
- [Pytest Warning Filters](https://docs.pytest.org/en/stable/how-to/capture-warnings.html)
- [Pydantic V2 Migration Guide](https://docs.pydantic.dev/latest/migration/)

**Files Affected**:

- `workers/multi-model-worker/src/schemas/controlnet_schema.py`
- `workers/multi-model-worker/src/schemas/text_to_image_schema.py`

---

## Next.js & React Issues

### Framework Issues Placeholder

This section will be populated as issues are discovered and resolved during Next.js and React development.

**External References**:

- [Next.js Troubleshooting](https://nextjs.org/docs/messages)
- [React DevTools](https://react.dev/learn/react-developer-tools)
- [Next.js App Router Migration](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)

---

## RunPod Integration Issues

### Integration Issues Placeholder

This section will be populated as issues are discovered and resolved during RunPod integration development.

**External References**:

- [RunPod Documentation](https://docs.runpod.io/)
- [RunPod Serverless API](https://docs.runpod.io/serverless/references/api)
- [RunPod Python SDK](https://github.com/runpod/runpod-python)
- [RunPod Storage](https://docs.runpod.io/pods/storage/overview)

---

## Docker & Container Issues

### Container Issues Placeholder

This section will be populated as issues are discovered and resolved during Docker and container development.

**External References**:

- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Docker Multi-Stage Builds](https://docs.docker.com/build/building/multi-stage/)
- [Docker Compose Troubleshooting](https://docs.docker.com/compose/troubleshooting/)

---

## S3 & Storage Issues

### Storage Issues Placeholder

This section will be populated as issues are discovered and resolved during S3 and storage integration.

**External References**:

- [AWS S3 API Reference](https://docs.aws.amazon.com/s3/latest/API/Welcome.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [S3-Compatible Storage](https://docs.aws.amazon.com/s3/latest/userguide/Welcome.html)

---

## Testing Issues

### Test Issues Placeholder

This section will be populated as issues are discovered and resolved during testing development.

**External References**:

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Pytest Documentation](https://docs.pytest.org/)
- [Python unittest](https://docs.python.org/3/library/unittest.html)

---

## Build & Deployment Issues

### Deployment Issues Placeholder

This section will be populated as issues are discovered and resolved during build and deployment processes.

**External References**:

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)
- [Docker Deployment](https://docs.docker.com/engine/reference/run/)

---

## Contributing to This Guide

When you encounter and solve a new issue:

1. **Document the Problem**: Clear description of symptoms and error messages
2. **Root Cause Analysis**: Why the issue occurs and what causes it
3. **Solution Steps**: Step-by-step resolution with code examples
4. **External Links**: Reference official documentation and relevant resources
5. **Files Affected**: List specific files that were modified

### Template for New Entries

```markdown
### Issue Title

**Problem**: Brief description of the issue and symptoms

**Root Cause**: Explanation of why this happens

**Solution**: Step-by-step fix with code examples

**Alternative Solutions**: Other approaches if applicable

**External References**:

- [Link to relevant docs](https://example.com)

**Files Affected**:

- `path/to/file.py`
```

---

## External Documentation Quick Links

### Core Technologies

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Pydantic Documentation](https://docs.pydantic.dev/)
- [Python Documentation](https://docs.python.org/3/)

### Testing & Quality

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Pytest Documentation](https://docs.pytest.org/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)

### Infrastructure & Deployment

- [Docker Documentation](https://docs.docker.com/)
- [RunPod Documentation](https://docs.runpod.io/)
- [Vercel Documentation](https://vercel.com/docs)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)

### AI & ML Libraries

- [Transformers Documentation](https://huggingface.co/docs/transformers)
- [Diffusers Documentation](https://huggingface.co/docs/diffusers)
- [PyTorch Documentation](https://pytorch.org/docs/stable/index.html)
- [ComfyUI Documentation](https://github.com/comfyanonymous/ComfyUI)

---

**Last Updated**: September 30, 2025
