import { Link } from 'react-router-dom'
import { CashIcon, PinIcon, PhoneIcon, ReturnIcon, TruckIcon } from './icons'

const MESSAGES = [
  { Icon: TruckIcon, text: 'Free Shipping on Orders Above ₹499' },
  { Icon: CashIcon, text: 'Cash on Delivery Available' },
  { Icon: ReturnIcon, text: 'Easy 7 Days Returns' },
]

export default function TopBar() {
  return (
    <div className="bg-primary-deep text-xs text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
        <ul className="flex flex-1 items-center justify-between gap-4 md:pr-8">
          {MESSAGES.map(({ Icon, text }, i) => (
            <li key={text} className={`items-center gap-2 ${i === 0 ? 'flex' : 'hidden md:flex'}`}>
              <Icon width={16} height={16} />
              {text}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <Link to="/track-order" className="flex items-center gap-1.5 hover:underline">
            <PinIcon width={16} height={16} />
            Track Order
          </Link>
          <span className="h-3 w-px bg-white/60" aria-hidden="true" />
          <button
            type="button"
            title="Coming soon"
            aria-disabled="true"
            className="flex cursor-not-allowed items-center gap-1.5 hover:underline"
          >
            <PhoneIcon width={16} height={16} />
            <span>
              Download App<span className="sr-only"> (coming soon)</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
