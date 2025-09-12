# Branch Flow Validation

**Target Branch:** `{{ github.base_ref }}`
**Source Branch:** `{{ github.head_ref }}`

## Type of Change

- [ ] 🚀 **Feature** (`feature/*` → `development`)
- [ ] 🐛 **Hotfix** (`hotfix/*` → `main`) - Emergency fix
- [ ] 📦 **Release** (`release/vX.Y.Z` → `main`) - Semantic version release
- [ ] 🔧 **Chore** (`feature/*` → `development`) - Maintenance/refactor

## Pre-Merge Checklist

- [ ] Branch follows naming convention
- [ ] Target branch is correct per workflow
- [ ] All status checks are passing
- [ ] Documentation updated (if applicable)
- [ ] Breaking changes documented (if applicable)

## Workflow Validation

### ✅ **Valid Flows:**

- `feature/description` → `development`
<<<<<<< HEAD
- `release/2025-w37` → `main`
=======
- `release/v1.2.3` → `main`
>>>>>>> origin/main
- `hotfix/description` → `main`

### ❌ **Blocked Flows:**

- `development` → `main` (use release branch instead)
- `feature/*` → `main` (merge to development first)

## Description

<!-- Describe your changes in detail -->

## Testing

<!-- Describe how you tested these changes -->

- [ ] Unit tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Linting passes (`npm run lint`)

## Release Notes

<!-- Will this change appear in release notes? -->

- [ ] No user-facing changes
- [ ] Include in release notes (feature/fix)
- [ ] Breaking change (major version bump)

---

**📖 Workflow Reference:** [`release/docs/strategy.md`](release/docs/strategy.md)
**🛡️ Protection Guide:** [`release/docs/branch_enforcement.md`](release/docs/branch_enforcement.md)
