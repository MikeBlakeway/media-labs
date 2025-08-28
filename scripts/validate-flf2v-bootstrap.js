#!/usr/bin/env node

/**
 * FLF2V Bootstrap Validation Script
 * 
 * Validates the structure and data for GitHub automation without API calls.
 * Run this to verify the bootstrap data before executing the main script.
 */

// Import the main script to access data structures
const path = require('path');
const fs = require('fs');

console.log('🔍 FLF2V Bootstrap Validation\n');

// Load the main script to validate data structures
const scriptPath = path.join(__dirname, 'github-bootstrap-flf2v.js');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Validate script structure
console.log('📋 Validating script structure...');

// Check for required constants
const requiredConstants = [
  'LABELS_TO_CREATE',
  'MILESTONES_TO_CREATE', 
  'ISSUES_TO_CREATE'
];

for (const constant of requiredConstants) {
  if (scriptContent.includes(`const ${constant}`)) {
    console.log(`  ✅ Found: ${constant}`);
  } else {
    console.log(`  ❌ Missing: ${constant}`);
  }
}

// Extract and validate data by evaluating safe portions
const dataExtracts = {
  labels: scriptContent.match(/const LABELS_TO_CREATE = \[([\s\S]*?)\];/)?.[1],
  milestones: scriptContent.match(/const MILESTONES_TO_CREATE = \[([\s\S]*?)\];/)?.[1],
  issues: scriptContent.match(/const ISSUES_TO_CREATE = \[([\s\S]*?)\];/)?.[1]
};

// Count items
const labelMatches = (dataExtracts.labels || '').match(/{\s*name:/g);
const labelCount = labelMatches ? labelMatches.length : 0;

const milestoneMatches = (dataExtracts.milestones || '').match(/{\s*title:/g);
const milestoneCount = milestoneMatches ? milestoneMatches.length : 0;

const issueMatches = (dataExtracts.issues || '').match(/{\s*title:/g);
const issueCount = issueMatches ? issueMatches.length : 0;

console.log('\n📊 Data validation summary:');
console.log(`  Labels to create: ${labelCount} (expected: 12)`);
console.log(`  Milestones to create: ${milestoneCount} (expected: 5)`);
console.log(`  Issues to create: ${issueCount} (expected: 15)`);

// Validate expected totals
const expectations = [
  { name: 'Labels', actual: labelCount, expected: 12 },
  { name: 'Milestones', actual: milestoneCount, expected: 5 },
  { name: 'Issues', actual: issueCount, expected: 15 }
];

console.log('\n✅ Validation results:');
let allValid = true;

for (const check of expectations) {
  if (check.actual === check.expected) {
    console.log(`  ✅ ${check.name}: ${check.actual}/${check.expected} ✓`);
  } else {
    console.log(`  ❌ ${check.name}: ${check.actual}/${check.expected} ✗`);
    allValid = false;
  }
}

console.log('\n🔧 Required environment:');
console.log('  - GITHUB_TOKEN: Personal access token with repo scope');
console.log('  - Repository: MikeBlakeway/media-labs');
console.log('  - Target: Issue #216 for summary comment');

console.log('\n📋 Next steps:');
if (allValid) {
  console.log('  ✅ Validation passed! Ready to execute bootstrap.');
  console.log('  📝 Run: GITHUB_TOKEN=<token> pnpm run bootstrap:flf2v');
} else {
  console.log('  ❌ Validation failed! Check script data structures.');
}

console.log('\n📚 Documentation: docs/flf2v-bootstrap.md');