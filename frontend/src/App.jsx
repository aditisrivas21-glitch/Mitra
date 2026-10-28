import { useEffect, useState } from 'react'
import * as api from './api'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import DocumentPanel from './components/DocumentPanel'
import SummarizeModal from './components/SummarizeModal'
import Landing from './components/Landing'

const MAX_UPLOAD_MB = 5

export default function App() {
  const [conversations, setConversations] = useState([])
  const [activeId, setActiveId] = useState(null) // null = a brand-new chat that is not saved yet
  const [messages, setMessages] = useState([])
  const [documents, setDocuments] = useState([])
  const [draft, setDraft] = useState('')
  const [health, setHealth] = useState(null)
  const [error, setError] = useState('')

  // 'landing' = marketing page, 'app' = the workspace. Remembered for the browser tab session only.
  const [view, setView] = useState(() => {
    try { return sessionStorage.getItem('mitra-view') === 'app' ? 'app' : 'landing' } catch { return 'landing' }
  })
  function go(next) {
    setView(next)
    try { sessionStorage.setItem('mitra-view', next) } catch { /* storage unavailable: fine */ }
    window.scrollTo?.(0, 0)
  }

  // loading flags drive the spinners / disabled buttons
  const [loadingChat, setLoadingChat] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [summarizingId, setSummarizingId] = useState(null)

  // UI visibility (drawers on mobile, modal)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
  const [showSummarizer, setShowSummarizer] = useState(false)

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => setHealth({ status: 'down' }))
    loadConversations()
  }, [])

  async function loadConversations(openFirst = false) {
    try {
      const list = await api.listConversations()
      setConversations(list)
      if (openFirst && list.length) await openConversation(list[0].id)
    } catch (e) {
      setError(e.message)
    }
  }

  async function openConversation(id) {
    setActiveId(id)
    setSidebarOpen(false)
    setError('')
    setLoadingChat(true)
    try {
      const conv = await api.getConversation(id)
      setMessages(conv.messages)
      setDocuments(conv.documents)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoadingChat(false)
    }
  }

  function newChat() {
    setActiveId(null)
    setMessages([])
    setDocuments([])
    setDraft('')
    setError('')
    setSidebarOpen(false)
  }

  // A new chat is only created in the database when the user actually does something in it.
  async function ensureConversation() {
    if (activeId) return activeId
    const conv = await api.createConversation()
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
    return conv.id
  }

  async function send(text) {
    const content = text.trim()
    if (!content || sending) return
    setError('')
    setSending(true)
    setDraft('')
    const temp = { id: `tmp-${Date.now()}`, role: 'user', content, tools: [] } // optimistic UI
    setMessages((m) => [...m, temp])
    try {
      const id = await ensureConversation()
      const res = await api.sendMessage(id, content)
      setMessages((m) => [...m.filter((x) => x.id !== temp.id), res.user_message, res.assistant_message])
      loadConversations()
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== temp.id))
      setDraft(content) // give the text back so nothing is lost
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  async function upload(file) {
    const ext = file.name.toLowerCase().split('.').pop()
    if (!['pdf', 'txt'].includes(ext)) return setError('Only PDF and TXT files are supported.')
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return setError(`File is larger than ${MAX_UPLOAD_MB} MB.`)
    setError('')
    setUploading(true)
    try {
      const id = await ensureConversation()
      const doc = await api.uploadDocument(id, file)
      setDocuments((d) => [...d, doc])
      loadConversations()
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  async function removeDocument(id) {
    try {
      await api.deleteDocument(id)
      setDocuments((d) => d.filter((x) => x.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  async function summarizeDoc(id, style) {
    setSummarizingId(id)
    setError('')
    try {
      const res = await api.summarizeDocument(id, style)
      setMessages((m) => [...m, res.user_message, res.assistant_message])
      setDocsOpen(false)
      loadConversations()
    } catch (e) {
      setError(e.message)
    } finally {
      setSummarizingId(null)
    }
  }

  async function removeConversation(id) {
    if (!window.confirm('Delete this chat and its documents?')) return
    try {
      await api.deleteConversation(id)
      setConversations((c) => c.filter((x) => x.id !== id))
      if (id === activeId) newChat()
    } catch (e) {
      setError(e.message)
    }
  }

  const activeTitle = conversations.find((c) => c.id === activeId)?.title || 'New chat'

  if (view === 'landing') return <Landing onStart={() => go('app')} />

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        busy={sending}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSelect={openConversation}
        onNew={newChat}
        onDelete={removeConversation}
        onHome={() => go('landing')}
      />
      <ChatWindow
        title={activeTitle}
        messages={messages}
        loading={loadingChat}
        sending={sending}
        uploading={uploading}
        error={error}
        health={health}
        draft={draft}
        setDraft={setDraft}
        docCount={documents.length}
        onDismissError={() => setError('')}
        onSend={send}
        onUpload={upload}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenDocs={() => setDocsOpen(true)}
        onOpenSummarizer={() => setShowSummarizer(true)}
      />
      <DocumentPanel
        documents={documents}
        uploading={uploading}
        summarizingId={summarizingId}
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
        onUpload={upload}
        onDelete={removeDocument}
        onSummarize={summarizeDoc}
      />
      {(sidebarOpen || docsOpen) && (
        <div className="scrim" onClick={() => { setSidebarOpen(false); setDocsOpen(false) }} />
      )}
      {showSummarizer && <SummarizeModal onClose={() => setShowSummarizer(false)} />}
    </div>
  )
}
