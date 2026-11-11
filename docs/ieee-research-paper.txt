Diffusion Models for Controllable Image-to-Image Translation: A Focused Review of Architectures, Editing Mechanisms, and Open Gaps

A manuscript-style literature paper for Word (IEEE IEEEtran layout)

Paste into Microsoft Word. Apply the IEEE conference template (two column) if required by the department. Keep numbered citations as `[1]`, `[2]`, … . Replace every [PASTE FIGURE] block with a screenshot from the matching uploaded PDF. Do not redraw copyrighted figures; use the originals with a caption that cites the source paper. If a journal requires permission, request it from the copyright holder before camera-ready submission.

---

Title (conference style, max ~2 lines)

Diffusion-Based Image Synthesis and Controllable Image-to-Image Translation: A Focused Review

Authors (fill in)

First Author, Student Member, IEEE (if applicable), Second Author, Third Author  
Department of Electronics and Telecommunication Engineering  
SVKM’s NMIMS Mukesh Patel School of Technology Management & Engineering, Mumbai, India  
E-mail: (add)

Abstract—Image-to-image (I2I) translation seeks a photorealistic target image that remains consistent with a structured source such as an edge map, a degraded photograph, or a user-provided guide. Over the last several years, denoising diffusion probabilistic models have displaced adversarial translators as the dominant family for this problem. This paper presents a focused technical review of eight unique publications drawn from a ten-file corpus (two files are image-only scans of papers that also appear as text PDFs; two further files are duplicates). We examine, in turn, pixel-space diffusion, latent diffusion with cross-attention conditioning, transformer denoisers, spatial ControlNet adapters, instruction-following editors, training-free cross-attention manipulation, stochastic-differential editing of RGB guides, and unified conditional I2I diffusion. For each work we reconstruct the problem statement, the principal architectural and training components, the reported empirical outcomes, and the limitations acknowledged by the authors or implied by the experimental protocol. A comparative discussion organizes the literature along three axes: the representation in which denoising is performed, the form of user control, and the degree of additional training. We then enumerate research gaps that remain open for drawing-conditioned architectural visualization, in particular the absence of a jointly specified drawing, style photograph, and natural-language instruction, and the mismatch between photorealism metrics and design intent. The review is not a claim of completeness for the field; it is a detailed reading of the stated corpus, written so that subsequent system papers may cite these foundations without overstating novelty.

Index Terms—Denoising diffusion probabilistic models, latent diffusion, Diffusion Transformer, ControlNet, InstructPix2Pix, Prompt-to-Prompt, SDEdit, Palette, image-to-image translation, controllable generation.

---

I. Introduction

Photorealistic image synthesis from a structured input is a long-standing problem at the intersection of computer vision and computer graphics. In the I2I setting, the source is not an empty noise tensor accompanied only by a class label; it is an image that already encodes geometry, semantics, or a coarse user intent [7], [8]. Early practical systems framed I2I as a conditional adversarial mapping and often required paired datasets and task-specific losses. The papers reviewed here document a different trajectory. They treat generation as the reversal of a gradual noising process [1], move that process into a perceptually compressed latent [2], replace convolutional denoisers with scalable transformers [3], and then attach controls that are spatial [4], instructional [5], attention-based [6], or defined by an RGB guide and a noise schedule [7].

The motivation for rereading this lineage in one document is application-driven but scientifically conservative. Architectural concept visualization needs an image that (i) respects a drawing, (ii) can adopt materials and lighting described in language or shown in a reference photograph, and (iii) looks photoreal enough for a design conversation. None of the eight unique papers delivers that product. They do, however, supply the only widely accepted technical vocabulary with which such a product can be described: forward and reverse processes, latent autoencoders, classifier-free guidance, cross-attention, and conditional score estimation.

This manuscript is organized as a survey-style IEEE paper rather than as a bullet summary. Section II states the scope of the corpus and the notation used throughout. Section III reviews unconditional and class-conditional diffusion backbones [1]–[3]. Section IV reviews controllable I2I and editing [4]–[8]. Section V compares families of methods. Section VI lists open gaps. Section VII concludes. Figure slots are placed where the source papers themselves use a diagram; the reader should insert the corresponding graphic from the uploaded PDF.

Throughout, we paraphrase. Equations are restated in conventional IEEE notation. Quantitative numbers are those reported by the original authors.

