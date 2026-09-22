import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from './api'

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const fnRef = useRef(fn)
  fnRef.current = fn
  const run = useCallback(async () => {
    setLoading(true); setError(null)
    try { setData(await fnRef.current()) } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run() }, deps)
  return { data, error, loading, reload: run, setData }
}

export function useToast() {
  const [toast, setToast] = useState<{ message: string; tone: 'ok' | 'err' } | null>(null)
  const show = useCallback((message: string, tone: 'ok' | 'err' = 'ok') => {
    setToast({ message, tone })
    setTimeout(() => setToast(null), 2800)
  }, [])
  return { toast, show }
}
