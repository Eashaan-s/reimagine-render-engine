# Literature survey starter — Reimagine Render Engine

Use this list for a **related work** chapter. Cite the papers themselves (IEEE/APA as your college requires). **ComfyUI** and **RunPod** are engineering tools, not research contributions.

Extended paraphrased notes (plain text, all 18 papers): [`literature-notes-detailed.txt`](literature-notes-detailed.txt).

Suggested chapter flow: traditional architectural visualization → GAN image-to-image → diffusion and latent models → structure/instruction control → parameter-efficient adaptation → the Qwen-Image editing stack you deploy → evaluation metrics → systems (desktop + serverless GPU) as implementation, not novelty.

## Core papers (map each to the product)

### 1. Isola, P., Zhu, J.-Y., Zhou, T., & Efros, A. A. (2017). Image-to-image translation with conditional adversarial networks. *CVPR*.

Paired translation (labels/edges → photo). Frames the capstone problem as I2I, not text-only generation. [https://arxiv.org/abs/1611.07004](https://arxiv.org/abs/1611.07004)

### 2. Zhu, J.-Y., Park, T., Isola, P., & Efros, A. A. (2017). Unpaired image-to-image translation using cycle-consistent adversarial networks. *ICCV*.

Unpaired domain transfer when you lack aligned wireframe–photo pairs. Contrast with your **paired** inputs (wireframe + optional style image). [https://arxiv.org/abs/1703.10593](https://arxiv.org/abs/1703.10593)

### 3. Ho, J., Jain, A., & Abbeel, P. (2020). Denoising diffusion probabilistic models. *NeurIPS*.

Foundational diffusion training objective. Later renderers (including Qwen-Image) sit in this family. [https://arxiv.org/abs/2006.11239](https://arxiv.org/abs/2006.11239)

### 4. Rombach, R., Blattmann, A., Lorenz, D., Esser, P., & Ommer, B. (2022). High-resolution image synthesis with latent diffusion models. *CVPR*.

Latent-space diffusion that made high-res synthesis practical (Stable Diffusion). Your worker is a later latent/transformer stack, not this exact model, but the **latent I2I** idea is the same. [https://arxiv.org/abs/2112.10752](https://arxiv.org/abs/2112.10752)

### 5. Peebles, W., & Xie, S. (2023). Scalable diffusion models with transformers (DiT). *ICCV*.

Diffusion Transformers; lineage for MMDiT-style backbones used in Qwen-Image. [https://arxiv.org/abs/2212.09748](https://arxiv.org/abs/2212.09748)

### 6. Zhang, L., Rao, A., & Agrawala, M. (2023). Adding conditional control to text-to-image diffusion models (ControlNet). *ICCV*.

Structure from edges, depth, or sketches. Directly relevant to **keeping the wireframe’s geometry** while changing materials/lighting. [https://arxiv.org/abs/2302.05543](https://arxiv.org/abs/2302.05543)

### 7. Brooks, T., Holynski, A., & Efros, A. A. (2023). InstructPix2Pix: Learning to follow image editing instructions. *CVPR*.

Instruction + source image editing. Analogous to your **texture prompt** plus base render. [https://arxiv.org/abs/2211.09800](https://arxiv.org/abs/2211.09800)

### 8. Hertz, A., Mokady, R., Tenenbaum, J., Aberman, K., Pritch, Y., & Cohen-Or, D. (2023). Prompt-to-prompt image editing with cross-attention control. *ICLR*.

Edit by manipulating attention rather than training a new translator. Use to discuss **identity preservation** vs full regeneration. [https://arxiv.org/abs/2208.01626](https://arxiv.org/abs/2208.01626)

### 9. Meng, C., He, Y., Song, Y., Song, J., Wu, J., Zhu, J.-Y., & Ermon, S. (2022). SDEdit: Guided image synthesis and editing with stochastic differential equations. *ICLR*.

Noisy-image conditioned editing; a baseline “perturb and denoise” editor before instruction models. [https://arxiv.org/abs/2108.01073](https://arxiv.org/abs/2108.01073)

### 10. Saharia, C., Chan, W., Chang, H., Lee, C. A., Ho, J., Salimans, T., Fleet, D. J., & Norouzi, M. (2022). Palette: Image-to-image diffusion models. *SIGGRAPH*.

Diffusion I2I for colorization, inpainting, uncropping, etc. Positions diffusion as a general I2I tool, not only T2I. [https://arxiv.org/abs/2111.05826](https://arxiv.org/abs/2111.05826)

### 11. Hu, E. J., Shen, Y., Wallis, P., Allen-Zhu, Z., Li, Y., Wang, S., Wang, L., & Chen, W. (2022). LoRA: Low-rank adaptation of large language models. *ICLR*.

Low-rank adapters. Your worker uses a **Lightning LoRA** so few KSampler steps (default 4) remain usable. [https://arxiv.org/abs/2106.09685](https://arxiv.org/abs/2106.09685)

### 12. Podell, D., English, Z., Lacey, K., Blattmann, A., Dockhorn, T., Müller, J., Penna, J., & Rombach, R. (2023). SDXL: Improving latent diffusion models for high-resolution image synthesis. *arXiv:2307.01952*.

Scaled latent diffusion; a comparison point for quality vs your Qwen-Image-Edit deployment. [https://arxiv.org/abs/2307.01952](https://arxiv.org/abs/2307.01952)

### 13. Bai, S., et al. (2025). Qwen2.5-VL Technical Report. *arXiv:2502.13923*.

Vision–language encoder used as the condition tower in the Qwen-Image stack (semantic path). [https://arxiv.org/abs/2502.13923](https://arxiv.org/abs/2502.13923)

### 14. Wu, C., et al. / Qwen Team (2025). Qwen-Image Technical Report. *arXiv:2508.02324*.

**Closest paper to the deployed model** (`qwen_image_edit_2511` in the ComfyUI graph): MMDiT generation/editing, dual semantic + VAE appearance paths. [https://arxiv.org/abs/2508.02324](https://arxiv.org/abs/2508.02324)

### 15. Li, C., Zhang, T., Du, X., Zhang, Y., & Xie, H. (2024). Generative AI models for different steps in architectural design: A literature review. *arXiv:2404.01335*.

Architecture-specific survey (sketch-to-image, ControlNet, layout). Use this to situate the app in **design process**, not only computer vision. [https://arxiv.org/abs/2404.01335](https://arxiv.org/abs/2404.01335)

### 16. Pizarro, P. N., et al. (2023). Automatic measures for evaluating generative design methods for architects. *arXiv:2303.11483*.

Argues photorealism is not the only architect criterion (intent, sketch messiness). Useful for an honest **limitations** section. [https://arxiv.org/abs/2303.11483](https://arxiv.org/abs/2303.11483)

### 17. Wang, Z., Bovik, A. C., Sheikh, H. R., & Simoncelli, E. P. (2004). Image quality assessment: From error visibility to structural similarity. *IEEE Transactions on Image Processing, 13*(4).

**SSIM** — if you measure whether openings, masses, and edges of the wireframe survive the render.

### 18. Zhang, R., Isola, P., Efros, A. A., Shechtman, E., & Wang, O. (2018). The unreasonable effectiveness of deep features as a perceptual metric (LPIPS). *CVPR*.

Perceptual distance for **style-reference adherence** vs the second image. [https://arxiv.org/abs/1801.03924](https://arxiv.org/abs/1801.03924)

## Optional extra (if recent Springer/IEEE is allowed)

Image-conditioned architectural I2I studies on FLUX.1 / Redux-style workflows (e.g. comparative image-control papers in *Architectural Intelligence*, 2025–2026). Use only if you can obtain the PDF through the library; do not cite a paywall abstract alone.

## Tools (do not list as “papers”)

- **ComfyUI** — node graph that hosts Qwen-Image-Edit + Lightning LoRA.
- **RunPod Serverless** — GPU job `POST /run` and poll `GET /status/{id}`.
- **Electron** — desktop shell (`preload` IPC, three-column UI).

## Evaluation paragraph you can adapt

Reimagine is an **instruction- and reference-conditioned I2I** system: node 370 holds the drawing, 371 the style image, 377 the assembled prompt, 368 the sampler. Related work splits into (a) paired GAN translators, (b) diffusion I2I and editors (InstructPix2Pix, SDEdit, Prompt-to-Prompt), (c) spatial control (ControlNet), (d) PEFT (LoRA), and (e) architecture-specific surveys. The implementation choice is a hosted Qwen-Image-Edit graph rather than training a new network. Success should be discussed as **structure preservation + style match + latency/cost of serverless GPU**, not as a new generative algorithm.
