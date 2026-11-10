# MS-60B Patch Editor

Patch editor for the Zoom MS-60B with an AX8-Edit-style UI. Spec: `docs/intent.md`.
Protocol reference: `docs/protocol.md` (ported from g200kg/zoom-ms-utility, MIT).

## Commands

```bash
npm run dev        # Vite dev server (Chromium only: Web MIDI is not in Safari)
npm run build      # Type-check + production build
npm test           # Vitest, single run
npm run test:watch # Vitest, watch mode
npm run lint       # oxlint
```

## Non-negotiable rules

1. **Never write to the pedal without the user's explicit approval in chat, for each write operation.**
2. **Never touch firmware or the updater.** No code that sends update messages.
3. **No auto-save.** Writes only happen from the Save button.
4. **Parameter names, ranges and values come from a verified source** (Zoom manual in `docs/`, or g200kg's code), never from memory. If a value cannot be verified, leave it out and record it as pending.
5. **Code ported from g200kg** keeps its MIT copyright notice in every affected file and is listed in `THIRD_PARTY_NOTICES.md`.

## Message classification (MS-60B, devid 0x5F)

Agreed with the user. See `docs/protocol.md` for bytes and sources.

| Class | Messages | Rule |
|---|---|---|
| Read | Identity Request, Request Current Program `0x33`, Request Patch `0x29` | Allowed |
| Read with notice | Program Change `Cn pp`, Parameter Edit Enable/Disable `0x50`/`0x51` | Allowed during a read scan; tell the user before a hardware test, restore the original active patch at the end |
| Write (not persisted) | Send Patch `0x28`, Parameter Edit `0x31` | Needs explicit approval |
| Write (persisted) | Store Patch `0x32` | Needs explicit approval |
| Forbidden | Unknown `0x60`, anything firmware/update related | Never send |

Enforced in code by `src/transport/readOnlyGuard.ts` (`readOnly()`): every scan goes through it. A write path must never bypass it without the user's approval for that operation.

Not ported from g200kg: the autosave timer and `InstallChecker` (it writes test effects into patch 49).

## Layout

- `src/transport` — `MidiTransport` interface and implementations
- `src/protocol` — message builders/parsers, patch (de)serialization; `__fixtures__/` = real captured bytes only
- `src/model` — patch/block/parameter model, working vs. device copy
- `src/ui` — React components
- `src/fixtures` — FAKE data for the UI prototype; never sent to the pedal
- `scripts/` — generators: `gen-effects-60b.mjs` (effect table) and `gen-golden-readbin.mjs` (differential oracle); both take the path to a g200kg clone outside the repo
