// lib/ai.js — one bounded AI assessment per surviving candidate.
//
// The rules decide WHO survives. The model only comments on the survivors:
// it never rejects, never re-scores, never re-ranks. That keeps the run
// auditable — you can always show what the rules did without the model.
//
// Provider: NVIDIA NIM (OpenAI-compatible). Any OpenAI-compatible endpoint
// works by setting AI_BASE_URL / AI_MODEL, which is the escape hatch if a
// provider has an outage on demo day.

const BASE = (process.env.AI_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
const MODEL = process.env.AI_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';
const KEY = process.env.NVIDIA_API_KEY || process.env.AI_API_KEY || '';
const TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 60000);

export const aiModel = MODEL;

export function aiConfigured() {
  return Boolean(KEY);
}

// The model may only use what we hand it. No outside knowledge, no guessing
// at size or budget — those become explicit unknowns instead.
const SYSTEM = `You assess business-event news for a seller of marketing systems to gyms.

You will receive ONE candidate: a gym name, a locality, an event type, a headline,
an excerpt, and the publication date. That is ALL you know.

Rules:
- Use only the supplied text. Never invent a date, a size, a budget or a person.
- If the text does not establish something, say so in "unknowns". Do not guess.
- "event_timing": "upcoming" only if the text says the event has not happened yet
  (will open, set to launch, plans to). "completed" if the text reports it as done
  (inaugurated, opened, launched). Otherwise "unclear".
- "buyer_category": "gym" if the text describes a gym or fitness centre.
  "adjacent" if it is a sports-tech platform, clinic, retailer or academy.
  "unclear" if you cannot tell.
- "confidence" is 1-5 for YOUR assessment, not for the business.

Return JSON only, exactly this shape:
{
  "buyer_category": "gym" | "adjacent" | "unclear",
  "relevant_buyer": true | false,
  "event_timing": "upcoming" | "completed" | "unclear",
  "service_fit": "one short phrase",
  "why": "one or two sentences, referencing the supplied text",
  "next_action": "one concrete action for the seller this week",
  "unknowns": ["what you could not establish", "..."],
  "evidence_supports": ["short quote from the supplied text", "..."],
  "confidence": 1 | 2 | 3 | 4 | 5
}`;

function payload(o) {
  return [
    `Gym: ${o.gym}`,
    `Locality: ${o.locality}`,
    `Event type (from rules): ${o.event_type}`,
    `Publication date: ${o.published_at || 'unknown'}`,
    `Headline: ${o.headline}`,
    `Excerpt: ${o.evidence}`,
    `Source: ${o.source_name}`,
  ].join('\n');
}

// Models sometimes wrap JSON in prose or fences. Pull out the object.
function extractJson(text) {
  if (!text) return null;
  let s = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(s);
  } catch (e) {
    /* fall through */
  }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(s.slice(start, end + 1));
    } catch (e) {
      return null;
    }
  }
  return null;
}

const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

// An assessment is only publishable if it has the fields we render.
// Anything short of that is treated as no assessment at all.
export function validateAssessment(a) {
  if (!a || typeof a !== 'object') return null;
  const unknowns = Array.isArray(a.unknowns) ? a.unknowns.filter((x) => typeof x === 'string').slice(0, 5) : [];
  const supports = Array.isArray(a.evidence_supports)
    ? a.evidence_supports.filter((x) => typeof x === 'string').slice(0, 4)
    : [];
  const confidence = Number(a.confidence);
  const clean = {
    buyer_category: oneOf(a.buyer_category, ['gym', 'adjacent', 'unclear'], 'unclear'),
    relevant_buyer: a.relevant_buyer === true,
    event_timing: oneOf(a.event_timing, ['upcoming', 'completed', 'unclear'], 'unclear'),
    service_fit: typeof a.service_fit === 'string' ? a.service_fit.slice(0, 90) : '',
    why: typeof a.why === 'string' ? a.why.slice(0, 400) : '',
    next_action: typeof a.next_action === 'string' ? a.next_action.slice(0, 240) : '',
    unknowns,
    evidence_supports: supports,
    confidence: Number.isFinite(confidence) ? Math.min(5, Math.max(1, Math.round(confidence))) : 1,
  };
  if (!clean.why || !clean.next_action) return null;
  return clean;
}

export async function assessOpportunity(o) {
  if (!KEY) return { ok: false, error: 'NVIDIA_API_KEY not set' };
  const started = Date.now();

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: payload(o) },
    ],
    // Reasoning models (nemotron-3-ultra, gpt-oss) spend tokens on a hidden
    // reasoning channel before emitting content. A small budget yields an
    // empty string, which reads as "no usable JSON". Give it real room.
    max_tokens: 2400,
    temperature: 0.1,
    stream: false,
    response_format: { type: 'json_object' },
  };

  try {
    const r = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return { ok: false, error: `HTTP ${r.status} ${text.slice(0, 160)}`, ms: Date.now() - started, model: MODEL };
    }

    const j = await r.json();
    const msg = j.choices && j.choices[0] && j.choices[0].message;
    const content = msg && (msg.content || msg.reasoning_content);
    const assessment = validateAssessment(extractJson(content));

    if (!assessment) {
      return {
        ok: false,
        error: 'model returned no usable JSON',
        ms: Date.now() - started,
        model: MODEL,
        raw: String(content || '').slice(0, 200),
      };
    }
    return { ok: true, assessment, ms: Date.now() - started, model: MODEL };
  } catch (e) {
    const timedOut = e.name === 'TimeoutError' || /abort/i.test(e.message);
    return {
      ok: false,
      error: timedOut ? `timed out after ${TIMEOUT_MS}ms` : e.message,
      ms: Date.now() - started,
      model: MODEL,
    };
  }
}
