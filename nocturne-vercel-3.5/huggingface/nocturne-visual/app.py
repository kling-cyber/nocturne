import json
import os
import uuid

import spaces
import torch
import gradio as gr
from diffusers import DiffusionPipeline, EulerDiscreteScheduler

MODEL_ID = os.getenv("NOCTURNE_MODEL", "SG161222/Realistic_Vision_V5.1_noVAE")

pipe = DiffusionPipeline.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16,
    use_safetensors=True,
).to("cuda")

try:
    pipe.scheduler = EulerDiscreteScheduler.from_config(pipe.scheduler.config)
except Exception:
    pass

pipe.set_progress_bar_config(disable=True)


def make_one(job):
    width = max(512, min(768, int(job.get("width", 768))))
    height = max(512, min(512, int(job.get("height", 512))))
    steps = max(4, min(10, int(job.get("steps", 8))))
    cfg = float(job.get("cfg", 7.0))
    seed = int(job.get("seed", 1)) & 0xFFFFFFFF
    generator = torch.Generator(device="cuda").manual_seed(seed)
    image = pipe(
        prompt=str(job.get("prompt", "")),
        negative_prompt=str(job.get("negative", "")),
        width=width,
        height=height,
        num_inference_steps=steps,
        guidance_scale=cfg,
        generator=generator,
    ).images[0]
    filename = os.path.join("/tmp", f"nocturne_{uuid.uuid4().hex}.png")
    image.save(filename, format="PNG", optimize=True)
    return filename


@spaces.GPU(duration=60)
def generate_batch(jobs_json: str):
    jobs = json.loads(jobs_json)
    if not isinstance(jobs, list) or not jobs:
        raise ValueError("No visual jobs supplied")
    jobs = jobs[:4]
    return [make_one(job) for job in jobs]


demo = gr.Interface(
    fn=generate_batch,
    inputs=gr.Textbox(label="Visual jobs JSON"),
    outputs=gr.Gallery(label="Generated visuals", type="filepath"),
    api_name="generate_batch",
    title="NOCTURNE Visual Engine",
    description="Server-side batch generator for fictional NOCTURNE CCTV and investigative scene visuals.",
)

demo.queue(default_concurrency_limit=1)
demo.launch()