---

II. Scope, Corpus, and Preliminaries

A. Corpus

Ten PDF files (labeled r1–r10 in the source collection) were examined. Two files (r1, r2) contain page images without an embedded text layer; they were identified from the printed title block. After de-duplication the unique set is as follows.

- r1: Ho, Jain, and Abbeel, denoising diffusion probabilistic models (DDPMs) [1].
- r2 and r3: Rombach et al., latent diffusion models (LDMs) [2] (one citation).
- r4: Peebles and Xie, Diffusion Transformers (DiT) [3].
- r5: Zhang, Rao, and Agrawala, ControlNet [4].
- r6 and r7: Brooks, Holynski, and Efros, InstructPix2Pix [5] (one citation).
- r8: Hertz et al., Prompt-to-Prompt [6].
- r9: Meng et al., SDEdit [7].
- r10: Saharia et al., Palette [8].

This is a focused review of that corpus. Concurrent systems such as Imagen, DALL·E 2, and later multimodal DiT image editors are mentioned only when the corpus papers themselves rely on them. Conditional GANs are discussed as the baseline family that [7] and [8] contrast against; they are not among the ten files.

B. Problem statement

Let a clean image (or a compressed latent of an image) be the starting point. A forward noising process gradually corrupts that image over a sequence of time steps. A learned reverse process then tries to recover structure from the noisy state. In unconditional synthesis the only extra input is the time step. In conditional synthesis the denoiser also sees a condition, which may be a class index [3], a text embedding [2], a spatial map [4], an input image [5], [8], an attention tensor derived from a prompt [6], or a partially noised RGB guide [7].

I2I is the special case in which the condition is image-shaped or is an instruction that refers to an image. The scientific questions that recur in Sections III–IV are: (1) in which representation should denoising be performed; (2) which neural architecture should predict noise or scores; (3) how the condition enters the network; (4) what must be trained versus what can be reused at test time; and (5) how realism is traded against faithfulness to the condition.

C. How to insert figures

Each figure environment below is a placeholder. In Word: Insert → Pictures, paste a screenshot from the cited PDF, then keep the caption. Suggested crop is named in the box. Number figures in the order they appear; if you skip a figure, renumber.

---

III. Generative Backbones: From Pixel Diffusion to Transformers

A. Denoising Diffusion Probabilistic Models [1]

Ho, Jain, and Abbeel [1] ask whether a parameterized Markov chain, trained with a variational bound rather than an adversarial game, can synthesize images of quality comparable to contemporaneous GANs. The work is foundational for every later paper in this corpus: [2]–[8] all assume a learned reverse process of this type, whether written as a DDPM, a score-based model, or an SDE.

Forward process. A clean training image is gradually corrupted by Gaussian noise according to a fixed variance schedule over many time steps. Because each step is Gaussian, any intermediate noisy image can be sampled directly from the original image in one closed-form draw. Training therefore does not require simulating the entire noising chain.

Reverse process and architecture. The reverse chain is also Gaussian. Its mean is predicted by a time-conditional U-Net (residual blocks in the style of PixelCNN++, group normalization, sinusoidal time embedding, and self-attention on a 16 by 16 feature map). Images are scaled into a symmetric range around zero. The last step uses a discrete decoder so that pixel-space likelihoods are well defined.

Objective. Starting from a variational bound on the negative log-likelihood, the authors show that predicting the added noise (rather than the clean image) yields a simple, uniformly weighted noise-matching loss: at a randomly chosen time step, the network must match the true Gaussian noise that was mixed into the image. This objective is a weighted form of denoising score matching across noise levels. Sampling starts from pure Gaussian noise and iterates one thousand reverse steps in the reported experiments.

Empirical results. On unconditional CIFAR-10, the simplified objective attains an Inception Score of 9.46 and an FID of 3.17, competitive with strong GAN baselines on FID [1]. Qualitative samples on CelebA-HQ at 256 by 256 pixels demonstrate that the same recipe extends beyond CIFAR-scale images.

