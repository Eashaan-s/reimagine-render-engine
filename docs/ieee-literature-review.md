A Focused Literature Review of Diffusion-Based Image Synthesis and Controllable Image-to-Image Translation

Corpus. Ten PDF files (labeled r1–r10) were reviewed. After text extraction and OCR of image-only scans, the set contains eight unique papers. Duplicate copies are cited once: r2 and r3 are the same latent-diffusion paper; r6 and r7 are the same InstructPix2Pix paper. r1 and r2 had no embedded text and were identified from page renders. This is a focused review of that uploaded corpus, not a claim that these eight works exhaust image-to-image (I2I) research.

Thread. Architectural visualization needs photoreal images that stay faithful to a drawing while responding to language and, often, a style photograph. The papers below supply the generative backbone (pixel and latent diffusion), the transformer replacement for U-Nets, spatial control, instruction following, training-free prompt and stroke editing, and unified conditional I2I. None of them, taken together, specifies a designer-facing desktop job that jointly consumes a drawing, a style photo, and an instruction.

---

I. Introduction

Image-to-image translation maps a structured source (edges, a degraded photo, a user stroke) to a photoreal target. Early practical systems used conditional adversarial networks. The documents in this corpus instead document the shift to denoising diffusion: a forward process that adds Gaussian noise until the signal is destroyed, and a learned reverse process that reconstructs images. Subsequent work moved the same idea into a compressed latent, replaced convolutional denoisers with transformers, and added spatial, instructional, and training-free controls.

The remainder of this review (i) extracts problem statement, key components, reported results, and author-stated or clearly implied limitations for each unique paper; (ii) compares families of methods; (iii) lists research gaps that remain open relative to drawing-conditioned architectural rendering; and (iv) gives an IEEE numbered reference list matching the in-text citations.

---

II. Per-Paper Review

A. Denoising Diffusion Probabilistic Models [1]

Problem. Ho, Jain, and Abbeel ask whether a parameterized Markov chain trained with variational inference can synthesize images competitive with GANs, without adversarial training.

Key components. The forward (diffusion) process is a fixed Markov chain that adds Gaussian noise on a variance schedule over many time steps. Because the process is Gaussian, any intermediate noisy image can be sampled from the original image in one closed-form draw. The reverse process is a time-conditional neural network with a U-Net backbone (PixelCNN++-style residual blocks, group normalization, self-attention at 16 by 16). The authors connect the variational bound to denoising score matching and train the network to predict the noise that was added, using a simplified mean-squared objective.

Training samples the time step uniformly; sampling starts from Gaussian noise and iterates one thousand reverse steps in the reported experiments. Images are scaled into a symmetric range around zero. The last reverse step uses a discrete decoder for integer pixel values.

Results. On unconditional CIFAR-10 they report Inception Score 9.46 and FID 3.17 with that simplified objective, competitive with or better than several GAN baselines on FID. They also show CelebA-HQ 256 by 256 samples of visually high quality.

Limitations (authors / method). Likelihoods remain weaker than the best autoregressive models; most of the lossless codelength is spent on imperceptible detail. Generation requires hundreds of sequential network evaluations in pixel space. The paper is unconditional / class-level, not instruction- or layout-conditioned I2I.

B. High-Resolution Image Synthesis with Latent Diffusion Models [2]

Problem. Pixel-space diffusion of the type in [1] is too expensive for high-resolution natural images (hundreds of GPU-days, slow sampling). Rombach et al. seek a point on the compression–fidelity curve where diffusion stays perceptually strong but cheap.

Key components. A pretrained autoencoder (KL- or VQ-regularized) maps RGB to a lower-dimensional latent; mild spatial downsampling (typically factor f = 4) is preferred over aggressive VQGAN-style compression so that reconstruction FID stays low. A time-conditional U-Net then runs DDPM-style denoising in that latent. Cross-attention layers inject token embeddings from text, class labels, or bounding boxes into the U-Net. High-resolution output is produced convolutionally. Classifier-free or post-hoc guidance can steer sampling without retraining the core denoiser.

