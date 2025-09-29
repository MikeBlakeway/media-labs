---
applyTo: 'AGENTS.md, .github/copilot-instructions.md, workers/*/AGENTS.md'
description: 'Comprehensive guidelines for maintaining agentic worker documentation'
---

# Agentic Documentation Maintenance Instructions

## Overview

This instruction file provides systematic guidance for maintaining project documentation that guides AI agents, ensuring consistency, accuracy, and current project state representation across all agentic documents.

## Documentation Hierarchy

### **Primary Agentic Documents**

- **`.github/copilot-instructions.md`** - Master AI agent guidance for entire project
- **`AGENTS.md`** - Project-level AI agent guide with architecture and workflows
- **`workers/*/AGENTS.md`** - Worker-specific AI agent guidance for specialized components

### **Supporting Documentation**

- **`.github/instructions/*.instructions.md`** - Specific instruction files for targeted tasks
- **`.github/chatmodes/*.chatmode.md`** - Specialized chatmodes for process enforcement
- **`docs/stories/*.story.md`** - Story-specific requirements and progress tracking

## When to Update Agentic Documentation

### **Mandatory Update Triggers**

#### **Every Story Completion**

- New implementation patterns established
- Architecture changes or component additions
- Quality standards updated or refined
- Integration points added or modified
- Technology versions changed

#### **Code Pattern Changes**

- New error handling patterns implemented
- Updated configuration management approaches
- Modified API route structures or conventions
- Enhanced testing patterns or standards
- New deployment or build processes

#### **Project Structure Updates**

- Directory structure changes
- New file organization patterns
- Updated naming conventions
- Modified dependency management
- Changed environment variable patterns

## What to Update

### **Implementation Patterns**

#### **Code Patterns and Conventions**

```markdown
Update with new:

- Function naming conventions
- Error handling patterns
- Configuration management approaches
- API route structures
- Testing methodologies
- Deployment procedures
```

#### **Architecture Updates**

```markdown
Document changes to:

- Component relationships and boundaries
- Data flow patterns
- Integration points and interfaces
- Performance optimization approaches
- Security implementation patterns
- Scalability considerations
```

### **Quality Standards**

#### **Testing Requirements**

```markdown
Update standards for:

- Unit test coverage expectations
- Integration testing patterns
- Performance benchmark requirements
- Error condition validation
- Documentation testing approaches
```

#### **Code Quality Metrics**

```markdown
Maintain current standards for:

- Code review requirements
- Performance benchmarks
- Security compliance patterns
- Documentation completeness
- Error handling coverage
```

### **Integration Requirements**

#### **System Integration Points**

```markdown
Document updates to:

- API integration patterns
- Database interaction approaches
- External service integrations
- Worker communication protocols
- Event handling mechanisms
```

#### **Development Workflow Integration**

```markdown
Update procedures for:

- Build and deployment processes
- Testing and validation workflows
- Code review and approval processes
- Documentation maintenance procedures
- Release management protocols
```

## How to Update Documentation

### **Step-by-Step Process**

#### **1. Identify Documentation Scope**

```bash
# Determine which documents need updates based on changes:
- Project-wide changes → .github/copilot-instructions.md + AGENTS.md
- Worker-specific changes → workers/*/AGENTS.md
- Process changes → .github/instructions/*.instructions.md
- Specialized workflows → .github/chatmodes/*.chatmode.md
```

#### **2. Update Primary Documents**

**For .github/copilot-instructions.md:**

```markdown
Update sections:

- Architecture Overview (if structure changed)
- Technology Version Detection (if versions updated)
- Code Quality Standards (if standards modified)
- Error Handling Patterns (if patterns changed)
- Project conventions & strict rules (if rules updated)
```

**For AGENTS.md:**

```markdown
Update sections:

- Development Workflows (if processes changed)
- Key Design Patterns (if patterns updated)
- Common Tasks for AI Agents (if procedures modified)
- Testing Strategy (if approaches changed)
- Troubleshooting Guide (if solutions updated)
```

**For workers/\*/AGENTS.md:**

```markdown
Update sections:

- Worker-specific implementation patterns
- Integration requirements and protocols
- Quality standards and testing approaches
- Current status and phase information
- Specialized development workflows
```

#### **3. Cross-Reference Validation**

**Ensure Consistency Across Documents:**