Limitations. The authors note that lossless codelengths remain dominated by imperceptible high-frequency detail, so likelihoods lag specialized compression models. Generation requires a long sequence of network evaluations in pixel space. The experimental protocol is unconditional (or, in related tables, compared against class-conditional GANs); it is not I2I.

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r1.pdf — typically Figure 2, the directed    |
|   graphical model of the forward noising chain and the learned   |
|   reverse denoising chain.]                                      |
|                                                                  |
+------------------------------------------------------------------+
Fig. 1. Directed graphical model of a DDPM. Solid arrows denote the
learned reverse process; the forward process (dotted) is a fixed
Gaussian noising chain (source: Ho et al. [1], r1.pdf).
```

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r1.pdf — typically Figure 1, CelebA-HQ       |
|   faces (left) and CIFAR-10 grid (right).]                       |
|                                                                  |
+------------------------------------------------------------------+
Fig. 2. Unconditional samples reported by Ho et al. [1] on
CelebA-HQ 256 by 256 and CIFAR-10 (source: r1.pdf). These results
established that non-adversarial diffusion can match contemporaneous
GAN visual quality on standard benchmarks.
```

B. Latent Diffusion Models [2]

Pixel DDPMs of the form [1] become prohibitive at high resolution because the U-Net is evaluated on every RGB pixel, often for hundreds of steps. Rombach et al. [2] separate perceptual compression from semantic generation.

Autoencoder. An encoder maps an RGB image to a spatially structured latent with a downsampling factor (the paper emphasizes a moderate factor of four, rather than the aggressive factor of sixteen used in some VQGAN pipelines). A decoder reconstructs the image from that latent. Regularization is either KL or vector-quantized. Reconstruction FID and PSNR on ImageNet validation are used to argue that a factor of four preserves detail that factors of eight or sixteen destroy, while still reducing the dimensionality enough for diffusion to be affordable.

Latent denoiser. A DDPM-style U-Net operates on the compressed latent, not on RGB pixels. Time is injected as in [1]. High-resolution images are obtained convolutionally from the decoded latent.

Cross-attention conditioning. Token sequences from text, class labels, or bounding boxes are mapped into intermediate U-Net features by cross-attention. This mechanism is what later industrial systems popularized as “prompting.” Classifier-free or post-hoc guidance can further steer sampling without retraining.

Empirical results. The authors report highly competitive or then-state-of-the-art scores for class-conditional ImageNet synthesis, inpainting, text-to-image, unconditional generation, and super-resolution, at a fraction of the GPU-day cost of pixel diffusion models [2]. In their FID-versus-compute plots, latent models with downsampling factors of four or eight dominate both pixel diffusion and more aggressive latent compression.

Limitations. Sampling remains iterative. Layout control via bounding boxes and text is weaker than the later spatial adapters of [4]. Evaluation is FID/IS-centric on natural photographs, not on drawings.

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r2.pdf or r3.pdf — typically Figure 1,       |
|   DIV2K reconstructions comparing mild downsampling (theirs)     |
|   versus more aggressive compression, with PSNR and FID.]        |
|                                                                  |
+------------------------------------------------------------------+
Fig. 3. Effect of latent downsampling factor f on reconstruction
fidelity. Mild compression (f = 4) is argued to be near-optimal for
subsequent diffusion [2] (source: r2.pdf / r3.pdf).
```

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r3.pdf — U-Net with cross-attention /        |
|   overall LDM pipeline (autoencoder + denoising U-Net).          |
|   Often labeled as the method figure in Section 3.]              |
|                                                                  |
+------------------------------------------------------------------+
Fig. 4. Latent diffusion pipeline: a pretrained autoencoder provides
a compressed latent; a time-conditional U-Net denoises it; cross-attention
injects condition tokens [2] (source: r3.pdf).
```

C. Diffusion Transformers [3]

Almost every diffusion model after [1], including the LDM U-Net of [2], retains a convolutional encoder–decoder with skip connections. Peebles and Xie [3] replace that U-Net with a Vision Transformer operating on latent patches, and they study quality as a function of forward-pass complexity (Gflops) rather than parameter count alone.

Patchify. The latent is cut into square patches. The number of tokens is the number of such patches. Smaller patches yield more tokens and more Gflops. Frequency-based positional embeddings follow ViT practice.

Block design. The authors ablate in-context token concatenation, cross-attention, adaptive layer normalization (adaLN), and adaLN-Zero. In adaLN-Zero, residual scales are initialized at zero so each block begins as an identity map; this variant yields the best FID in their comparison. Class and timestep embeddings modulate normalization.

