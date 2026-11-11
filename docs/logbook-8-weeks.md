# Weekly progress logbook (15 weeks)

Student product: **Reimagine Render Engine** — desktop app that turns an architectural wireframe (plus optional style reference and a short instruction) into a photorealistic preview.

Fill in **Date** on your college form. Weeks are numbered 1–8 so you can match your calendar. First person, past tense — copy each block into the official logbook.

Runnable evidence: `progress/30-ui-shell` (week 2–3), `progress/50-workflow-mapping` (week 4–5), repository root (week 8 documentation). Weeks 1–7 do **not** require a live hosted-GPU demonstration.

---

## Week 1 — Problem, scope, and product identity

**Date:** _______________

**Objective.** Define the capstone as a student-owned desktop tool (not a third-party lab banner) and freeze the scientific problem: image-to-image architectural preview from a drawing.

**Work done.** Wrote the problem statement (slow CGI vs. early 2D drawings). Stripped third-party lab branding from the window title, README, and application id so the title bar reads only **Reimagine Render Engine**. Confirmed the three-column layout would stay; the render graph would not be rewritten.

**Outcome.** A named product and a clear non-goal: I am not training a new network this term; I am building a usable client around a fixed image-edit graph.

**Next week.** Implement the desktop shell so a user can import images even if Generate is not connected.

---

## Week 2 — Desktop shell (30%)

**Date:** _______________

**Objective.** Ship a runnable window that matches the final information architecture.

**Work done.** Built / copied the Electron UI: custom title bar, **Generate Style & Prompt**, **Input**, **Output**. Wired import and drag-and-drop for the base wireframe and optional reference image. Generate is present but blocked with a milestone message (`progress/30-ui-shell`).

**Outcome.** A professor can open the 30% snapshot, import a PNG, and see the same layout as the finished app without any inference backend.

**Next week.** Polish interaction: presets, lighting, Simple/Advanced sampler controls, status bar.

---

## Week 3 — Interaction polish

**Date:** _______________

**Objective.** Make the shell usable as a design tool, not only a static mock.

**Work done.** Multi-select chips for style presets, tags, and lighting. Simple vs Advanced (sampler, steps, CFG, seed). Status bar states (idle / busy / error). Preview resolution and filename on the Input panel. Export and history strip remain in the layout for later weeks.

**Outcome.** All user-facing fields that later fill the node graph exist in the UI.

**Next week.** Map those fields onto the frozen ComfyUI node IDs.

---

## Week 4 — Workflow mapping (50%)

**Date:** _______________

**Objective.** Prove that UI values land on the same graph nodes the production job uses.

**Work done.** Integrated `workflowBuilder.js`: node **370** (base image), **371** (style image), **377** (prompt), **368** (sampler). Generate in `progress/50-workflow-mapping` builds the API prompt and writes mapped JSON under the app user-data folder. No GPU job is submitted.

**Outcome.** I can show a JSON job whose node IDs match the literature-facing “structure + instruction + sampler” story.

**Next week.** Document the prompt assembly and the image payload shape.

---

## Week 5 — Prompt assembly and job package

**Date:** _______________

**Objective.** Make the job self-contained: human instruction plus two image slots.

**Work done.** `assemblePrompt` combines the lead sentence, style presets, tags, lighting, and the texture textarea. Base/style files are named `reimagine_base.png` / `reimagine_style.png` in the package. `convert-workflow` remains the path from a ComfyUI UI export to `workflow-api.json`. Confirmed defaults: 4 steps, CFG 1.0, Euler, random seed if unset.

**Outcome.** Anyone can explain the package as “drawing + optional style photo + text + sampler settings” without opening ComfyUI.

**Next week.** Implement client features around the mapped job: export, history, status, and window controls.

---

## Week 6 — Client implementation (export, history, status)

**Date:** _______________

**Objective.** Turn the mapped job into a usable desktop tool: save results, keep a local history, and show clear status — still without a vendor GPU login.

**Work done.** Implemented Output **Export** (`export-image` IPC, PNG save dialog under Pictures / Reimagine Renders). Added the history strip (`addToHistory`, `selectHistoryItem`, `open-renders-folder`). Wired the custom title-bar min/max/close (`windowControl`). Connected the status bar (`setStatus`) and generate loading overlay so the user sees idle / mapping / error instead of a silent wait. Confirmed Simple vs Advanced still writes sampler, steps, CFG, and seed into the payload that `buildWorkflowPayload` consumes.

**Outcome.** After a job is mapped (or, later, after an image returns), the user can export a PNG, reopen recent outputs, and read what the app is doing. This week is application code, not a literature chapter.

**Next week.** Wire Generate through Electron IPC end-to-end so the mapped job is ready for an inference worker, without vendor credentials.

---

## Week 7 — End-to-end client wiring (no vendor config)

**Date:** _______________

**Objective.** Connect renderer → preload → main → `buildWorkflowPayload` so Generate is a real IPC round-trip.

**Work done.** Documented and verified `window.reimagine.generateRender` → `trigger-generation` → workflow JSON. The job is ready for an **inference worker** (GPU image-edit). Did not configure or demonstrate a specific cloud vendor, API key, or endpoint in this week’s review materials.

**Outcome.** 70% of the system: a complete client-side job. Remaining stage is attaching a particular hosted GPU provider.

**Next week.** Architecture diagrams (full vs 70%) and this logbook for submission.

---

## Week 8 — Architecture, workflow write-up, logbook

**Date:** _______________

**Objective.** Materials a supervisor can read without running code.

**Work done.** Wrote `docs/system-architecture.md` (full component/function map), `docs/system-architecture-70.md` (inference worker as a black box, no vendor config), and this logbook. Explained the user workflow in plain language.

