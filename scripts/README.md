# Scripts Directory

This directory contains automation and utility scripts for the Media Labs project.

## Directory Structure

```text
scripts/
├── README.md              # This file - script documentation
├── test/                  # Temporary test scripts (see Test Scripts section)
├── deploy.sh              # Deployment automation script
└── validate-workflows.ts  # Workflow template validation utility
```

## Production Scripts

### `deploy.sh`

Deployment automation script for production environments.

**Usage:**

```bash
./scripts/deploy.sh
```

### `validate-workflows.ts`

Validates workflow template JSON files for schema compliance and structural integrity.

**Usage:**

```bash
npx tsx scripts/validate-workflows.ts
```

**Purpose:**

- Validates JSON syntax in workflow templates
- Checks schema compliance with workflow structure
- Ensures required fields are present
- Reports validation errors with detailed context

## Test Scripts

The `scripts/test/` directory contains temporary test scripts used for debugging and development. These scripts follow specific conventions:

### Convention Rules

1. **Location**: All test scripts must be placed in `scripts/test/`
2. **Language**: All test scripts must be written in TypeScript (`.ts` extension)
3. **Cleanup**: Temporary test scripts should be removed once no longer needed
4. **Documentation**: Useful ongoing scripts should be documented below

### Current Test Scripts

#### `test-example.ts`

Example test script demonstrating the project's established conventions.

**Usage:**

```bash
npx tsx scripts/test/test-example.ts
```

**Purpose:**

- Demonstrates proper test script structure and formatting
- Shows environment variable checking patterns
- Serves as a template for creating new test scripts
- Documents the established naming and organization conventions

_This example script should be kept as a reference template._

#### `test-workflow-form-categorization.ts`

Integration test for ML-002 story - validates workflow form field categorization across real workflow templates.

**Usage:**

```bash
npx tsx scripts/test/test-workflow-form-categorization.ts
```

**Purpose:**

- Validates field categorization logic with real workflow templates from `data/workflows/`
- Ensures proper balance between essential and advanced fields
- Provides metrics on categorization effectiveness (% essential vs advanced)
- Verifies that essential fields (prompts, uploads, size) are correctly identified
- Useful for ongoing validation when workflow templates are added/modified

_Keep for ongoing validation of field categorization logic._

#### `test-fflf2v-debug.ts`

Debugging script for investigating the "unknown op 'None'" error in fflf2v workflow execution.

**Usage:**

```bash
npx tsx scripts/test/test-fflf2v-debug.ts
```

**Purpose:**

- Analyzes workflow template structure for None/null values
- Examines workflow patches from network requests
- Identifies RunPod worker capability mismatches
- Provides diagnostic information for ComfyUI vs Volume worker issues

_Remove after resolving the fflf2v workflow error._

#### `test-runpod-config.ts`

RunPod endpoint configuration diagnostic tool.

**Usage:**

```bash
npx tsx scripts/test/test-runpod-config.ts
```

**Purpose:**

- Checks environment variable configuration
- Identifies endpoint type mismatches (ComfyUI vs Volume workers)
- Provides step-by-step configuration guidance
- Offers solutions for common RunPod setup issues

_Remove after RunPod configuration is properly established._

#### `test-runpod-endpoints.ts`

Tests connectivity and capabilities of configured RunPod endpoints.

**Usage:**

```bash
npx tsx scripts/test/test-runpod-endpoints.ts
```

**Purpose:**

- Tests API connectivity to RunPod endpoints
- Verifies endpoint response and capabilities
- Helps distinguish between ComfyUI and Volume workers
- Validates proper endpoint configuration

_Remove after endpoint connectivity is verified._

### Recently Removed Scripts

The following temporary test scripts were created during development and have been cleaned up:

- `test-signed-url*.js/mjs` - Signed URL testing (removed after implementation)
- `test-b2.js` - Backblaze B2 integration testing (removed after verification)
- `debug-*.js` - Various debugging utilities (removed after resolution)

## Adding New Scripts

### For Production Scripts

1. Place in the root `scripts/` directory
2. Use descriptive names that indicate purpose
3. Add documentation to this README under "Production Scripts"
4. Include usage examples and purpose description

### For Test Scripts

1. Place in `scripts/test/` directory
2. Use TypeScript (`.ts` extension)
3. Use descriptive names with `test-` prefix: `test-feature-name.ts`
4. Clean up when no longer needed
5. Document here if script proves useful for ongoing debugging

## Script Execution

All scripts can be executed from the project root:

```bash
# Production scripts
./scripts/deploy.sh
npx tsx scripts/validate-workflows.ts

# Test scripts
npx tsx scripts/test/test-example.ts
```

## Maintenance

This README should be updated whenever:

- New production scripts are added
- Useful test scripts are identified for retention
- Scripts are removed or relocated
- Script purposes or usage patterns change
