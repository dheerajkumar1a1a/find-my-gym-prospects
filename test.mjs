// test.mjs — local smoke test. node test.mjs
import { runRadar, toTelegram } from './lib/radar.js';

const log = await runRadar();

console.log('--- COVERAGE ---');
for (const s of log.sources) {
  console.log(`${s.name.padEnd(14)} ok=${s.ok} failed=${s.failed} items=${s.items} ${s.errors.join(' | ')}`);
}

console.log('\n--- COUNTS ---');
console.log(log.counts);

console.log('\n--- OPPORTUNITIES ---');
for (const o of log.opportunities) {
  console.log(
    `${o.act_now.toString().padStart(2)} | ${o.gym} | ${o.locality} | ${o.event_type} | ${o.event_date} | ${o.stage.tier} | ${o.source_name} | resolvable=${o.source_resolvable}`
  );
  console.log(`     ${o.headline}`);
  console.log(`     ${o.source_url}`);
}

console.log('\n--- REJECTED ---');
for (const r of log.rejected.slice(0, 25)) {
  console.log(`  [${r.reason}] ${r.name} — ${r.detail}`);
}

console.log('\n--- TELEGRAM PREVIEW ---');
console.log(toTelegram(log));
