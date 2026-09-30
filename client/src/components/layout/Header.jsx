import { useRef, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useCategories } from '../../features/categories/hooks/useCategories'
import MobileMenu from './MobileMenu'
import MoreMenu from './MoreMenu'
import { CartIcon, HeartIcon, LogoMark, MenuIcon, SearchIcon, UserIcon } from './icons'
import { MAIN_NAV, getMoreCategories } from './navLinks'

const navClass = ({ isActive }) =>
  `border-b-2 py-2 whitespace-nowrap ${
    isActive
      ? 'border-primary font-semibold text-primary'
      : 'border-transparent text-ink hover:text-primary'
  }`

const CART_COUNT = 0 // TODO: real count in the cart feature.

function SearchBox({ id, className = '' }) {
  // UI only: search logic arrives in Feature 2.
  return (
    <form
      role="search"
      onSubmit={(e) => e.preventDefault()}
      className={`flex items-center rounded-md border border-line bg-surface ${className}`}
    >
      <label htmlFor={id} className="sr-only">
        Search for earrings, necklaces
      </label>
      <input
        id={id}
        type="search"
        placeholder="Search for earrings, necklaces..."
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none"
      />
      <button type="submit" aria-label="Search" className="px-3 text-ink hover:text-primary">
        <SearchIcon />
      </button>
    </form>
  )
}

const actionClass = 'flex flex-col items-center text-[11px] text-ink hover:text-primary'

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const hamburgerRef = useRef(null)
  const { data: categories } = useCategories()
  const moreItems = getMoreCategories(categories)

  const closeMenu = () => {
    setMenuOpen(false)
    hamburgerRef.current?.focus()
  }

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <button
          ref={hamburgerRef}
          type="button"
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen(true)}
          className="rounded-sm p-2 text-ink hover:bg-blush lg:hidden"
        >
          <MenuIcon />
        </button>

        <Link to="/" aria-label="Roopaank home" className="flex items-center gap-2 text-primary">
          <LogoMark />
          <span className="leading-tight">
            <span className="block font-display text-2xl font-semibold tracking-wide">
              ROOPAANK
            </span>
            <span className="hidden text-[8px] tracking-widest text-muted sm:block">
              FASHION JEWELLERY FOR YOU
            </span>
          </span>
        </Link>

        <nav
          aria-label="Main"
          className="hidden flex-1 items-center justify-center gap-4 text-xs lg:flex xl:gap-5 xl:text-sm"
        >
          {MAIN_NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navClass}>
              {item.label}
            </NavLink>
          ))}
          <MoreMenu items={moreItems} />
        </nav>

        <SearchBox id="site-search" className="hidden w-56 xl:flex" />

        <div className="ml-auto flex items-center gap-4 lg:ml-0">
          <Link to="/wishlist" className={actionClass}>
            <HeartIcon />
            Wishlist
          </Link>
          <Link
            to="/cart"
            className={`${actionClass} relative`}
            aria-label={`Cart, ${CART_COUNT} items`}
          >
            <CartIcon />
            <span
              aria-hidden="true"
              className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-white"
            >
              {CART_COUNT}
            </span>
            <span aria-hidden="true">Cart</span>
          </Link>
          <Link to="/login" className={actionClass}>
            <UserIcon />
            Login
          </Link>
        </div>
      </div>

      <div className="px-4 pb-3 xl:hidden">
        <SearchBox id="site-search-mobile" className="w-full" />
      </div>

      {menuOpen && (
        <MobileMenu id="mobile-menu" items={MAIN_NAV} moreItems={moreItems} onClose={closeMenu} />
      )}
    </header>
  )
}
