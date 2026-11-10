import { describe, expect, it } from 'vitest'
import { CATALOG } from '../catalog'
import { liveMessages } from '../liveDiff'
import { newBlock, setParam, toggleBlock, moveBlock, type Patch } from '../patch'
import cap from '../../protocol/__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import { decodePatch60B } from '../../protocol/patch60b'

const id = (n: string) => CATALOG.find((e) => e.name === n)!.id
const raw = cap.patches[6].split(' ').map((x) => parseInt(x, 16))
const p: Patch = { name: 'T', blocks: [newBlock(id('M Comp')), newBlock(id('Ba GEQ')), newBlock(id('SVT')), newBlock(id('Delay'))] }

describe('liveMessages', () => {
  it('nothing changed → nothing to send', () => expect(liveMessages(p, p, raw)).toEqual([]))

  it('params of effects 1-3 → one 0x31 each', () => {
    const to = setParam(setParam(p, 0, 0, 3), 2, 1, 7)
    expect(liveMessages(p, to, raw).map((m) => Array.from(m))).toEqual([
      [0xf0, 0x52, 0x00, 0x5f, 0x31, 0, 2, 3, 0, 0xf7],
      [0xf0, 0x52, 0x00, 0x5f, 0x31, 2, 3, 7, 0, 0xf7],
    ])
  })

  it.each([
    ['a param of effect 4', setParam(p, 3, 0, 500)],
    ['on/off', toggleBlock(p, 0)],
    ['order', moveBlock(p, 0, 1)],
    ['name', { ...p, name: 'X' }],
  ])('%s → one 0x28 with the whole patch', (_, to) => {
    const m = liveMessages(p, to as Patch, raw)
    expect(m).toHaveLength(1)
    const d = decodePatch60B(m[0])
    expect(d.name).toBe((to as Patch).name)
    expect(d.effects.slice(0, d.maxFx).map((e) => e.id)).toEqual((to as Patch).blocks.map((b) => b.effectId))
  })
})