Scaling law (empirical). Holding training iterations fixed, increasing depth, width, or token count lowers FID. The largest configuration, DiT-XL/2, reaches an FID of 2.27 on class-conditional ImageNet at 256 by 256 pixels and also leads their 512 by 512 comparison against U-Net diffusion models such as ADM and LDM [3].

Limitations. The protocol is class-conditional ImageNet generation. There is no instruction, no second image, and no architectural drawing. DiT is nonetheless the architectural ancestor of later multimodal transformer denoisers.

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r4.pdf — typically Figure 1, selected        |
|   ImageNet 256 and 512 samples from DiT-XL/2.]                   |
|                                                                  |
+------------------------------------------------------------------+
Fig. 5. Class-conditional ImageNet samples from DiT-XL/2 [3]
(source: r4.pdf). Visual quality is the qualitative counterpart of
the FID numbers discussed in the text.
```

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r4.pdf — typically Figure 3, DiT overview:   |
|   patchify, DiT blocks, adaLN / in-context / cross-attention     |
|   variants.]                                                     |
|                                                                  |
+------------------------------------------------------------------+
Fig. 6. Diffusion Transformer architecture. Latents are patchified
and processed by transformer blocks; adaLN-Zero is the preferred
conditioning mechanism [3] (source: r4.pdf).
```

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r4.pdf — typically Figure 2, Gflops versus   |
|   FID bubble plot, and/or the scaling grids of model size vs     |
|   patch size.]                                                   |
|                                                                  |
+------------------------------------------------------------------+
Fig. 7. Empirical scaling: higher Gflops correlate with lower FID
for DiT models [3] (source: r4.pdf).
```

---

IV. Controllable Translation and Editing

Sections III-A–III-C explain how a photoreal image can be drawn from noise. The remaining papers ask how a user-specified constraint can redirect that process.

A. ControlNet: Spatial Conditioning of Frozen Text-to-Image Models [4]

Text prompts, even with the cross-attention of [2], are a poor language for layout, pose, and exact silhouettes. Zhang, Rao, and Agrawala [4] add image-shaped conditions—Canny edges, Hough lines, scribbles, human keypoints, segmentation, surface normals, depth, cartoon line drawings—without catastrophic forgetting of a large pretrained U-Net.

Locked backbone and trainable copy. The production Stable Diffusion U-Net remains frozen. A clone of the encoding (and middle) blocks is trained to read the conditioning image. The two streams communicate through zero convolutions: one-by-one convolutions whose weights and biases start at zero. At initialization the clone contributes nothing, so image quality of the pretrained model is preserved; during training the zero convolutions grow and inject spatial features.

Objective and prompt dropout. The learning rule remains noise prediction, now conditioned on both the text prompt and the spatial feature. Fifty percent of text prompts are replaced by empty strings so that the map can carry semantics by itself. Multiple ControlNets may be composed (for example depth and pose together). The authors report a sudden convergence phenomenon: after several thousand steps the model abruptly begins to follow the condition, rather than improving control gradually.

Inference. Classifier-free guidance is retained; a resolution-weighting heuristic is proposed so that CFG interacts stably with the extra branch.

Empirical results. Qualitative figures show tight adherence to Canny and pose maps, with optional text. Depth-to-image trained on a single consumer GPU is described as competitive with much larger industrial runs. User studies compare against strong conditional baselines. Training is reported to be robust from fewer than fifty thousand to more than one million images [4].

Limitations. The interface is a spatial map plus optional caption, not an edit instruction and not a style photograph. The frozen prior is a web-scale natural-image T2I model. Success is judged by visual map following and photoreal appearance.

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r5.pdf — typically Figure 1, ControlNet      |
|   teaser: Canny / pose inputs and controlled Stable Diffusion    |
|   outputs with default and customized prompts.]                  |
|                                                                  |
+------------------------------------------------------------------+
Fig. 8. Spatial control of a pretrained text-to-image diffusion
model using ControlNet [4] (source: r5.pdf).
```

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r5.pdf — architecture: locked U-Net blocks,  |
|   trainable copy, zero-convolution connections.]                 |
|                                                                  |
+------------------------------------------------------------------+
Fig. 9. ControlNet block: a frozen encoder is reused; a trainable
copy is attached with zero-initialized convolutions [4]
(source: r5.pdf).
```

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r5.pdf — typically Figure 4, “sudden         |
|   convergence,” and/or Figure 6, multi-condition composition.]   |
|                                                                  |
+------------------------------------------------------------------+
Fig. 10. Training dynamics and multi-condition composition in
ControlNet [4] (source: r5.pdf). Optional: include only one of the
two if space is limited.
```

