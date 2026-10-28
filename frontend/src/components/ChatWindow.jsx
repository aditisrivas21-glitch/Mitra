import { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'
import Composer from './Composer'
import Welcome from './Welcome'
import Logo from './Logo'
import { IconClose, IconDoc, IconMenu, IconNotes } from './Icons'

export default function ChatWindow({
  title, messages, loading, sending, uploading, error, health, draft, setDraft, docCount,
  onDismissError, onSend, onUpload, onOpenSidebar, onOpenDocs, onOpenSummarizer,
}) {
  const endRef = useRef(null)
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const empty = !loading && messages.length === 0
  const keyMissing = health && health.status === 'ok' && !health.api_key_configured

  function focusInput() {
    requestAnimationFrame(() => {
      const el = inputRef.current
      if (!el) return
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    })
  }

  function onCard(card) {
    if (card.action === 'summarize') return onOpenSummarizer()
    if (card.action === 'docs') return onOpenDocs()
    if (card.action === 'draft') setDraft(card.draft)
    focusInput()
  }

  const composer = (variant) => (
    <Composer
      ref={inputRef} variant={variant} draft={draft} setDraft={setDraft} sending={sending}
      uploading={uploading} docCount={docCount} onSend={onSend} onUpload={onUpload} onOpenDocs={onOpenDocs}
    />
  )

  // Drag a PDF/TXT anywhere on the workspace to upload it.
  const dragProps = {
    onDragOver: (e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); setDragging(true) } },
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) },
    onDrop: (e) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer?.files?.[0]
      if (file) onUpload(file)
    },
  }

  return (
    <main className="chat" {...dragProps}>
      <header className="chat-head">
        <button className="icon-btn mobile-only" onClick={onOpenSidebar} aria-label="Open chat list"><IconMenu /></button>
        <h2 className="chat-title">{title}</h2>
        <div className="head-actions">
          <button className="btn soft" onClick={onOpenSummarizer}>
            <IconNotes width={17} height={17} /> <span className="hide-sm">Summarize text</span>
          </button>
          <button className="btn soft" onClick={onOpenDocs}>
            <IconDoc width={17} height={17} /> <span className="hide-sm">Documents</span>{docCount > 0 && <span className="count">{docCount}</span>}
          </button>
        </div>
      </header>

      {health?.status === 'down' && (
        <div className="banner warn" role="alert">
          <span>The backend is not reachable. Start it with <code>uvicorn app.main:app --reload</code> in the backend folder.</span>
        </div>
      )}
      {keyMissing && (
        <div className="banner warn" role="alert">
          <span>No Gemini API key found. Add <code>GEMINI_API_KEY</code> to <code>backend/.env</code> and restart the backend.</span>
        </div>
      )}
      {error && (
        <div className="banner error" role="alert">
          <span>{error}</span>
          <button className="icon-btn" onClick={onDismissError} aria-label="Dismiss error"><IconClose width={16} height={16} /></button>
        </div>
      )}

      {empty ? (
        <section className="messages welcome-wrap">
          <Welcome onCard={onCard}>{composer('inline')}</Welcome>
        </section>
      ) : (
        <>
          <section className="messages" aria-live="polite">
            <div className="thread">
              {loading && <div className="center-note"><span className="spinner" /> Opening chat…</div>}
              {messages.map((m) => <MessageBubble key={m.id} message={m} />)}
              {sending && (
                <div className="msg assistant" role="status" aria-label="Mitra is thinking">
                  <span className="avatar"><Logo size={26} animated={false} /></span>
                  <div className="bubble typing"><span /><span /><span /></div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </section>
          {composer('dock')}
        </>
      )}

      {dragging && <div className="drop-veil"><div>Drop a PDF or TXT file to add it to this chat</div></div>}
    </main>
  )
}
