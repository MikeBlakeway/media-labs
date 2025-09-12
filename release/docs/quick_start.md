# 🚀 Quick Start: Your Release Strategy

## Welcome to Your New Release Workflow

This guide will get you up and running with your new **Weekly Release Strategy** in 30 minutes.

---

## 📋 Immediate Next Steps (30 minutes)

### Step 1: GitHub Repository Setup (10 minutes)

1. **Set up Branch Protection**

   - Go to **Settings** → **Branches** → **Add rule**
   - Follow instructions in [protection_guide.md](protection_guide.md)

2. **Install Dependencies**

   ```bash
   cd /Users/mike.blakeway/Development/personal-projects/media-labs
   npm install
   ```

3. **Test GitHub Actions**
   - Commit and push these new files
   - Watch the CI/CD pipeline run in **Actions** tab

### Step 2: Choose Deployment Platform (10 minutes)

**Recommended: Vercel** (follow [deployment_guide.md](deployment_guide.md))

1. **Sign up**: [vercel.com](https://vercel.com)
2. **Connect Repository**: Import from GitHub
3. **Add Environment Variables**: Copy from your local `.env.local`
4. **Deploy**: Push to `main` branch

### Step 3: Test Your First Release (10 minutes)

1. **Create a test feature**:

   ```bash
   git checkout development
   git checkout -b feature/test-release-strategy
   echo "# Test Release Strategy" > TEST_RELEASE.md
   git add .
   git commit -m "feat: add test file for release strategy"
   git push origin feature/test-release-strategy
   ```

2. **Create PR**: `feature/test-release-strategy` → `development`
3. **Watch**: CI/CD pipeline run and staging deployment
4. **Merge**: Complete your first automated workflow

---

## 📅 Your Weekly Schedule

### **Monday-Thursday**: Development Mode

- Work on `feature/*` branches
- Create PRs to `development`
- Test on staging/preview deployments

### **Friday at 10 AM**: Release Day

- Use [checklist.md](checklist.md)
- Create `release/2025-wXX` branch
- Test on staging
- Create PR to `main`
- Deploy to production

---

## 🛠️ Daily Workflow Commands

### Starting New Feature

```bash
git checkout development
git pull origin development
git checkout -b feature/awesome-feature
# ... make changes ...
git add .
git commit -m "feat: add awesome feature"
git push origin feature/awesome-feature
```

### Weekly Release (Fridays)

```bash
git checkout development
git pull origin development
git checkout -b release/2025-w$(date +%V)
git push origin release/2025-w$(date +%V)
# Create PR via GitHub UI
```

### Emergency Hotfix

```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix
# ... make fix ...
git add .
git commit -m "fix: resolve critical issue"
git push origin hotfix/critical-fix
# Create PR to main
```

---

## 🎯 Commit Message Format

Use **Conventional Commits** for automatic versioning:

```bash
feat: add new awesome feature        # minor version bump
fix: resolve critical bug            # patch version bump
perf: improve loading performance    # patch version bump
docs: update README                  # no version bump
style: fix formatting               # no version bump
refactor: cleanup code              # patch version bump
test: add unit tests                # no version bump
chore: update dependencies          # no version bump

# Breaking changes (major version bump)
feat!: redesign API endpoints
BREAKING CHANGE: API endpoints have changed
```

---

## 📊 Monitoring Your Success

### GitHub Actions Dashboard

- **Monitor**: Repository → **Actions** tab
- **Check**: All workflows should be green ✅
- **Review**: Failed builds immediately

### Weekly Release Health

- ✅ Releases deploy by Friday 4 PM
- ✅ Zero production breaking changes
- ✅ All tests passing before merge
- ✅ Changelog automatically generated

### Monthly Review Questions

1. Are we hitting our Friday release target?
2. How many hotfixes did we need? (target: <2/month)
3. Are CI builds consistently green?
4. Is the changelog accurately reflecting changes?

---

## 🆘 When Things Go Wrong

### Build Fails in CI

1. Check the **Actions** tab for error details
2. Fix the issue in your feature branch
3. Push the fix (CI will re-run automatically)

### Production Issue Discovered

1. Assess severity (is it breaking for users?)
2. If critical: Create hotfix branch from `main`
3. If minor: Add to next week's release

### Deployment Fails

1. Check deployment platform dashboard
2. Verify environment variables are set
3. Review logs for specific error messages
4. Roll back to previous version if needed

---

## 📚 Important Files Reference

| File                                              | Purpose                 | When to Use                |
| ------------------------------------------------- | ----------------------- | -------------------------- |
| [RELEASE_STRATEGY.md](strategy.md)                | Full strategy guide     | Understanding the workflow |
| [RELEASE_DAY_CHECKLIST.md](checklist.md)          | Friday release steps    | Every Friday               |
| [DEPLOYMENT_PLATFORMS.md](deployment_guide.md)    | Platform setup guide    | Initial setup              |
| [BRANCH_PROTECTION_GUIDE.md](protection_guide.md) | GitHub settings         | Initial setup              |
| `.github/workflows/ci-cd.yml`                     | GitHub Actions          | Automated CI/CD            |
| `.releaserc.json`                                 | Semantic release config | Automated versioning       |

---

## 🎉 You're Ready

Your release strategy is now set up and ready to go. Here's what happens automatically:

✅ **Every Push**: CI/CD runs tests and builds
✅ **Every PR**: Preview deployment created
✅ **Every Friday**: Weekly release process starts
✅ **Every Merge to Main**: Version tagged and deployed
✅ **Every Release**: Changelog generated automatically

---

## 💬 Questions or Issues?

- **GitHub Issues**: Use for bugs or feature requests
- **Release Problems**: Check [RELEASE_DAY_CHECKLIST.md](checklist.md)
- **Deployment Issues**: See [DEPLOYMENT_PLATFORMS.md](deployment_guide.md)

**Happy releasing!** 🚀
