# Story Management Chatmode

## Overview

This chatmode enforces mandatory story documentation and agentic maintenanc3. **Test Implementation and Results**: Comprehensive test coverage, TDD process, and execution results
4. **Test Results / Validation**: Detailed test results, coverage metrics, and validation outcomes
5. **Architectural Alignment**: Integration with existing systems and patterns
6. **Foundation for Next Phases**: What this enables for subsequent work
7. **Quality Metrics**: Coverage, standards compliance, test metrics, and deliverables
8. **Deliverables Summary**: Final checklist of all completed items including test suite
9. **Status**: Clear completion status and next phase identificationesses to prevent critical documentation violations that have occurred multiple times in development sessions.

## Required Instruction Files

**MANDATORY REFERENCE**: When this chatmode is active, AI agents MUST consult these instruction files:

### **📚 Story Documentation Instructions**
**File**: `.github/instructions/story-documentation.instructions.md`
**Purpose**: Comprehensive templates, quality standards, and enforcement mechanisms for story work summaries
**Usage**: Reference for proper story documentation structure, technical specificity requirements, and validation checklists

### **🔧 Agentic Maintenance Instructions**
**File**: `.github/instructions/agentic-maintenance.instructions.md`
**Purpose**: Step-by-step guidance for maintaining AGENTS.md and copilot-instructions.md
**Usage**: Reference for when and how to update agentic documentation with new patterns and requirements

## Activation Criteria

**MANDATORY ACTIVATION** when working on:
- Any file in `docs/stories/*.md`
- Any file in `workers/*/docs/stories/*.md`
- Tasks involving story completion or progress tracking
- Updates to agentic documentation (`AGENTS.md`, `.github/copilot-instructions.md`)

## Mandatory Reading Requirements

**BEFORE STARTING ANY WORK**, AI agents MUST read these instruction files:

### 📚 Story Documentation Instructions
```
READ FILE: .github/instructions/story-documentation.instructions.md
SECTIONS TO FOCUS ON:
- "Work Summary Template" (complete template structure)
- "Quality Standards" (technical specificity requirements)
- "Enforcement Mechanisms" (validation procedures)
```

### 🔧 Agentic Maintenance Instructions
```
READ FILE: .github/instructions/agentic-maintenance.instructions.md
SECTIONS TO FOCUS ON:
- "What to Update" (triggers for documentation updates)
- "How to Update Documentation" (step-by-step procedures)
- "Validation Procedures" (consistency checking)
```

**⚠️ CRITICAL**: These files contain the detailed procedures and templates. This chatmode provides overview - the instruction files provide implementation details.

## Critical Process Requirements

### 🧪 TEST DRIVEN DEVELOPMENT (TDD) REQUIREMENTS

**MANDATORY TDD APPROACH** for all story work:

#### **Test-First Implementation Process**
1. **Requirements Analysis**: Convert all acceptance criteria into testable scenarios
2. **Test Case Design**: Write comprehensive test cases including edge cases and error conditions
3. **Test Implementation**: Implement all tests BEFORE writing production code
4. **Red-Green-Refactor**: Follow TDD cycle (failing tests → minimal implementation → refactor)
5. **Test Validation**: All tests must pass before story completion

#### **Test Coverage Standards**
- **Functional Coverage**: Every acceptance criterion must have corresponding test cases
- **Edge Case Coverage**: Include boundary conditions, error scenarios, and invalid inputs
- **Integration Coverage**: Test component interactions and system integration points
- **Performance Coverage**: Include performance and resource usage validation where applicable

#### **Test Execution Requirements**
- **Passing Tests**: All tests must pass before story can be marked complete
- **Environmental Exceptions**: Document any tests that cannot run due to environmental limitations (GPU access, external dependencies)
- **Test Documentation**: Include test results and coverage metrics in work summary

### 🚨 NON-NEGOTIABLE REQUIREMENTS

These requirements are **ABSOLUTELY MANDATORY** and violations are considered critical process failures:

