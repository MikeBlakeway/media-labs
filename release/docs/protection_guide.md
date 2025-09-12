# Branch Protection Setup Guide

## Required GitHub Repository Settings

### 1. Branch Protection Rules for `main`

Navigate to: **Settings** → **Branches** → **Add rule**

**Rule Configuration:**

```text
Branch name pattern: main
✅ Require a pull request before merging
✅ Require approvals: 1 (even for solo dev - good practice)
✅ Dismiss stale PR approvals when new commits are pushed
✅ Require status checks to pass before merging
✅ Require branches to be up to date before merging
✅ Require linear history (squash or rebase)
✅ Do not allow bypassing the above settings
```

**Required Status Checks:**

- `ci` (will be created by our GitHub Actions)
- `build` (will be created by our GitHub Actions)

### 2. General Repository Settings

Navigate to: **Settings** → **General**

**Pull Requests:**

```text
✅ Allow squash merging (recommended for clean history)
❌ Allow merge commits (cleaner without these)
✅ Allow rebase merging (good for small changes)
✅ Always suggest updating pull request branches
✅ Automatically delete head branches (cleanup)
```

**Merge Queue Settings:**

```text
❌ Require merge queue (not needed for solo dev)
```

### 3. Actions Permissions

Navigate to: **Settings** → **Actions** → **General**

```text
✅ Allow all actions and reusable workflows
✅ Allow GitHub Actions to create and approve pull requests
```

## Why These Settings?

- **Manual Approval**: Even as solo dev, you review changes before merging
- **Status Checks**: Automated CI prevents broken code from reaching main
- **Linear History**: Clean, readable git history
- **Auto-cleanup**: Removes merged branches automatically
- **Squash Merging**: Keeps main branch history clean and focused
