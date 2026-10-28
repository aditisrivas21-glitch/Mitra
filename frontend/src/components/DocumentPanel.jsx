import { useRef, useState } from 'react'
import { IconClose, IconFile } from './Icons'

export default function DocumentPanel({
  documents, uploading, summarizingId, open, onClose, onUpload, onDelete, onSummarize,
}) {
  const fileRef = useRef(null)
  const [style, setStyle] = useState('short')

  function onPick(e) {
    const file = e.target.files?.[0]
    if (file) onUpload(file)
    e.target.value = '' // allow picking the same file again
  }

  return (
    <aside className={`docs ${open ? 'open' : ''}`} aria-label="Documents">
      <div className="sidebar-head">
        <h2 className="panel-title">Documents</h2>
        <button className="icon-btn docs-close" onClick={onClose} aria-label="Close documents"><IconClose /></button>
      </div>
      <p className="muted small">
        Files you add belong to this chat. Ask questions about them in the chat, or summarize them here.
      </p>

      <input ref={fileRef} type="file" accept=".pdf,.txt,application/pdf,text/plain" hidden onChange={onPick} />
      <button className="btn primary full" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? (<><span className="spinner" /> Reading file…</>) : 'Upload PDF or TXT'}
      </button>
      <p className="muted small">Up to 5 MB each, 5 files per chat. Scanned PDFs are not supported.</p>

      <label className="field">
        <span>Summary style</span>
        <select value={style} onChange={(e) => setStyle(e.target.value)}>
          <option value="short">Short (2-3 sentences)</option>
          <option value="bullets">Bullet points</option>
          <option value="detailed">Detailed</option>
        </select>
      </label>

      <ul className="doc-list">
        {documents.length === 0 && <li className="muted small">No documents yet. Upload one and ask Mitra about it.</li>}
        {documents.map((d) => (
          <li key={d.id} className="doc">
            <div className="doc-name" title={d.filename}><IconFile width={16} height={16} /> <span>{d.filename}</span></div>
            <div className="muted small">{d.char_count.toLocaleString()} characters</div>
            <div className="doc-actions">
              <button className="btn small" onClick={() => onSummarize(d.id, style)} disabled={summarizingId !== null}>
                {summarizingId === d.id ? (<><span className="spinner" /> Summarizing…</>) : 'Summarize'}
              </button>
              <button className="btn small danger" onClick={() => onDelete(d.id)} disabled={summarizingId === d.id}>
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}
