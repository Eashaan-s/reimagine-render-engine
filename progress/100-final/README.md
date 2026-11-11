# 100% — Final product (repository root)

The **canonical application is not duplicated here.** Open the repo root:

`c:\Users\shank\reimagine-render-engine` (or the clone root)

That tree is the complete Reimagine Render Engine: three-column UI, ComfyUI node mapping, RunPod generate/poll/export, and packaging scripts. Third-party lab branding has been removed from the title bar source, README, and `package.json` (`appId`: `com.reimagine.renderengine`).

## What 100% adds over 70%

| Item | Where |
|------|--------|
| Full main process (including optional local ComfyUI for other machines) | [`../../main.js`](../../main.js) |
| Windows installer | `npm run dist` in the root |
| Architecture + payload docs | [`../../README.md`](../../README.md) |
| Literature survey (course chapter starter) | [`../../docs/literature-survey.md`](../../docs/literature-survey.md) |
| 8-week logbook | [`../../docs/logbook-8-weeks.md`](../../docs/logbook-8-weeks.md) |
| Full system architecture | [`../../docs/system-architecture.md`](../../docs/system-architecture.md) |
| 70% architecture (no vendor config) | [`../../docs/system-architecture-70.md`](../../docs/system-architecture-70.md) |

## Demo script (live)

1. From the **repository root**: `npm install`, copy `.env.example` → `.env`, set RunPod keys.
2. `npm start`. Confirm title bar: **Reimagine Render Engine** only.
3. Import a wireframe (Input). Optional: style reference + prompt.
4. Generate. Status bar should show RunPod job states, then the output PNG.
5. Export to Pictures / Reimagine Renders.

If you must show earlier %: run `progress/30-ui-shell`, then `50-workflow-mapping`, then `70-runpod-generate`. Do not present those as the shipped product.

## How this maps to a report

1. Problem: slow photoreal arch viz from drawings.
2. Related work: [`docs/literature-survey.md`](../../docs/literature-survey.md).
3. Method: Qwen-Image-Edit workflow on RunPod; Electron desktop; nodes 370 / 371 / 377 / 368 frozen.
4. Implementation milestones: 30 / 50 / 70 / 100 as in [`progress/`](../).
5. Evaluation (suggested): qualitative before/after + optional SSIM/LPIPS vs wireframe structure (cite Wang 2004, Zhang 2018); expert review (Pizarro et al. 2023).
