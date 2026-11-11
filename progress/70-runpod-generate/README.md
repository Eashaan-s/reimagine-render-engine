# 70% — RunPod generate

**What this milestone proves:** the production pipeline end-to-end: map UI → ComfyUI API prompt → RunPod `POST /run` → poll `/status/{id}` → show PNG → export.

**Copied from:** repository root `runpodClient.js`, `workflowBuilder.js`, and renderer. Local ComfyUI is omitted so the capstone story stays on RunPod.

```mermaid
sequenceDiagram
  participant UI as Renderer
  participant Main as Electron_main
  participant WB as workflowBuilder
  participant RP as RunPod

  UI->>Main: trigger-generation
  Main->>WB: inject nodes 370 371 377 368
  Main->>RP: POST /run workflow plus images
  loop poll
    Main->>RP: GET /status/id
  end
  RP-->>Main: COMPLETED image
  Main-->>UI: imageBase64 seed prompt
```

## Environment

```bash
cd progress/70-runpod-generate
npm install
cp .env.example .env
# set RUNPOD_API_KEY and RUNPOD_ENDPOINT_ID
npm start
```

Failure modes (same as the final app): missing keys, job `FAILED`/`CANCELLED`, poll timeout (`POLL_TIMEOUT_MS`, default 10 minutes).

## Intentionally missing vs 100%

- Local ComfyUI backend / splash auto-start
- Windows installer (`electron-builder`)
- Course literature survey and packaging polish (those live at 100% / repo root)

**Previous:** [`../50-workflow-mapping`](../50-workflow-mapping) · **Final:** [repository root](../../) · notes: [`../100-final`](../100-final)
