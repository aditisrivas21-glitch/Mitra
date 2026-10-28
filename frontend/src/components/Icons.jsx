// Small stroke icon set (24x24). Keeps the UI free of emoji-as-icons and needs no extra dependency.
const base = {
  width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false,
}
const make = (children) => (props) => <svg {...base} {...props}>{children}</svg>

export const IconPlus = make(<path d="M12 5v14M5 12h14" />)
export const IconClose = make(<path d="M6 6l12 12M18 6L6 18" />)
export const IconMenu = make(<path d="M4 7h16M4 12h16M4 17h10" />)
export const IconTrash = make(<><path d="M4 7h16" /><path d="M9 7V4.5h6V7" /><path d="M6.5 7l.8 12h9.4l.8-12" /></>)
export const IconClip = make(<path d="M20 11.5l-7.6 7.6a5 5 0 01-7.1-7.1l8-8a3.3 3.3 0 014.7 4.7l-8 8a1.7 1.7 0 01-2.4-2.4l7.3-7.3" />)
export const IconSend = make(<><path d="M12 19V5" /><path d="M6 11l6-6 6 6" /></>)
export const IconBook = make(<><path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5z" /><path d="M12 6.5V19.5" /></>)
export const IconCalc = make(<><rect x="5" y="3.5" width="14" height="17" rx="3" /><path d="M8.5 8h7" /><path d="M9 12.5h.01M12 12.5h.01M15 12.5h.01M9 16h.01M12 16h.01M15 16h.01" strokeWidth="2.4" /></>)
export const IconNotes = make(<><path d="M6 4h9l3 3v13H6z" /><path d="M9 11h6M9 14.5h6M9 18h3" /></>)
export const IconGlobe = make(<><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17" /><path d="M12 3.5c2.4 2.4 3.6 5.2 3.6 8.5s-1.2 6.100-3.6 8.500c-2.400-2.400-3.600-5.200-3.600-8.500S9.600 5.900 12 3.500z" /></>)
export const IconDoc = make(<><path d="M7 3.5h7l4 4v13H7z" /><path d="M14 3.5v4h4" /><circle cx="12.500" cy="14" r="2.200" /><path d="M14.200 15.700l2 2" /></>)
export const IconChat = make(<path d="M5 5h14a2 2 0 012 2v8a2 2 0 01-2 2h-7l-4.500 3.500V17H5a2 2 0 01-2-2V7a2 2 0 012-2z" />)
export const IconClock = make(<><circle cx="12" cy="12" r="8.500" /><path d="M12 7.500V12l3 2" /></>)
export const IconSpark = make(<path d="M12 3.500l1.900 5.600 5.600 1.900-5.600 1.900L12 18.500l-1.900-5.600L4.500 11l5.600-1.900z" />)
export const IconArrow = make(<path d="M5 12h14M13 6l6 6-6 6" />)
export const IconFile = make(<><path d="M7 3.500h7l4 4v13H7z" /><path d="M14 3.500v4h4" /></>)