Results. The authors report new or highly competitive scores for class-conditional ImageNet synthesis, inpainting, text-to-image, unconditional generation, and super-resolution, with substantially lower training and sampling cost than pixel DMs. Latents with a downsampling factor of four or eight outperform both pixel diffusion and more aggressive compression on the reported FID–compute plots. CelebA-HQ FID is cited as a then-SOTA result in their tables.

Limitations. Sampling is still iterative (many denoising steps). Native layout control is weaker than later spatial adapters: bounding-box and text conditioning exist, but architectural drawings as hard geometric constraints are not the experimental focus. Photorealism is measured with FID/IS-style metrics on natural-image benchmarks, not design intent.

C. Scalable Diffusion Models with Transformers (DiT) [3]

Problem. Almost all prior diffusion models, including [1] and [2], keep a convolutional U-Net denoiser. Peebles and Xie ask whether a standard Vision Transformer can replace that U-Net in latent diffusion, and whether quality scales predictably with compute.

Key components. Images are encoded with the LDM autoencoder; latents are patchified (patch size p, e.g. p = 2) into a token sequence of length T = (I/p)². DiT blocks follow ViT practice. Conditioning (timestep and class) is injected most successfully with adaLN-Zero: adaptive layer normalization whose residual scale is zero-initialized so the block starts as an identity. The design space is model size (S/B/L/XL) × patch size; complexity is reported in forward Gflops, not only parameter count. Training is class-conditional ImageNet latent diffusion.

Results. Higher Gflops (deeper/wider transformers or more tokens) consistently lower FID. DiT-XL/2 reaches FID 2.27 on class-conditional ImageNet at 256 by 256 pixels and also leads the 512 by 512 setting among the diffusion models they compare, beating U-Net systems such as ADM and LDM on the reported plots.

Limitations. The paper is a class-conditional generative study, not instruction editing, not edge/depth I2I, and not multi-image conditioning. Architectural drawings and designer language are outside the experimental protocol.

D. Adding Conditional Control to Text-to-Image Diffusion Models (ControlNet) [4]

Problem. Text-to-image diffusion (as in [2]) cannot reliably specify spatial layout. Zhang, Rao, and Agrawala want to add image-shaped conditions (edges, pose, depth, segmentation, normals, scribbles, Hough lines) without destroying a large pretrained backbone.

Key components. The production U-Net is locked. A trainable copy of the encoding blocks processes the conditioning image. Locked and trainable streams meet through zero convolutions (1×1 convolutions with weights and bias initialized to zero) so early training cannot inject harmful noise into the frozen features. The learning objective remains the usual noise-prediction loss with an extra condition c_f. During training, 50% of text prompts are dropped so the spatial map can carry semantics alone. Multiple ControlNets can be composed. The authors describe sudden convergence (control appears abruptly after several thousand steps) and a CFG resolution-weighting trick at inference.

Results. ControlNets trained on Canny, pose, depth, and related maps control Stable Diffusion with or without prompts. Depth-to-image trained on a single consumer GPU is reported as competitive with much larger industrial runs. User studies compare against strong conditional baselines. Training is described as robust from small (<50k) to large (>1M) sets.

Limitations. Control is spatial + optional caption, not a free-form edit instruction plus a style photograph. The locked backbone is a general T2I model trained on web photos, not architectural drawings. Extra sampling cost of the copied encoder is modest but real. Success is judged by visual adherence to maps and photoreal appearance, not by whether a designer’s intended program (rooms, openings, materials) survived.

E. InstructPix2Pix: Learning to Follow Image Editing Instructions [5]

Problem. Users want to edit a photograph with a sentence such as “make his jacket leather,” without writing a full before/after caption, drawing a mask, or running per-image inversion.

