# Model Licenses (MVP)

This file summarizes licenses and important usage notes for the models and libraries targeted by the AI Media Lab MVP. This is a guide for developers and agents — always check the upstream model card and weight license before using in production or for commercial use.

- SDXL (Stable Diffusion XL)
  - License / policy: OpenRAIL++ (model weights distributed under OpenRAIL++ with usage terms)
  - Notes: High-quality text→image; permitted for research and non-commercial demos under the license. Document the exact checkpoint used in `docs/` or PR descriptions.

- Stable Video Diffusion (SVD)
  - License / policy: Research/non-commercial release (check model repo and license)
  - Notes: Intended for research demos — avoid commercial deployment unless license changes.

- VideoCrafter2 / DynamiCrafter
  - License / policy: Research release / repo license (verify per model)
  - Notes: Useful alternative for T2V/I2V pipelines; licensing may restrict commercial usage.

- AnimateDiff
  - License / policy: Apache-2.0
  - Notes: Permissive license for animation modules and motion layers. Good for extending image→video pipelines.

- RIFE / FILM (frame interpolation)
  - License / policy: OSS (varies by implementation, typically permissive)
  - Notes: Used as a post-processor for first/last→in-between frame interpolation.

- InsightFace + inswapper (face swap)
  - License / policy: InsightFace code: MIT; pretrained weights: often research/non-commercial — check specific weights
  - Notes: Code is permissive, but many pretrained models restrict commercial use. Record any model weights and their license in PRs.

- Demucs v4 (audio separation)
  - License / policy: MIT
  - Notes: Good-quality audio source separation for music and speech.

General guidance

- Always include the model name, exact checkpoint/version, source URL, and license in PRs that add or update models. Add a short README fragment under `docs/` for any new model added.
- For public demos, prefer models with permissive licenses (Apache-2.0, MIT, or explicit commercial permissions). For any model with research-only or non-commercial weights, add a clear warning and avoid monetization until a license-compliant path is available.