B. InstructPix2Pix: Learning to Follow Editing Instructions [5]

Brooks, Holynski, and Efros [5] address a different user: one who types an instruction (“make his jacket out of leather”) rather than a full before/after caption or a spatial mask. Paired instruction–image–edit data do not exist at web scale, so the method first synthesizes a dataset and then finetunes a latent diffusion model.

Synthetic data. A GPT-3 model is finetuned on a small human-written set of (caption, instruction, edited-caption) triplets, then applied to LAION-style captions to produce many such triplets. Stable Diffusion, combined with Prompt-to-Prompt [6], renders a before image from the original caption and an after image from the edited caption while sharing layout. Prompt-to-Prompt is essential: without attention injection, the two samples would not form a usable paired edit.

Architecture. Weights are initialized from Stable Diffusion. The first convolution is widened so that the noisy latent is concatenated with the VAE encoding of the input image; new channels are zero-initialized. The text pathway, originally trained on captions, is fed the instruction.

Dual classifier-free guidance. Two independent guidance scales are used: one pulls the sample toward the input image, the other toward the instruction. During training, the image condition, the text condition, or both are randomly dropped (five percent of examples for each of those three cases). At inference the two scales are combined so the user can trade image faithfulness against instruction strength. No per-example inversion or finetuning is required; an edit is a single generative pass on the order of seconds [5].

Empirical results. Despite purely synthetic supervision, the model generalizes to real photographs and human-written instructions, covering object replacement, weather, medium, and style. Qualitative grids illustrate the two-scale guidance trade-off.

Limitations. The training domain is synthetic and inherits LAION and Stable Diffusion biases. Precise counting and rigid geometry are weak relative to natural-photo appearance edits. The formulation is one image + one instruction, not drawing + style reference + instruction.

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r6.pdf or r7.pdf — typically Figure 1,       |
|   instruction-edit grid (fruits to cake, leather jacket, etc.).] |
|                                                                  |
+------------------------------------------------------------------+
Fig. 11. Instruction-based edits produced by InstructPix2Pix [5]
(source: r6.pdf / r7.pdf).
```

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r6.pdf — data generation: GPT-3 triplets     |
|   plus Stable Diffusion and Prompt-to-Prompt paired images.]     |
|                                                                  |
+------------------------------------------------------------------+
Fig. 12. Synthetic paired-data pipeline of InstructPix2Pix [5]
(source: r6.pdf). This figure is the key “how the dataset exists”
diagram for Section IV-B.
```

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r6.pdf — typically Figure 4, two-axis CFG    |
|   (image scale versus instruction scale) for a fixed instruction.]|
|                                                                  |
+------------------------------------------------------------------+
Fig. 13. Dual classifier-free guidance. Horizontal and vertical
axes trade image faithfulness against instruction strength [5]
(source: r6.pdf).
```

C. Prompt-to-Prompt: Training-Free Cross-Attention Control [6]

Hertz et al. [6] start from the observation that, in a text-conditioned diffusion model, a small change to the prompt usually yields an entirely different sample. Masked inpainting, the then-standard workaround, discards structure inside the mask. Prompt-to-Prompt instead treats cross-attention maps—tensors that bind spatial locations to text tokens—as an editable handle.

Mechanism. A source trajectory is generated (or inverted) under a source prompt. A target trajectory under an edited prompt injects (copies or blends) selected attention maps from the source for a chosen subset of denoising steps. Three practical operators are described: (i) replace a token while freezing maps, which preserves composition while changing identity; (ii) add words while freezing maps of the original tokens, which supports global style; (iii) re-weight a token’s map to amplify or attenuate a concept.

Training. None. The method is an inference-time intervention on a frozen text-to-image model. Real photographs require an inversion so that a latent trajectory exists.

Empirical results. The paper is primarily qualitative: object swaps, style transfers, and local adjective control with an explicit trade-off between prompt fidelity and source layout [6].

Limitations. Performance is strongest on model-generated images that already lie on the diffusion manifold. Inversion of real images is imperfect. There is no learned instruction encoder and no second reference image. The user still edits by rewriting captions.

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r8.pdf — typically Figure 1, four editing    |
|   modes (re-weight, replace, style, refine).]                    |
|                                                                  |
+------------------------------------------------------------------+
Fig. 14. Prompt-to-Prompt applications controlled only by text [6]
(source: r8.pdf).
```

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r8.pdf — typically Figure 2, same seed with  |
|   versus without attention injection (e.g. “lemon cake” family).]|
|                                                                  |
+------------------------------------------------------------------+
Fig. 15. Attention injection versus seed sharing. Without injected
maps, a prompt edit produces a different scene [6] (source: r8.pdf).
```

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r8.pdf — typically Figure 3, method          |
|   overview: cross-attention maps as the control interface.]      |
|                                                                  |
+------------------------------------------------------------------+
Fig. 16. Method overview of Prompt-to-Prompt. Source attention maps
constrain the spatial layout of a second denoising run [6]
(source: r8.pdf).
```

