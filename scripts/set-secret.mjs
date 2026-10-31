// scripts/set-secret.mjs — set a GitHub Actions secret without the gh CLI.
//
//   GH_TOKEN=... GH_REPO=owner/repo node scripts/set-secret.mjs TELEGRAM_BOT_TOKEN 123:ABC
//
// GitHub wants secrets encrypted with the repo's public key (libsodium sealed
// box). This does that and PUTs the result. Nothing is written to disk.
import sodium from 'tweetsodium';

const [name, value] = process.argv.slice(2);
const token = process.env.GH_TOKEN;
const repo = process.env.GH_REPO;

if (!name || value === undefined) {
  console.error('usage: node scripts/set-secret.mjs <NAME> <value>');
  process.exit(1);
}
if (!token || !repo) {
  console.error('GH_TOKEN and GH_REPO must be set');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'User-Agent': 'gym-radar-secrets',
  'Content-Type': 'application/json',
};

const keyRes = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/public-key`, { headers });
if (!keyRes.ok) {
  console.error('could not fetch the repo public key:', keyRes.status, await keyRes.text());
  process.exit(1);
}
const { key, key_id } = await keyRes.json();

const sealed = sodium.seal(Buffer.from(value), Buffer.from(key, 'base64'));

const put = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/${name}`, {
  method: 'PUT',
  headers,
  body: JSON.stringify({ encrypted_value: Buffer.from(sealed).toString('base64'), key_id }),
});

if (!put.ok) {
  console.error('failed:', put.status, await put.text());
  process.exit(1);
}
console.log(`${name} set on ${repo} (${value.length} chars)`);