#### **Pre-Session Checklist** - COMPLETE BEFORE STARTING WORK
- [ ] Read and understand the complete story document including all acceptance criteria
- [ ] **Convert all acceptance criteria into testable scenarios and edge cases**
- [ ] **Plan test implementation strategy using Test Driven Development approach**
- [ ] Identify all checklist items that will be addressed in this session
- [ ] Commit to updating documentation throughout the session (not just at the end)
- [ ] Plan the comprehensive work summary structure required at session end
- [ ] Verify understanding of all Definition of Done criteria

#### **During Session Requirements** - CONTINUOUS COMPLIANCE
- **Test Driven Development**: Write tests BEFORE implementing functionality for all requirements
- **Test Coverage**: Convert all acceptance criteria and edge cases into comprehensive test cases
- **Story Progress Tracking**: Update checklist items from `[ ]` to `[x]` as work is completed
- **Real-time Documentation**: Update agentic documentation with new patterns as they emerge
- **Context Maintenance**: Keep story document current with progress throughout session
- **Violation Prevention**: Stop work immediately if process requirements are being skipped

#### **Session End Checklist** - COMPLETE BEFORE ENDING SESSION
- [ ] All completed work is marked with `[x]` in story checklists
- [ ] Comprehensive work summary added with all required sections
- [ ] All acceptance criteria explicitly addressed and confirmed complete
- [ ] All Definition of Done items verified and marked complete
- [ ] **All tests implemented and passing** (except where environmental limitations prevent execution)
- [ ] **Test coverage validates all requirements and edge cases**
- [ ] Agentic documents updated with new patterns
- [ ] Status clearly marked as **COMPLETE** ✅ with next phase identified

### 📋 Work Summary Structure Requirements

Every story must include a comprehensive "Summary of Work Completed" section with:

#### **Mandatory Sections**
**📚 REFER TO**: `.github/instructions/story-documentation.instructions.md` for complete templates

1. **Overview**: Brief summary of story completion and date
2. **Implementation Details**: Detailed breakdown of each major component
3. **Key Implementation Highlights**: Important technical details and achievements
4. **Test Results / Validation**: Comprehensive test results and verification
5. **Architectural Alignment**: Integration with existing systems and patterns
6. **Foundation for Next Phases**: What this enables for subsequent work
7. **Quality Metrics**: Coverage, standards compliance, deliverables
8. **Deliverables Summary**: Final checklist of all completed items
9. **Status**: Clear completion status and next phase identification

#### **Quality Standards**
**📚 REFER TO**: `.github/instructions/story-documentation.instructions.md` Section: "Quality Standards" for detailed requirements

- **Technical Specificity**: Include specific file names, functions, and implementation details
- **Test Coverage Documentation**: Document all test cases implemented, TDD process followed, and test results
- **Quantitative Metrics**: Provide test results, coverage percentages, performance numbers, pass/fail counts
- **Edge Case Coverage**: Detail boundary conditions and error scenarios tested
- **Environmental Limitations**: Document any tests that cannot run due to environmental constraints
- **Integration Context**: Explain how work fits into existing architecture
- **Future Readiness**: Detail what this enables for next development phases

### 🔄 Agentic Documentation Maintenance

**MANDATORY UPDATES** for every story completion:
**🔧 REFER TO**: `.github/instructions/agentic-maintenance.instructions.md` for step-by-step procedures

#### **AGENTS.md Files**
**🔧 REFER TO**: Section "What to Update" → "Implementation Patterns" and "Quality Standards"
- Add new implementation patterns and development workflows
- Update quality standards and integration points
- Document new rules for AI agents as patterns emerge
- Keep current status and phase information up to date

#### **Copilot-Instructions.md**
**🔧 REFER TO**: Section "How to Update Documentation" → "Update Primary Documents"
- Update architecture overviews when new components are added
- Add new code patterns and conventions as they are established
- Update technology versions and dependencies when changed
- Maintain current project structure and file organization patterns

#### **Documentation Consistency**
**🔧 REFER TO**: Section "Cross-Reference Validation" for validation procedures
- Ensure all agentic documents are synchronized with current project state
- Cross-reference between documents for consistency
- Update examples and code snippets to reflect current implementation
- Maintain alignment between worker-specific and project-wide guidance

## Process Violation Recovery

### 🚨 IMMEDIATE ACTION REQUIRED

If any process requirement is missed:

