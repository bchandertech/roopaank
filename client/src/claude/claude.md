## Design source of truth

- The base UI for the entire site MUST be built by looking at docs/raapaank.png.
- Before building any feature, open and study docs/raapaank.png and match its layout, colors, fonts, spacing, icons, text, and style as closely as possible.
- If anything in my prompt conflicts with docs/raapaank.png, follow the image and tell me about the difference.
- After building each feature, compare the result with docs/raapaank.png and list anything that still looks different.

## Project

- Roopaank: an Indian online store for affordable artificial/fashion jewellery (prices ₹49–₹499).
- Stack: Vite + React + Tailwind (already set up). No new dependencies unless I approve them.

## Working style

- Build one feature at a time. After finishing a feature, stop and tell me which files changed and how to check it in the browser.
- Reuse existing components; never duplicate a component that already exists.

## Quality rules

- Mobile-first and responsive (mobile, tablet, desktop). Touch targets at least 44×44px.
- Accessibility: semantic HTML, keyboard navigation, visible focus styles, alt text on all images, labels on all inputs and icon buttons.
- Prices in INR with en-IN formatting (₹1,299).
- Use typed mock data from src/data/ until a real API exists.
- Use placeholder images from public/images/ with clear file names so I can replace them with real photos later.
