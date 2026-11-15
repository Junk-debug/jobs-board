---
paths:
  - "src/components/**/*.tsx"
  - "src/routes/**/*.tsx"
  - "src/index.css"
---

# UI rules

## Layout

- Values people compare between items (pay, dates) sit in the same place in every item
- Items in one list have the same height. Reserve space for content that varies, such as a title that can wrap, instead of letting each item grow
- A list that people scan item by item is a single column. Grids are for things chosen by picture
- Text-heavy items are stacked blocks, not table rows

## Colour

- Colour tokens from `src/index.css` only, no raw colours in components or pages
- The accent colour marks the brand and the user's own actions. Data such as prices, dates and labels uses the text colours. Why: an accent-coloured price reads as an error or a sale
- Check the contrast of new colours: at least 3:1 for icons, 4.5:1 for text

## Loading

- A skeleton that must match its content exactly (the job card) shares a layout component with it; otherwise simple blocks of roughly the same shape are enough. Why: shared layouts prevent drift but cost indirection
- Anything that appears after loading has its space reserved while loading, so nothing jumps

## Components

- shadcn uses the Radix base
- Don't edit `components/ui/*` by hand unless the user asks for it. Add or update these components with the shadcn CLI

## Verify

- Check visual changes in the running app at phone and desktop widths. Measure sizes and alignment instead of judging by eye
