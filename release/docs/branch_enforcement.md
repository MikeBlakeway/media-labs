# Branch Protection Enforcement Guide

## Overview

This guide implements enforcement rules to maintain our agreed branching strategy and prevent direct merges from `development` to `main`.

## Required: Enhanced Branch Protection Rules

### Main Branch Protection (Updated)

Navigate to: **Settings** → **Branches** → Edit "main" rule

**Enhanced Rule Configuration:**

```text
Branch name pattern: main

✅ Require a pull request before merging
✅ Require approvals: 1
✅ Dismiss stale PR approvals when new commits are pushed
✅ Require status checks to pass before merging
  - ci
  - build
  - lint
✅ Require branches to be up to date before merging
✅ Require linear history (squash merge only)
✅ Restrict pushes that create files (optional)
✅ Do not allow bypassing the above settings

🚨 NEW: Required Push Restrictions
✅ Restrict who can push to matching branches
✅ Repository administrators included in restrictions
```

### Additional Protection: Development Branch

Navigate to: **Settings** → **Branches** → **Add rule**

```text
Branch name pattern: development

✅ Require a pull request before merging
✅ Require approvals: 1
✅ Require status checks to pass before merging
  - ci
  - build
  - lint
✅ Require branches to be up to date before merging
❌ Do not allow bypassing (keep flexible for solo dev)
```

## Implementation Steps

### Step 1: Update Main Branch Protection

1. Go to GitHub repo → **Settings** → **Branches**
2. Edit existing "main" rule
3. Add the enhanced settings above
4. Save changes

### Step 2: Add Development Branch Protection

1. Click **Add rule**
2. Set pattern: `development`
3. Configure as shown above
4. Save changes

### Step 3: Verify Workflow

Test the protection by:

1. Try to create PR: `development` → `main` (should be blocked/warned)
2. Create proper flow: `development` → `release/2025-w37` → `main` (should work)

## Enforcement Strategy

### Automatic Enforcement

- **GitHub Protection**: Blocks direct pushes and non-compliant PRs
- **Required Reviews**: Ensures conscious review of all changes
- **Status Checks**: Automated validation before merge

### Visual Cues

- **PR Templates**: Guide proper branch selection
- **Status Badges**: Show protection status in README
- **Branch Names**: Clear naming convention enforcement

## Breaking Glass Procedures

For emergency situations:

1. **Hotfixes**: `hotfix/*` → `main` (allowed by design)
2. **Critical Issues**: Temporarily disable protection (admin only)
3. **Recovery**: Re-enable protection immediately after fix

## Workflow Reminders

### ✅ Correct Flow

```bash
git checkout development
git checkout -b feature/my-feature
# Work, commit, push
# PR: feature/my-feature → development

# Weekly release:
git checkout development
git checkout -b release/2025-w37
# PR: release/2025-w37 → main
```

### ❌ Blocked Flow

```bash
# This will be prevented:
# PR: development → main
# PR: feature/xyz → main (unless hotfix/*)
```

## Additional Tools

### PR Templates

Create `.github/pull_request_template.md`:

```markdown
## Type of Change

- [ ] Feature (feature/\* → development)
- [ ] Hotfix (hotfix/\* → main)
- [ ] Release (release/YYYY-wNN → main)

## Checklist

- [ ] Following correct branch flow
- [ ] Status checks passing
- [ ] Documentation updated
```

### GitHub Actions Check

Create workflow to validate branch naming:

```yaml
name: Branch Protection Check
on:
  pull_request:
    branches: [main]

jobs:
  validate-branch:
    runs-on: ubuntu-latest
    steps:
      - name: Check branch name
        run: |
          if [[ "${{ github.head_ref }}" =~ ^(release/20[0-9]{2}-w[0-9]{2}|hotfix/.+)$ ]]; then
            echo "✅ Valid branch name for main merge"
          else
            echo "❌ Invalid branch name. Use release/YYYY-wNN or hotfix/* for main merges"
            exit 1
          fi
```

This provides multiple layers of protection while maintaining flexibility for legitimate use cases.
