# FLF2V Integration Planning Bootstrap

This document describes the automated GitHub artifact generation for the FLF2V (First-Last-Frame-to-Video) cloud mode implementation.

## Overview

The FLF2V integration planning bootstrap automatically creates:

- **12 GitHub labels** for organization and tracking
- **5 milestones** with due dates for phased implementation
- **15 detailed issues** with tasks and acceptance criteria
- **Summary comment** on the meta-issue with links to all created artifacts

## Quick Start

### Prerequisites

1. **GitHub Personal Access Token** with `repo` permissions
   - Go to [GitHub Settings > Personal Access Tokens](https://github.com/settings/tokens)
   - Create a token with `repo` scope (read/write access to repositories)

2. **pnpm and dependencies** installed:
   ```bash
   corepack enable
   corepack prepare pnpm@10.15.0 --activate
   pnpm install
   ```

### Validation (Optional but Recommended)

```bash
# Validate the bootstrap data structure
pnpm run validate:flf2v
```

Expected output:
```
✅ Validation results:
  ✅ Labels: 12/12 ✓
  ✅ Milestones: 5/5 ✓
  ✅ Issues: 15/15 ✓
```

### Running the Bootstrap

```bash
# Set your GitHub token
export GITHUB_TOKEN="your_github_token_here"

# Run the bootstrap automation
pnpm run bootstrap:flf2v
```

**Alternative method:**
```bash
GITHUB_TOKEN="your_token" pnpm run bootstrap:flf2v
```

## What Gets Created

### Labels (12 total)

| Label | Color | Description |
|-------|-------|-------------|
| `area:api` | Green | Issues related to the API backend |
| `area:ui` | Blue | Issues related to the UI frontend |
| `area:docs` | Yellow | Issues related to documentation |
| `area:devops` | Purple | Issues related to DevOps and infrastructure |
| `type:feature` | Teal | New feature implementation |
| `type:chore` | Gold | Maintenance and setup tasks |
| `type:hardening` | Orange | Security and reliability improvements |
| `priority:P1` | Red | High priority |
| `priority:P2` | Orange | Medium priority |
| `priority:P3` | Blue | Low priority |
| `size:S` | Light Green | Small size task |
| `size:M` | Purple | Medium size task |

### Milestones (5 total)

1. **PR1 — API Surface** (due: 2025-08-31)
   - Async RunPod + B2 + webhook + SSE integration

2. **PR2 — Persistence** (due: 2025-09-03)
   - SQLite via Prisma or better-sqlite3

3. **PR3 — UI Page** (due: 2025-09-06)
   - Upload → Generate → Stream → Play workflow

4. **PR4 — Local Fake Mode** (due: 2025-09-08)
   - Local development mode without GPU

5. **PR5 — Polish & Safety** (due: 2025-09-10)
   - Validation, limits, docs, CI improvements

### Issues (15 total)

Each issue includes:
- **Detailed task breakdown** with checkboxes
- **Acceptance criteria** for completion
- **Proper labels** for organization
- **Milestone assignment** for phased delivery
- **Assignment to @github-copilot** for tracking

#### PR1 — API Surface (Issues 1-6)
1. Bootstrap env & configuration for Cloud Mode
2. Storage helper for B2 presigned URLs (AWS SDK v3)
3. RunPod submission helper
4. Route: POST /api/jobs (multipart) → create + submit
5. SSE stream: GET /api/jobs/stream?jobId=...
6. Webhook: POST /api/callbacks/gpu/:jobId (HMAC)

#### PR2 — Persistence (Issues 7-8)
7. Define Job model & migration
8. Repo layer & GET /api/jobs/:id

#### PR3 — UI Page (Issues 9-10)
9. FLF2V UI page (uploads + controls + submit)
10. SSE hook & video playback

#### PR4 — Local Fake Mode (Issue 11)
11. Implement VIDEO_RUN_MODE=local_fake

#### PR5 — Polish & Safety (Issues 12-15)
12. Validation, limits, friendly errors
13. Concurrency guard & rate limit
14. Developer docs & examples
15. CI tweaks

## Script Output

The script provides detailed console output:

```
🚀 Starting FLF2V Integration Planning Bootstrap...

📋 Creating labels...
  ✅ Created label: area:api
  ✅ Created label: area:ui
  ...

🎯 Creating milestones...
  ✅ Created milestone: PR1 — API Surface
  ✅ Created milestone: PR2 — Persistence
  ...

📝 Creating issues...
  ✅ Created issue #217: Bootstrap env & configuration for Cloud Mode
  ✅ Created issue #218: Storage helper for B2 presigned URLs (AWS SDK v3)
  ...

💬 Adding summary comment to meta issue...
  ✅ Added summary comment to issue #216

🎉 FLF2V Integration Planning Bootstrap completed successfully!
```

## Troubleshooting

### Common Issues

1. **Permission Error**
   ```
   ❌ GITHUB_TOKEN environment variable is required
   ```
   **Solution**: Set the `GITHUB_TOKEN` environment variable with a valid GitHub personal access token.

2. **403 Forbidden**
   ```
   ❌ Failed to create label: Request failed with status code 403
   ```
   **Solution**: Ensure your GitHub token has `repo` scope permissions.

3. **422 Unprocessable Entity**
   ```
   ℹ️ Label already exists: area:api
   ```
   **Solution**: This is normal - the script handles existing artifacts gracefully.

### Manual Verification

After running the script, verify the results:

1. **Labels**: Visit [GitHub Labels](https://github.com/MikeBlakeway/media-labs/labels)
2. **Milestones**: Visit [GitHub Milestones](https://github.com/MikeBlakeway/media-labs/milestones)
3. **Issues**: Visit [GitHub Issues](https://github.com/MikeBlakeway/media-labs/issues)
4. **Meta Issue**: Check [Issue #216](https://github.com/MikeBlakeway/media-labs/issues/216) for the summary comment

## Alternative: Manual Creation

If the automated script cannot be run, labels and milestones can be created manually:

### Manual Label Creation
Visit [Create Label](https://github.com/MikeBlakeway/media-labs/labels/new) and create each label with the colors specified above.

### Manual Milestone Creation  
Visit [Create Milestone](https://github.com/MikeBlakeway/media-labs/milestones/new) and create each milestone with the due dates specified above.

### Semi-Automated Issues
The script can be modified to create only issues if labels and milestones exist manually.

## Script Details

The automation script (`scripts/github-bootstrap-flf2v.js`) uses:

- **@octokit/rest**: GitHub API client for Node.js
- **Structured data**: All artifacts defined as configuration objects
- **Error handling**: Graceful handling of existing artifacts
- **Idempotent operation**: Safe to run multiple times

### Key Features

- **Atomic operations**: Each artifact creation is independent
- **Existing artifact detection**: Won't duplicate existing labels/milestones
- **Detailed logging**: Clear success/failure reporting
- **Meta-issue update**: Automatic summary comment with links

## Next Steps

After running the bootstrap:

1. **Review created artifacts** via GitHub web interface
2. **Assign team members** to specific milestones/issues
3. **Begin implementation** starting with PR1 milestone
4. **Track progress** using GitHub project boards
5. **Update due dates** if needed for your timeline

## Repository Integration

This bootstrap process integrates with the existing media-labs monorepo structure:

- **Respects existing conventions** (labels, naming, etc.)
- **Follows project patterns** (apps/api, apps/ui structure)
- **Uses conventional commits** for issue descriptions
- **Aligns with documented workflows** in the repository

For more information about the FLF2V implementation, see the original planning issue [#216](https://github.com/MikeBlakeway/media-labs/issues/216).