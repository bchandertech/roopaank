export const MAIN_NAV = [
  { label: 'Home', to: '/', end: true },
  { label: 'Shop', to: '/shop' },
  { label: 'Earrings', to: '/category/earrings' },
  { label: 'Necklaces', to: '/category/necklaces' },
  { label: 'Bangles', to: '/category/bangles' },
  { label: 'Rings', to: '/category/rings' },
  { label: 'Jewellery Sets', to: '/category/jewellery-sets' },
  { label: 'Hair Accessories', to: '/category/hair-accessories' },
]

const mainPaths = new Set(MAIN_NAV.map((item) => item.to))

// Categories that are not already in the main nav go under "More".
export function getMoreCategories(categories = []) {
  return categories
    .map((c) => ({ label: c.name, to: `/category/${c.slug}` }))
    .filter((item) => !mainPaths.has(item.to))
}
