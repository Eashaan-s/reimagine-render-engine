# 50% — Workflow mapping

**What this milestone proves:** UI values are injected into the same ComfyUI API nodes the final product uses. Generate does **not** call a GPU.

**Copied from:** repository root `workflowBuilder.js` and `workflows/` (nodes unchanged).

## Node map (frozen)

| UI input | ComfyUI node | Field |
|----------|--------------|-------|
| Base wireframe | **370** (`LoadImage`) | `inputs.image` → `reimagine_base.png` |
| Style reference | **371** (`LoadImage`) | `inputs.image` → `reimagine_style.png` |
| Tags + texture prompt | **377** (`TextEncodeQwenImageEditPlus`) | `inputs.prompt` |
| Steps / CFG / Sampler / Seed | **368** (`KSampler`) | `inputs.steps`, `cfg`, `sampler_name`, `seed` |

Defaults: 4 steps, CFG 1.0, sampler `euler`, random seed if unset.

## Payload shape (same as production)

```json
{
  "input": {
    "workflow": { "...": "ComfyUI API prompt" },
    "images": [
      { "name": "reimagine_base.png", "image": "<base64>" },
      { "name": "reimagine_style.png", "image": "<base64>" }
    ]
  }
}
```

At 50% the JSON is written under Electron `userData/mapped-workflows/` with image bytes omitted. After Generate, **Output** shows a labeled exhibit (your drawing, optional style, banner **MAPPED JOB · GPU worker not attached**). Export and history work on that exhibit. Tell the panel this is proof the client maps and displays; it is **not** a photoreal GPU render.

## How to demo tomorrow

```bash
cd progress/50-workflow-mapping
npm install
npm start
```

1. Import a wireframe (and optional style).
2. Click Generate.
3. Output panel fills; Export a PNG; status says Mapped.
4. Optionally open the JSON path from the status line (userData/mapped-workflows).

## How to run

```bash
cd progress/50-workflow-mapping
npm install
npm run convert-workflow
npm start
```

## Intentionally missing

- RunPod API key / endpoint
- POST `/run` and poll `/status/{id}`
- Output canvas image from a worker

**Previous:** [`../30-ui-shell`](../30-ui-shell) · **Next:** [`../70-runpod-generate`](../70-runpod-generate)