Key components. Synthetic supervision: a fine-tuned GPT-3 produces instruction + edited-caption triplets from LAION-style captions; Stable Diffusion plus Prompt-to-Prompt [6] then renders before/after image pairs that share layout. A latent diffusion model is initialized from Stable Diffusion; the first convolution is widened so the noisy latent and the VAE encoding of the input image are concatenated; new channels start at zero. Captions are replaced by instructions. Dual classifier-free guidance uses two scales (stay close to the input image, and obey the instruction), with random dropout of image, text, or both during training. Inference is a single forward generative pass (seconds), with no test-time fine-tuning.

Results. The model generalizes from fully synthetic pairs to real photos and human-written instructions: object replacement, weather, medium, and style changes. Qualitative grids show the two-scale guidance trade-off.

Limitations. Training images and instructions are synthetic and inherit LAION and Stable Diffusion biases. The authors’ own discussion of data notes domain issues in web captions. Instruction following is weaker on precise geometry, counting, and structured drawings than on natural photographs. The method is image + text instruction; it is not formulated as drawing + style reference + instruction.

F. Prompt-to-Prompt Image Editing with Cross-Attention Control [6]

Problem. In text-to-image diffusion, a small prompt change usually yields a completely different image. Masked inpainting discards structure inside the mask. Hertz et al. want text-only edits that preserve composition.

Key components. They observe that cross-attention maps bind spatial locations to prompt tokens. Prompt-to-Prompt injects (copies or blends) source attention maps into a second denoising trajectory whose prompt has been edited. Applications: (i) replace a token while freezing maps; (ii) add words for global style while freezing attention on the original tokens; (iii) re-weight a token’s map to amplify or attenuate a concept. No new weights, no extra dataset. Real images require an inversion step so a latent trajectory exists to edit.

Results. Diverse qualitative edits on generated images (object swap, style, local adjectives) with a controllable trade-off between prompt fidelity and source layout. The method is training-free given a frozen text-to-image model.

Limitations. Strength is highest on model-generated images that already lie on the diffusion manifold; inversion of real photographs is imperfect. There is no learned instruction encoder and no second reference image. Users still phrase edits as caption rewrites, not as “apply this material board to this floor plan.”

G. SDEdit: Guided Image Synthesis and Editing with Stochastic Differential Equations [7]

Problem. Stroke paintings, composites, and coarse RGB edits should become photoreal while remaining faithful to the user guide, without a new GAN per task or a fragile inversion loss.

Key components. SDEdit hijacks a pretrained SDE (score-based / diffusion) generator. The guide is an RGB image (strokes, composite, or edited photo). The method adds Gaussian noise up to a chosen noise level, then runs the reverse SDE to denoise. A larger noise level yields more realism and less faithfulness. No task-specific training data or extra losses; one unlabeled generative prior is reused. Tasks demonstrated: stroke-to-image, stroke-based editing, compositing.

Results. Human studies: up to 98.09% preference on realism and 91.72% on overall satisfaction versus GAN baselines in the stroke-to-image setting they report; compositing improves faithfulness scores relative to the GAN inversion systems they compare.

Limitations. The guide is pixel RGB, not language and not an explicit spatial map such as a semantic layout. The noise-level knob is a global trade-off: too little noise keeps artifacts; too much noise invents structure. The prior is trained on natural-image domains (e.g. faces, scenes) rather than construction drawings.

H. Palette: Image-to-Image Diffusion Models [8]

Problem. Saharia et al. ask whether a single conditional diffusion recipe—without per-task GAN losses or architecture surgery—can cover many I2I problems.

Key components. Palette is a conditional diffusion model in pixel space: the denoiser sees the corrupted or incomplete input (grayscale, masked image, cropped canvas, JPEG) together with the noisy target. Tasks: colorization, inpainting, uncropping, JPEG restoration. They study L2 versus L1 in the denoising objective (diversity vs. fidelity) and show self-attention matters empirically. Evaluation is standardized on ImageNet with FID, Inception Score, ResNet-50 classification accuracy, perceptual distance, and human ratings. A multi-task generalist is compared with specialists.

Results. The simple diffusion implementation outperforms strong GAN and regression baselines on all four tasks without task-specific hyperparameter tuning. The generalist matches or beats specialists. Sequential Palette uncropping is used to build wide panoramas from a central crop.

