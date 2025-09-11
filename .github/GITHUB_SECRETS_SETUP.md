# 🔐 GitHub Secrets Setup Guide

## Required GitHub Secrets for CI/CD Pipeline

Based on your `.env` file, here are the exact secrets you need to add to GitHub.

**Go to**: Repository → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

---

## ✅ Required Secrets (Must Have)

### RunPod API Configuration
```bash
RUNPOD_API_KEY=rpa_6KE5O9T8TJRDI11I5MZHC7WLW5FJKJV8Y5XYNMED13e36x
RUNPOD_ENDPOINT_ID=9x22egc7mtsd6z
```

### RunPod S3 Storage (Network Volume)
```bash
RUNPOD_S3_ENDPOINT=https://s3api-eu-ro-1.runpod.io
RUNPOD_S3_REGION=eu-ro-1
RUNPOD_VOLUME_ID=axqw0i289u
RUNPOD_S3_ACCESS_KEY_ID=user_2zMfU4MTJtnB8kk2nyelLeG8BhK
RUNPOD_S3_SECRET_ACCESS_KEY=rps_K1XKQ5N8CIN69I6SMRFWB30QLI4X0U3LO75K2MBMrzwgz5
```

### RunPod Model Configuration
```bash
RUNPOD_MODELS_PREFIX=models
RUNPOD_MODEL_DIR_UNET=unet
RUNPOD_MODEL_DIR_CLIP=clip
RUNPOD_MODEL_DIR_CLIP_VISION=clip_vision
RUNPOD_MODEL_DIR_VAE=vae
RUNPOD_MODEL_DIR_LORA=loras
RUNPOD_MODEL_DIR_CHECKPOINTS=checkpoints
```

---

## 🔧 Optional Secrets (From Your .env)

### Backblaze B2 Storage
```bash
B2_S3_ENDPOINT=s3.eu-central-003.backblazeb2.com
B2_S3_REGION=eu-central-003
B2_S3_BUCKET=media-labs
B2_S3_ACCESS_KEY_ID=003b8e2a77ab1dd0000000001
B2_S3_SECRET_ACCESS_KEY=K003+rMm5Ba8ghscztn6w//RwBjPm9Y
```

### Development Configuration
```bash
USE_LOCAL_WORKER=false
LOCAL_WORKER_URL=http://localhost:8000
```

### GitHub Token (if needed for releases)
```bash
GITHUB_TOKEN=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
```

---

## 📋 Quick Setup Instructions

### Step 1: Copy Values from Your .env
Your `.env` file contains all the values you need. For each variable above:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. **Name**: Use the exact variable name (e.g., `RUNPOD_API_KEY`)
4. **Secret**: Copy the value from your `.env` file
5. Click **Add secret**

### Step 2: Priority Order
Add these secrets in this order for fastest setup:

1. **RUNPOD_VOLUME_ID** (fixes the immediate build error)
2. **RUNPOD_S3_REGION**
3. **RUNPOD_S3_ENDPOINT** 
4. **RUNPOD_S3_ACCESS_KEY_ID**
5. **RUNPOD_S3_SECRET_ACCESS_KEY**
6. **RUNPOD_API_KEY**
7. **RUNPOD_ENDPOINT_ID**

Then add the model directory secrets and B2 storage as needed.

### Step 3: Test the Build
After adding the core RunPod secrets, commit and push to test:

```bash
git add .
git commit -m "fix: update CI/CD environment variables to match .env file"
git push origin development
```

Check the **Actions** tab to verify the build now passes! 🚀

---

## ⚠️ Security Note

**Never commit secrets to git!** The values shown above are examples from your `.env` file. Make sure your `.env` file is in `.gitignore` and only add these values as GitHub repository secrets.

---

## 🎯 Expected Result

Once you add these secrets, your CI/CD pipeline should:
- ✅ Pass all tests
- ✅ Build successfully 
- ✅ Complete security scans
- ✅ Be ready for deployment

The build error about missing `RUNPOD_VOLUME_ID` will be resolved! 🎉