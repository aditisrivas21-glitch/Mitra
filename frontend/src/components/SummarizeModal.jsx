import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import * as api from '../api'
import { IconClose } from './Icons'

export default function SummarizeModal({ onClose }) {
  const [text, setText] = useState('')
  const [style, setStyle] = useState('short')
  const [summary, setSummary] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function run() {
    setError('')
    setSummary('')
    setLoading(true)
    try {
      const res = await api.summarizeText(text, style)
      setSummary(res.summary)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy. Select the text and copy it manually.')
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Summarize text" onClick={(e) => e.stopPropagation()}>
        <div className="sidebar-head">
          <h2 className="panel-title">Summarize text</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        <textarea
          className="modal-text"
          rows={8}
          value={text}
          maxLength={60000}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste an article, lecture notes or any long text (at least 50 characters)…"
        />
        <div className="modal-row">
          <select value={style} onChange={(e) => setStyle(e.target.value)} aria-label="Summary style">
            <option value="short">Short (2-3 sentences)</option>
            <option value="bullets">Bullet points</option>
            <option value="detailed">Detailed</option>
          </select>
          <span className="muted small">{text.length.toLocaleString()} / 60,000</span>
          <button className="btn primary" onClick={run} disabled={loading || text.trim().length < 50}>
            {loading ? (<><span className="spinner" /> Summarizing…</>) : 'Summarize'}
          </button>
        </div>

        {error && <div className="banner error" role="alert"><span>{error}</span></div>}
        {summary && (
          <div className="result">
            <ReactMarkdown>{summary}</ReactMarkdown>
            <button className="btn small" onClick={copy}>{copied ? 'Copied' : 'Copy summary'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
