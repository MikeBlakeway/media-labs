# 📋 Release Day Checklist

**Release Date**: `{{ DATE }}`  
**Release Branch**: `release/{{ WEEK }}`  
**Target Version**: `{{ VERSION }}`

---

## 🌅 Morning Preparation (10:00 AM)

### 1. Create Release Branch
- [ ] Switch to `development` branch
- [ ] Pull latest changes: `git pull origin development`
- [ ] Create release branch: `git checkout -b release/2025-w{{ WEEK_NUMBER }}`
- [ ] Push release branch: `git push origin release/2025-w{{ WEEK_NUMBER }}`

### 2. Initial Verification
- [ ] GitHub Actions CI passes on release branch
- [ ] All tests are green
- [ ] Build completes successfully
- [ ] No security vulnerabilities detected

---

## 🔍 Testing Phase (11:00 AM - 1:00 PM)

### 3. Staging Deployment
- [ ] Release branch auto-deploys to staging
- [ ] Staging environment is accessible
- [ ] All features work as expected
- [ ] Performance is acceptable

### 4. Manual Testing Checklist
- [ ] **Core Features**
  - [ ] Workflow upload and execution
  - [ ] File processing (images/videos)
  - [ ] Result display and download
  - [ ] Error handling works correctly
- [ ] **UI/UX**
  - [ ] All pages load correctly
  - [ ] Responsive design works
  - [ ] No broken links or images
  - [ ] Forms validate properly
- [ ] **Performance**
  - [ ] Page load times < 3 seconds
  - [ ] No memory leaks in browser
  - [ ] File uploads work smoothly

### 5. Integration Testing
- [ ] **RunPod Integration**
  - [ ] Model preflight checks work
  - [ ] Job submission successful
  - [ ] Result polling functions correctly
- [ ] **S3 Storage**
  - [ ] File uploads to RunPod volume
  - [ ] File downloads from B2 storage
  - [ ] Proper error handling for storage issues

---

## 📝 Documentation Review (1:00 PM - 2:00 PM)

### 6. Change Documentation
- [ ] Review all commits since last release
- [ ] Verify changelog will be accurate
- [ ] Check that breaking changes are documented
- [ ] Update README if needed

### 7. Release Notes Preparation
- [ ] Review auto-generated release notes
- [ ] Add any manual notes for important changes
- [ ] Include migration instructions if needed
- [ ] Verify version number is correct

---

## 🚀 Release Execution (2:00 PM - 4:00 PM)

### 8. Create Release PR
- [ ] Create PR: `release/2025-w{{ WEEK_NUMBER }}` → `main`
- [ ] Use release PR template
- [ ] Add appropriate labels
- [ ] Request self-review (even for solo dev)

### 9. Final Review
- [ ] Review all changed files in PR
- [ ] Verify no sensitive data is included
- [ ] Check that all CI checks pass
- [ ] Confirm deployment plan

### 10. Merge and Deploy
- [ ] **Manual approval required** ✋
- [ ] Merge PR (squash merge preferred)
- [ ] Verify auto-tagging occurs
- [ ] Monitor GitHub Actions for release creation
- [ ] Check that changelog is updated

### 11. Production Deployment
- [ ] **Production deployment issue created automatically**
- [ ] Review deployment issue checklist
- [ ] Deploy to production platform
- [ ] Verify production deployment successful
- [ ] Test critical paths in production

---

## 🎯 Post-Release (4:00 PM onwards)

### 12. Monitoring
- [ ] Monitor application for 30 minutes post-deploy
- [ ] Check error logs/monitoring dashboards
- [ ] Verify no spike in errors
- [ ] Confirm performance metrics are normal

### 13. Communication
- [ ] Close deployment issue
- [ ] Update project status
- [ ] Document any issues encountered
- [ ] Plan any necessary follow-up work

### 14. Cleanup
- [ ] Delete merged release branch (auto-deleted)
- [ ] Update local repository: `git checkout main && git pull`
- [ ] Verify version tags are correct
- [ ] Archive any temporary files

---

## 🆘 Rollback Procedure (If Needed)

### Emergency Rollback
- [ ] Assess severity of issue
- [ ] Create revert commit: `git revert HEAD`
- [ ] Push revert: `git push origin main`
- [ ] Monitor auto-deployment of rollback
- [ ] Create hotfix branch for proper fix
- [ ] Document incident and lessons learned

---

## ✅ Release Completion

**Release completed successfully**: ___/___/___ at ___:___ ___  
**Final version**: v_____  
**Issues encountered**: ________________  
**Notes for next release**: ________________

---

**Next Release**: Friday, `{{ NEXT_FRIDAY }}`  
**Next Release Branch**: `release/{{ NEXT_WEEK }}`