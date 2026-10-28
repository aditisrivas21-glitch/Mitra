import ReactMarkdown from 'react-markdown'
import Logo from './Logo'

const TOOL_LABELS = {
  calculator: 'Calculator',
  get_current_datetime: 'Clock',
  wikipedia_search: 'Wikipedia search',
}

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`msg ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && <span className="avatar"><Logo size={26} animated={false} /></span>}
      <div className="msg-body">
        <div className="bubble">
          {isUser ? <p className="plain">{message.content}</p> : <ReactMarkdown>{message.content}</ReactMarkdown>}
        </div>
        {/* The agent's "work shown": which tools it called and with what input */}
        {!isUser && message.tools?.length > 0 && (
          <ul className="trace" aria-label="Tools used by Mitra">
            {message.tools.map((t, i) => (
              <li key={i}>
                <span className="trace-name">Used {TOOL_LABELS[t.name] || t.name}</span>
                <span className="trace-args">{Object.values(t.args || {}).join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
