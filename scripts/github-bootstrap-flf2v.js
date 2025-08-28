#!/usr/bin/env node

/**
 * GitHub Automation Script for FLF2V Integration Planning
 * 
 * This script auto-generates milestones, labels, and issues for the FLF2V
 * cloud mode implementation as specified in issue #216.
 * 
 * Usage:
 *   GITHUB_TOKEN=<token> node scripts/github-bootstrap-flf2v.js
 * 
 * Required: GITHUB_TOKEN environment variable with repo permissions
 */

const { Octokit } = require('@octokit/rest');

const REPO_OWNER = 'MikeBlakeway';
const REPO_NAME = 'media-labs';
const META_ISSUE_NUMBER = 216;

// Configuration data from issue #216
const LABELS_TO_CREATE = [
  { name: 'area:api', color: '0e8a16', description: 'Issues related to the API backend' },
  { name: 'area:ui', color: '1f77b4', description: 'Issues related to the UI frontend' },
  { name: 'area:docs', color: 'f9d71c', description: 'Issues related to documentation' },
  { name: 'area:devops', color: '8e5ea2', description: 'Issues related to DevOps and infrastructure' },
  { name: 'type:feature', color: '00d4aa', description: 'New feature implementation' },
  { name: 'type:chore', color: 'ffd700', description: 'Maintenance and setup tasks' },
  { name: 'type:hardening', color: 'ff6b35', description: 'Security and reliability improvements' },
  { name: 'priority:P1', color: 'b60205', description: 'High priority' },
  { name: 'priority:P2', color: 'ff9500', description: 'Medium priority' },
  { name: 'priority:P3', color: '0075ca', description: 'Low priority' },
  { name: 'size:S', color: 'c2e0c6', description: 'Small size task' },
  { name: 'size:M', color: '7057ff', description: 'Medium size task' }
];

const MILESTONES_TO_CREATE = [
  {
    title: 'PR1 — API Surface',
    description: 'Async RunPod + B2 + webhook + SSE integration',
    due_on: '2025-08-31T23:59:59Z'
  },
  {
    title: 'PR2 — Persistence',
    description: 'SQLite via Prisma or better-sqlite3',
    due_on: '2025-09-03T23:59:59Z'
  },
  {
    title: 'PR3 — UI Page',
    description: 'Upload → Generate → Stream → Play workflow',
    due_on: '2025-09-06T23:59:59Z'
  },
  {
    title: 'PR4 — Local Fake Mode',
    description: 'Local development mode without GPU',
    due_on: '2025-09-08T23:59:59Z'
  },
  {
    title: 'PR5 — Polish & Safety',
    description: 'Validation, limits, docs, CI improvements',
    due_on: '2025-09-10T23:59:59Z'
  }
];