D. SDEdit: Guided Synthesis via Stochastic Differential Equations [7]

Meng et al. [7] consider guides that are themselves RGB images: coarse colored strokes, composites, or stroke edits on a photograph. The desiderata are realism (the output should look like a natural image) and faithfulness (it should not ignore the guide). Conditional GANs would require a new dataset per task; GAN inversion would require a new loss per task.

Procedure. A pretrained SDE (score-based) generative model is hijacked. Gaussian noise is added to the guide up to a chosen noise level; the reverse SDE then denoises. A larger noise level increases realism and decreases faithfulness. No task-specific training or extra loss is used.

Tasks. Stroke painting to image, stroke-based editing, and image compositing.

Empirical results. In human studies on stroke-to-image, SDEdit is preferred over GAN baselines by up to 98.09% on realism and 91.72% on overall satisfaction in the numbers reported by the authors [7]. Compositing improves faithfulness relative to the inversion systems they compare.

Limitations. The guide is pixel RGB, not language and not an explicit semantic map. The noise-level knob is global. The prior is trained on natural-image domains (faces, scenes), not construction drawings.

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r9.pdf — typically Figure 1, three rows:     |
|   stroke-to-image, compositing, stroke editing.]                 |
|                                                                  |
+------------------------------------------------------------------+
Fig. 17. SDEdit applications: stroke painting, compositing, and
stroke-based editing [7] (source: r9.pdf).
```

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r9.pdf — typically Figure 2, “hijack” the    |
|   reverse SDE from a noisy guide at a chosen noise level.]       |
|                                                                  |
+------------------------------------------------------------------+
Fig. 18. Core idea of SDEdit. Noise is added to the user guide;
the reverse SDE produces a realistic image whose structure is
inherited from that noisy state [7] (source: r9.pdf).
```

E. Palette: Unified Conditional Diffusion for I2I [8]

Saharia et al. [8] ask whether one conditional diffusion recipe, without per-task GAN auxiliary losses or architecture surgery, can cover a family of I2I problems.

Tasks and architecture. Palette is a pixel-space conditional denoiser. The network sees the corrupted input (grayscale for colorization; a masked image for inpainting; a cropped canvas for uncropping; JPEG artifacts for restoration) together with the noisy target. Self-attention is shown to matter empirically. The denoising objective is studied with squared error versus absolute error; the choice affects sample diversity.

Evaluation protocol. The authors advocate a unified ImageNet protocol: FID, Inception Score, classification accuracy of a pretrained ResNet-50, perceptual distance to the original, and human ratings. A multi-task generalist is compared with task-specific specialists.

Empirical results. The simple implementation outperforms strong GAN and regression baselines on all four tasks without task-specific hyperparameter tuning. The generalist matches or exceeds specialists. Sequential fifty-percent uncropping is used to extrapolate a central 256 by 256 crop into a wide panorama [8].

