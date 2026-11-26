// Output checks: run with `node tests/validate.mjs`.
// main.ts must write identical bytes on two runs; every screenshot must fit the
// gate's limits; and the kit's own check must pass on the repository.
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('..', import.meta.url));
const kit = process.env.KIT_DIR ?? '/tmp/kitx/best-flight-game-20261126-0057-kit';

let failed = 0;
function check(name, condition) {
  if (condition) console.log(`ok   ${name}`);
  else {
    console.log(`FAIL ${name}`);
    failed += 1;
  }
}

function listFiles(dir, base = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(base, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(join(dir, entry.name), path));
    else out.push(path);
  }
  return out.sort();
}

// Two runs of main.ts must write the same bytes.
for (const outDir of ['out1', 'out2']) {
  const run = spawnSync('node', ['main.ts'], {
    cwd: here,
    env: { ...process.env, MAKEFUN_OUTPUT_DIR: join(here, outDir) },
    encoding: 'utf8',
  });
  if (run.status !== 0) {
    console.log(`FAIL main.ts run into ${outDir} failed:\n${run.stderr}`);
    failed += 1;
  }
}
{
  const first = listFiles(join(here, 'out1'));
  const second = listFiles(join(here, 'out2'));
  check('both runs write the same file list', JSON.stringify(first) === JSON.stringify(second));
  let identical = true;
  for (const file of first) {
    if (!readFileSync(join(here, 'out1', file)).equals(readFileSync(join(here, 'out2', file)))) identical = false;
  }
  check('both runs write identical bytes', identical);
  check('dossier.json exists', existsSync(join(here, 'out1', 'dossier.json')));
}

// Screenshots: 3 or 4, each at most 256 KiB, long side at most 1280, short side at least 480.
function jpegSize(buffer) {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
    }
    offset += 2 + buffer.readUInt16BE(offset + 2);
  }
  return null;
}
{
  const shots = readdirSync(join(here, 'screenshots')).filter((name) => !name.startsWith('.')).sort();
  check('3 or 4 screenshots', shots.length >= 3 && shots.length <= 4);
  for (const name of shots) {
    const path = join(here, 'screenshots', name);
    const size = statSync(path).size;
    const dims = jpegSize(readFileSync(path));
    check(`${name} is at most 256 KiB (${Math.round(size / 1024)} KiB)`, size <= 262144);
    if (dims) {
      check(`${name} is ${dims.width}x${dims.height}`, Math.max(dims.width, dims.height) <= 1280 && Math.min(dims.width, dims.height) >= 480);
    } else {
      console.log(`FAIL ${name} is not a readable JPEG`);
      failed += 1;
    }
  }
}

// The kit's own check on the repository.
{
  const run = spawnSync('node', [join(kit, 'cli', 'makefun.mjs'), 'check', '--kit', kit, '--repo', here], {
    encoding: 'utf8',
  });
  console.log(run.stdout);
  if (run.stderr) console.log(run.stderr);
  check('kit check passes', run.status === 0);
}

process.exit(failed === 0 ? 0 : 1);
