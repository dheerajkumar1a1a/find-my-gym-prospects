// lib/radar.js
// Evidence-based opportunity radar for gyms in Pune.
//
// Pipeline:  sources -> extract -> resolve -> verify -> disqualify -> score -> opportunity
//
// Design rules this file obeys:
//   1. Nothing is invented. Every opportunity carries the URL and date it came from.
//   2. Observed fact and inferred opportunity are separate fields, never merged.
//   3. Rejection is a first-class output. The log of what we threw away is as
//      valuable as the cards we keep.
//   4. Rules decide who survives. The AI step only comments on the survivors,
//      and a failed call is labelled, never fatal.

import { aiConfigured, assessOpportunity, aiModel } from './ai.js';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export const SCOPE = {
  market: 'gyms',
  geo: 'Pune',
  windowDays: 365,
  note: 'Press and news coverage only. Google Places proximity sweep is not wired yet, so gyms with no press footprint cannot appear here.',
};

// ---------------------------------------------------------------- text utils

const unesc = (s) =>
  String(s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));

const strip = (s) => unesc(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

const cleanTitle = (t) => strip(t).replace(/['\u2019]s\b/g, '').replace(/\s+/g, ' ');

// Press releases open with boilerplate. Nobody wants to read it on a card.
const BOILERPLATE = [
  /^get latest articles and stories on [^.]*\.\s*/i,
  /^latest news[^.]*\.\s*/i,
  /^read more[^.]*\.\s*/i,
  /^follow us[^.]*\.\s*/i,
  /^stay updated[^.]*\.\s*/i,
];

function cleanEvidence(text) {
  let s = strip(text || '');
  for (const re of BOILERPLATE) s = s.replace(re, '');
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > 300) {
    const cut = s.slice(0, 300);
    const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(' '));
    s = cut.slice(0, lastStop > 120 ? lastStop : 300).trim() + '…';
  }
  return s;
}

const fmtDate = (d) =>
  d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

// ---------------------------------------------------------------- vocabulary

const LOCALITIES = [
  'Baner', 'Balewadi', 'Aundh', 'Wakad', 'Hinjawadi', 'Hinjewadi', 'Kothrud',
  'Viman Nagar', 'Kharadi', 'Hadapsar', 'Pimple Saudagar', 'Pimple Nilakh',
  'Pimpri-Chinchwad', 'Pimpri', 'Chinchwad', 'Wanowrie', 'Wanwadi', 'Kondhwa',
  'Koregaon Park', 'Kalyani Nagar', 'Shivajinagar', 'Magarpatta', 'Bavdhan',
  'Pashan', 'Ravet', 'Nigdi', 'Akurdi', 'Thergaon', 'Tathawade', 'Punawale',
  'Wagholi', 'Lohegaon', 'Dhanori', 'Vishrantwadi', 'Yerawada', 'Katraj',
  'Mohammadwadi', 'Warje', 'Karve Nagar', 'Erandwane', 'Deccan', 'Camp',
  'NIBM', 'Undri', 'Sus', 'Bhosari', 'Moshi', 'Chakan', 'Talegaon', 'Khadki',
  'Dapodi', 'Ambegaon', 'Narhe', 'Salunke Vihar', 'Handewadi', 'Ganeshkhind',
  'Model Colony', 'Prabhat Road', 'Bhandarkar Road', 'Sinhagad Road',
];

// Chains whose branches cannot buy a website locally: the brand does.
const FRANCHISES = [
  "anytime fitness", "gold's gym", 'golds gym', 'snap fitness', 'cult.fit',
  'cultfit', 'cult fit', 'fitness first', 'talwalkars', 'talwalkar', 'f45',
  'orangetheory', 'planet fitness', 'crunch fitness', '9round', 'the gym group',
  'curves', 'gympik',
];

// Public bodies and institutions: not private gyms, so not your buyer.
const INSTITUTIONS =
  /(municipal|corporation|\bpmc\b|\bpcmc\b|police|army|navy|air force|railway|school|college|university|institute|hospital|physiotherap|sports authority|stadium|government|govt\.?|smart city|corporator|mla\b|mp\b)/i;

// Anything that reads like a crime or accident report, not a business event.
const NOISE =
  /(arrest|police|murder|death|died|dies|dead|fire|blaze|assault|molest|rape|robbery|theft|suicide|electrocut|drown|crime|scam|fraud|lawsuit|case filed|held for|booked for|probe|autopsy|gang|raid|seized|injur)/i;

// Sellers of equipment, not gyms. A sports retailer opening a store is a vendor.
const VENDOR = /\b(store|showroom|retail|e-commerce|marketplace|distributor|dealership)\b/i;

// Adjacent to fitness, but not a gym.
const CLINIC = /\b(spa|salon|clinic|physiotherap|ayurved|diagnostic|nutritio)\b/i;

// Does this text describe a fitness business at all?
const FITNESS =
  /(gym|gyms|fitness|studio|crossfit|strength|health club|wellness|training cent(er|re)|performance cent(er|re)|athletic|bodybuilding|powerlifting|calisthenics)/i;

const PREMIUM_CUE =
  /(flagship|inaugurat|celebrity|bollywood|actor|actress|suniel|24-hour|24x7|24\/7|luxury|premium|signature studio|grand opening)/i;

const STOP = new Set([
  'the', 'a', 'an', 'in', 'at', 'of', 'for', 'with', 'and', 'to', 'on', 'by',
  'from', 'as', 'is', 'its', 'it', 'new', 'first', 'flagship', 'premium',
  'luxury', 'grand', 'exclusive', 'now', 'open', 'opens', 'opening', 'launch',
  'launches', 'launched', 'inaugurates', 'unveils', 'debuts', 'starts', 'pune',
  'india', 'maharashtra', 'city', 'this', 'that', 'his', 'her', 'their',
  'after', 'before', 'over', 'into', 'out', 'up', 'down', 'world', 'state',
  'area', 'road', 'near', 'your', 'our', 'why', 'how', 'what', 'when', 'here',
  'there', 'more', 'most', 'best', 'top', 'big', 'small', 'next', 'last',
]);

// ---------------------------------------------------------------- RSS parsing

function parseRss(xml) {
  let blocks = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map((m) => m[0]);
  if (!blocks.length) {
    blocks = [...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0]);
  }
  return blocks.map((b) => {
    const tag = (name) => {
      const m = b.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
      return m ? m[1] : '';
    };
    const atomLink = b.match(/<link[^>]*href="([^"]+)"/i);
    const rawDate = tag('pubDate') || tag('published') || tag('updated') || tag('dc:date');
    const d = rawDate ? new Date(strip(rawDate)) : null;
    return {
      title: strip(tag('title')),
      link: unesc(strip(tag('link')) || (atomLink ? atomLink[1] : '')),
      desc: strip(tag('description') || tag('summary') || tag('content') || tag('content:encoded')).slice(0, 400),
      date: d && !isNaN(d) ? d : null,
    };
  }).filter((x) => x.title);
}

