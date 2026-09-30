import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDownIcon } from './icons'

export default function MoreMenu({ items }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const buttonRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && open) {
      setOpen(false)
      buttonRef.current?.focus()
    }
  }

  const onBlur = (e) => {
    if (!rootRef.current?.contains(e.relatedTarget)) setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown} onBlur={onBlur}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 py-2 text-ink hover:text-primary"
      >
        More
        <ChevronDownIcon />
      </button>
      {open && (
        <ul
          id={menuId}
          className="absolute right-0 top-full z-30 mt-1 min-w-48 rounded-md border border-line bg-surface py-1 shadow-lg"
        >
          {items.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-ink hover:bg-blush hover:text-primary"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
