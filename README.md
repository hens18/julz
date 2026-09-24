# JULZ

Minimal storefront layout for [JULZ](https://www.instagram.com/julz.us/). Static HTML/CSS/JS — open `index.html` or serve the folder (`npx serve .`). Live via GitHub Pages from `main`.

## Adding the clothing photos
Products live in the `PRODUCTS` array at the top of `main.js`. Drop photos in `assets/products/` and set `image: "assets/products/<file>.jpg"` (4:5 portrait works best). Names, prices and descriptions there are placeholders.

## Notes
- `assets/julz-mark.svg` — vector trace of the logo (also inlined as the `#mark` symbol).
- Campaign film: loads `assets/hero.mp4` if present, otherwise the Higgsfield-hosted clip, otherwise the SVG star.
- Bag and newsletter are front-end only; connect a store (e.g. Shopify Buy Button / Stripe) and an email provider before launch.
- Shipping & returns copy is placeholder.
