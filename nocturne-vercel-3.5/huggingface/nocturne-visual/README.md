---
title: NOCTURNE Visual Engine
emoji: 🌑
sdk: gradio
sdk_version: "6.26.0"
python_version: "3.12"
app_file: app.py
---

# NOCTURNE Visual Engine

Private Gradio/ZeroGPU worker for NOCTURNE's server-side batch visual generation.

The production game server sends a small batch of case-specific CCTV and investigative-photo prompts. The Space generates the images and returns them through the Gradio API. NOCTURNE stores the returned images temporarily on its game server.

The game, case truth, NPC simulation, camera selection and evidence logic remain authoritative on Render.
