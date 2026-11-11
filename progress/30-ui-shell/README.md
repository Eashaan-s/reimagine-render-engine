# 30% — UI shell

**What this milestone proves:** a desktop window that matches the final product layout so a user can import a wireframe, add a style reference, and set prompt / presets. No GPU job runs.

**Product this is copied from:** repository root (Reimagine Render Engine). Design is unchanged.

## Information architecture

| Column | Role |
|--------|------|
| Generate Style & Prompt | Texture prompt, reference image, style / tags / lighting |
| Input | Base wireframe, metadata, Simple / Advanced sampler controls |
| Output | Placeholder for a later render, export, history strip |

Custom title bar: **Reimagine Render Engine** only (no lab banner). Window controls stay on the right.

## How to run

```bash
cd progress/30-ui-shell
npm install
npm start
```

## Intentionally missing

- ComfyUI workflow injection (`workflowBuilder`)
- RunPod `/run` and `/status` polling
- `.env` credentials

Clicking **Generate** shows a milestone message instead of submitting a job.

**Next:** [`../50-workflow-mapping`](../50-workflow-mapping)
