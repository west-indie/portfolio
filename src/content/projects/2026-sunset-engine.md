---
slug: 2026-sunset-engine
title: Sunset Engine
subtitle: 'VST synth plug-in with a groove engine and deep filter shaping, inspired by lo-fi, jungle, house, and Miami bass.'
year: '2026'
month: '02'
category: tooling
layout: coding_v2
tags:
  - C++
  - JUCE
  - CMake
  - VST3
  - DSP (Digital Signal Processing)
categoryMeta:
  type: VST3 instrument plug-in
  platform: Windows / VST3
  focus: 'Groove-driven synthesis, filter shaping and character processing'
entryLines:
  - 'Type: VST3 instrument plug-in'
  - 'Platform: Windows / VST3'
  - 'Focus: Groove-driven synthesis, filter shaping and character processing'
role: Lead Designer and Programmer
location: New Ultraviolet Systems Basic
disciplines:
  - interactive-media
  - creative-coding
  - electronic-instrument-design
  - sound
omitTechStack: false
omitLinkStack: true
omitWorkflow: true
hidden: false
hideFromWorkPage: false
techStack:
  - C++
  - JUCE
  - CMake
  - VST3
  - DSP (Digital Signal Processing)
collaborators: []
links: {}
media:
  gallery: []
  heroImage: /images/projects/2026-sunset-engine/SunsetEngine2026040712PIMG.png
  heroFit: width
  omitFeaturedFromGallery: false
shortDescription: 'VST synth plug-in with a groove engine and deep filter shaping, inspired by lo-fi, jungle, house, and Miami bass.'
client: New Ultraviolet Systems Basic
moreWork:
  - 2026-basic-convert
  - 2025-the-noise
  - 2024-new-plays
---
## Groove first, filter forward

Sunset Engine is built around movement, tone, and immediacy rather than maximum synthesis complexity. Its oscillators, filter, modulation, and groove systems are designed to work together so patches can quickly develop rhythmic motion and character without relying heavily on external processing.

The filter acts as the tonal centerpiece of the instrument, while pump, swing, humanization, and modulation provide movement that remains connected to the synth’s internal timing. The result is a focused instrument shaped around lo-fi, jungle, house, and Miami bass rather than a general-purpose synthesizer.

- **Filter-first synthesis.** Drive, envelopes, key tracking, velocity, and modulation all feed into a filter designed to remain expressive across basses, pads, stabs, and leads.
- **Built-in groove.** Pump, swing, humanization, and micro-shift create rhythmic movement without requiring external sidechain or timing tools.
- **Focused modulation.** A deliberately small routing system keeps motion flexible without turning the interface into a large modulation matrix.
- **Character processing.** Dirt, wow, resampling, space, and width provide warmth and degradation while supporting the core sound rather than overwhelming it.

## Signal flow

<div class="codingv2-workflow" role="list" aria-label="Workflow steps">
  <div class="codingv2-workflow-step" role="listitem"><strong>Generate</strong><p>Oscillators, sub, and noise create the source.</p></div>
  <span class="codingv2-workflow-arrow" aria-hidden="true">→</span>
  <div class="codingv2-workflow-step" role="listitem"><strong>Shape</strong><p>Drive, filter, and envelopes establish the core tone.</p></div>
  <span class="codingv2-workflow-arrow" aria-hidden="true">→</span>
  <div class="codingv2-workflow-step" role="listitem"><strong>Move</strong><p>Groove, pump, swing, humanization, and modulation animate the patch.</p></div>
  <span class="codingv2-workflow-arrow" aria-hidden="true">→</span>
  <div class="codingv2-workflow-step" role="listitem"><strong>Color</strong><p>Dirt, wow, degradation, and related processing add character.</p></div>
  <span class="codingv2-workflow-arrow" aria-hidden="true">→</span>
  <div class="codingv2-workflow-step" role="listitem"><strong>Finish</strong><p>Space, width, and master processing complete the sound.</p></div>
</div>

## Designed for movement

Sunset Engine was designed so movement feels like part of the instrument rather than an effect added afterward. Its timing systems share host tempo information across synced modulation, pump behavior, swing, and groove controls, allowing sustained sounds to develop rhythmic motion from within the patch itself.

The interface follows the same philosophy. Controls are divided into clear functional zones for synthesis, filtering, modulation, groove, character, and output processing, keeping the full signal path visible while still giving the filter and movement systems visual priority.