const ISSUES_TO_CREATE = [
  // PR1 — API Surface
  {
    title: 'Bootstrap env & configuration for Cloud Mode',
    body: `## Task Description

Bootstrap environment configuration and validation for FLF2V cloud mode integration.

## Tasks

- [ ] Add \`.env.example\` at **root** and **apps/api** with keys: \`VIDEO_RUN_MODE\`, \`RUNPOD_API_KEY\`, \`RUNPOD_ENDPOINT_ID\`, \`RUNPOD_REGION\`, \`PUBLIC_BASE_URL\`, \`CALLBACK_SECRET\`, \`B2_ENDPOINT\`, \`B2_REGION\`, \`B2_BUCKET\`, \`B2_ACCESS_KEY_ID\`, \`B2_SECRET_ACCESS_KEY\`
- [ ] Add \`apps/api/src/config/runpod.ts\` and \`apps/api/src/config/storage.ts\` (zod-validated)

## Acceptance Criteria

- API logs clear missing-env errors and exits gracefully in \`cloud\` mode
- All configuration values are validated with appropriate schemas

## Related Issues

Part of PR1 milestone for FLF2V integration.`,
    labels: ['area:api', 'type:chore', 'priority:P1', 'size:S'],
    milestone: 'PR1 — API Surface'
  },
  {
    title: 'Storage helper for B2 presigned URLs (AWS SDK v3)',
    body: `## Task Description

Implement B2-compatible storage helpers using AWS SDK v3 for presigned URLs.

## Tasks

- [ ] \`apps/api/src/lib/storage.ts\`: S3 client (\`forcePathStyle:true\`)
- [ ] \`presignPut(key, 'video/mp4', exp)\` and \`presignGet(key, exp)\` functions
- [ ] Unit tests for storage functionality

## Acceptance Criteria

- PUT/GET URLs work with a curl smoke test
- Storage client properly configured for B2 compatibility
- Tests cover both successful and error cases

## Related Issues

Part of PR1 milestone for FLF2V integration.`,
    labels: ['area:api', 'type:feature', 'priority:P1', 'size:S'],
    milestone: 'PR1 — API Surface'
  },
  {
    title: 'RunPod submission helper',
    body: `## Task Description

Create RunPod API integration helper for job submission to serverless endpoints.

## Tasks

- [ ] \`apps/api/src/lib/runpod.ts\`: \`submitToRunPod({ jobId, workflow, images, outputPutUrl, callbackUrl })\` → POST \`/v2/<endpointId>/run\`
- [ ] Basic error mapping + request id logging
- [ ] Proper TypeScript types for RunPod API

## Acceptance Criteria

- Tiny test submission returns 200/enqueued status
- Error responses are properly mapped and logged
- Request tracking via request IDs

## Related Issues

Part of PR1 milestone for FLF2V integration.`,
    labels: ['area:api', 'type:feature', 'priority:P1', 'size:S'],
    milestone: 'PR1 — API Surface'
  },
  {
    title: 'Route: POST /api/jobs (multipart) → create + submit',
    body: `## Task Description

Main job creation endpoint that accepts images and parameters, then submits to RunPod.

## Tasks

- [ ] Validate inputs (two images + frames/fps/res)
- [ ] Load \`apps/api/workflows/wan2.1_flf2v_720_f16.json\`
- [ ] Presign PUT to \`videos/<jobId>.mp4\`; build \`images[]\` with names **\`start_image.png\`** and **\`end_image.png\`**
- [ ] Submit to RunPod with webhook \`PUBLIC_BASE_URL/api/callbacks/gpu/<jobId>?hmac=...\`

## Acceptance Criteria

- Returns \`{id,status}\` response format
- Job appears on RunPod dashboard
- Proper multipart file handling
- Input validation with clear error messages

## Related Issues

Part of PR1 milestone for FLF2V integration.`,
    labels: ['area:api', 'type:feature', 'priority:P1', 'size:M'],
    milestone: 'PR1 — API Surface'
  },
  {
    title: 'SSE stream: GET /api/jobs/stream?jobId=...',
    body: `## Task Description

Server-Sent Events endpoint for real-time job status updates.

## Tasks

- [ ] Minimal channel registry and \`send(jobId, payload)\` helper
- [ ] Emit \`{type:'connected'}\` on open; used by callbacks to push updates
- [ ] Proper cleanup on client disconnect

## Acceptance Criteria

- Stream emits updates for a running job
- Multiple clients can subscribe to same job
- Clean connection management and error handling

## Related Issues

Part of PR1 milestone for FLF2V integration.`,
    labels: ['area:api', 'type:feature', 'priority:P1', 'size:S'],
    milestone: 'PR1 — API Surface'
  },
  {
    title: 'Webhook: POST /api/callbacks/gpu/:jobId (HMAC)',
    body: `## Task Description

Secure webhook endpoint for RunPod job completion callbacks.

## Tasks

- [ ] Verify \`?hmac=\` using \`CALLBACK_SECRET\`
- [ ] Update job status, persist \`outputKey\`, broadcast SSE
- [ ] Proper error handling and logging

## Acceptance Criteria

- Valid callbacks flip job state correctly
- Invalid HMAC → 403 response
- SSE clients receive real-time updates

## Related Issues

Part of PR1 milestone for FLF2V integration.`,
    labels: ['area:api', 'type:feature', 'priority:P1', 'size:S'],
    milestone: 'PR1 — API Surface'
  },
  // PR2 — Persistence
  {
    title: 'Define Job model & migration',
    body: `## Task Description

Define Prisma schema for job persistence and create initial migration.

## Tasks

- [ ] Prisma model (id, status, frames, fps, width, height, outputKey?, error?, createdAt, updatedAt)
- [ ] Migration creating \`apps/api/data/app.db\`
- [ ] Proper enum types for job status

## Acceptance Criteria

- Migration succeeds; table exists
- Schema supports all required job fields
- Indexes for performance optimization

## Related Issues

Part of PR2 milestone for FLF2V integration.`,
    labels: ['area:api', 'type:feature', 'priority:P1', 'size:S'],
    milestone: 'PR2 — Persistence'
  },
  {
    title: 'Repo layer & GET /api/jobs/:id',
    body: `## Task Description

Repository layer for job data access and job retrieval endpoint.

## Tasks

- [ ] \`apps/api/src/repos/jobsRepo.ts\` with \`create/update/getById\`
- [ ] GET route returns job; if completed, also a presigned **GET** URL
- [ ] Proper error handling for not found cases

## Acceptance Criteria

- Job lifecycle survives server restarts
- Completed jobs include download URLs
- Clean separation of data access logic

## Related Issues

Part of PR2 milestone for FLF2V integration.`,
    labels: ['area:api', 'type:feature', 'priority:P1', 'size:S'],
    milestone: 'PR2 — Persistence'
  },
  // PR3 — UI Page
  {
    title: 'FLF2V UI page (uploads + controls + submit)',
    body: `## Task Description

Main UI page for FLF2V video generation with file uploads and parameter controls.

## Tasks

- [ ] \`apps/ui/app/flf2v/page.tsx\` with two file inputs & previews
- [ ] Frames/fps/resolution presets with clear labeling
- [ ] POST FormData to API and display job id
- [ ] Loading states and error handling

## Acceptance Criteria

- Job gets created from the page successfully
- File previews work correctly
- User-friendly parameter selection
- Clear feedback for all user actions

## Related Issues

Part of PR3 milestone for FLF2V integration.`,
    labels: ['area:ui', 'type:feature', 'priority:P1', 'size:M'],
    milestone: 'PR3 — UI Page'
  },
  {
    title: 'SSE hook & video playback',
    body: `## Task Description

React hook for SSE job status updates and video playback component.

## Tasks

- [ ] \`hooks/useJobSSE.ts\` → connect to stream
- [ ] On completion, GET job → render \`<video src=...>\` + download
- [ ] Proper cleanup and error handling

## Acceptance Criteria

- Page updates to COMPLETED and plays MP4
- Download functionality works
- Real-time status updates during processing

## Related Issues

Part of PR3 milestone for FLF2V integration.`,
    labels: ['area:ui', 'type:feature', 'priority:P1', 'size:S'],
    milestone: 'PR3 — UI Page'
  },
  // PR4 — Local Fake Mode
  {
    title: 'Implement VIDEO_RUN_MODE=local_fake',
    body: `## Task Description

Local development mode that bypasses RunPod for testing the full workflow.

## Tasks

- [ ] Skip RunPod; schedule timeout to mark COMPLETE
- [ ] Optional tiny placeholder MP4 generation
- [ ] Same API interface as cloud mode

## Acceptance Criteria

- Full UI flow works with no GPU required
- Timing simulates real processing delays
- Easy to switch between modes via environment

## Related Issues

Part of PR4 milestone for FLF2V integration.`,
    labels: ['area:api', 'type:feature', 'priority:P2', 'size:S'],
    milestone: 'PR4 — Local Fake Mode'
  },
  // PR5 — Polish & Safety
  {
    title: 'Validation, limits, friendly errors',
    body: `## Task Description

Input validation, limits enforcement, and user-friendly error messages.

## Tasks

- [ ] Zod limits for file types/sizes and numeric ranges
- [ ] Map RunPod errors to user-friendly messages
- [ ] Input sanitization and validation

## Acceptance Criteria

- Bad inputs rejected with clear messages
- File size and type limits enforced
- Error messages guide users to correct input

## Related Issues

Part of PR5 milestone for FLF2V integration.`,
    labels: ['area:api', 'type:hardening', 'priority:P2', 'size:S'],
    milestone: 'PR5 — Polish & Safety'
  },
  {
    title: 'Concurrency guard & rate limit',
    body: `## Task Description

Implement concurrency limits and rate limiting to manage resource usage.

## Tasks

- [ ] Cap concurrent GPU jobs (configurable)
- [ ] Naive per-IP rate limit on POST \`/jobs\`
- [ ] Proper queue management

## Acceptance Criteria

- Excess requests receive 429 status
- Configurable limits via environment
- Fair job processing order

## Related Issues

Part of PR5 milestone for FLF2V integration.`,
    labels: ['area:api', 'type:hardening', 'priority:P3', 'size:S'],
    milestone: 'PR5 — Polish & Safety'
  },
  {
    title: 'Developer docs & examples',
    body: `## Task Description

Comprehensive documentation for FLF2V integration setup and usage.

## Tasks

- [ ] \`docs/flf2v.md\` (envs, endpoint, \`/runpod-volume\`, B2 keys, cURL & Postman examples)
- [ ] API documentation with examples
- [ ] Troubleshooting guide

## Acceptance Criteria

- New contributor can run end-to-end in ≤10 minutes
- Clear setup instructions for all environments
- Working examples for all major endpoints

## Related Issues

Part of PR5 milestone for FLF2V integration.`,
    labels: ['area:docs', 'type:chore', 'priority:P2', 'size:S'],
    milestone: 'PR5 — Polish & Safety'
  },
  {
    title: 'CI tweaks',
    body: `## Task Description

Update CI/CD pipeline to support new FLF2V functionality.

## Tasks

- [ ] Add type-check/tests for new libs
- [ ] Lint config for new folders
- [ ] Build validation for new components

## Acceptance Criteria

- CI green and enforcing quality standards
- New code follows existing patterns
- Automated testing covers new functionality

## Related Issues

Part of PR5 milestone for FLF2V integration.`,
    labels: ['area:devops', 'type:chore', 'priority:P3', 'size:S'],
    milestone: 'PR5 — Polish & Safety'
  }
];

