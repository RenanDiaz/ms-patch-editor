import { useEffect, useState } from 'react'
import { fakeBank, FAKE_FIRMWARE } from './fixtures/fakeBank'
import { initBank } from './model/bank'
import { EditorPage } from './ui/EditorPage'
import { PedalEditorPage } from './ui/PedalEditorPage'
import { S1ReadPage } from './ui/S1ReadPage'
import { S3WritePage } from './ui/S3WritePage'

/**
 * Default → editor on the real pedal. #/demo → editor with FAKE data (S2).
 * #/s1 → S1 read page. #/s3 → S3 controlled write (one slot, confirmed).
 */
export default function App() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const h = () => setHash(window.location.hash)
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])
  if (hash === '#/s1') return <S1ReadPage />
  if (hash === '#/s3') return <S3WritePage />
  if (hash === '#/demo') return <EditorPage initial={() => initBank(FAKE_FIRMWARE, fakeBank())} />
  return <PedalEditorPage />
}
