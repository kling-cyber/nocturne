/* =========================================================
   NOCTURNE LOCAL COMFYUI CLIENT
   Sends API-format workflows to a local ComfyUI server.
   Uses only Node 20 built-in fetch and no extra dependency.
   ========================================================= */

const crypto = require("crypto");

const COMFY_URL = String(process.env.COMFYUI_URL || "").trim().replace(/\/$/, "");
const CHECKPOINT = String(process.env.COMFYUI_CHECKPOINT || "Realistic_Vision_V5.1_fp16-no-ema.safetensors").trim();
const WIDTH = Number(process.env.COMFYUI_WIDTH || 768);
const HEIGHT = Number(process.env.COMFYUI_HEIGHT || 512);
const STEPS = Number(process.env.COMFYUI_STEPS || 8);
const CFG = Number(process.env.COMFYUI_CFG || 8);
const SAMPLER = String(process.env.COMFYUI_SAMPLER || "euler").trim();
const SCHEDULER = String(process.env.COMFYUI_SCHEDULER || "simple").trim();
const CCTV_DENOISE = Number(process.env.COMFYUI_CCTV_DENOISE || 0.24);

// Image generation is intentionally capped at 10 seconds for the local GPU path.
// Keep this fixed so an older Render environment value such as 30000 cannot
// silently restore the previous 30-second generation limit.
const GENERATION_TIMEOUT_MS = 10000;
const POLL_MS = Math.max(200, Number(process.env.COMFYUI_POLL_MS || 350));

const clean = (value, max = 7000) => String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, max);

function seedFor(caseSeed, cameraId, type, capture) {
  const digest = crypto.createHash("sha256").update(`${caseSeed}|${cameraId}|${type}|${capture}`).digest();
  return digest.readUInt32BE(0) * 2147483648 + digest.readUInt32BE(4);
}

function baseWorkflow({ prompt, negativePrompt, seed }) {
  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: CHECKPOINT } },
    "2": { class_type: "CLIPTextEncode", inputs: { text: clean(prompt), clip: ["1", 1] } },
    "3": { class_type: "CLIPTextEncode", inputs: { text: clean(negativePrompt), clip: ["1", 1] } },
    "4": { class_type: "EmptyLatentImage", inputs: { width: WIDTH, height: HEIGHT, batch_size: 1 } },
    "5": { class_type: "KSampler", inputs: { seed, steps: STEPS, cfg: CFG, sampler_name: SAMPLER, scheduler: SCHEDULER, denoise: 1, model: ["1", 0], positive: ["2", 0], negative: ["3", 0], latent_image: ["4", 0] } },
    "6": { class_type: "VAEDecode", inputs: { samples: ["5", 0], vae: ["1", 2] } },
    "7": { class_type: "SaveImage", inputs: { filename_prefix: "NOCTURNE", images: ["6", 0] } }
  };
}

function continuityWorkflow({ prompt, negativePrompt, seed, inputName }) {
  return {
    "1": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: CHECKPOINT } },
    "2": { class_type: "LoadImage", inputs: { image: inputName } },
    "3": { class_type: "VAEEncode", inputs: { pixels: ["2", 0], vae: ["1", 2] } },
    "4": { class_type: "CLIPTextEncode", inputs: { text: clean(prompt), clip: ["1", 1] } },
    "5": { class_type: "CLIPTextEncode", inputs: { text: clean(negativePrompt), clip: ["1", 1] } },
    "6": { class_type: "KSampler", inputs: { seed, steps: STEPS, cfg: CFG, sampler_name: SAMPLER, scheduler: SCHEDULER, denoise: CCTV_DENOISE, model: ["1", 0], positive: ["4", 0], negative: ["5", 0], latent_image: ["3", 0] } },
    "7": { class_type: "VAEDecode", inputs: { samples: ["6", 0], vae: ["1", 2] } },
    "8": { class_type: "SaveImage", inputs: { filename_prefix: "NOCTURNE", images: ["7", 0] } }
  };
}

