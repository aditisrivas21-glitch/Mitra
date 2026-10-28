import Logo from './Logo'
import { IconClose, IconPlus, IconTrash } from './Icons'

export default function Sidebar({ conversations, activeId, busy, open, onClose, onSelect, onNew, onDelete, onHome }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Chat history">
      <div className="sidebar-head">
        <button className="brand" onClick={onHome} title="Back to the Mitra home page">
          <Logo size={34} />
          <span>Mitra</span>
        </button>
        <button className="icon-btn mobile-only" onClick={onClose} aria-label="Close menu"><IconClose /></button>
      </div>
      <button className="btn primary full" onClick={onNew} disabled={busy}>
        <IconPlus width={18} height={18} /> New chat
      </button>

      <p className="side-label">Your chats</p>
      <nav className="conv-list">
        {conversations.length === 0 && (
          <p className="muted small pad">Chats you start will be saved here.</p>
        )}
        {conversations.map((c) => (
          <div key={c.id} className={`conv ${c.id === activeId ? 'active' : ''}`}>
            <button className="conv-title" onClick={() => onSelect(c.id)} disabled={busy} title={c.title}>
              {c.title}
            </button>
            <button className="icon-btn danger" onClick={() => onDelete(c.id)} disabled={busy}
              aria-label={`Delete chat ${c.title}`} title="Delete chat">
              <IconTrash width={17} height={17} />
            </button>
          </div>
        ))}
      </nav>
    </aside>
  )
}