```markdown
Verify alignment between:

- Architecture descriptions across all documents
- Code pattern examples and naming conventions
- Quality standards and testing requirements
- Integration points and communication protocols
- Current project status and phase information
```

#### **4. Update Supporting Documentation**

**Instruction Files (.github/instructions/):**

```markdown
Update when:

- New step-by-step procedures are established
- Quality requirements are modified
- Integration patterns change
- Validation criteria are updated
```

**Chatmode Files (.github/chatmodes/):**

```markdown
Update when:

- Process enforcement requirements change
- New specialized workflows are needed
- Quality gates are modified
- Violation recovery procedures are updated
```

### **Documentation Quality Standards**

#### **Accuracy Requirements**

- All examples must reflect current codebase patterns
- Version numbers must match actual project dependencies
- File paths and structure must be current and accurate
- Code snippets must compile and follow established patterns

#### **Completeness Requirements**

- New patterns must be documented when established
- Deprecated patterns must be removed or marked as such
- Integration points must include all required context
- Error handling must cover all known scenarios

#### **Consistency Requirements**

- Terminology must be consistent across all documents
- Code examples must follow the same style and conventions
- Architecture descriptions must align across documents
- Process descriptions must match actual workflows

## Maintenance Workflow

### **Regular Maintenance Schedule**

#### **Per Story Completion**

1. Review changes made during story implementation
2. Identify new patterns or updated approaches
3. Update relevant agentic documentation sections
4. Validate consistency across all documents
5. Test documentation accuracy with examples

#### **Weekly Review**

1. Scan for accumulated small changes not captured per-story
2. Review cross-document consistency
3. Validate all code examples still work
4. Update technology version information if needed
5. Ensure all links and references are current

#### **Release Preparation**

1. Comprehensive review of all agentic documentation
2. Update architecture overviews with any structural changes
3. Validate all examples work with current codebase
4. Ensure version information is accurate
5. Cross-check all instruction files for completeness

### **Validation Procedures**

#### **Content Validation**

```bash
# Validate code examples
npm run lint # Check code style compliance
npm test     # Ensure examples work correctly

# Validate file references
find . -name "*.md" | xargs grep -n "src/" # Check file paths
find . -name "*.md" | xargs grep -n "workers/" # Check worker paths
```

#### **Consistency Validation**

```bash
# Check for terminology consistency
grep -r "ModelManager" docs/ .github/
grep -r "MemoryMonitor" docs/ .github/

# Validate architecture descriptions match
grep -A 10 -B 2 "Architecture" AGENTS.md .github/copilot-instructions.md
```

#### **Completeness Validation**

```markdown
Checklist for completeness:

- [ ] All new code patterns documented
- [ ] All integration points covered
- [ ] All quality standards specified
- [ ] All error handling patterns included
- [ ] All testing approaches documented
- [ ] All deployment procedures covered
```

## Common Update Scenarios

### **Adding New Components**

1. Update architecture overview in copilot-instructions.md
2. Add component-specific patterns to AGENTS.md
3. Update integration requirements in worker AGENTS.md
4. Create specific instructions if complex integration required
5. Update testing approaches for component validation

### **Changing Development Workflows**

1. Update workflow descriptions in AGENTS.md
2. Modify relevant instruction files in .github/instructions/
3. Update chatmode requirements if process changes affect enforcement
4. Validate cross-document consistency of workflow descriptions
5. Update troubleshooting guides with new workflow scenarios

### **Technology Updates**

1. Update version detection in copilot-instructions.md
2. Modify dependency management patterns in AGENTS.md
3. Update build and deployment procedures
4. Validate all code examples work with new versions
5. Update performance benchmarks if technology changes affect them

## Quality Assurance

### **Documentation Review Checklist**

- [ ] All code examples tested and working
- [ ] File paths and references validated as current
- [ ] Architecture descriptions consistent across documents
- [ ] New patterns documented with examples
- [ ] Deprecated patterns removed or marked obsolete
- [ ] Cross-references between documents validated
- [ ] Terminology consistent throughout all documents

### **Process Integration**

- Documentation updates must be completed before story closure
- New patterns must be documented when established during development
- Quality gates include documentation consistency validation
- Cross-document alignment is verified during reviews

This systematic approach ensures agentic documentation remains accurate, current, and effective for guiding AI agent behavior throughout project evolution.
