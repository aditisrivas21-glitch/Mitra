import Logo from './Logo'
import { IconBook, IconCalc, IconChat, IconDoc, IconGlobe, IconNotes } from './Icons'

// `action` tells ChatWindow what a card does. Cards start a real chat (or open a real feature);
// nothing here produces canned answers.
export const CARDS = [
  { id: 'study', icon: IconBook, title: 'Studying', hint: 'Understand a topic', action: 'draft', draft: 'Help me understand ' },
  { id: 'solve', icon: IconCalc, title: 'Solving problems', hint: 'Step by step, with a calculator', action: 'draft', draft: 'Walk me through solving: ' },
  { id: 'notes', icon: IconNotes, title: 'Summarizing notes', hint: 'Paste text, get the gist', action: 'summarize' },
  { id: 'research', icon: IconGlobe, title: 'Web research', hint: 'Look it up on Wikipedia', action: 'draft', draft: 'Look up on Wikipedia and explain: ' },
  { id: 'docs', icon: IconDoc, title: 'Document Q&A', hint: 'Ask a PDF or TXT file', action: 'docs' },
  { id: 'chat', icon: IconChat, title: 'General chat', hint: 'Anything on your mind', action: 'focus' },
]

export default function Welcome({ onCard, children }) {
  return (
    <div className="welcome">
      <div className="welcome-hello">
        <Logo size={84} />
        <h1>Hi, I&rsquo;m Mitra! <span className="tulip" role="img" aria-label="tulip">🌷</span></h1>
        <p>What would you like a little help with today?</p>
      </div>

      <ul className="cards">
        {CARDS.map((c, i) => (
          <li key={c.id} style={{ '--i': i }}>
            <button type="button" className="card" onClick={() => onCard(c)}>
              <span className="card-icon"><c.icon width={22} height={22} /></span>
              <span className="card-text">
                <strong>{c.title}</strong>
                <span>{c.hint}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {children}
    </div>
  )
}