#### **Story Checklist Not Updated**
- **STOP ALL WORK** immediately
- Update checklist items to reflect current progress
- Resume work only after documentation is current
- **📚 REFER TO**: `.github/instructions/story-documentation.instructions.md` Section "Violation Recovery Procedures"

#### **Tests Not Implemented or Failing**
- **STOP ALL WORK** if TDD process is not being followed
- All acceptance criteria must have corresponding test cases
- All tests must pass before story completion (except environmental limitations)
- **📚 REFER TO**: `.github/instructions/story-documentation.instructions.md` Section "Test Coverage Requirements"

#### **Work Summary Missing at Session End**
- **SESSION CANNOT END** until comprehensive summary is added
- All required sections must be complete and detailed including test results
- No exceptions - this is non-negotiable
- **📚 REFER TO**: `.github/instructions/story-documentation.instructions.md` Section "Work Summary Template" for complete structure

#### **Agentic Documentation Not Updated**
- All new patterns **MUST BE DOCUMENTED** before session close
- Update relevant AGENTS.md and copilot-instructions.md files
- Ensure consistency across all agentic documentation
- **🔧 REFER TO**: `.github/instructions/agentic-maintenance.instructions.md` Section "Step-by-Step Process" for detailed procedures

#### **Process Improvement Required**
- Add explicit acknowledgment of process violation
- Document specific steps taken to prevent future violations
- Update process documentation if gaps are identified

## Enforcement Mechanisms

### **Automatic Triggers**
- Reference this chatmode at the start of every story session
- Include process checklist validation before beginning work
- Require explicit confirmation of work summary completion

### **Quality Gates**
- All checklist items must be marked complete before story closure
- Work summary must include all mandatory sections
- Agentic documentation must reflect current project state

### **Violation Detection**
- Process violations must be flagged immediately when detected
- Recovery procedures must be followed before continuing
- Documentation debt is not acceptable - it must be resolved in session

## Success Criteria

A story session is successfully completed when:

1. ✅ All story checklist items are marked `[x]`
2. ✅ **Test Driven Development process followed with all tests implemented**
3. ✅ **All tests passing (except documented environmental limitations)**
4. ✅ **Test coverage validates all acceptance criteria and edge cases**
5. ✅ Comprehensive work summary includes all required sections including test results
6. ✅ All Definition of Done criteria are satisfied
7. ✅ Agentic documentation is updated with new patterns
8. ✅ Story status is marked **COMPLETE** ✅
9. ✅ Next phase is clearly identified
10. ✅ No process violations remain unresolved

## Critical Reminder

**STORY DOCUMENTATION AND COMPREHENSIVE TESTING ARE AS IMPORTANT AS CODE IMPLEMENTATION**

Process requirements are not optional suggestions - they are mandatory standards that ensure:
- **Quality Assurance**: Comprehensive test coverage validates all functionality and edge cases
- **Reliability**: Test Driven Development approach ensures robust and maintainable code
- Project continuity and knowledge transfer
- Consistent quality and architectural alignment
- Effective AI agent guidance and rule enforcement
- Proper progress tracking and deliverable validation

**Failure to follow these requirements constitutes a critical process violation that must be corrected immediately.**

## Integration with Instruction Files

This chatmode is designed to work in conjunction with detailed instruction files:

### **Story Work Process**
1. **Activate this chatmode** at session start
2. **Read story-documentation.instructions.md** for templates and detailed requirements
3. **Follow the templates and quality standards** from the instruction file
4. **Reference agentic-maintenance.instructions.md** when updating documentation
5. **Validate completion** using checklists from both chatmode and instruction files

### **Documentation Update Process**
1. **Identify changes** requiring documentation updates (per agentic-maintenance.instructions.md)
2. **Follow step-by-step procedures** from agentic-maintenance.instructions.md
3. **Validate consistency** using procedures from agentic-maintenance.instructions.md
4. **Cross-reference** between instruction files for comprehensive coverage

**⚠️ KEY PRINCIPLE**: This chatmode provides **process enforcement**, the instruction files provide **implementation details**. Both are required for complete compliance.

---

*This chatmode was created in response to recurring documentation process violations to provide systematic enforcement of story management requirements. It integrates with comprehensive instruction files to provide complete process guidance.*