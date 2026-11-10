import { useEffect, useState } from 'react'
import { fakeBank, FAKE_FIRMWARE } from './fixtures/fakeBank'
import { initBank } from './model/bank'
import { EditorPage } from './ui/EditorPage'
import { S1ReadPage } from './ui/S1ReadPage'

/** #/s1 → S1 read page (real pedal, read-only). Default → S2 editor prototype with FAKE data. */
export default function App() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const h = () => setHash(window.location.hash)
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  if (hash === '#/s1') return <S1ReadPage />
  return <EditorPage initial={() => initBank(FAKE_FIRMWARE, fakeBank())} sourceLabel="DATOS FALSOS" />
}
