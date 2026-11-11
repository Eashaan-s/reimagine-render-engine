# Rendering workflow graph

End-to-end path from drawing to photoreal output. Boxes are software steps, not PowerPoint slides.

## Main graph

```mermaid
flowchart TD
  startNode[User_has_a_drawing]
  upload[Upload_to_Input_panel]
  extras[Optional_style_photo_and_text]
  generate[Click_Generate]
  renderer[Renderer_collects_images_and_fields]
  preload[Preload_bridge]
  mainProc[Main_process]
  mapper[Job_packer_workflowBuilder]
  n370[Slot_370_drawing]
  n371[Slot_371_style]
  n377[Slot_377_instruction]
  n368[Slot_368_sampler]
  job[Job_file_workflow_plus_images]
  worker[GPU_worker_paints_photoreal]
  png[PNG_returned]
  output[Output_panel]
  export[Export_or_history]

  startNode --> upload
  upload --> extras
  extras --> generate
  generate --> renderer
  renderer --> preload
  preload --> mainProc
  mainProc --> mapper
  mapper --> n370
  mapper --> n371
  mapper --> n377
  mapper --> n368
  n370 --> job
  n371 --> job
  n377 --> job
  n368 --> job
  job --> worker
  worker --> png
  png --> output
  output --> export
```

## Where each implementation stage sits

```mermaid
flowchart LR
  subgraph stage30 [Stage_30_window]
    s1[Upload_drawing]
    s2[App_window]
  end
  subgraph stage50 [Stage_50_packer]
    s3[Job_packer]
    s4[Job_file]
  end
  subgraph stage70 [Stage_70_client]
    s5[IPC_export_history_status]
  end
  subgraph stage100 [Stage_100_render]
    s6[GPU_worker]
    s7[Photoreal_in_Output]
  end
  s1 --> s2 --> s3 --> s4 --> s5 --> s6 --> s7
```

## Same graph in one line

User drawing → Input panel → Generate → Renderer → Preload → Main → Job packer (370, 371, 377, 368) → Job file → GPU worker → PNG → Output → Export

Stage 30 stops after the window. Stage 50 stops after the job file. Stage 70 is the full client ready to send that file. Stage 100 is the worker returning the photoreal PNG.
