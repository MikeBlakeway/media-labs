# Docker Tagging Strategy

## Overview

This document describes the comprehensive Docker image tagging strategy for the volume worker, designed to provide clear versioning, prevent tag accumulation, and support different deployment environments.

## Branch-Based Tagging

### Release Branches (`release/v1.2.3`)

**Purpose**: Production-ready releases

**Tags Generated**:

- `v1.2.3` - Semantic version tag
- `release-v1.2.3` - Branch-specific tag
- `release-v1.2.3-abc123` - SHA-specific tag

**Example**:

```bash
ghcr.io/user/media-labs/volume-worker:v1.2.3
ghcr.io/user/media-labs/volume-worker:release-v1.2.3
ghcr.io/user/media-labs/volume-worker:release-v1.2.3-abc123
```

### Main Branch

**Purpose**: Latest stable release with production suffix

**Tags Generated**:

- `v1.2.3-latest` - Versioned latest tag
- `latest` - Generic latest tag (overwrites previous)
- `main` - Branch tag
- `main-abc123` - SHA-specific tag

**Example**:

```bash
ghcr.io/user/media-labs/volume-worker:v1.2.3-latest
ghcr.io/user/media-labs/volume-worker:latest
ghcr.io/user/media-labs/volume-worker:main
ghcr.io/user/media-labs/volume-worker:main-abc123
```

### Development Branch

**Purpose**: Next version testing with beta suffix

**Tags Generated**:

- `v1.2.4-beta` - Next version beta tag
- `beta` - Generic beta tag (overwrites previous)
- `development` - Branch tag
- `development-abc123` - SHA-specific tag

**Example**:

```bash
ghcr.io/user/media-labs/volume-worker:v1.2.4-beta
ghcr.io/user/media-labs/volume-worker:beta
ghcr.io/user/media-labs/volume-worker:development
ghcr.io/user/media-labs/volume-worker:development-abc123
```

### Hotfix Branches (`hotfix/v1.2.3-fix-something`)

**Purpose**: Critical fixes with hotfix suffix

**Tags Generated**:

- `v1.2.3-hotfix` - Versioned hotfix tag
- `hotfix-v1.2.3` - Branch-specific tag
- `hotfix-v1.2.3-fix-something-abc123` - SHA-specific tag

**Example**:

```bash
ghcr.io/user/media-labs/volume-worker:v1.2.3-hotfix
ghcr.io/user/media-labs/volume-worker:hotfix-v1.2.3
ghcr.io/user/media-labs/volume-worker:hotfix-v1.2.3-fix-something-abc123
```

## Version Resolution Strategy

### Main Branch

- Uses the **latest released semantic version** from git tags
- Represents the current stable version in production
- Format: `{latest-tag}-latest`

### Development Branch

- Uses the **next patch version** from latest tag
- Automatically increments: `v1.2.3` → `v1.2.4-beta`
- Represents upcoming features and changes

### Release Branches

- Extracts version directly from branch name
- Must follow pattern: `release/v{major}.{minor}.{patch}`
- Becomes the canonical version for that release

### Hotfix Branches

- Extracts base version from branch name
- Must follow pattern: `hotfix/v{major}.{minor}.{patch}-{description}`
- Adds `-hotfix` suffix to distinguish from regular releases

## Tag Cleanup Strategy

### Problem Solved

The "multiple latest versions" issue where each build from main created a new versioned latest tag, leading to accumulation of `v1.1.0-latest`, `v1.2.0-latest`, `v1.3.0-latest`, etc.

### Solution Implementation

#### 1. Generic Tag Overwriting

- `latest` and `beta` tags get **overwritten** on each build
- Only one `latest` and one `beta` tag exist at any time
- Provides predictable, stable references

#### 2. Versioned Tag Cleanup

- Automatic cleanup keeps only the **3 most recent** tagged versions
- Removes old `-latest` and `-beta` suffixed tags
- Maintains recent history while preventing accumulation

#### 3. Cleanup Triggers

- Runs after builds from `main` and `development` branches
- Uses GitHub's `delete-package-versions` action
- Continues on error to prevent build failures

## Branch Protection

### Allowed Branches

Only these branch patterns can trigger builds:

- `main`
- `development`
- `release/**`
- `hotfix/**`

### Blocked Branches

- **Feature branches** (`feature/*`, `feat/*`, etc.) are blocked
- **Personal branches** (developer names) are blocked
- **Any other pattern** is blocked

### Validation

- Branch name validation occurs during the version detection step
- Invalid branches cause immediate workflow failure
- Clear error messages guide developers to correct branch naming

## Usage Guidelines

### For Deployment Scripts

**Production Deployments**:

```bash
# Use specific release version
docker pull ghcr.io/user/media-labs/volume-worker:v1.2.3

# Or use latest stable
docker pull ghcr.io/user/media-labs/volume-worker:latest
```

**Staging/Testing**:

```bash
# Use beta version for testing
docker pull ghcr.io/user/media-labs/volume-worker:beta

# Or specific beta version
docker pull ghcr.io/user/media-labs/volume-worker:v1.2.4-beta
```

**Hotfix Deployments**:

```bash
# Use hotfix version
docker pull ghcr.io/user/media-labs/volume-worker:v1.2.3-hotfix
```

### For Development

**Local Development**:

```bash
# Always use development tag for local testing
docker pull ghcr.io/user/media-labs/volume-worker:development
```

**CI/CD Integration**:

```bash
# Use SHA-based tags for specific commit testing
docker pull ghcr.io/user/media-labs/volume-worker:main-abc123
```

## Benefits

### 1. Predictable Versioning

- Clear correlation between app versions and Docker images
- Consistent suffix conventions across environments
- Semantic versioning alignment

### 2. Resource Management

- No accumulation of "latest" tagged versions
- Automatic cleanup prevents registry bloat
- Maintains essential history while removing clutter

### 3. Environment Clarity

- `latest` = current production version
- `beta` = next development version
- Version-specific tags for exact deployments
- Hotfix identification through suffixes

### 4. Developer Experience

- Clear branch restrictions prevent confusion
- Meaningful tag names aid debugging
- Automatic version increment for development

## Migration Notes

### Breaking Changes

- Feature branches can no longer trigger builds
- Old generic tagging patterns have been replaced
- Cleanup job now removes old versioned tags

### Backward Compatibility

- Existing version tags remain unchanged
- SHA-based tags continue to be generated
- Branch-specific tags maintained for traceability

## Troubleshooting

### Common Issues

**"Unsupported branch" error**:

- Ensure branch follows allowed patterns
- Use `release/v1.2.3` not `release-v1.2.3`
- Use `hotfix/v1.2.3-description` format

**"Invalid branch format" error**:

- Check semantic version format in branch name
- Ensure `v` prefix is present: `v1.2.3`
- Verify major.minor.patch pattern

**Missing images**:

- Check if branch is allowed to trigger builds
- Verify workflow permissions for registry access
- Check cleanup job hasn't removed needed versions

### Debug Commands

```bash
# Check available tags
docker search ghcr.io/user/media-labs/volume-worker

# Pull specific version
docker pull ghcr.io/user/media-labs/volume-worker:TAG

# Inspect image labels
docker inspect ghcr.io/user/media-labs/volume-worker:TAG
```
