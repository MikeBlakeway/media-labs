# Story Documentation

This directory contains user story documentation for the Media Labs project. Each story represents a specific feature or improvement request.

## Stories Overview

| Story ID | Title                                         | Status       | Description                                                                                                                                   |
| -------- | --------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| ML-001   | Improve app theming (complete Dark Mode)      | ✅ Completed | Complete dark-mode theming across components, fix missing dark variant styles, improve contrast and component rendering.                      |
| ML-002   | Hide advanced settings on workflow pages      | ✅ Completed | Advanced workflow inputs now collapsed behind expandable section. Essential fields (prompts, uploads, size/length) remain visible by default. |
| ML-003   | Persist generated outputs across sessions     | 🔄 Pending   | Add database storage for generated outputs and B2 indexing to restore content across sessions.                                                |
| ML-004   | Add in-browser video playback for MP4 outputs | ✅ Completed | In-browser video player with full controls for previewing generated MP4 videos without downloading.                                           |
| ML-005   | Add stable layout with navbar and footer      | ✅ Completed | Consistent navigation with persistent header/navbar and footer across all pages for better user experience.                                   |

## ML-002 Implementation Summary

**Completed**: September 24, 2025

### Key Changes

1. **New Components Created**:

   - `CollapsibleSection.tsx` - Accessible collapsible section with ARIA support
   - `FieldSummaryBadge.tsx` - Shows count of modified advanced settings

2. **New Utilities**:

   - `field-categorization.ts` - Logic to separate essential vs advanced fields

3. **Updated Workflow Form**:

   - Modified `src/app/w/[slug]/page.tsx` to use field categorization
   - Essential fields (prompts, uploads, size/length) always visible
   - Advanced fields collapsed in expandable section with summary

4. **Testing**:
   - Unit tests for categorization logic
   - Integration test validates real workflow templates
   - 28% essential vs 73% advanced fields across 8 workflow templates

### UX Impact

- **Reduced Cognitive Load**: Only essential fields visible by default
- **Improved Scanning**: Critical inputs (prompts, uploads) easier to find
- **Preserved Functionality**: All advanced settings accessible via expansion
- **Visual Feedback**: Summary badge shows count of modified advanced settings

### Technical Details

The implementation uses CSS-based visibility toggling (not unmounting) to preserve form state when sections are collapsed/expanded. Field categorization is based on:

- **Essential**: File uploads, text prompts, size/length parameters
- **Advanced**: Model selections, sampling parameters, technical settings

Form validation and submission include all fields regardless of collapsed state.

## Story Template

When adding new stories, use the following structure:

```markdown
---
ContentId: ML-XXX
DateApproved: MM/DD/YYYY
MetaDescription: Brief description
---

# ML-XXX — Story Title

## Details

### Problem

### Impact

### Scope

## Acceptance criteria

## Checklist

## Definition of Done

## Notes & Implementation Hints
```

## Related Documentation

- [Main Project Documentation](../../README.md)
- [Agent Development Guide](../../AGENTS.md)
- [API Reference](../api/reference.md) (if exists)
- [Component Documentation](../components/README.md) (if exists)
