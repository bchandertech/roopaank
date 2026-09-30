import { render, screen } from '@testing-library/react'
import App from './App'

test('App renders the home page', () => {
  render(<App />)

  expect(
    screen.getByRole('heading', { level: 1, name: 'Fashion Jewellery for Every You' }),
  ).toBeInTheDocument()
})
