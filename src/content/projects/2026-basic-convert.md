---
slug: 2026-basic-convert
title: BasicConverter
subtitle: 'Universal media converter built for accelerated, high-volume batch processing.'
year: '2026'
month: '03'
category: program
layout: coding_v2
categoryMeta:
  type: Desktop Application
  platform: Windows
  focus: 'Batch media conversion, format mapping and accelerated processing'
entryLines:
  - 'Type: Desktop Application'
  - 'Platform: Windows'
  - 'Focus: Batch media conversion, format mapping and accelerated processing'
role: Lead Designer and Programmer
location: New Ultraviolet Systems Basic
disciplines:
  - code-programs
  - media-pipeline
  - batch-processing
  - automation-tools
omitTechStack: true
omitLinkStack: true
hidden: false
hideFromWorkPage: false
techStack: []
collaborators: []
links: {}
media:
  gallery:
    - type: image
      src: /images/projects/2026-basic-convert/BasicConverter-hero.png
      caption: Converting an Audio File turns the program red!
  heroImage: /images/projects/2026-basic-convert/BasicConverter-default.png
  heroFit: width
  omitFeaturedFromGallery: false
shortDescription: 'Universal media converter built for accelerated, high-volume batch processing.'
client: New Ultraviolet Systems Basic
moreWork:
  - test-title
  - signal-weaver
---
## Built for mixed-format batches

BasicConverter is designed around converting large groups of media without configuring every file individually. Files and folders can be collected into a single batch, assigned a target device or custom preset, and processed using format-specific conversion rules.

Rather than treating every input the same, the application allows compatible formats to be mapped to different outputs and processing engines before conversion begins.

- **Batch input.** Add individual files or entire folders and prepare them as a single conversion job.
- **Format mapping.** Define how detected input formats should be converted instead of applying one output format across the entire batch.
- **Engine-aware processing.** Route conversions through compatible processing engines and configure output behavior for different media types.
- **Reusable presets.** Save device or conversion configurations instead of rebuilding the same settings for repeated jobs.
- **Format-aware theming.** The interface shifts by the primary media category: purple for video, red for audio, orange for PDF, mint green for archives, and cyan for office or general formats. The color change gives an immediate indication of the active media type.

## Workflow

<div class="codingv2-workflow" role="list" aria-label="Workflow steps">
  <div class="codingv2-workflow-step" role="listitem"><strong>Add</strong><p>Select files or folders to build the input batch.</p></div>
  <span class="codingv2-workflow-arrow" aria-hidden="true">→</span>
  <div class="codingv2-workflow-step" role="listitem"><strong>Target</strong><p>Choose a device profile or custom conversion preset.</p></div>
  <span class="codingv2-workflow-arrow" aria-hidden="true">→</span>
  <div class="codingv2-workflow-step" role="listitem"><strong>Map</strong><p>Assign compatible output formats and conversion engines.</p></div>
  <span class="codingv2-workflow-arrow" aria-hidden="true">→</span>
  <div class="codingv2-workflow-step" role="listitem"><strong>Convert</strong><p>Run the batch and generate the configured outputs.</p></div>
</div>

## Control without clutter

BasicConverter exposes considerably more configuration than BasicMP3, so the interface is organized around progressive levels of control. Common batch settings remain visible at the top of the workspace, while format mappings, engine settings and output configuration are separated into dedicated tabs.

The goal was to keep large conversion jobs configurable without forcing every option onto the screen at once. Device presets provide a faster starting point, while custom settings leave the underlying conversion pipeline accessible when more control is needed.

The cyan and red hero views demonstrate this format-aware system across general and audio conversion modes; the same structure carries through the purple, orange, and mint variants.
