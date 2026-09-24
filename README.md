# JULZ

Static site for [JULZ](https://www.instagram.com/julz.us/) — open `index.html` or serve the folder (`npx serve .`).

- `assets/julz-mark.svg` — vector trace of the logo (also inlined as `#mark` symbol)
- Hero video: loads `assets/hero.mp4` if present, otherwise the Higgsfield-hosted demo clip, otherwise an animated SVG fallback. Download the final clip to `assets/hero.mp4` before launch.
- Waitlist form is front-end only — wire `[data-join]` in `main.js` to your email provider.
