import { useId } from 'react'

// Mitra mark: a speech bubble holding an open book, with a tiny star riding the bubble's corner.
// With `animated`, the bubble floats, the pages breathe and the star twinkles (CSS in styles.css).
export default function Logo({ size = 40, animated = true, className = '' }) {
  const uid = useId().replace(/:/g, '')
  const grad = `mitra-bubble-${uid}`
  const star = `mitra-star-${uid}`
  return (
    <svg
      className={`logo ${animated ? 'is-animated' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 96 96"
      role="img"
      aria-label="Mitra logo"
    >
      <defs>
        <linearGradient id={grad} x1="8" y1="8" x2="80" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#C4B2F7" />
          <stop offset="1" stopColor="#7A5FD6" />
        </linearGradient>
        <linearGradient id={star} x1="0" y1="-9" x2="0" y2="9" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#F7B2CB" />
          <stop offset="1" stopColor="#E87AA3" />
        </linearGradient>
      </defs>

      <g className="logo-bubble">
        {/* speech bubble with a tail at the lower left */}
        <path
          d="M30 12 H58 Q80 12 80 34 V48 Q80 70 58 70 H43 L27 85 V69.6 Q8 65 8 48 V34 Q8 12 30 12 Z"
          fill={`url(#${grad})`}
        />
        {/* open book */}
        <g className="logo-book">
          <path className="logo-page logo-page-l" d="M44 55 C38 50 29 49 22 51 V31 C29 29 38 30 44 35 Z" fill="#FFF9F0" />
          <path className="logo-page logo-page-r" d="M44 55 C50 50 59 49 66 51 V31 C59 29 50 30 44 35 Z" fill="#FFF9F0" />
          <path d="M44 35 V55" stroke="#B6A2F2" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M27 38 C31 37 35 37.6 39 39.4 M27 43.5 C31 42.5 35 43 39 44.8" stroke="#D9CEFA" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <path d="M61 38 C57 37 53 37.6 49 39.4 M61 43.5 C57 42.5 53 43 49 44.8" stroke="#D9CEFA" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        </g>
      </g>

      {/* tiny star */}
      <g transform="translate(77 15)">
        <g className="logo-star">
          <polygon
            points="0,-10 2.9,-3.4 9.5,-3.1 4.5,1.4 5.9,8.1 0,4.6 -5.9,8.1 -4.5,1.4 -9.5,-3.1 -2.9,-3.4"
            fill={`url(#${star})`}
            stroke="#FFF9F0"
            strokeWidth="2.2"
            strokeLinejoin="round"
            paintOrder="stroke"
          />
        </g>
      </g>
    </svg>
  )
}