async function main() {
  // Validate environment
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: token });

  console.log('🚀 Starting FLF2V Integration Planning Bootstrap...\n');

  try {
    // Step 1: Create labels
    console.log('📋 Creating labels...');
    const createdLabels = [];
    
    for (const label of LABELS_TO_CREATE) {
      try {
        await octokit.rest.issues.createLabel({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          name: label.name,
          color: label.color,
          description: label.description
        });
        console.log(`  ✅ Created label: ${label.name}`);
        createdLabels.push(label.name);
      } catch (error) {
        if (error.status === 422) {
          console.log(`  ℹ️  Label already exists: ${label.name}`);
        } else {
          console.error(`  ❌ Failed to create label ${label.name}:`, error.message);
        }
      }
    }

    // Step 2: Create milestones
    console.log('\n🎯 Creating milestones...');
    const createdMilestones = new Map();
    
    for (const milestone of MILESTONES_TO_CREATE) {
      try {
        const response = await octokit.rest.issues.createMilestone({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          title: milestone.title,
          description: milestone.description,
          due_on: milestone.due_on
        });
        console.log(`  ✅ Created milestone: ${milestone.title}`);
        createdMilestones.set(milestone.title, response.data.number);
      } catch (error) {
        if (error.status === 422) {
          // Milestone might already exist, try to get it
          try {
            const existingMilestones = await octokit.rest.issues.listMilestones({
              owner: REPO_OWNER,
              repo: REPO_NAME
            });
            const existing = existingMilestones.data.find(m => m.title === milestone.title);
            if (existing) {
              console.log(`  ℹ️  Milestone already exists: ${milestone.title}`);
              createdMilestones.set(milestone.title, existing.number);
            }
          } catch (getError) {
            console.error(`  ❌ Failed to create/get milestone ${milestone.title}:`, error.message);
          }
        } else {
          console.error(`  ❌ Failed to create milestone ${milestone.title}:`, error.message);
        }
      }
    }

    // Step 3: Create issues
    console.log('\n📝 Creating issues...');
    const createdIssues = [];
    
    for (const issue of ISSUES_TO_CREATE) {
      try {
        const milestoneNumber = createdMilestones.get(issue.milestone);
        
        const response = await octokit.rest.issues.create({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          title: issue.title,
          body: issue.body,
          labels: issue.labels,
          milestone: milestoneNumber
        });
        
        console.log(`  ✅ Created issue #${response.data.number}: ${issue.title}`);
        createdIssues.push({
          number: response.data.number,
          title: issue.title,
          url: response.data.html_url,
          milestone: issue.milestone
        });
      } catch (error) {
        console.error(`  ❌ Failed to create issue "${issue.title}":`, error.message);
      }
    }

    // Step 4: Comment on meta issue with summary
    console.log('\n💬 Adding summary comment to meta issue...');
    
    const summaryComment = `## 🎉 FLF2V Integration Planning Bootstrap Complete!

I've successfully auto-generated all the required GitHub artifacts for the FLF2V cloud mode implementation:

### 📋 Labels Created
${LABELS_TO_CREATE.map(l => `- \`${l.name}\``).join('\n')}

