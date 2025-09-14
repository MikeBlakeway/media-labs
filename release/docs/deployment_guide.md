# 🚀 Deployment Platform Recommendations

## Platform Comparison for Next.js 15 + TypeScript

Based on your project requirements (Next.js 15, experimental/personal, solo dev), here are the recommended deployment platforms:

---

## 🌟 Recommended: Vercel (Perfect Match)

**Why it's perfect for your project:**

- ✅ **Next.js Native**: Built by the Next.js team
- ✅ **Zero Config**: Deploy with `git push`
- ✅ **Preview Deployments**: Every PR gets a preview URL
- ✅ **Edge Functions**: Perfect for your API routes
- ✅ **Free Tier**: Generous limits for personal projects

### Setup Process (Vercel)

1. Connect GitHub repository
2. Configure environment variables
3. Push to deploy automatically

### Environment Variables Needed

```bash
# Production Environment
RUNPOD_VOLUME_ID=your_volume_id
RUNPOD_S3_REGION=us-east-1
RUNPOD_S3_ENDPOINT=https://your-endpoint.runpod.io
RUNPOD_S3_ACCESS_KEY_ID=your_access_key
RUNPOD_S3_SECRET_ACCESS_KEY=your_secret_key

# Model Directory Mappings
RUNPOD_MODEL_DIR_UNET=diffusion_models
RUNPOD_MODEL_DIR_CLIP=clip
RUNPOD_MODEL_DIR_CLIP_VISION=clip_vision
RUNPOD_MODEL_DIR_VAE=vae
RUNPOD_MODEL_DIR_LORA=loras
RUNPOD_MODEL_DIR_CHECKPOINTS=checkpoints

# B2 Storage (for outputs)
BUCKET_ENDPOINT_URL=https://s3.us-west-004.backblazeb2.com
BUCKET_REGION=us-west-004
BUCKET_NAME=your-bucket-name
BUCKET_ACCESS_KEY_ID=your_b2_key_id
BUCKET_SECRET_ACCESS_KEY=your_b2_secret_key
```

### Deployment Configuration

Create `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NEXT_PUBLIC_APP_ENV": "production"
  }
}
```

**Pricing**: Free for personal projects (100GB bandwidth/month)

---

## 🥈 Alternative: Netlify

**Good for:**

- ✅ **Great Free Tier**: Generous limits
- ✅ **Form Handling**: Built-in form processing
- ✅ **Split Testing**: A/B testing features
- ✅ **Branch Deploys**: Each branch gets a URL

### Setup Process (Netlify)

1. Connect GitHub repository
2. Set build command: `npm run build`
3. Set publish directory: `.next`

**Pricing**: Free for personal projects (100GB bandwidth/month)

---

## 🥉 Alternative: Railway

**Good for:**

- ✅ **Database Hosting**: Built-in PostgreSQL/Redis
- ✅ **Full-Stack**: Great for backend-heavy apps
- ✅ **Docker Support**: Custom containers
- ✅ **Good Performance**: Fast deployments

### Setup Process

1. Connect GitHub repository
2. Configure build settings
3. Add environment variables

**Pricing**: $5/month minimum (usage-based)

---

## 🎯 Our Recommendation: Start with Vercel

### Why Vercel for Your Release Strategy?

1. **Perfect GitHub Integration**
   - Automatic deployments on push to `main`
   - Preview deployments for all PRs
   - Deployment status in GitHub

2. **Release Strategy Alignment**
   - `main` branch → Production
   - `development` branch → Staging (preview)
   - `feature/*` branches → Feature previews
   - `release/*` branches → Release testing

3. **Zero Configuration Required**
   - Works out of the box with Next.js 15
   - Handles TypeScript compilation
   - Optimizes for performance automatically

---

## 🔧 Integration with Your CI/CD Pipeline

### GitHub Actions + Vercel Integration

Add to your workflow (optional, Vercel auto-deploys):

```yaml
- name: Deploy to Vercel
  if: github.ref == 'refs/heads/main'
  run: |
    echo "🚀 Deployment will happen automatically via Vercel GitHub integration"
    echo "✅ Production URL: https://media-labs.vercel.app"

- name: Comment PR with Preview URL
  if: github.event_name == 'pull_request'
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: '🚀 Preview deployment will be available at: https://media-labs-git-${{ github.head_ref }}-mikeblakeway.vercel.app'
      })
```

### Branch → Environment Mapping

| Branch Type   | Vercel Environment | Purpose                   |
| ------------- | ------------------ | ------------------------- |
| `main`        | Production         | Live application          |
| `development` | Preview            | Staging environment       |
| `release/*`   | Preview            | Release candidate testing |
| `feature/*`   | Preview            | Feature testing           |

---

## 📋 Deployment Checklist

### Initial Setup (One-time)

- [ ] Create Vercel account
- [ ] Connect GitHub repository
- [ ] Configure environment variables
- [ ] Set up custom domain (optional)
- [ ] Configure team settings

### Per-Release Process

- [ ] Merge to `main` triggers production deploy
- [ ] Monitor deployment status
- [ ] Verify production environment
- [ ] Test critical user paths
- [ ] Monitor for errors/issues

### Emergency Procedures

- [ ] **Rollback**: Redeploy previous version via Vercel dashboard
- [ ] **Hotfix**: Push fix to `main`, auto-deploys
- [ ] **Disable**: Pause deployments via settings

---

## 🎊 Next Steps

1. **Sign up for Vercel**: [vercel.com](https://vercel.com)
2. **Connect your repository**: GitHub integration
3. **Configure environments**: Add your environment variables
4. **Test deployment**: Push to `main` to trigger first deploy
5. **Set up monitoring**: Add error tracking (Sentry recommended)

**Estimated setup time**: 30 minutes
**Ongoing maintenance**: Minimal (mostly automatic)

---

## 💡 Pro Tips

- **Environment Secrets**: Use Vercel's environment variable encryption
- **Preview Comments**: Enable GitHub integration for automatic PR comments
- **Custom Domains**: Add your domain once you're ready for production
- **Analytics**: Enable Vercel Analytics for performance insights
- **Monitoring**: Set up Sentry or similar for error tracking