Limitations. There is no free-form language condition and no separate style photograph. Sampling is expensive (many reverse steps in pixel space). Benchmarks are natural ImageNet photos, not plans or elevations.

---

III. Comparative Discussion

Pixel diffusion vs. latent diffusion. [1] and [8] denoise in RGB (or a closely related pixel space). Quality is high, but compute scales with resolution and step count. [2] shows that a perceptually faithful VAE latent with mild downsampling preserves DM inductive bias while cutting cost; Stable Diffusion-class systems, including the backbones used in [4] and [5], rest on that idea.

U-Net vs. transformer denoisers. [1], [2], [4], [5], and [8] inherit convolutional U-Nets. [3] shows the U-Net is not required: patchified latents plus adaLN-Zero transformers scale smoothly in Gflops and set ImageNet FID numbers that beat the U-Net diffusion models they plot. That result motivates later multimodal DiT / MMDiT stacks, but [3] itself does not perform I2I.

How the user specifies the change.

| Mechanism | Papers | User input | Training |
| --- | --- | --- | --- |
| Unconditional / class synthesis | [1], [3] | none / class id | full generative training |
| Task-conditional I2I | [8] | degraded image | conditional DM per task family |
| Noise-and-denoise RGB guide | [7] | strokes / composite | none (pretrained prior) |
| Cross-attention rewrite | [6] | prompt pair | none |
| Spatial map + frozen T2I | [4] | edges, depth, pose, … | ControlNet copy |
| Instruction + image | [5] | photo + sentence | synthetic pairs, SD finetune |
| Latent T2I / general cond. | [2] | text, class, boxes | LDM |

GAN I2I (referenced by [7] and [8] as the prior art, not present as a separate PDF in this ten-file set) learns a direct map and often needs auxiliary structure losses. Diffusion methods in this corpus replace that with likelihood-style denoising, at the price of iterative sampling.

Structure vs. appearance. [4] is the only work here whose primary interface is a geometric or semantic map. [5] and [6] emphasize linguistic change and tend to preserve layout only as a side effect of image conditioning or attention injection. [7] preserves coarse RGB structure via the noise schedule. [8] preserves whatever the task defines (known pixels, grayscale). No paper jointly optimizes a drawing, a style photograph, and an instruction.

---

IV. Research Gaps

The following gaps are left open by this corpus. They are relevant to a capstone that uses these ideas in a desktop I2I client; this review does not claim that the student project closes model-training gaps in [1]–[8].

1. Drawing-conditioned photorealism. [1] and [3] generate from noise or class labels. [2] conditions on text and coarse boxes. [8] conditions on natural-image degradations. Architectural drawings (plans, elevations, CAD linework) are not a reported domain. Whether openings, spans, and alignment survive photoreal decoding is unevaluated.

2. Joint instruction + reference style + layout. [4] supplies layout without instruction-following data. [5] supplies instructions without a second style image or a hard spatial map. [6] rewrites captions. [7] uses RGB strokes. No paper trains or evaluates the triple (structure drawing, style photograph, natural-language request).

3. Domain gap: ImageNet/LAION photos vs. design artifacts. FID, IS, ResNet accuracy, and photoreal human votes in [1]–[3], [8] and instruction edits in [5] are built around natural photographs and web imagery. Messy sketches, orthographic drawings, and material boards are out of distribution. Designer-centered criteria (program, circulation, constructability) are absent; they appear in other literature, not in these eight PDFs.

4. Geometry, counting, and hard constraints. [5] is known to be weak when the instruction demands exact object counts or rigid geometry; [6] preserves layout only insofar as attention maps capture it; [7] can wash out structure if the noise level is large. Hard geometric fidelity is not a first-class loss in any of these papers.

5. Sampling cost and interactive latency. [1] uses T = 1000 pixel steps; [8] is likewise a heavy pixel sampler; [2] reduces but does not eliminate steps; [5] is “seconds,” not a guaranteed interactive budget. This corpus does not develop few-step distillation or desktop-oriented latency SLAs.