### 🎯 Milestones Created
${MILESTONES_TO_CREATE.map(m => `- **${m.title}** (due: ${m.due_on.split('T')[0]})`).join('\n')}

### 📝 Issues Created by Milestone

${Object.entries(
  createdIssues.reduce((acc, issue) => {
    if (!acc[issue.milestone]) acc[issue.milestone] = [];
    acc[issue.milestone].push(issue);
    return acc;
  }, {})
).map(([milestone, issues]) => 
  `#### ${milestone}\n${issues.map(issue => `- #${issue.number}: [${issue.title}](${issue.url})`).join('\n')}`
).join('\n\n')}

### 📊 Summary
- **Labels**: ${LABELS_TO_CREATE.length} created/verified
- **Milestones**: ${MILESTONES_TO_CREATE.length} created with due dates
- **Issues**: ${createdIssues.length} created and assigned to milestones
- **Total Scope**: Comprehensive FLF2V cloud mode implementation

All issues have been created and assigned to milestones with detailed task breakdowns and acceptance criteria. The planning is now ready for implementation across the **media-labs** monorepo.

🚀 **Next Steps**: Development teams can now pick up issues from the milestones and begin implementation of the FLF2V cloud mode integration!`;

    try {
      await octokit.rest.issues.createComment({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        issue_number: META_ISSUE_NUMBER,
        body: summaryComment
      });
      console.log(`  ✅ Added summary comment to issue #${META_ISSUE_NUMBER}`);
    } catch (error) {
      console.error(`  ❌ Failed to add comment to meta issue:`, error.message);
    }

    console.log('\n🎉 FLF2V Integration Planning Bootstrap completed successfully!');
    console.log(`\n📈 Results Summary:`);
    console.log(`   - Labels: ${createdLabels.length}/${LABELS_TO_CREATE.length} created`);
    console.log(`   - Milestones: ${createdMilestones.size}/${MILESTONES_TO_CREATE.length} created`);
    console.log(`   - Issues: ${createdIssues.length}/${ISSUES_TO_CREATE.length} created`);
    console.log(`\n🔗 View progress at: https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/${META_ISSUE_NUMBER}`);

  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };