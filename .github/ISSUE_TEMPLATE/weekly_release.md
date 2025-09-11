---
name: Weekly Release
about: Weekly release from development to main
title: '🚀 Weekly Release: [YYYY-wNN]'
labels: 'release, weekly'
assignees: ''
---

## 📅 Weekly Release - [DATE]

This PR contains the weekly release from `development` to `main`.

### 📦 What's Included

- Summary of major features added this week
- Bug fixes and improvements
- Performance optimizations
- Documentation updates

### 🔍 Pre-merge Checklist

- [ ] All CI checks passed ✅
- [ ] Manual testing completed on staging
- [ ] Release notes reviewed and approved
- [ ] No breaking changes (or properly documented)
- [ ] Deployment plan confirmed
- [ ] All team members notified

### 🧪 Testing Completed

- [ ] **Core Features**
  - [ ] Workflow upload and execution
  - [ ] File processing works correctly
  - [ ] Result display and download
  - [ ] Error handling functions properly
- [ ] **Integrations**
  - [ ] RunPod API calls successful
  - [ ] S3 storage operations work
  - [ ] Authentication flows tested
- [ ] **Performance**
  - [ ] Page load times acceptable
  - [ ] No memory leaks detected
  - [ ] File uploads/downloads smooth

### 🚀 Post-merge Actions

- [ ] Auto-versioning will trigger semantic-release
- [ ] Production deployment issue will be created automatically
- [ ] Release notes will be generated from conventional commits
- [ ] GitHub release will be published

### 📋 Deployment Plan

1. **Staging**: Already deployed and tested ✅
2. **Production**: Manual deployment after merge approval
3. **Monitoring**: 30-minute post-deploy monitoring period
4. **Rollback**: Standard revert procedure if issues arise

### 🆘 Rollback Plan

If issues are discovered post-deployment:

1. Assess severity and impact
2. Execute `git revert HEAD` on main branch
3. Monitor auto-deployment of rollback
4. Create hotfix branch for proper resolution
5. Document incident and lessons learned

---

**Ready for manual review and approval** ✅

**Reviewer**: @MikeBlakeway (even for solo dev - good practice!)  
**Estimated Deployment Time**: [TIME]  
**Next Release**: Friday, [NEXT_FRIDAY]