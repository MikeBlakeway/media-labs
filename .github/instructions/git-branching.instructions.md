---
applyTo: '**'
description: 'Git branching strategy and pull request guidelines'
---

# Git Branching Strategy Instructions

## Mandatory Branch Flow

Strictly enforce the documented branching strategy to prevent workflow violations.

### Branch Hierarchy and Rules

- **`main`**: Production-ready code only
- **`development`**: Integration and testing branch
- **`feature/*`**: New feature development (branch from `development`)
- **`release/YYYY-wNN`**: Weekly release preparation
- **`hotfix/*`**: Emergency production fixes (branch from `main`)

### Prohibited Operations

- **NEVER** create direct PRs from `development` to `main`
- **NEVER** push directly to `main` or `development` branches
- **NEVER** merge without required approvals and status checks
- **NEVER** bypass branch protection rules

### Required PR Patterns

#### Feature Development

```
feature/description → development
```

- Branch from: `development`
- PR target: `development`
- Squash merge recommended

#### Weekly Releases

```
development → release/YYYY-wNN → main
```

- Create `release/YYYY-wNN` from `development`
- PR from `release/YYYY-wNN` to `main`
- Squash merge required for linear history

#### Emergency Hotfixes

```
hotfix/description → main
```

- Branch from: `main`
- PR target: `main`
- Immediate merge after review

### Branch Naming Conventions

- **Features**: `feature/short-description` (kebab-case)
- **Releases**: `release/YYYY-wNN` (e.g., `release/2025-w37`)
- **Hotfixes**: `hotfix/short-description` (kebab-case)
- **Avoid**: personal prefixes, ticket numbers, special characters

### Commit Message Standards

Follow conventional commit format:

- `feat: add new workflow template system`
- `fix: resolve S3 upload timeout issue`
- `docs: update API documentation`
- `refactor: extract common hooks logic`
- `test: add integration tests for RunPod`

### Pull Request Requirements

#### Required Elements

- Clear, descriptive title
- Detailed description of changes
- Link to related issues/documentation
- Screenshots for UI changes
- Breaking change notifications

#### Review Requirements

- Minimum 1 approval required
- All status checks must pass (CI, build, lint)
- Branches must be up to date before merge
- No force-push after review starts

### Branch Protection Enforcement

#### Main Branch Protection

- Require PR before merging
- Require 1 approval minimum
- Dismiss stale approvals on new commits
- Require status checks: `ci`, `build`, `lint`
- Require linear history (squash merge only)
- Include administrators in restrictions

#### Development Branch Protection

- Require PR before merging
- Require 1 approval minimum
- Require status checks to pass
- Allow bypass for solo development flexibility

### Workflow Violations Prevention

When creating or reviewing code:

1. Verify correct source and target branches
2. Confirm proper branch naming conventions
3. Ensure all required checks are enabled
4. Validate commit message format
5. Check for breaking changes documentation

Refer to [branch enforcement guide](../../release/docs/branch_enforcement.md) for complete protection rules.
