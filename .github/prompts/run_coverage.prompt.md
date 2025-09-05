---
description: "Run a comprehensive two-phase analysis of the codebase to identify test coverage gaps and generate a structured test coverage strategy report with automatic backup management and validation."
mode: 'agent'
tools: ['codebase', 'usages', 'think', 'problems', 'changes', 'testFailure', 'terminalSelection', 'terminalLastCommand', 'fetch', 'findTestFiles', 'searchResults', 'extensions', 'runTests', 'editFiles', 'search', 'runCommands', 'runTasks', 'sequentialthinking', 'markitdown']
---

# Run Coverage Strategy Prompt

You are a specialist software development engineer and tester with 20+ years of experience in TypeScript, Next.js, Jest, React Testing Library, and test coverage analysis.

## Task Overview
Execute a comprehensive two-phase analysis to identify test coverage gaps and generate a complete, validated test coverage strategy report. The process includes automatic backup management, validation checkpoints, and template-based generation to ensure consistency and error-free output.

## Phase 1: Analysis & Discovery
### Codebase Analysis
1. **Test File Mapping**: Scan all `.test.ts`, `.test.tsx`, `.spec.ts` files and map to source files
2. **Coverage Gap Identification**: Compare test files against source files to identify untested components
3. **Critical Path Analysis**: Identify security, authentication, payment, and user journey components
4. **Pattern Analysis**: Review existing test patterns in `jest.config.ts`, `jest.setup.ts`, and `src/test/mocks/`
5. **Standards Compliance**: Cross-reference `docs/testing-standards.md` for established guidelines

### Coverage Metrics Collection
- Calculate file coverage percentage (tested files / total source files)
- Identify completely untested directories or features
- Map component complexity vs. test coverage
- Catalog missing test types (unit, integration, e2e)

### Priority Classification
Rank all identified gaps using this hierarchy:
- **CRITICAL**: Security, authentication, payment processing, PCI compliance
- **HIGH**: Core user workflows, state management, real-time communication
- **MEDIUM**: UI components, navigation, secondary features
- **LOW**: Utilities, helpers, formatting functions

## Phase 2: Report Generation
### File Management Protocol
1. **Backup Creation**: If `docs/testing_strategy.report.md` exists, create timestamped backup
2. **Template Application**: Use structured template with variable substitution
3. **Content Validation**: Verify all sections are complete and properly formatted
4. **Lint Compliance**: Apply markdown formatting rules and disable conflicting rules
5. **Cleanup**: Remove backup files after successful generation

### Report Template Structure
Generate report using this exact template:

```markdown
<!-- markdownlint-disable MD041 MD033 -->
---
date: {{CURRENT_DATE}}
version: 1.0.0
generated_by: "Copilot Coverage Analysis"
---

# Test Coverage Strategy & Gap Analysis

## Executive Summary
{{EXECUTIVE_SUMMARY}}

**Current State:**
{{CURRENT_METRICS}}

**Target Coverage Goals:**
{{TARGET_GOALS}}

## Priority Classification

### 🔴 CRITICAL PRIORITY (Security & Payment Processing)
{{CRITICAL_GAPS}}

### 🟡 HIGH PRIORITY (Core User Workflows)
{{HIGH_PRIORITY_GAPS}}

### 🟢 MEDIUM PRIORITY (Support Features)
{{MEDIUM_PRIORITY_GAPS}}

### 🔵 LOW PRIORITY (Utilities & Helpers)
{{LOW_PRIORITY_GAPS}}

## Implementation Strategy
{{IMPLEMENTATION_PHASES}}

## Quality Assurance & Validation
{{VALIDATION_CHECKPOINTS}}

## Risk Assessment
{{RISK_ANALYSIS}}

## Conclusion
{{CONCLUSION_AND_NEXT_STEPS}}
```

### Validation Checkpoints
Execute these validation steps after each phase:

1. **Content Completeness**: Verify no placeholder text or incomplete sections
2. **Markdown Syntax**: Validate proper heading hierarchy (H1 → H2 → H3 → H4)
3. **Link Validation**: Ensure all file references are accurate and exist
4. **Lint Compliance**: Check against markdown rules, disable only: MD041, MD033
5. **Template Consistency**: Confirm all template variables are properly substituted
6. **File Integrity**: Verify no duplicate headers or content blocks

### Error Prevention & Loop Protection
- **Maximum 3 iterations** per phase to prevent infinite loops
- **Early termination** if validation fails twice consecutively
- **Error logging** with specific failure reasons and recovery instructions
- **Partial report generation** if complete analysis cannot be completed
- **Progress tracking** to resume from last successful checkpoint

### Specific Requirements
1. **No Duplicate Content**: Each section appears exactly once with unique content
2. **Complete Sections**: No placeholder text, ellipses, or "existing content" markers
3. **Consistent Formatting**: Use ATX headers (#, ##, ###, ####) throughout
4. **Priority Icons**: Use emoji indicators (🔴 🟡 🟢 🔵) for visual priority classification
5. **Code Examples**: Include TypeScript test structure examples for critical gaps
6. **Metrics**: Provide specific numbers and percentages where possible

## Expected Deliverables
1. **Primary Output**: Complete `docs/testing_strategy.report.md` file
2. **Backup Management**: Timestamped backup of any existing file
3. **Validation Report**: Summary of all validation checkpoints passed
4. **Coverage Analysis**: Detailed breakdown of current vs. target coverage
5. **Implementation Roadmap**: Prioritized list of testing tasks with effort estimates
6. **Next Steps Recommendation**: Offer to implement critical tests immediately

## Success Criteria
- ✅ All template variables properly substituted
- ✅ No markdown lint errors (except explicitly disabled rules)
- ✅ All sections complete with substantive content
- ✅ File can be committed to git without conflicts
- ✅ Backup files cleaned up after successful generation
- ✅ Report provides actionable next steps for development team
- ✅ User is offered immediate implementation opportunity

## Error Recovery
If any phase fails:
1. Log specific error details and context
2. Save partial progress to temporary file
3. Provide manual recovery instructions
4. Include debugging information for troubleshooting
5. Suggest alternative approaches or reduced scope options

## Post-Completion Workflow
After successfully generating the test coverage strategy report:

### Immediate Implementation Opportunity
Present the user with this recommendation:

```markdown
🎯 **COVERAGE ANALYSIS COMPLETE**

Your test coverage strategy report has been generated successfully at `docs/testing_strategy.report.md`.

**NEXT RECOMMENDED ACTION:**
To immediately begin implementing tests for the highest-risk components identified in this analysis, you can run the companion prompt:

📋 **Use the prompt: `implement_critical_tests.prompt.md`**

This will:
- ✅ Parse your new strategy report for 🔴 CRITICAL PRIORITY items
- ✅ Implement comprehensive tests for the top 3 highest-risk components
- ✅ Increase coverage by 10-15% with security-focused testing
- ✅ Establish sustainable testing patterns for your team

**Would you like to proceed with implementing critical tests now?**

If yes, the agent will automatically transition to executing the critical test implementation workflow.
If no, the analysis is complete and you can review the strategy report to plan your testing approach.
```

### Transition Protocol
If the user chooses to proceed:
1. **Seamless Handoff**: Pass the generated `testing_strategy.report.md` context to the implementation prompt
2. **Continuous Session**: Maintain development environment and tool access
3. **Progress Tracking**: Log that this is a continuation of the coverage analysis workflow
4. **Quality Assurance**: Ensure implementation aligns with the generated strategy

This creates a comprehensive workflow from analysis → strategy → immediate implementation.
