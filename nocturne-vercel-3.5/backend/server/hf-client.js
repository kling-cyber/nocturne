/* NOCTURNE Hugging Face ZeroGPU client. Uses the Gradio queue HTTP API. */

const clean = (v, n = 12000) => String(v ?? '').replace(/[\u0000-\u001F\u007F]/g, '').slice(0, n);
const SPACE_ID = String(process.env.HF_SPACE_ID || '').trim();
const TOKEN = String(process.env.HF_TOKEN || '').trim();
const SPACE_URL = String(process.env.HF_SPACE_URL || '').trim().replace(/\/$/, '') ||
  (SPACE_ID ? `https://${SPACE_ID.replace('/', '-')}.hf.space` : '');
const ENDPOINT = String(process.env.HF_ENDPOINT || '/generate_batch').trim();
const TIMEOUT = Number(process.env.HF_REQUEST_TIMEOUT_MS || 360000);

async function fetchTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}

function authHeaders(json = false) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

function parseCompleteSSE(text) {
  const blocks = String(text || '').split(/\n\s*\n/);
  for (const block of blocks) {
    const event = block.match(/^event:\s*(.+)$/m)?.[1]?.trim();
    const dataLine = block.match(/^data:\s*(.+)$/m)?.[1]?.trim();
    if (!dataLine) continue;
    let data;
    try { data = JSON.parse(dataLine); } catch (_) { continue; }
    if (event === 'complete' || event === 'error' || event === 'cancel') return { event, data };
  }
  throw new Error('Hugging Face returned no completed Gradio event.');
}

function outputUrl(file) {
  if (typeof file === 'string' && /^https?:\/\//i.test(file)) return file;
  if (file && typeof file === 'object') return String(file.url || '').trim();
  return '';
}

async function generateBatch(jobs) {
  if (!SPACE_URL || !TOKEN) throw new Error('HF_SPACE_ID/HF_SPACE_URL and HF_TOKEN must be configured.');
  if (!Array.isArray(jobs) || !jobs.length) throw new Error('No Hugging Face visual jobs supplied.');

  const endpoint = ENDPOINT.startsWith('/') ? ENDPOINT : `/${ENDPOINT}`;
  const submit = await fetchTimeout(`${SPACE_URL}/gradio_api/call${endpoint}`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ data: [JSON.stringify(jobs)] })
  });
  const submitText = await submit.text();
  let submitData = null;
  try { submitData = JSON.parse(submitText); } catch (_) {}
  if (!submit.ok) throw new Error(`Hugging Face submit HTTP ${submit.status}: ${clean(submitText, 1800)}`);
  if (!submitData?.event_id) throw new Error(`Hugging Face did not return event_id: ${clean(submitText, 1800)}`);

  const result = await fetchTimeout(`${SPACE_URL}/gradio_api/call${endpoint}/${encodeURIComponent(submitData.event_id)}`, {
    headers: authHeaders(false)
  });
  const resultText = await result.text();
  if (!result.ok) throw new Error(`Hugging Face result HTTP ${result.status}: ${clean(resultText, 1800)}`);
  const parsed = parseCompleteSSE(resultText);
  if (parsed.event === 'error') throw new Error(`Hugging Face generation error: ${clean(JSON.stringify(parsed.data), 2200)}`);
  if (parsed.event === 'cancel') throw new Error('Hugging Face generation was cancelled.');

  const values = Array.isArray(parsed.data) ? parsed.data[0] : parsed.data;
  const files = Array.isArray(values) ? values : [values];
  const buffers = [];
  for (const file of files) {
    const url = outputUrl(file);
    if (!url) throw new Error(`Hugging Face returned an unusable image: ${clean(JSON.stringify(file), 1200)}`);
    const image = await fetchTimeout(url, { headers: authHeaders(false) });
    if (!image.ok) throw new Error(`Hugging Face image download HTTP ${image.status}.`);
    buffers.push(Buffer.from(await image.arrayBuffer()));
  }
  return buffers;
}

module.exports = { configured: !!(SPACE_URL && TOKEN), generateBatch, spaceUrl: SPACE_URL };
