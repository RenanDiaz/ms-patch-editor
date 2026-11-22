import { describe, expect, it } from 'vitest'
import cap from '../__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import { BackupFileError, parseBackupJson, restorePlan, toBackupJson } from '../backupFile'

const bytes = (h: string) => h.split(' ').map((x) => parseInt(x, 16))

describe('backup file', () => {
  it('reads the S1 capture format (any capture/backup file can be restored)', () => {
    const b = parseBackupJson(JSON.stringify(cap))
    expect(b.patches).toHaveLength(50)
    expect(b.patches[0]).toEqual(bytes(cap.patches[0]))
    expect(b.identity?.version).toBe('2.10')
  })

  it('round-trips what the editor writes', () => {
    const patches = cap.patches.map(bytes)
    const text = toBackupJson({ identity: cap.identity, originalProgram: 3, patches }, 'test')
    expect(parseBackupJson(text).patches).toEqual(patches)
  })

  it.each([
    ['not JSON', '{'],
    ['other format', JSON.stringify({ ...cap, format: 'x' })],
    ['49 patches', JSON.stringify({ ...cap, patches: cap.patches.slice(1) })],
    ['a broken patch', JSON.stringify({ ...cap, patches: ['f0 00', ...cap.patches.slice(1)] })],
  ])('rejects %s', (_, text) => expect(() => parseBackupJson(text)).toThrow(BackupFileError))

  it('restorePlan lists only the slots that differ, with both names', () => {
    const now = cap.patches.map(bytes)
    const backup = now.map((p) => p.slice())
    backup[32] = now[6]
    expect(restorePlan(now, backup)).toEqual([
      { slot: 32, now: 'Empty', backup: 'Octaver', nowChain: 'THRU', backupChain: expect.stringContaining(' · ') },
    ])
    expect(restorePlan(now, now)).toEqual([])
  })
})