async function getText(url) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'en-IN,en;q=0.9' },
    signal: AbortSignal.timeout(9000),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.text();
}

// ---------------------------------------------------------------- connectors

// Bing News RSS: fewer items than Google News, but the links resolve to the
// publisher. That is the whole point. Google News links are JS wrappers.
// Bing wraps every link in an apiclick.aspx redirect. Unwrap it, because a
// judge clicking "source" must land on the publisher, not on bing.com.
function unwrapBing(link) {
  try {
    const u = new URL(link);
    if (!/bing\.com$/i.test(u.hostname)) return link;
    const target = u.searchParams.get('url');
    if (target && /^https?:\/\//i.test(target)) return target;
    if (target) {
      try {
        return decodeURIComponent(target);
      } catch (e) {
        /* keep the redirect */
      }
    }
  } catch (e) {
    /* not a URL */
  }
  return link;
}

function hostOf(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch (e) {
    return null;
  }
}

async function bingNews(q) {
  const url = `https://www.bing.com/news/search?q=${encodeURIComponent(q)}&format=rss&setmkt=en-IN&setlang=en-IN`;
  return parseRss(await getText(url))
    .slice(0, 12)
    .map((x) => {
      const real = unwrapBing(x.link);
      return {
        ...x,
        link: real,
        source: 'bing_news',
        source_name: hostOf(real) || 'Bing News',
        resolvable: !/bing\.com/i.test(real),
      };
    });
}

async function googleNews(q) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q + ' when:1y')}&hl=en-IN&gl=IN&ceid=IN:en`;
  return parseRss(await getText(url))
    .slice(0, 12)
    .map((x) => ({ ...x, source: 'google_news', source_name: 'Google News', resolvable: false }));
}

async function puneFeed(url, name) {
  return parseRss(await getText(url))
    .slice(0, 40)
    .map((x) => ({ ...x, source: 'pune_press', source_name: name, resolvable: true }));
}

const QUERIES = [
  'gym opening Pune',
  'new gym Pune',
  'fitness studio launch Pune',
  'gym launched Pune',
  'fitness centre opening Pune',
  'gym expansion new branch Pune',
  'crossfit studio Pune launch',
];

async function job(id, name, query, fn) {
  const started = Date.now();
  try {
    const items = await fn();
    return { id, name, query, status: 'ok', ms: Date.now() - started, items };
  } catch (e) {
    return { id, name, query, status: 'error', ms: Date.now() - started, error: e.message, items: [] };
  }
}

// ---------------------------------------------------------------- extraction

// Headlines come in Title Case, so "capitalised run" alone is useless. We look
// for the brand token and walk forward until we hit a verb, an adjective or a
// place name.
const VERBS = new Set([
  'opens', 'open', 'opening', 'launches', 'launched', 'launch', 'launching',
  'inaugurates', 'inaugurated', 'unveils', 'unveiled', 'debuts', 'debuted',
  'expands', 'expanded', 'announces', 'announced', 'plans', 'enters', 'brings',
  'adds', 'starts', 'started', 'welcomes', 'introduces', 'to', 'is', 'has',
  'will', 'set', 'gets', 'eyes', 'forays', 'invests', 'raises', 'partners',
]);

const GENERIC = new Set([
  'flagship', 'new', 'first', 'second', 'third', 'fourth', 'premium', 'luxury',
  'grand', 'exclusive', 'physical', 'signature', 'its', 'the', 'a', 'an', 'in',
  'at', 'of', 'for', 'with', 'and', 'on', 'by', 'from', 'as', 'pune', 'india',
  'maharashtra', 'city', 'centre', 'center', 'high-performance', 'performance',
  'facility', 'store', 'outlet', 'plan', 'brand', 'chain', 'group',
]);

const GENERIC_NAME = /^(fitness|gym|studio|club|health|wellness|centre|center|fitness cent(er|re)|fitness studio|health club|sports|sports and fitness)$/i;

const isLocality = (word) =>
  LOCALITIES.some((l) => l.toLowerCase() === String(word).toLowerCase()) || /^pune$/i.test(word);

function extractGymName(title) {
  let t = cleanTitle(title);
  let lower = t.toLowerCase();

  // 1. A known chain brand named directly.
  for (const f of FRANCHISES) {
    if (lower.includes(f)) {
      return { name: f.replace(/\b\w/g, (c) => c.toUpperCase()), franchise: true };
    }
  }

  // 2. Strip wire-service prefixes ("Business News | ...") and the trailing
  //    "- Publisher Name" that Google News appends.
  t = t.replace(/^(business news|latest news|press release|ani|pti|ians|media release)\s*\|\s*/i, '');
  const dash = t.lastIndexOf(' - ');
  if (dash > 20) {
    const tail = t.slice(dash + 3).trim();
    if (tail.split(/\s+/).length <= 6 && !FITNESS.test(tail)) t = t.slice(0, dash).trim();
  }

  // 3. Drop a leading "Person Name Verb" so we start on the brand.
  //    Case-sensitive on purpose: an all-caps brand like STAMVIA must survive.
  t = t.replace(
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(Inaugurates|Launches|Unveils|Opens|Announces|Debuts|Introduces)\s+/,
    ''
  );

  const tokens = t.split(/\s+/);
  const cleaned = (w) => w.replace(/[^A-Za-z0-9&'\u2019-]/g, '');

  // 4. Find the first brand-like token.
  let start = -1;
  for (let i = 0; i < tokens.length; i++) {
    const raw = cleaned(tokens[i]);
    if (!raw) continue;
    const low = raw.toLowerCase();
    if (GENERIC.has(low) || VERBS.has(low) || STOP.has(low) || isLocality(raw)) continue;
    if (!/^[A-Za-z]/.test(raw)) continue;
    start = i;
    break;
  }
  if (start < 0) return { name: null, franchise: false };

  // 5. Walk forward until the name stops being a name.
  const out = [];
  for (let i = start; i < tokens.length && out.length < 5; i++) {
    const raw = cleaned(tokens[i]);
    if (!raw) continue;
    const low = raw.toLowerCase();
    if (VERBS.has(low) || STOP.has(low) || GENERIC.has(low) || isLocality(raw)) break;
    if (!/^[A-Za-z]/.test(raw)) break;
    out.push(raw);
  }

  const name = out.join(' ').replace(/[&\s]+$/, '').trim();
  if (name.length < 3 || GENERIC_NAME.test(name)) return { name: null, franchise: false };
  // A bare three-letter acronym is not a business we can name.
  if (out.length === 1 && name.replace(/[^A-Za-z]/g, '').length < 4) return { name: null, franchise: false };
  return { name, franchise: false };
}


function extractLocality(text) {
  for (const l of LOCALITIES) {
    const re = new RegExp('\\b' + l.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'i');
    if (re.test(text)) return l;
  }
  return null;
}

function classifyEvent(title) {
  const t = title.toLowerCase();
  if (/(second|another|new|third|fourth)\s+(branch|outlet|studio|centre|center|facility|location)/.test(t)) return 'expansion';
  if (/(expand|expansion|franchise|more branches|multi-city|forays? into)/.test(t)) return 'expansion';
  if (/(opens?|opening|launch(es|ed|ing)?|inaugurat|unveil|debut|now open|throws? open|welcomes|introduces)/.test(t)) return 'opening';
  if (/(hiring|recruit|vacanc|walk-in interview|job fair)/.test(t)) return 'hiring';
  if (/(funding|raises?|investment|series [a-c]\b)/.test(t)) return 'funding';
  if (/(partner|tie-up|collaborat|associat)/.test(t)) return 'partnership';
  return 'other';
}

// ---------------------------------------------------------------- offer mapping

const OFFERS = {
  opening: {
    offer: 'Founding-member launch funnel',
    service: 'Digital Launch System',
    next_action: 'Audit their pre-launch enquiry path, then pitch a launch landing page with trial booking.',
  },
  expansion: {
    offer: 'Branch pages and lead routing',
    service: 'Digital Launch System + Lead Conversion',
    next_action: 'Check whether the new branch exists on their site yet, then pitch branch pages and enquiry routing.',
  },
  hiring: {
    offer: 'Lead tracking and conversion audit',
    service: 'Lead Conversion System',
    next_action: 'Ask what happens to an enquiry after the first phone call.',
  },
  funding: {
    offer: 'Growth campaign and attribution',
    service: 'AI-enabled Marketing',
    next_action: 'Ask which acquisition channel they plan to scale first.',
  },
  partnership: {
    offer: 'Corporate enquiry workflow',
    service: 'Lead Conversion System',
    next_action: 'Ask how corporate enquiries are handled today.',
  },
  other: {
    offer: 'Discovery call',
    service: 'Audit',
    next_action: 'Confirm the event with the business before pitching anything.',
  },
};

const RELEVANCE = { opening: 5, expansion: 5, funding: 4, hiring: 3, partnership: 3, other: 2 };

// ---------------------------------------------------------------- scoring

function scoreEvidence({ resolvable, date, locality }) {
  let s = 1;
  if (resolvable) s += 2;
  if (date) s += 1;
  if (locality) s += 1;
  return Math.min(5, s);
}

function scoreTiming(date) {
  if (!date) return 2;
  const days = (Date.now() - date.getTime()) / 86400000;
  if (days <= 30) return 5;
  if (days <= 90) return 4;
  if (days <= 180) return 3;
  if (days <= 365) return 2;
  return 1;
}

function readStage(text) {
  if (PREMIUM_CUE.test(text)) {
    return {
      tier: 'C',
      label: 'Stage C · premium launch',
      note:
        'Right trigger, wrong time for you. No case study yet, so this is a park-and-revisit, not a call this week.',
    };
  }
  return {
    tier: 'A',
    label: 'Stage A · fits your current stage',
    note: 'No premium cue in the coverage. Verify size and decision-maker before pitching.',
  };
}

// ---------------------------------------------------------------- syndication

const words = (s) =>
  new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w))
  );

function jaccard(a, b) {
  const A = words(a);
  const B = words(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

// ---------------------------------------------------------------- the run

export async function runRadar(options = {}) {
  const startedAt = new Date();
  const queries = options.queries || QUERIES;
  const windowDays = options.windowDays || SCOPE.windowDays;

  // 1. Fetch everything in parallel. One dead source never kills the run.
  const jobs = [];
  for (const q of queries) {
    jobs.push(job('bing_news', 'Bing News', q, () => bingNews(q)));
    jobs.push(job('google_news', 'Google News', q, () => googleNews(q)));
  }
  jobs.push(job('pune_press', 'Punekar News', 'feed', () => puneFeed('https://punekarnews.in/feed/', 'Punekar News')));
  jobs.push(job('pune_press', 'Pune Mirror', 'feed', () => puneFeed('https://punemirror.com/feed/', 'Pune Mirror')));

  const results = await Promise.allSettled(jobs);
  const settled = results.map((r) =>
    r.status === 'fulfilled' ? r.value : { id: 'unknown', name: 'unknown', status: 'error', error: String(r.reason), items: [], ms: 0 }
  );

  // 2. Source coverage, reported honestly.
  const coverage = {};
  for (const s of settled) {
    const key = s.id + '::' + s.name;
    coverage[key] = coverage[key] || { id: s.id, name: s.name, queries: 0, ok: 0, failed: 0, items: 0, errors: [] };
    coverage[key].queries++;
    if (s.status === 'ok') {
      coverage[key].ok++;
      coverage[key].items += s.items.length;
    } else {
      coverage[key].failed++;
      if (s.error && !coverage[key].errors.includes(s.error)) coverage[key].errors.push(s.error);
    }
  }

  // 3. Flatten + dedupe identical links.
  const seenLinks = new Set();
  const raw = [];
  for (const s of settled) {
    for (const item of s.items) {
      const key = (item.link || item.title).toLowerCase();
      if (seenLinks.has(key)) continue;
      seenLinks.add(key);
      raw.push(item);
    }
  }

  // 4. Filter, extract, reject. Rejections are recorded, not discarded.
  const rejected = [];
  const kept = [];
  const cutoff = Date.now() - windowDays * 86400000;

  for (const item of raw) {
    const title = cleanTitle(item.title);
    const haystack = title + ' ' + (item.desc || '');
    const reject = (name, reason, detail) => rejected.push({ name: name || title.slice(0, 70), reason, detail, source: item.source_name, url: item.link });

    if (NOISE.test(title)) { reject(null, 'not a business event', 'crime or accident report'); continue; }

    const event = classifyEvent(title);
    if (event === 'other') { reject(null, 'no event', 'headline does not describe an opening, expansion, hire, funding or partnership'); continue; }

    if (!FITNESS.test(haystack)) { reject(null, 'not a fitness business', 'no gym or fitness language in the item'); continue; }

    if (VENDOR.test(title)) { reject(null, 'vendor, not a gym', 'this sells equipment or runs a store, it does not buy gym services'); continue; }

    if (CLINIC.test(title)) { reject(null, 'not a gym', 'spa, clinic or salon rather than a fitness business'); continue; }

    if (INSTITUTIONS.test(title)) { reject(null, 'institutional, not a private gym', 'public body, school, hospital or sports authority'); continue; }

    const { name, franchise } = extractGymName(title);
    if (franchise) { reject(name, 'franchise branch', 'the brand decides software, not the local branch'); continue; }
    if (!name) { reject(null, 'could not identify the business', 'no readable business name in the headline'); continue; }

    const locality = extractLocality(haystack);
    const mentionsPune = /pune|punekar/i.test(haystack);
    if (!mentionsPune && !locality) { reject(name, 'outside Pune', 'no Pune reference in the item'); continue; }

    if (item.date && item.date.getTime() < cutoff) {
      reject(name, 'too old', `published ${item.date.toISOString().slice(0, 10)}, outside the ${windowDays} day window`);
      continue;
    }

    // Syndication: the same story carried by several outlets, and the same gym
    // named slightly differently in each headline.
    const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '').replace(/s$/, '');
    const dupe = kept.find((k) => norm(k.gym) === norm(name) || jaccard(k.headline, title) >= 0.55);
    if (dupe) {
      if (!dupe.also_reported_by.some((d) => d.source === item.source_name)) {
        dupe.also_reported_by.push({ source: item.source_name, url: item.link });
      }
      reject(name, 'duplicate', `same story as ${dupe.gym}, already carried by ${dupe.source_name}`);
      continue;
    }

    const offer = OFFERS[event];
    const stage = readStage(haystack);
    const scores = {
      evidence: scoreEvidence({ resolvable: item.resolvable, date: item.date, locality }),
      timing: scoreTiming(item.date),
      relevance: RELEVANCE[event] || 2,
    };

    kept.push({
      id: (name + '|' + (locality || '') + '|' + event).toLowerCase().replace(/[^a-z0-9|]/g, '-'),
      gym: name,
      locality: locality || 'Pune (locality not stated)',
      event_type: event,
      // The feed gives us the PUBLICATION date, not the opening date. Those are
      // different facts and the card must not conflate them.
      published_at: item.date ? item.date.toISOString().slice(0, 10) : null,
      event_date: item.date ? item.date.toISOString().slice(0, 10) : null,
      date_semantics: 'publication date from the feed; the opening date itself is not established',
      headline: title,
      evidence: cleanEvidence(item.desc || title),
      source_name: item.source_name,
      source_url: item.link,
      source_resolvable: item.resolvable,
      also_reported_by: [],
      scores,
      act_now: scores.timing * 3 + scores.relevance * 2 + scores.evidence,
      best_evidence: scores.evidence * 3 + scores.relevance * 2 + scores.timing,
      stage,
      offer,
      why_now: `${name} ${eventPhrase(event)}${locality ? ' in ' + locality : ''}${item.date ? ', reported ' + fmtDate(item.date) : ''}. ${offer.offer} becomes relevant now.`,
      unknowns: [
        'Whether they have a budget for this',
        'Who actually decides',
        'Whether they already have a vendor or agency',
      ],
    });
  }

  // 4b. Bounded AI assessment, survivors only. The model never rejects,
  // never re-scores and never re-ranks; it annotates what the rules kept.
  let ai = { status: 'skipped', model: aiModel, assessed: 0, failed: 0, ms: 0, error: null };
  if (!aiConfigured()) {
    ai.status = 'not_configured';
  } else if (kept.length && !options.noAI) {
    const t0 = Date.now();
    const results = await Promise.allSettled(kept.map((o) => assessOpportunity(o)));
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.ok) {
        kept[i].assessment = r.value.assessment;
        kept[i].assessment_status = 'ok';
      } else {
        const err = r.status === 'fulfilled' ? r.value.error : String(r.reason);
        kept[i].assessment = null;
        kept[i].assessment_status = 'unavailable';
        kept[i].assessment_error = String(err).slice(0, 160);
        ai.failed++;
      }
    });
    ai.ms = Date.now() - t0;
    ai.assessed = kept.filter((o) => o.assessment).length;
    ai.status = ai.assessed === kept.length ? 'ok' : ai.assessed > 0 ? 'partial' : 'unavailable';
    if (ai.status !== 'ok') {
      const firstErr = kept.find((o) => o.assessment_error);
      ai.error = firstErr ? firstErr.assessment_error : null;
    }
  }

  // 5. Rank two ways: urgency, and strength of evidence.
  const actNow = [...kept].sort((a, b) => b.act_now - a.act_now);
  const bestEvidence = [...kept].sort((a, b) => b.best_evidence - a.best_evidence);

  return {
    run_id: 'run_' + startedAt.getTime().toString(36),
    at: startedAt.toISOString(),
    scope: SCOPE,
    window_days: windowDays,
    counts: {
      items_scanned: raw.length,
      opportunities: kept.length,
      rejected: rejected.length,
      duplicates: rejected.filter((r) => r.reason === 'duplicate').length,
    },
    sources: Object.values(coverage),
    ai,
    opportunities: actNow,
    views: { act_now: actNow.map((o) => o.id), best_evidence: bestEvidence.map((o) => o.id) },
    // Every rejection is kept: the tally and the rows must agree.
    rejected,
    ms: Date.now() - startedAt.getTime(),
  };
}

function eventPhrase(event) {
  return {
    opening: 'opened or is opening',
    expansion: 'is expanding',
    hiring: 'is hiring',
    funding: 'raised money',
    partnership: 'announced a partnership',
    other: 'showed a business change',
  }[event] || 'showed a business change';
}

export function toTelegram(log) {
  const lines = [];
  lines.push('<b>Gym Radar · daily sweep</b>');
  lines.push(
    `${new Date(log.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST`
  );
  lines.push('');
  lines.push(
    `${log.counts.items_scanned} items scanned · <b>${log.counts.opportunities} opportunities</b> · ${log.counts.rejected} rejected (${log.counts.duplicates} duplicate)`
  );

  if (log.ai && log.ai.status === 'ok') {
    lines.push(`AI: ${log.ai.assessed} assessed by ${escapeHtml(log.ai.model)}`);
  } else if (log.ai && log.ai.status !== 'skipped') {
    lines.push(`AI: ${log.ai.status} — rules-only fallback`);
  }

  if (!log.opportunities.length) {
    lines.push('');
    lines.push('Nothing to act on today. Sources checked:');
    for (const s of log.sources) {
      lines.push(`· ${s.name}: ${s.ok} ok, ${s.failed} failed, ${s.items} items`);
    }
    lines.push('');
    lines.push('A quiet day is a real answer. The coverage above is what was actually searched.');
    return lines.join('\n');
  }

  const top = log.opportunities.slice(0, 5);
  top.forEach((o, i) => {
    lines.push('');
    lines.push(`${i + 1}. <b>${escapeHtml(o.gym)}</b> · ${escapeHtml(o.locality)}`);
    lines.push(escapeHtml(o.headline));
    lines.push(`${o.event_type} · published ${o.published_at || 'date unknown'} · ${o.stage.label}`);
    lines.push(`Offer: ${escapeHtml(o.offer.offer)}`);
    const a = o.assessment;
    if (a) {
      lines.push(
        `AI: ${a.relevant_buyer ? 'relevant buyer' : 'not clearly a buyer'} · ${a.buyer_category} · event ${a.event_timing} · confidence ${a.confidence}/5`
      );
      lines.push(escapeHtml(a.why));
      lines.push(`Next: ${escapeHtml(a.next_action)}`);
      if (a.unknowns.length) lines.push(`Unknown: ${escapeHtml(a.unknowns[0])}`);
    } else {
      lines.push('Rules-only fallback; AI assessment unavailable.');
      lines.push(`Next: ${escapeHtml(o.offer.next_action)}`);
    }
    if (o.source_resolvable && o.source_url) {
      lines.push(`<a href="${o.source_url}">Source: ${escapeHtml(o.source_name)}</a>`);
    } else {
      lines.push(`Source: ${escapeHtml(o.source_name)} (link not directly resolvable)`);
    }
  });

  lines.push('');
  const failed = log.sources.filter((s) => s.failed > 0);
  if (failed.length) {
    lines.push(`Coverage gap: ${failed.map((s) => `${s.name} ${s.failed} failed`).join(', ')}`);
  }
  if (log.ai && log.ai.status !== 'ok' && log.ai.status !== 'skipped') {
    lines.push(`AI: ${log.ai.status}${log.ai.error ? ' — ' + escapeHtml(String(log.ai.error)) : ''}`);
  }
  lines.push('<a href="https://dheerajkumar1a1a.github.io/find-my-gym-prospects/">Open the wall</a>');
  return lines.join('\n');
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
