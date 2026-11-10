import { describe, expect, it } from 'vitest'
import cap from '../__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import { describeEffect, findEffect } from '../describe'
import { isAllowedReadMessage, parseIdentityReply } from '../messages'
import { BITS, decodePatch60B, NAME_OFFSETS_60B } from '../patch60b'
import oracle from './g200kg-readbin-real.json'

/** Real bytes read from the user's MS-60B on 2026-11-10 (firmware 2.10), read-only scan. */
const bytes = (h: string) => h.split(' ').map((x) => parseInt(x, 16))
const patches = cap.patches.map(bytes)
const firmware = cap.identity.firmware

describe('real capture: scan log', () => {
  it('is an MS-60B, firmware 2.10, 50 patches of 105 bytes', () => {
    expect(cap.identity).toMatchObject({ manufacturer: 0x52, deviceId: 0x5f, version: '2.10' })
    expect(patches).toHaveLength(50)
    patches.forEach((p) => expect(p).toHaveLength(105))
  })

  it('the Identity Reply in the log parses to the same identity', () => {
    const reply = cap.log.find((l) => l.dir === 'in' && l.hex.startsWith('f0 7e'))!
    expect(parseIdentityReply(bytes(reply.hex))).toEqual(cap.identity)
  })

  it('sent only read messages, and restored the original program last', () => {
    const out = cap.log.filter((l) => l.dir === 'out').map((l) => bytes(l.hex))
    out.forEach((m) => expect(isAllowedReadMessage(m), m.join(',')).toBe(true))
    expect(out.at(-1)).toEqual([0xc0, cap.originalProgram])
  })

  it('every patch in the log matches the patches array, in order', () => {
    const fromLog = cap.log.filter((l) => l.dir === 'in' && l.hex.startsWith('f0 52 00 5f 28')).map((l) => l.hex)
    expect(fromLog).toEqual(cap.patches)
  })
})

describe('real capture: decoder', () => {
  it('matches g200kg ReadBin on all 50 real patches', () => {
    expect(oracle.cases).toHaveLength(50)
    oracle.cases.forEach((c, i) => {
      const p = decodePatch60B(patches[i])
      expect(c.bytes).toEqual(patches[i])
      expect(p.name).toBe(c.name)
      expect(p.maxFx).toBe(c.maxfx)
      expect(p.focus).toBe(c.curfx)
      expect(p.dspFull).toBe(c.dspstate)
      p.effects.forEach((e, n) => expect([e.on ? 1 : 0, e.id, ...e.params]).toEqual(c.fx[n]))
    })
  })

  it('every effect id is in the 60B table and available on this firmware', () => {
    const missing: string[] = []
    patches.forEach((b, i) =>
      decodePatch60B(b).effects.forEach((e, n) => {
        const def = findEffect(e.id)
        if (!def || def.minFirmware > firmware) missing.push(`${i + 1}/${n + 1}: 0x${e.id.toString(16)}`)
      }),
    )
    expect(missing).toEqual([])
  })

  it('no parameter is outside the g200kg range, and unused params are 0', () => {
    const bad: string[] = []
    patches.forEach((b, i) =>
      decodePatch60B(b).effects.forEach((e, n) => {
        const v = describeEffect(e, n, firmware)
        v.params.filter((p) => p.outOfRange).forEach((p) => bad.push(`${i + 1}/${n + 1} ${v.name}.${p.name}=${p.raw}`))
        e.params.slice(v.params.length).forEach((x, k) => x && bad.push(`${i + 1}/${n + 1} unused p${v.params.length + k + 1}=${x}`))
      }),
    )
    expect(bad).toEqual([])
  })

  it('slots beyond maxFx are THRU', () => {
    patches.forEach((b) => {
      const p = decodePatch60B(b)
      p.effects.slice(p.maxFx).forEach((e) => expect(e.id).toBe(0))
    })
  })

  it('decoded bank is stable (regression snapshot)', () => {
    const summary = patches.map((b, i) => {
      const p = decodePatch60B(b)
      return {
        slot: i + 1,
        name: p.name,
        maxFx: p.maxFx,
        focus: p.focus,
        dspFull: p.dspFull,
        fx: p.effects.map((e) => [e.on ? 1 : 0, findEffect(e.id)?.name ?? e.id, ...e.params]),
      }
    })
    expect(summary).toMatchSnapshot()
  })
})

describe('real capture: bits outside the decoded fields', () => {
  // Bits no decoded field reads. S3 must preserve them when writing.
  const covered = new Array(105).fill(0)
  for (const fx of BITS) for (const spans of fx) for (const [o, m] of spans) covered[o] |= m
  for (const o of NAME_OFFSETS_60B) covered[o] = 0x7f
  covered[89] |= 0x1c // maxFx
  covered[88] |= 0x40 | 0x3f // focus bit + dspFull
  covered[85] |= 0x10 // focus bit
  for (const o of [0, 1, 2, 3, 4, 104]) covered[o] = 0xff

  it('only byte 90 (always 0x0F) and bit 0x10 of the AMP cab bytes are uncovered', () => {
    const found = new Set<string>()
    patches.forEach((b) =>
      b.forEach((v, o) => {
        const extra = v & ~covered[o] & 0x7f
        if (extra) found.add(`${o}:0x${extra.toString(16)}`)
      }),
    )
    expect([...found].sort()).toEqual(['43:0x10', '64:0x10', '90:0xf'])
    patches.forEach((b) => expect(b[90]).toBe(0x0f))
  })
})
