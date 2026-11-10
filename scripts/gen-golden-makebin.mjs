// Builds a differential-test oracle for the S3 encoder: takes the real patches
// of a capture (ms60b-capture/1), applies seeded random edits (on/off, effect
// type, params, name) and runs g200kg's own apatch.ReadBin + MakeBin
// (js/apatch.js, MIT) to get the bytes g200kg would send. Effect count is kept
// so MakeBin's focus handling is not involved. Output:
// src/protocol/__tests__/g200kg-makebin-golden.json
// Usage: node scripts/gen-golden-makebin.mjs <g200kg clone> <commit> <capture.json>
import { readFileSync, writeFileSync } from 'node:fs'
import vm from 'node:vm'

const [root, commit, capturePath] = process.argv.slice(2)
if (!root || !commit || !capturePath) {
  console.error('usage: node scripts/gen-golden-makebin.mjs <g200kg clone> <commit> <capture.json>')
  process.exit(1)
}
const ctx = vm.createContext({})
vm.runInContext(
  readFileSync(`${root}/js/apatch.js`, 'utf8') +
    readFileSync(`${root}/js/effectslist.js`, 'utf8') +
    '\n;globalThis.__apatch = apatch; globalThis.__effects = effectlist;',
  ctx,
  { timeout: 1000 },
)
const Apatch = ctx.__apatch
const effects = ctx.__effects
const ids60 = Object.keys(effects).map(Number).filter((id) => ((effects[id].ver >> 4) & 0xf) !== 0)

let seed = 0x5328
function rnd() {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = (a) => a[Math.floor(rnd() * a.length)]
const CABS = [0, 1, 16, 32, 48, 64, 80, 96, 112, 128, 192]

const capture = JSON.parse(readFileSync(capturePath, 'utf8'))
const cases = []
capture.patches.forEach((hex, slot) => {
  const base = hex.split(' ').map((x) => parseInt(x, 16))
  for (let k = 0; k < 3; k++) {
    const p = new Apatch()
    p.ReadBin(base)
    for (let f = 0; f < p.maxfx; f++) {
      const r = rnd()
      if (r < 0.25) p.fx[f][0] ^= 1
      else if (r < 0.6) {
        const id = pick(ids60)
        p.fx[f] = [1, id, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        effects[id].param.forEach((d, i) => {
          p.fx[f][i + 2] = d.name === 'CAB' && effects[id].group === 'AMP' ? pick(CABS) : Math.floor(rnd() * ((d.max || 0) + 1))
        })
      } else if (r < 0.85) {
        const e = effects[p.fx[f][1]]
        e?.param.forEach((d, i) => {
          if (d.max) p.fx[f][i + 2] = Math.floor(rnd() * (d.max + 1))
        })
      }
    }
    if (rnd() < 0.3) p.name = Array.from({ length: 1 + Math.floor(rnd() * 10) }, () => String.fromCharCode(0x20 + Math.floor(rnd() * 95))).join('').replace(/^ +| +$/g, '') || 'X'
    const out = p.MakeBin(0x5f, effects)
    cases.push({ slot, base, name: p.name, maxfx: p.maxfx, fx: p.fx.slice(0, 4).map((x) => Array.from(x)), out: Array.from(out) })
  }
})
writeFileSync(
  'src/protocol/__tests__/g200kg-makebin-golden.json',
  JSON.stringify({ source: `g200kg/zoom-ms-utility@${commit} js/apatch.js MakeBin`, capture: capturePath.split('/').pop(), cases }) + '\n',
)
console.log(`wrote ${cases.length} cases`)
