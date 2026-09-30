const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: 'false',
}

export const TruckIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7z" />
    <circle cx="7" cy="18" r="1.6" />
    <circle cx="17" cy="18" r="1.6" />
  </svg>
)
export const CashIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="6" width="18" height="12" rx="1.5" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
)
export const ReturnIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />
  </svg>
)
export const PinIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 21s7-6.2 7-11.5a7 7 0 1 0-14 0C5 14.800 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
)
export const PhoneIcon = (p) => (
  <svg {...base} {...p}>
    <rect x="7" y="3" width="10" height="18" rx="2" />
    <path d="M11 18h2" />
  </svg>
)
export const SearchIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
)
export const HeartIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 20s-7.500-4.600-7.500-10A4.300 4.300 0 0 1 12 7.600 4.300 4.300 0 0 1 19.500 10c0 5.400-7.500 10-7.500 10z" />
  </svg>
)
export const CartIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M3 4h2.500l2 11h10l2-8H7" />
    <circle cx="9" cy="19" r="1.400" />
    <circle cx="17" cy="19" r="1.400" />
  </svg>
)
export const UserIcon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
  </svg>
)
export const MenuIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)
export const CloseIcon = (p) => (
  <svg {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)
export const ChevronDownIcon = (p) => (
  <svg {...base} width={14} height={14} {...p}>
    <path d="m6 9 6 6 6-6" />
  </svg>
)

export const LogoMark = (p) => (
  <svg
    viewBox="0 0 48 40"
    width="40"
    height="34"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...p}
  >
    <path d="M24 6c4 5 5 11 0 18-5-7-4-13 0-18z" />
    <path d="M24 24C18 22 14 17 13 10c6 1 10 6 11 14zM24 24c6-2 10-7 11-14-6 1-10 6-11 14z" />
    <path d="M24 26C15 28 9 24 5 17c8-1 14 2 19 9zM24 26c9 2 15-2 19-9-8-1-14 2-19 9z" />
    <path d="M10 33c9 4 19 4 28 0" />
  </svg>
)
