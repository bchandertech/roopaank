import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Header from './Header'
import TopBar from './TopBar'
import { renderWithProviders } from '../../test/renderWithProviders'

describe('TopBar', () => {
  test('shows the messages, Track Order link and a coming-soon Download App', () => {
    renderWithProviders(<TopBar />)

    expect(screen.getByText('Free Shipping on Orders Above ₹499')).toBeInTheDocument()
    expect(screen.getByText('Cash on Delivery Available')).toBeInTheDocument()
    expect(screen.getByText('Easy 7 Days Returns')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Track Order' })).toHaveAttribute(
      'href',
      '/track-order',
    )
    expect(screen.getByRole('button', { name: /Download App/ })).toHaveAttribute(
      'title',
      'Coming soon',
    )
  })
})

describe('Header', () => {
  test('nav links have the correct hrefs', () => {
    renderWithProviders(<Header />)
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const expected = {
      Home: '/',
      Shop: '/shop',
      Earrings: '/category/earrings',
      Necklaces: '/category/necklaces',
      Bangles: '/category/bangles',
      Rings: '/category/rings',
      'Jewellery Sets': '/category/jewellery-sets',
      'Hair Accessories': '/category/hair-accessories',
    }
    for (const [name, href] of Object.entries(expected)) {
      expect(
        Array.from(nav.querySelectorAll('a')).find((a) => a.textContent === name),
      ).toHaveAttribute('href', href)
    }
    expect(screen.getByRole('link', { name: 'Roopaank home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /Wishlist/ })).toHaveAttribute('href', '/wishlist')
    expect(screen.getByRole('link', { name: 'Cart, 0 items' })).toHaveAttribute('href', '/cart')
    expect(screen.getByRole('link', { name: /Login/ })).toHaveAttribute('href', '/login')
  })

  test('highlights the active link', () => {
    renderWithProviders(<Header />, { route: '/category/rings' })
    const nav = screen.getByRole('navigation', { name: 'Main' })
    const rings = Array.from(nav.querySelectorAll('a')).find((a) => a.textContent === 'Rings')
    expect(rings).toHaveAttribute('aria-current', 'page')
  })

  test('More dropdown opens, lists the remaining categories and closes on Escape', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Header />)

    const more = await screen.findByRole('button', { name: 'More' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    await user.click(more)

    expect(more).toHaveAttribute('aria-expanded', 'true')
    for (const [name, slug] of [
      ['Oxidised Jewellery', 'oxidised-jewellery'],
      ['Western Jewellery', 'western-jewellery'],
      ['Kids Jewellery', 'kids-jewellery'],
      ['Gift Sets', 'gift-sets'],
    ]) {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', `/category/${slug}`)
    }

    await user.keyboard('{Escape}')
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Gift Sets' })).not.toBeInTheDocument()
    expect(more).toHaveFocus()
  })

  test('More dropdown opens with the keyboard and closes when focus leaves', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Header />)

    const more = await screen.findByRole('button', { name: 'More' })
    more.focus()
    await user.keyboard('{Enter}')
    expect(more).toHaveAttribute('aria-expanded', 'true')

    await user.tab()
    expect(screen.getByRole('link', { name: 'Oxidised Jewellery' })).toHaveFocus()

    await user.click(document.body)
    expect(more).toHaveAttribute('aria-expanded', 'false')
  })

  test('mobile menu opens and closes with the button and Escape', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Header />)

    const hamburger = screen.getByRole('button', { name: 'Open menu' })
    expect(hamburger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(hamburger)
    const dialog = screen.getByRole('dialog', { name: 'Main menu' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(hamburger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus()
    expect(await screen.findByRole('link', { name: 'Gift Sets' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close menu' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(hamburger).toHaveFocus()

    await user.click(hamburger)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(hamburger).toHaveFocus()
  })

  test('mobile menu keeps Tab focus inside and closes after choosing a link', async () => {
    const user = userEvent.setup()
    renderWithProviders(<Header />)

    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    const dialog = screen.getByRole('dialog')

    await user.tab({ shift: true })
    const links = dialog.querySelectorAll('a')
    expect(links[links.length - 1]).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveFocus()

    await user.click(within(dialog).getByRole('link', { name: 'Shop' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
