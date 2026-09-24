# JULZ

Minimal storefront layout for [JULZ](https://www.instagram.com/julz.us/). Static HTML/CSS/JS — serve the folder (`npx serve .`); the 3D hero is an ES module, so it only runs over http(s), not by double-clicking `index.html` (a static star shows instead). Live via GitHub Pages from `main`.

## Adding the clothing photos
Products live in the `PRODUCTS` array at the top of `main.js`. Drop photos in `assets/products/` and set `image: "assets/products/<file>.jpg"` (4:5 portrait works best). Names, prices and descriptions there are placeholders.

## Notes
- `assets/julz-mark.svg` — vector trace of the logo (also inlined as the `#mark` symbol).
- 3D hero: `js/star3d.js` (three.js from jsDelivr). It extrudes the logo path into a chrome star that spins in a starfield, then on scroll drops into the `[data-drop-slot]` next to the shop heading. Falls back to the flat SVG star without WebGL or with reduced motion.
- `assets/hero.mp4` / Higgsfield clip are no longer used on the page.
- Bag and newsletter are front-end only; connect a store (e.g. Shopify Buy Button / Stripe) and an email provider before launch.
- Shipping & returns copy is placeholder.
