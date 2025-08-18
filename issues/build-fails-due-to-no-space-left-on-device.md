## Issue

**Title:** Build Fails Due to No Space Left on Device

**Body:** The CI workflow is failing because the runner runs out of disk space during the Docker image export step. The error message is:

```
ERROR: write /usr/local/lib/python3.11/site-packages/triton/_C/libtriton.so: no space left on device
```

This occurs when exporting to Docker image format, as reported in this workflow run: [https://github.com/MikeBlakeway/media-lab/actions/runs/17051897680/job/48341317843](https://github.com/MikeBlakeway/media-lab/actions/runs/17051897680/job/48341317843) (commit ref: 8bf50433003102afc3ccb80a9dffe885c2eba3dd).

### Suggested actions:
- Reduce the image size or number of dependencies
- Use a larger runner or add disk cleanup steps to the workflow
- Investigate if intermediate files can be deleted before export

Please review and address.