async function uploadReference(buffer, filename) {
  const form = new FormData();
  form.append("image", new Blob([buffer], { type: "image/png" }), filename);
  form.append("type", "input");
  form.append("overwrite", "true");
  const response = await fetch(`${COMFY_URL}/upload/image`, { method: "POST", body: form });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}
  if (!response.ok) throw new Error(`ComfyUI /upload/image HTTP ${response.status}: ${clean(text, 1200)}`);
  if (!data?.name) throw new Error("ComfyUI did not return an uploaded reference image name.");
  return data.name;
}

async function request({ prompt, negativePrompt, caseSeed, cameraId, type, capture = 0, initImage = null }) {
  if (!COMFY_URL) throw new Error("COMFYUI_URL is not configured.");
  const clientId = crypto.randomUUID();
  const seed = seedFor(caseSeed, cameraId, type, capture);
  let payloadPrompt;
  let continuity = false;

  if (type === "cctv" && initImage?.buffer) {
    const inputName = `NOCTURNE_${clean(cameraId, 20).replace(/[^A-Za-z0-9_-]/g, "_")}_reference.png`;
    const uploadedName = await uploadReference(initImage.buffer, inputName);
    payloadPrompt = continuityWorkflow({ prompt, negativePrompt, seed, inputName: uploadedName });
    continuity = true;
  } else {
    payloadPrompt = baseWorkflow({ prompt, negativePrompt, seed });
  }

  console.log(`[NOCTURNE] ComfyUI request: ${type} ${cameraId} ${WIDTH}x${HEIGHT} steps=${STEPS} cfg=${CFG} sampler=${SAMPLER} scheduler=${SCHEDULER} continuity=${continuity} timeout=${GENERATION_TIMEOUT_MS}ms`);

  const response = await fetch(`${COMFY_URL}/prompt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, prompt: payloadPrompt }) });
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch (_) {}
  if (!response.ok) throw new Error(`ComfyUI /prompt HTTP ${response.status}: ${clean(text, 1200)}`);
  if (data?.error) throw new Error(`ComfyUI rejected workflow: ${clean(JSON.stringify(data.error), 1500)}`);
  const promptId = data?.prompt_id;
  if (!promptId) throw new Error("ComfyUI did not return a prompt_id.");
  console.log(`[NOCTURNE] ComfyUI prompt accepted: ${promptId}`);
  return waitForImage(promptId);
}

async function waitForImage(promptId) {
  const deadline = Date.now() + GENERATION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, POLL_MS));
    const response = await fetch(`${COMFY_URL}/history/${encodeURIComponent(promptId)}`);
    if (!response.ok) throw new Error(`ComfyUI /history HTTP ${response.status}.`);
    const history = await response.json();
    const entry = history?.[promptId];
    if (!entry) continue;
    if (entry.status?.status_str === "error") {
      const messages = Array.isArray(entry.status?.messages) ? entry.status.messages.map(x => JSON.stringify(x)).join(" ") : "workflow execution failed";
      throw new Error(`ComfyUI execution failed: ${clean(messages, 1800)}`);
    }
    for (const node of Object.values(entry.outputs || {})) {
      const images = Array.isArray(node?.images) ? node.images : [];
      if (!images.length) continue;
      const image = images[0];
      const params = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder || "", type: image.type || "output" });
      const imageResponse = await fetch(`${COMFY_URL}/view?${params.toString()}`);
      if (!imageResponse.ok) throw new Error(`ComfyUI /view HTTP ${imageResponse.status}.`);
      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      console.log(`[NOCTURNE] ComfyUI image retrieved: ${image.filename}`);
      return { image: `data:image/png;base64,${buffer.toString("base64")}`, buffer, filename: image.filename, subfolder: image.subfolder || "", type: image.type || "output", promptId };
    }
  }
  throw new Error(`ComfyUI image generation timed out after ${GENERATION_TIMEOUT_MS}ms.`);
}

module.exports = { configured: !!COMFY_URL, request, CHECKPOINT, generationTimeoutMs: GENERATION_TIMEOUT_MS };
