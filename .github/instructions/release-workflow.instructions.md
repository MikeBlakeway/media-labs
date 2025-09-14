---
applyTo: 'release/**,CHANGELOG.md,package.json,release/docs/**,release/notes/**'
description: 'Release process and weekly deployment workflow guidance'
---

# Release Workflow Instructions

## Weekly Release Strategy

Follow the documented weekly release strategy with Friday releases and proper branch flow.

### Branch Flow Requirements

- **Development Flow**: `feature/xyz` → `development` → `release/YYYY-wNN` → `main`
- **Hotfix Flow**: `hotfix/description` → `main` (emergency only)
- **Release Branch Naming**: Always use format `release/YYYY-wNN` (e.g., `release/2025-w37`)
- **Version Tagging**: Auto-tag versions on main branch merge (format: `v1.2.0`)

### Release Day Checklist Enforcement

When creating or modifying release-related files, ensure:

1. **Morning Preparation (10:00 AM)**

   - Create release branch from `development`
   - Verify CI passes on release branch
   - Confirm all tests are green

2. **Testing Phase (11:00 AM - 1:00 PM)**

   - Manual testing checklist completion
   - Core features verification (workflow upload, file processing, result display)
   - UI/UX validation (responsive design, no broken links)
   - Performance checks (page load < 3 seconds)
   - Integration testing (RunPod, S3 storage)

3. **Documentation Review (1:00 PM - 2:00 PM)**

   - Changelog accuracy verification
   - Breaking changes documentation
   - Release notes preparation

4. **Release Execution (2:00 PM - 4:00 PM)**
   - Create PR: `release/YYYY-wNN` → `main`
   - Manual review and approval
   - Merge, auto-tag, and deploy

### Release Branch Protection

- Never create direct PRs from `development` to `main`
- All releases must go through `release/YYYY-wNN` branches
- Require manual approval for all release PRs
- Squash merge to maintain linear history

### Version Management

- Follow semantic versioning (major.minor.patch)
- Update package.json version in release branch
- Generate accurate changelog entries
- Include migration instructions for breaking changes

### Emergency Procedures

- Hotfixes go directly to `main` from `hotfix/description` branches
- Re-enable branch protection immediately after emergency fixes
- Document emergency procedures in release notes

Refer to [release strategy documentation](../../release/docs/strategy.md) and [release checklist](../../release/docs/checklist.md) for complete details.
