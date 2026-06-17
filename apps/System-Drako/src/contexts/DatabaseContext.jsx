import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { fsaSupported, getStoredHandle, storeHandle, clearStoredHandle, verifyPermission, readHandle, writeHandle, pickNewDatabaseFile, pickExistingDatabaseFile } from '../lib/fileDb.js'
import { exportDatabase, importDatabase, subscribeDB } from '../lib/db.js'
import { useToast } from './ToastContext.jsx'

const DatabaseCtx = createContext(null)

export function DatabaseProvider({ children }) {
  const toast = useToast()
  const [status, setStatus] = useState('checking')   // checking | local | connected | pending
  const [fileName, setFileName] = useState('')
  const [lastSaved, setLastSaved] = useState(null)
  const handleRef = useRef(null)
  const saveTimer = useRef(null)
  const suppress = useRef(false)

  const flush = useCallback(async () => {
    const handle = handleRef.current
    if (!handle) return
    try {
      const payload = await exportDatabase()
      await writeHandle(handle, payload)
      setLastSaved(new Date())
    } catch (e) {
      toast.error('Falha ao salvar no arquivo: ' + (e.message || e))
    }
  }, [toast])

  const scheduleSave = useCallback(() => {
    if (suppress.current) { suppress.current = false; return }
    if (!handleRef.current) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(flush, 600)
  }, [flush])

  // subscribe to DB mutations -> auto-save to file
  useEffect(() => {
    const unsub = subscribeDB(scheduleSave)
    return unsub
  }, [scheduleSave])

  // best-effort flush when leaving / hidden
  useEffect(() => {
    const onHide = () => { if (saveTimer.current) { clearTimeout(saveTimer.current); flush() } }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') onHide() })
    return () => window.removeEventListener('pagehide', onHide)
  }, [flush])

  const connectHandle = useCallback(async (handle) => {
    const ok = await verifyPermission(handle, true)
    if (!ok) { setStatus('pending'); return false }
    handleRef.current = handle
    setFileName(handle.name || 'banco.drako')
    // load file into the working DB
    try {
      suppress.current = true
      const data = await readHandle(handle)
      if (data && data.kind === 'drako-db') await importDatabase(data, 'merge')
    } catch (e) { /* empty/invalid file is fine */ }
    setStatus('connected')
    return true
  }, [])

  // on mount: try silent reconnect
  useEffect(() => {
    (async () => {
      if (!fsaSupported()) { setStatus('local'); return }
      const stored = await getStoredHandle()
      if (!stored) { setStatus('local'); return }
      try {
        if ((await stored.queryPermission({ mode: 'readwrite' })) === 'granted') {
          await connectHandle(stored)
          toast.success(`Banco reconectado: ${stored.name}`)
        } else {
          setFileName(stored.name || 'banco.drako')
          handleRef.current = stored
          setStatus('pending')
        }
      } catch { setStatus('local') }
    })()
    // eslint-disable-next-line
  }, [])

  const connectNew = useCallback(async () => {
    try {
      const payload = await exportDatabase()
      const handle = await pickNewDatabaseFile(payload)
      handleRef.current = handle
      setFileName(handle.name)
      setStatus('connected')
      toast.success(`Banco criado em: ${handle.name}`)
    } catch (e) { if (e.name !== 'AbortError') toast.error('Não foi possível criar o arquivo.') }
  }, [toast])

  const openExisting = useCallback(async () => {
    try {
      const handle = await pickExistingDatabaseFile()
      const ok = await connectHandle(handle)
      if (ok) toast.success(`Banco aberto: ${handle.name}`)
    } catch (e) { if (e.name !== 'AbortError') toast.error('Não foi possível abrir o arquivo.') }
  }, [connectHandle, toast])

  const reconnect = useCallback(async () => {
    if (!handleRef.current) return
    const ok = await connectHandle(handleRef.current)
    if (ok) toast.success('Banco reconectado.')
  }, [connectHandle, toast])

  const disconnect = useCallback(async () => {
    await flush()
    await clearStoredHandle()
    handleRef.current = null
    setFileName('')
    setStatus('local')
    toast.info('Banco de arquivo desconectado. Usando apenas o local.')
  }, [flush, toast])

  const api = { supported: fsaSupported(), status, fileName, lastSaved, connectNew, openExisting, reconnect, disconnect }
  return <DatabaseCtx.Provider value={api}>{children}</DatabaseCtx.Provider>
}

export const useDatabase = () => useContext(DatabaseCtx)
