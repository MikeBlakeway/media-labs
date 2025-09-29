---
applyTo: 'docs/stories/*.md, workers/*/docs/stories/*.md'
description: 'Comprehensive story documentation requirements and templates'
---

# Story Documentation Standards

## Overview

This instruction file provides detailed templates, quality standards, and enforcement mechanisms for story documentation to ensure comprehensive work summaries and proper progress tracking throughout development sessions.

## Mandatory Documentation Structure

### **Core Story Components**

Every story document must maintain these sections with proper completion tracking:

#### **1. Acceptance Criteria**

- Clear, measurable success criteria for story completion
- Specific technical requirements and deliverables
- Integration requirements with existing systems
- Performance and quality benchmarks

#### **2. Progress Tracking Checklists**

**Session End Checklist:**

```markdown
- [ ] All completed work is marked with `[x]` in story checklists
- [ ] Comprehensive work summary added with all required sections
- [ ] All acceptance criteria explicitly addressed and confirmed complete
- [ ] All Definition of Done items verified and marked complete
- [ ] Agentic documents updated with new patterns
- [ ] Status clearly marked as **COMPLETE** ✅ with next phase identified
```

**Implementation Checklists:**

```markdown
### Inspect and modify

- [ ] [Specific implementation task 1]
- [ ] [Specific implementation task 2]
- [ ] [Integration task with existing systems]

### Tests

- [ ] Unit tests for [specific component]
- [ ] Integration tests for [specific workflow]
- [ ] Performance validation for [specific metrics]

### General

- [ ] Documentation updates for new patterns
- [ ] Code review and quality validation
- [ ] Deployment readiness verification
```

#### **3. Definition of Done**

- Comprehensive criteria that must be met for story closure
- Technical validation requirements
- Documentation completion requirements
- Integration validation requirements

### **Work Summary Requirements**

Every completed story **MUST** include a "Summary of Work Completed" section with all required subsections:

## Work Summary Template

````markdown
## Summary of Work Completed

### Overview

**[Story ID]: [Story Title] completed on [Date]**. [Brief 2-3 sentence summary of what was accomplished and its significance for the project.]

### [Primary Component] Implementation

[Detailed breakdown of the main component or feature implemented]

#### **[Sub-Component 1]** (`path/to/file.ext`)

- **[Capability 1]**: [Detailed description of what was implemented and how it works]
- **[Capability 2]**: [Technical details of implementation approach and key decisions]
- **[Capability 3]**: [Integration points and architectural considerations]

#### **[Sub-Component 2]** (`path/to/file.ext`)

- **[Feature 1]**: [Implementation details with specific technical information]
- **[Feature 2]**: [Key algorithms, data structures, or patterns used]
- **[Feature 3]**: [Error handling and edge case management]

### Key Implementation Highlights

#### **[Technical Achievement 1]**

```[language]
# Code example demonstrating key implementation
[actual working code snippet]
```
````

#### **[Technical Achievement 2]**

```[language]
# Another important code pattern or usage example
[actual working code snippet]
```

### Test Results / Validation

#### **Comprehensive Test Suite**

- **Unit Tests**: [X/Y] tests passing with [specific details about coverage and scope]
- **Integration Tests**: [Description of end-to-end validation and results]
- **Performance Benchmarks**: [Specific metrics and performance validation results]
- **Framework Validation**: [Description of validation scripts and their results]

#### **Test Coverage Breakdown**

- ✅ **[Component 1]**: [Specific test coverage and validation areas]
- ✅ **[Component 2]**: [Integration testing and validation results]
- ✅ **[Component 3]**: [Performance and reliability testing outcomes]

### Architectural Alignment

#### **Integration with Existing Systems**

- **[System 1] Integration**: [How new work integrates without breaking changes]
- **[Pattern] Compatibility**: [Adherence to established architectural patterns]
- **[Standard] Compliance**: [Compliance with project coding and quality standards]

#### **Design Pattern Compliance**

- **[Architecture Pattern]**: [How implementation supports established architectural approach]
- **[Integration Pattern]**: [How work enables future development phases]
- **[Quality Pattern]**: [How implementation maintains established quality standards]

### Foundation for Next Phases

#### **Ready for [Next Phase]**

- **[Enabler 1]**: [How this work enables the next development phase]
- **[Enabler 2]**: [New capabilities provided for future development]
- **[Enabler 3]**: [Integration points available for subsequent work]

#### **[Scalability Category] Features**

- **[Feature 1]**: [How implementation supports future scaling requirements]
- **[Feature 2]**: [Architectural decisions that enable growth and expansion]
- **[Feature 3]**: [Performance optimizations and resource management]

### Quality Metrics

#### **Code Quality Standards**

- **Test Coverage**: [X]% coverage across [scope] with [detailed breakdown]
- **Documentation**: [Status and completeness of technical documentation]
- **Error Handling**: [Comprehensive error management implementation details]
- **Performance**: [Specific performance metrics and benchmarks achieved]

#### **Standards Compliance**

- **[Standard 1]**: [Compliance with specific project or industry standards]
- **[Standard 2]**: [Adherence to established patterns and conventions]
- **[Standard 3]**: [Integration with project quality and monitoring systems]

### Deliverables Summary

#### **Production-Ready Components**

- ✅ **[Component 1]**: [Complete implementation with key capabilities]
- ✅ **[Component 2]**: [Full feature set with integration points]
- ✅ **[Component 3]**: [Testing and validation framework]

#### **Testing and Validation**

