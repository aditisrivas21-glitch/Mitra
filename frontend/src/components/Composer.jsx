import { forwardRef, useEffect, useRef } from 'react'
import { IconClip, IconFile, IconSend } from './Icons'

const MAX_CHARS = 4000

// Message box with an attach button. Used both on the welcome screen and at the bottom of a chat.
const Composer = forwardRef(function Composer(
  { draft, setDraft, sending, uploading, docCount, onSend, onUpload, onOpenDocs, variant = 'dock' },
  ref,
) {
  const fileRef = useRef(null)
  const innerRef = useRef(null)
  const inputRef = ref || innerRef

  // grow the textarea with its content (up to 160px)
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [draft, inputRef])

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      onSend(draft)
    }
  }

  function onPick(e) {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = '' // allow picking the same file again
  }

  return (
    <div className={`composer ${variant}`}>
      {docCount > 0 && (
        <button type="button" className="doc-chip" onClick={onOpenDocs}>
          <IconFile width={15} height={15} /> {docCount} {docCount === 1 ? 'document' : 'documents'} in this chat
        </button>
      )}
      <div className="composer-box">
        <input ref={fileRef} type="file" accept=".pdf,.txt,application/pdf,text/plain" hidden onChange={onPick} />
        <button
          type="button" className="icon-btn attach" onClick={() => fileRef.current?.click()}
          disabled={uploading} aria-label="Upload a PDF or TXT file" title="Upload a PDF or TXT file"
        >
          {uploading ? <span className="spinner" /> : <IconClip />}
        </button>
        <textarea
          ref={inputRef}
          value={draft}
          rows={1}
          maxLength={MAX_CHARS}
          placeholder="Ask Mitra anything…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={sending}
          aria-label="Message"
        />
        <button
          type="button" className="send" onClick={() => onSend(draft)}
          disabled={sending || !draft.trim()} aria-label={sending ? 'Mitra is thinking' : 'Send message'}
        >
          <IconSend />
        </button>
      </div>
      <p className="composer-hint">
        Enter to send, Shift+Enter for a new line.
        {draft.length > MAX_CHARS * 0.9 && <strong> {draft.length}/{MAX_CHARS}</strong>}
      </p>
    </div>
  )
})

export default Composer