Limitations. There is no free-form language condition and no separate style photograph. Sampling is expensive. Benchmarks are natural ImageNet photos.

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r10.pdf — teaser or task collage:            |
|   colorization, inpainting, uncropping, JPEG restoration.]       |
|                                                                  |
+------------------------------------------------------------------+
Fig. 19. Four I2I tasks addressed by a single Palette recipe [8]
(source: r10.pdf).
```

```
+------------------------------------------------------------------+
|                                                                  |
|  [PASTE FIGURE FROM r10.pdf — typically Figure 2, stepwise       |
|   uncropping to a wide panorama.]                                |
|                                                                  |
+------------------------------------------------------------------+
Fig. 20. Iterative Palette uncropping from a central crop to a
panorama [8] (source: r10.pdf).
```

---

V. Comparative Discussion

A. Where denoising happens

References [1] and [8] denoise in pixel space. The inductive bias is strong and the implementations are conceptually simple, but compute scales with resolution times step count. Reference [2] shows that a VAE latent with mild spatial downsampling preserves enough spatial structure for a U-Net (or, later, a transformer [3]) to model semantics, while decoding restores high-frequency appearance. ControlNet [4] and InstructPix2Pix [5] inherit that latent U-Net ecosystem. SDEdit [7] may be implemented with pixel-space score models; the conceptual object is the reverse SDE, not a particular autoencoder.

B. Denoiser architecture

U-Nets with residual blocks and sparse self-attention appear in [1], [2], [4], [5], and [8]. DiT [3] demonstrates that this inductive bias is not required for class-conditional generation: patchified latents and adaLN-Zero transformers scale smoothly in Gflops and outperform the U-Net diffusion models plotted in that paper. The implication for later systems is architectural, not task-level: [3] does not itself solve I2I.

C. Form of user control

Table I summarizes how the user specifies an edit. The rows are mutually distinct interfaces. Combining them in one trained system is not demonstrated in this corpus.

TABLE I  
USER CONTROL INTERFACES IN THE REVIEWED CORPUS

| Interface | Representative work | Typical input | Additional training |
| --- | --- | --- | --- |
| Unconditional / class | [1], [3] | none / class id | full generative model |
| Latent T2I and general tokens | [2] | text, class, boxes | LDM on paired conditions |
| Degraded-image I2I | [8] | grayscale, mask, crop, JPEG | conditional DM |
| RGB guide + noise time | [7] | strokes, composite | none (pretrained SDE) |
| Prompt rewrite + attention | [6] | source/target captions | none |
| Spatial map + frozen T2I | [4] | edges, depth, pose, … | ControlNet copy |
| Instruction + image | [5] | photo + sentence | synthetic pairs, SD finetune |

Conditional GANs, as discussed inside [7] and [8], learn a direct mapping from the condition to the output image and often require auxiliary structure losses. Diffusion replaces that mapping with iterative score estimation. The cost is sequential sampling; the benefit, in the papers’ own evaluations, is improved diversity, simpler objectives, and, for [7], the reuse of a single unlabeled prior across tasks.

D. Structure versus appearance

Only ControlNet [4] treats a geometric or semantic map as the primary interface. InstructPix2Pix [5] and Prompt-to-Prompt [6] are linguistic; layout is preserved only insofar as image concatenation or attention injection capture it. SDEdit [7] preserves coarse RGB structure through the chosen noise level. Palette [8] preserves the known pixels of each restoration task. No paper jointly optimizes a drawing, a style photograph, and an instruction.

E. Training versus training-free methods

A second orthogonal cut is whether new weights are learned. DDPM, LDM, DiT, Palette, ControlNet, and InstructPix2Pix all train (or finetune) a denoiser. SDEdit and Prompt-to-Prompt do not. Training-free methods are attractive when paired data are scarce, but they inherit the domain of the frozen prior and, in the case of [6], an inversion problem for real photographs.

---

VI. Research Gaps

The following gaps are left open by [1]–[8]. They are stated with respect to drawing-conditioned architectural visualization because that is a natural downstream reading of I2I. This paper does not claim that a student implementation closes these gaps at the level of model training. It claims only that they remain visible after a close reading of the corpus.

Gap 1 — Drawings as a domain. DDPM [1] and DiT [3] generate from noise or class labels. LDM [2] conditions on text and coarse boxes. Palette [8] conditions on natural-image degradations. Plans, elevations, and CAD linework are not reported test domains. Whether openings, spans, and alignment survive photoreal decoding is therefore unevaluated.

Gap 2 — The triple condition. ControlNet [4] supplies layout without instruction-following data of the InstructPix2Pix kind. InstructPix2Pix [5] supplies instructions without a second style image or a hard spatial map. Prompt-to-Prompt [6] rewrites captions. SDEdit [7] uses RGB strokes. No experiment in this set trains or measures drawing + style photograph + natural language as one job.

Gap 3 — Photoreal metrics versus design intent. FID, Inception Score, ResNet accuracy, perceptual distance, and generic human photorealism votes [1]–[3], [7], [8] are built around natural photographs. Messy sketches, orthographic drawings, and material boards are out of distribution. Criteria such as program, circulation, or constructability do not appear.

Gap 4 — Hard geometry and counting. Instruction models [5] are weaker when the text demands exact object counts or rigid geometry. Attention injection [6] preserves layout only as encoded in maps. SDEdit [7] can invent structure if the noise level is large. Hard geometric fidelity is not a first-class loss in any of the eight papers.

Gap 5 — Latency. Reference [1] uses one thousand pixel-space steps; [8] is likewise a heavy sampler; [2] reduces but does not eliminate steps; [5] reports “seconds,” not an interactive bound. Few-step distillation is outside this corpus.

Gap 6 — Systems layer. All eight papers are algorithm papers. They do not specify a desktop client that packages two images and a prompt as a job, nor a split between a local workstation and a remote inference worker.

Gap 7 — User-centered evaluation. There is no protocol in this set for the question: did the render still match the drawing that a designer signed off?

---

VII. Conclusion

This manuscript has rewritten a working literature draft as a survey-style IEEE paper over eight unique publications. Denoising diffusion [1] supplies the training identity. Latent diffusion [2] makes high-resolution synthesis practical and introduces cross-attention as a general conditioner. Diffusion Transformers [3] show that the U-Net is not fundamental. ControlNet [4], InstructPix2Pix [5], Prompt-to-Prompt [6], SDEdit [7], and Palette [8] then illustrate five incompatible—but complementary—ways of telling a generative model what to change. Taken together, they justify describing modern controllable rendering as conditional latent diffusion with optional spatial and language interfaces. They do not, individually or jointly, constitute a validated drawing-plus-style-plus-instruction system for architectural practice. Subsequent implementation work should cite [1]–[8] as consumed foundations and should state clearly that product integration, latency engineering, and designer-facing evaluation remain application-level contributions rather than new generative-model results.

---

Acknowledgment

The authors thank the course supervisor for guidance. Figures reproduced in the camera-ready version must follow the copyright policy of NeurIPS, IEEE CVPR/ICCV, ICLR, and ACM SIGGRAPH as applicable to [1]–[8].

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

---

Appendix A — File-to-Citation Map (not part of the IEEE bibliography)

Use this table only while assembling figures from the Downloads folder. Delete the appendix before final submission if the department forbids it.

| Uploaded file | Paper | Cite | Suggested figures in this manuscript |
| --- | --- | --- | --- |
| r1.pdf | DDPM | [1] | Fig. 1, Fig. 2 |
| r2.pdf, r3.pdf | LDM | [2] | Fig. 3, Fig. 4 |
| r4.pdf | DiT | [3] | Fig. 5, Fig. 6, Fig. 7 |
| r5.pdf | ControlNet | [4] | Fig. 8, Fig. 9, Fig. 10 |
| r6.pdf, r7.pdf | InstructPix2Pix | [5] | Fig. 11, Fig. 12, Fig. 13 |
| r8.pdf | Prompt-to-Prompt | [6] | Fig. 14, Fig. 15, Fig. 16 |
| r9.pdf | SDEdit | [7] | Fig. 17, Fig. 18 |
| r10.pdf | Palette | [8] | Fig. 19, Fig. 20 |

Appendix B — Word Formatting Checklist

1. Title: 24 pt, centered. Author block: 11 pt.  
2. Abstract: italic or IEEE Abstract style, 150–200 words (this draft is slightly long; trim if the conference cap is 150).  
3. Body: 10 pt Times (IEEEtran) or 11 pt for a college report.  
4. Captions: “Fig. N.” in 8–9 pt, below the image; table titles above Table I.  
5. In-text citations: hard brackets `[1]`, not superscript, unless the department demands otherwise.  
6. After pasting figures, update cross-references (“as shown in Fig. 8”).  
7. If two-column layout squeezes a wide teaser, place that figure as a page-wide float at the top of a page (`span` two columns in Word: Insert → Text Box full width, or use the IEEE template’s `figure` equivalent).