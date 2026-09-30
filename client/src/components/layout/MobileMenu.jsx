import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { CloseIcon } from './icons'

const linkClass = ({ isActive }) =>
  `block rounded-sm px-3 py-2 ${
    isActive ? 'bg-blush font-semibold text-primary' : 'text-ink hover:bg-blush'
  }`

export default function MobileMenu({ id, items, moreItems, onClose }) {
  const panelRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose()
      return
    }
    if (e.key !== 'Tab') return
    const focusable = panelRef.current.querySelectorAll('a[href], button:not([disabled])')
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-40 lg:hidden" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col overflow-y-auto bg-surface p-4 shadow-xl"
      >
        <button
          ref={closeRef}
          type="button"
          aria-label="Close menu"
          onClick={onClose}
          className="mb-2 self-end rounded-sm p-2 text-ink hover:bg-blush"
        >
          <CloseIcon />
        </button>
        <nav aria-label="Mobile">
          <ul className="space-y-1">
            {[...items, ...moreItems].map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={linkClass} onClick={onClose}>
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
