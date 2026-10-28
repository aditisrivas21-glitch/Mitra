import { useRef } from 'react'
import Logo from './Logo'
import {
  IconArrow, IconBook, IconCalc, IconChat, IconClock, IconDoc, IconGlobe, IconNotes,
} from './Icons'

const FEATURES = [
  {
    id: 'study', cls: 'f-study', icon: IconBook, title: 'Study with me',
    text: 'Ask for an explanation, a quick quiz or a revision plan. Mitra keeps the whole conversation in mind, so follow-up questions just work.',
  },
  {
    id: 'solve', cls: 'f-solve', icon: IconCalc, title: 'Solve problems',
    text: 'Arithmetic runs through a real calculator, never a guess.',
  },
  {
    id: 'notes', cls: 'f-notes', icon: IconNotes, title: 'Summarize notes',
    text: 'Short, bullets or detailed. Paste text or summarize a file.',
  },
  {
    id: 'research', cls: 'f-research', icon: IconGlobe, title: 'Look things up',
    text: 'Mitra checks Wikipedia for people, places and concepts.',
  },
  {
    id: 'docs', cls: 'f-docs', icon: IconDoc, title: 'Ask your documents',
    text: 'Upload a PDF or TXT and ask questions. Answers name the file they came from.',
  },
  {
    id: 'chat', cls: 'f-chat', icon: IconChat, title: 'Just talk',
    text: 'Not everything is an assignment. Ask anything, any time. Mitra also knows the time in any timezone.',
  },
]

const STEPS = [
  { title: 'Ask, paste or upload', text: 'Type a question, paste your notes or drop in a PDF or TXT file.' },
  { title: 'Mitra picks the right tool', text: 'She reads your document, runs the calculator, checks the clock or looks on Wikipedia.' },
  { title: 'You see how she got there', text: 'Every answer shows which tools were used, and every chat is saved to your history.' },
]

const ORBIT = [
  { label: 'Calculator', icon: IconCalc, cls: 'o1' },
  { label: 'Clock', icon: IconClock, cls: 'o2' },
  { label: 'Wikipedia', icon: IconGlobe, cls: 'o3' },
  { label: 'PDF notes', icon: IconDoc, cls: 'o4' },
]

export default function Landing({ onStart }) {
  const heroRef = useRef(null)

  // Cursor parallax: write CSS variables directly so React does not re-render on every mouse move.
  function onMove(e) {
    const el = heroRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--mx', (((e.clientX - r.left) / r.width) - 0.5).toFixed(3))
    el.style.setProperty('--my', (((e.clientY - r.top) / r.height) - 0.5).toFixed(3))
  }

  return (
    <div className="landing">
      <header className="l-nav">
        <a className="l-brand" href="#top" aria-label="Mitra home">
          <Logo size={34} />
          <span>Mitra</span>
        </a>
        <nav className="l-links" aria-label="Sections">
          <a href="#what">What she does</a>
          <a href="#how">How it works</a>
        </nav>
        <button className="btn soft" onClick={onStart}>Open Mitra</button>
      </header>

      <section id="top" className="hero" ref={heroRef} onMouseMove={onMove}>
        <div className="hero-copy">
          <p className="hero-pill"><span className="dot" /> Your study companion</p>
          <h1>
            <span className="h-line">A study buddy</span>
            <span className="h-line">who&rsquo;s always</span>
            <span className="h-line">in your corner.</span>
          </h1>
          <p className="hero-sub">
            Mitra explains, calculates, looks things up and reads your notes, then shows you exactly
            how she got her answer.
          </p>
          <div className="hero-cta">
            <button className="btn primary big" onClick={onStart}>
              Say hi to Mitra <IconArrow width={18} height={18} />
            </button>
            <a className="btn ghost big" href="#what">See what she can do</a>
          </div>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="blob b1" />
          <div className="blob b2" />
          <div className="art-card">
            <Logo size={190} />
          </div>
          {ORBIT.map((o) => (
            <span key={o.label} className={`orbit ${o.cls}`}>
              <o.icon width={16} height={16} /> {o.label}
            </span>
          ))}
        </div>
      </section>

      <section id="what" className="section">
        <h2 className="section-title">Six small ways to feel less stuck</h2>
        <div className="bento">
          {FEATURES.map((f) => (
            <article key={f.id} className={`tile ${f.cls}`}>
              <span className="tile-icon"><f.icon width={22} height={22} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="section how">
        <h2 className="section-title">How it works</h2>
        <ol className="steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="step-n">{i + 1}</span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="final">
        <Logo size={72} />
        <h2>What would you like a little help with today?</h2>
        <button className="btn primary big" onClick={onStart}>
          Start a chat <IconArrow width={18} height={18} />
        </button>
      </section>

      <footer className="l-foot">
        <span>Mitra &mdash; made with care for late-night revision.</span>
        <span>Powered by Gemini. Please don&rsquo;t upload private documents on the free tier.</span>
      </footer>
    </div>
  )
}
