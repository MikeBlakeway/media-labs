# Volume Worker Versioning Strategy Implementation

## Overview

Updated the volume worker build workflow to align with the main application's semantic versioning strategy, ensuring consistent version management across all project artifacts.

## Implementation Details

### Version Detection Strategy

The workflow now detects and applies versions in the following priority order:

1. **Release Branches**: Extracts semantic version from branch names like `release/v1.2.3`
2. **Main Branch**: Uses the latest semantic version tag when building from main
3. **Development Branches**: Falls back to branch name + SHA tagging

### Docker Image Tags Generated

| Branch/Event                      | Tags Applied                                          | Example                                             |
| --------------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| Release branch (`release/v1.2.3`) | `v1.2.3`, `release-v1.2.3`, `release-v1.2.3-abc123`   | `ghcr.io/user/media-labs/volume-worker:v1.2.3`      |
| Main branch                       | `latest`, `main`, `v1.2.3` (if tagged), `main-abc123` | `ghcr.io/user/media-labs/volume-worker:latest`      |
| Development branch                | `development`, `development-abc123`                   | `ghcr.io/user/media-labs/volume-worker:development` |
| Pull request                      | `pr-123`                                              | `ghcr.io/user/media-labs/volume-worker:pr-123`      |

### Key Improvements

#### 1. Semantic Version Coordination

- Volume worker images now use the same semantic versions as the main application
- Release branches automatically tag with proper semantic versions
- Main branch builds include the latest semantic version tag

#### 2. Git History Access

- Added `fetch-depth: 0` to access full git history for version detection
- Enables proper semantic version tag discovery

#### 3. Enhanced Metadata Extraction

- Sophisticated tagging strategy that adapts to different branch types
- Conditional tagging ensures appropriate versions are applied only when relevant

#### 4. Comprehensive Testing

- Test job validates image functionality
- Cleanup job maintains registry hygiene

## Version Detection Logic

```bash
# Extract semantic version from release branches
if [[ "$branch" =~ ^release/.*$ ]]; then
  BRANCH_VERSION=$(echo "$branch" | sed -n 's/release\/v\?\([0-9]\+\.[0-9]\+\.[0-9]\+\).*/\1/p')
fi

# Get latest semantic tag for main branch coordination
LATEST_TAG=$(git describe --tags --match "v*" --abbrev=0 2>/dev/null || echo "v0.0.0")
```

## Benefits

1. **Consistency**: Volume worker images use same versioning as main application
2. **Traceability**: Clear correlation between app versions and worker images
3. **Automation**: No manual version management required
4. **Flexibility**: Handles multiple branch types appropriately
5. **Registry Management**: Automatic cleanup of old images

## Integration with Release Strategy

This implementation fully aligns with the documented release strategy:

- **Weekly Releases**: Release branches automatically get semantic version tags
- **Conventional Commits**: Works with semantic-release automated versioning
- **Branch Protection**: Coordinates with branch protection enforcement
- **Documentation**: Follows established patterns from release documentation

## Next Steps

1. Test the updated workflow with a release branch
2. Validate that semantic version tags are properly applied
3. Verify integration with main application releases
4. Update any documentation references to volume worker versioning

## Files Modified

- `.github/workflows/build-volume-worker.yml` - Complete versioning strategy implementation
