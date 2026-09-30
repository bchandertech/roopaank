import { screen } from '@testing-library/react'

test('main mounts the app into #root', async () => {
  document.body.innerHTML = '<div id="root"></div>'

  await import('./main.jsx')

  expect(
    await screen.findByRole(
      'heading',
      { level: 1, name: 'Fashion Jewellery for Every You' },
      { timeout: 10000 },
    ),
  ).toBeInTheDocument()
  expect(document.getElementById('root')).not.toBeEmptyDOMElement()
})