**Outcome.** Submission pack: weekly log, 70% architecture for the current review, full architecture for the final report.

**Next week.** Connect Generate to a real inference worker while keeping nodes 370, 371, 377, and 368 unchanged.

---

## Week 9 — Inference worker attached (100% generate path)

**Date:** _______________

**Objective.** Turn the mapped job from weeks 4–8 into a live image-edit run: the GPU worker must return a PNG without changing the frozen graph.

**Work done.** Wired Generate from the renderer through preload and main into an inference client. The client submits the workflow JSON plus base64 images (`reimagine_base.png` and optional `reimagine_style.png`) and polls until a PNG returns. Progress strings go to the status bar. Confirmed `workflowBuilder` still overwrites only nodes **370**, **371**, **377**, and **368**. If no style image is present, node 371 and encoder `image2` inputs are dropped.

**Outcome.** A complete input-to-output journey exists: drawing, optional style, instruction, and sampler settings become one job; Output shows the PNG with seed, prompt, time, and pixel size.

**Next week.** Harden backend choice, errors, and the three-megapixel resolution policy.

---

## Week 10 — Backend selection, errors, and resolution policy

**Date:** _______________

**Objective.** Make inference reliable enough for a demo: hosted versus local worker, honest errors, documented canvas size.

**Work done.** Implemented backend resolution (hosted GPU when credentials exist, otherwise local ComfyUI, unless `RENDER_BACKEND` is forced). Added connection checks and optional local engine start. Mapped common failures (missing drawing, missing credentials, unreachable engine, payment or paused endpoint) to the status bar. Confirmed `ImageScaleToTotalPixels` at three megapixels with Lanczos; Output reports returned PNG width and height. Stated this is a 2K-class budget, not 8K pixels.

**Outcome.** Generate either returns a PNG or a readable error. Resolution is an implementation policy.

**Next week.** Ground the product in published I2I and diffusion papers.

---

## Week 11 — Literature notes and related-work spine

**Date:** _______________

**Objective.** Collect paraphrased notes on the papers that justify the product.

**Work done.** Noted pix2pix, CycleGAN, DDPM, latent diffusion, DiT, ControlNet, InstructPix2Pix, Prompt-to-Prompt, SDEdit, and Palette, each with a product hook. Recorded Qwen Image Edit, Qwen2.5-VL, and LoRA/Lightning as consumed, not student-trained. Drafted the related-work spine: GAN I2I → diffusion → editing → desktop packaging.

**Outcome.** A citation spine exists. Week 1’s non-goal (no new network) is backed by named papers.

**Next week.** IEEE-style related work plus a comparative table.

---

## Week 12 — IEEE related work and literature-survey table

**Date:** _______________

**Objective.** Write related work in IEEE numbered style, with a survey table that has a literature-gap column and a column for the gap this application covers.

**Work done.** Drafted abstract (audience, problem, scope, non-claim), introduction flowchart, related work, and TABLE I for papers [1]–[10] (method, reported focus, literature gap, gap covered by the application). Stated coverage is systems-level only. Added tech references for Qwen-Image, Qwen2.5-VL, and LoRA. Did not add a second gap-synthesis essay.

**Outcome.** Related work is ready to paste into the blackbook / IEEE paper.

**Next week.** Qualitative evaluation criteria and staged screenshots.

---

## Week 13 — Qualitative evaluation and visual results

**Date:** _______________

**Objective.** Define evaluation without inventing FID or SSIM numbers, and capture pipeline screenshots.

**Work done.** Wrote four criteria: geometric faithfulness, style/material transfer, instruction following against the stored prompt, and concept-preview usefulness. Captured the three-column UI, an instruction-only edit, stage-wise triples (wireframe / reference / output), and one wireframe under several scenarios. Confirmed Output shows natural width × height. Documented SSIM/LPIPS only as future work.

**Outcome.** Results chapter can use figures and a criteria table, without fake accuracy percentages.

**Next week.** Assemble the blackbook-style report.

---

## Week 14 — Blackbook report assembly

**Date:** _______________

**Objective.** Put the capstone into the college report skeleton.

**Work done.** Assembled Chapters 1–6: introduction and contributions; literature survey and Table 1; methodology (Electron layers, software spec, frozen nodes, ten-step procedure); evaluation and qualitative investigation; advantages, limitations, applications; short conclusion and future scope. Figure slots 1–7 point to week-13 screenshots.

**Outcome.** A departmental-style report aligned with the running desktop product.

**Next week.** Final freeze, demo checklist, and allowed viva claims.

---

## Week 15 — Final freeze, demo pack, and viva claims

**Date:** _______________

**Objective.** Close the 15-week log: freeze the product story, the demo path, and examination claims.

**Work done.** Rechecked non-claims: no new trained model, no BIM, no construction-accurate 3-D, no 8K pixel guarantee, no FID/SSIM unless measured. Prepared a viva path: import drawing, optional style, chips plus texture prompt, Generate, show seed and resolution, Export, history. Listed future work (architectural test set, optional edge constraint, local-only lab notes). Confirmed repository root is the final client; `progress/` remains staged 30/50/70 evidence.

**Outcome.** Fifteen-week record is complete. The product is a designer-facing frozen-workflow I2I client; the literature is cited as consumed foundations.

**Next week.** None (term log complete).

---

## Sign-off

| Week | Student initials | Supervisor initials |
|------|------------------|---------------------|
| 1 | | |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |
| 10 | | |
| 11 | | |
| 12 | | |
| 13 | | |
| 14 | | |
| 15 | | |