6. Systems: no designer desktop client. All eight papers are model and algorithm papers. They do not specify a local UI that packages a frozen graph, two images, and a prompt as a job, nor a split between a student workstation and a remote GPU worker. Engineering of that pipeline is outside their claims.

7. Evaluation for the downstream user. Metrics are FID, IS, classification accuracy, perceptual distance, and generic human photorealism/faithfulness ([7], [8]). There is no protocol in this set for “did the render still match the drawing the architect signed off?”

---

V. Conclusion

Within the ten uploaded files, the unique literature runs from the DDPM training identity [1], through latent U-Net diffusion [2] and transformer denoisers [3], to spatial ControlNet adapters [4], synthetic instruction I2I [5], training-free attention editing [6], SDE-based stroke editing [7], and unified conditional pixel diffusion [8]. Together they justify treating modern rendering as conditional latent diffusion with optional spatial and language controls. They do not, individually or jointly, deliver a validated drawing + style + instruction system for architectural practice. A capstone implementation should cite them as foundations it consumes, and should state clearly that product integration and designer-facing evaluation remain application-level work.

---

References

[1] J. Ho, A. Jain, and P. Abbeel, “Denoising diffusion probabilistic models,” in Proc. Adv. Neural Inf. Process. Syst. (NeurIPS), 2020.

[2] R. Rombach, A. Blattmann, D. Lorenz, P. Esser, and B. Ommer, “High-resolution image synthesis with latent diffusion models,” in Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR), 2022, pp. 10684–10695.

[3] W. Peebles and S. Xie, “Scalable diffusion models with transformers,” in Proc. IEEE/CVF Int. Conf. Comput. Vis. (ICCV), 2023.

[4] L. Zhang, A. Rao, and M. Agrawala, “Adding conditional control to text-to-image diffusion models,” in Proc. IEEE/CVF Int. Conf. Comput. Vis. (ICCV), 2023.

[5] T. Brooks, A. Holynski, and A. A. Efros, “InstructPix2Pix: Learning to follow image editing instructions,” in Proc. IEEE/CVF Conf. Comput. Vis. Pattern Recognit. (CVPR), 2023.

[6] A. Hertz, R. Mokady, J. Tenenbaum, K. Aberman, Y. Pritch, and D. Cohen-Or, “Prompt-to-prompt image editing with cross-attention control,” in Proc. Int. Conf. Learn. Represent. (ICLR), 2023.

[7] C. Meng, Y. He, Y. Song, J. Song, J. Wu, J.-Y. Zhu, and S. Ermon, “SDEdit: Guided image synthesis and editing with stochastic differential equations,” in Proc. Int. Conf. Learn. Represent. (ICLR), 2022.

[8] C. Saharia, W. Chan, H. Chang, C. A. Lee, J. Ho, T. Salimans, D. J. Fleet, and M. Norouzi, “Palette: Image-to-image diffusion models,” in Proc. ACM SIGGRAPH, Vancouver, Canada, Aug. 2022.

Source-file mapping (not for the Word bibliography)

| File | Identity | Citation |
| --- | --- | --- |
| r1.pdf (scan, 25 pp.) | DDPM, Ho, Jain, Abbeel, NeurIPS 2020 | [1] |
| r2.pdf (scan, 45 pp.) | LDM, Rombach et al., arXiv/CVPR 2022 | [2] |
| r3.pdf | Same paper as r2 | [2] |
| r4.pdf | DiT, Peebles and Xie | [3] |
| r5.pdf | ControlNet, Zhang, Rao, Agrawala | [4] |
| r6.pdf | InstructPix2Pix, Brooks et al. | [5] |
| r7.pdf | Duplicate of r6 | [5] |
| r8.pdf | Prompt-to-Prompt, Hertz et al. | [6] |
| r9.pdf | SDEdit, Meng et al. | [7] |
| r10.pdf | Palette, Saharia et al., SIGGRAPH 2022 | [8] |