- ✅ **[Test Category 1]**: [Comprehensive test coverage and validation]
- ✅ **[Test Category 2]**: [Performance and reliability testing]
- ✅ **[Test Category 3]**: [Integration and end-to-end validation]

#### **Documentation and Standards**

- ✅ **[Doc Category 1]**: [Technical documentation and usage guides]
- ✅ **[Doc Category 2]**: [Integration patterns and architectural notes]
- ✅ **[Doc Category 3]**: [Quality standards and operational procedures]

**Status**: **COMPLETE** ✅
**Next Phase**: **[Next Story/Phase]** - [Clear description of follow-up work enabled]
**Foundation Quality**: **[Assessment]** with [brief quality summary and readiness assessment]

````

## Quality Standards

### **Technical Specificity Requirements**

#### **Implementation Details Must Include:**
- Specific file names and paths for all modified/created files
- Function names, class names, and method signatures for key implementations
- Algorithm descriptions and data structure choices
- Integration points with existing systems and components
- Error handling approaches and edge case management

#### **Quantitative Metrics Must Include:**
- Exact test result counts (e.g., "25/29 tests passing")
- Performance benchmarks with specific numbers
- Test coverage percentages with scope definition
- Memory usage, timing, or resource consumption metrics
- Line counts, file counts, or other measurable deliverables

### **Integration Context Requirements**

#### **Architectural Alignment Must Address:**
- How new work fits into established project architecture
- Compatibility with existing patterns and conventions
- Breaking changes avoided and migration strategies
- Future extensibility and scaling considerations
- Dependencies and integration points with other components

#### **Future Readiness Must Detail:**
- What specific capabilities are enabled for next phases
- How the foundation supports upcoming development work
- Integration points available for future components
- Scalability features and performance optimizations
- Extension points and customization capabilities

### **Documentation Completeness Standards**

#### **Work Summary Must Be:**
- **Comprehensive**: All major work areas covered with sufficient detail
- **Specific**: Technical details actionable for future developers
- **Quantified**: Metrics and measurements provided where applicable
- **Integrated**: Clear connections to existing architecture and future work
- **Validated**: Test results and quality metrics demonstrate completion

#### **Progress Tracking Must Show:**
- All checklist items marked `[x]` when completed
- Real-time updates throughout development session
- Clear correlation between checklist items and work summary
- Explicit confirmation of all Definition of Done criteria
- Current status and next phase identification

## Enforcement Mechanisms

### **Quality Gates**

#### **Pre-Session Validation**
```markdown
Before starting work, verify:
- [ ] Story document structure includes all required sections
- [ ] Acceptance criteria are clear and measurable
- [ ] Definition of Done criteria are comprehensive
- [ ] Progress tracking checklists are properly structured
````

#### **Session Progress Validation**

```markdown
During work sessions, continuously:

- [ ] Update checklist items as work is completed
- [ ] Document new patterns in agentic documentation
- [ ] Maintain story document currency with progress
- [ ] Prepare work summary sections incrementally
```

#### **Session End Validation**

```markdown
Before session completion, verify:

- [ ] All work summary sections are complete and detailed
- [ ] All checklist items are properly marked
- [ ] All acceptance criteria have been met and documented
- [ ] All Definition of Done criteria are satisfied
- [ ] Status is clearly marked and next phase identified
```

### **Violation Recovery Procedures**

#### **Incomplete Work Summary**

```markdown
If work summary is missing or incomplete:

1. STOP - Session cannot end until summary is complete
2. Review all work completed during session
3. Document each component with required detail level
4. Include all required sections with proper formatting
5. Validate completeness against template requirements
```

#### **Missing Progress Updates**

```markdown
If checklist items are not updated:

1. STOP - Review all completed work
2. Mark all completed items with `[x]`
3. Ensure correlation between checklist and work summary
4. Validate all acceptance criteria are addressed
5. Resume work only after documentation is current
```

#### **Insufficient Technical Detail**

```markdown
If work summary lacks required specificity:

1. Add specific file names, functions, and technical details
2. Include quantitative metrics and test results
3. Provide architectural context and integration information
4. Detail future readiness and next phase enablement
5. Validate against quality standards before proceeding
```

## Validation Checklist

### **Story Completion Validation**

```markdown
A story is properly completed when:

- [ ] All acceptance criteria are explicitly addressed and confirmed
- [ ] All Definition of Done criteria are satisfied and documented
- [ ] All checklist items are marked `[x]` with proper completion
- [ ] Work summary includes all required sections with sufficient detail
- [ ] Technical details are specific and actionable for future work
- [ ] Test results and quality metrics demonstrate completion
- [ ] Architectural alignment and integration context is provided
- [ ] Foundation for next phases is clearly established
- [ ] Status is marked **COMPLETE** ✅ with next phase identified
- [ ] Agentic documentation has been updated with new patterns
```

### **Documentation Quality Validation**

```markdown
Documentation meets standards when:

- [ ] Technical implementation details are comprehensive and specific
- [ ] Code examples are actual working code from the implementation
- [ ] Quantitative metrics are provided with specific numbers
- [ ] Integration context explains architectural fit and future readiness
- [ ] All file paths, function names, and technical references are accurate
- [ ] Test results demonstrate comprehensive validation of functionality
- [ ] Quality metrics show compliance with established standards
- [ ] Future readiness section enables clear next phase planning
```

This comprehensive template and standards framework ensures consistent, high-quality story documentation that provides proper progress tracking, technical detail, and foundation for continued development work.
