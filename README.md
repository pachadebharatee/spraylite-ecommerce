# Spraylite — Fragrance Store Homepage

A responsive e-commerce homepage for **Spraylite**, a fictional premium fragrance and personal-care brand. Built with plain HTML, CSS and vanilla JavaScript.

- **Live demo:** https://spraylite-ecommerce-psi.vercel.app/
- **Repository:** https://github.com/pachadebharatee/spraylite-ecommerce

> This is a frontend demo project. Products, prices, reviews and contact details are demonstration data. There is no backend, checkout or payment: the cart and wishlist live in the browser, and the newsletter form only validates input.

## Objective

Design and build a modern, responsive store homepage that shows UI/UX judgement, responsive layout, clean code, interactive states, and working **cart** and **wishlist** features.

## Technologies

| | |
| --- | --- |
| Markup | Semantic HTML5 (landmarks, native `<dialog>` drawers) |
| Styles | CSS3: custom properties (design tokens), Grid, Flexbox, `clamp()` type scale, media queries |
| Logic | Vanilla JavaScript (ES2017+), in one IIFE, no globals beyond the product data |
| Storage | `localStorage` (cart and wishlist) |
| Font | Poppins, self-hosted WOFF2 (SIL Open Font License), no Google Fonts request |
| Libraries | None. No frameworks, npm packages or build step |
| Hosting | Vercel (static) |

## Homepage sections

1. Announcement bar: shipping, gifting and returns
2. Header: logo, navigation, search, wishlist and cart with live counts, and a mobile menu
3. Hero: background video with poster, headline and calls to action
4. Benefits strip
5. Shop by family (Floral, Woody, Fresh, Spicy) and promo banners
6. Our fragrances: the product grid with filters, sort and search results
7. Best sellers, ranked from the product data
8. About Spraylite
9. Journal / brand story
10. Lookbook
11. Festive gifting, with a live countdown
12. Customer stories (an auto slider, labelled as sample reviews)
13. Morning to night: three shoppable rituals
14. Footer: newsletter, service benefits, links and contact

## Key features

### Product catalogue
- Six products are defined once in `js/products.js` and rendered by a single card template, which is reused for the main grid and the best-seller row.
- Each card shows the image, fragrance family, size, notes, INR price, an optional badge, a wishlist toggle and an *Add* button.
- Prices are formatted with `Intl.NumberFormat("en-IN")`, so they display as ₹3,450.

### Search, filters and sorting
- **Search:** live and case-insensitive. It matches name, family, category and notes, and every word must match ("rose oud" works). The popular-term chips run a search.
- **Family filters:** the pill tabs, the *Shop by family* tiles, the promo banners and the footer links all set the same filter.
- **Sort:** Featured, Price (low to high or high to low), or Name. It works together with the active filter and search.
- The result count is announced to screen readers. If nothing matches, the grid shows an empty state with *Clear search*.
- The sort control is a styled listbox (button plus `role="listbox"`). It supports the keyboard (arrow keys, Home/End, Enter, Escape) and closes on an outside click. The native `<select>` stays in the page as the no-JavaScript fallback and the source of truth.

### Cart (mandatory)
- Adding the same product again increases its quantity instead of creating a second line.
- Quantity can be raised or lowered between **1 and 10**, and the buttons disable at each limit. Items can be removed.
- The drawer shows each line's image, name, family, size, unit price and line total, and the subtotal updates live.
- The header badge shows the total number of units.
- A toast confirms each add. Inside the drawer, messages go to an `aria-live` status line.
- The empty state has a *Browse fragrances* button. *Continue shopping* closes the drawer.
- The drawer states that checkout is not part of this demo.

### Wishlist (mandatory)
- The heart toggles a product on or off, and a toast confirms the change.
- Hearts stay in sync wherever the same product appears (main grid and best sellers).
- The drawer lists saved items with **Move to cart** (adds the item and removes it from the wishlist) and **Remove**.
- The header badge shows how many products are saved. The drawer has an empty state.

### Persistence and data safety
- The cart and wishlist are saved to `localStorage` and restored on refresh.
- Saved data is validated on load:
  - Bad JSON is discarded.
  - Unknown product ids and invalid or negative quantities are dropped.
  - Quantities above 10 are reduced to 10, and duplicate lines are merged.
- If storage is blocked (for example in private mode), the page keeps working in memory.
- Open tabs stay in sync through the `storage` event.

### Other interactions
- Drawers use the native `<dialog>` element. Focus stays inside, the page behind is inert, and background scrolling is locked. Escape, the Close button and a backdrop click all close the drawer, and focus returns to the button that opened it.
- The mobile menu sets `aria-expanded`. Escape, choosing a link and clicking outside all close it.
- The festive countdown runs to 20 December 2026, 23:59 IST. Values never go negative, and once the deadline passes the countdown is replaced by a "closed" message.
- The newsletter form validates the address. Errors and success are announced, and the success message says the demo sends and stores nothing.
- Back to top, scroll-reveal animations and the testimonial slider (which pauses on hover or focus, stops once the visitor uses the controls, and stays off for reduced motion).

## Responsive design

The layout is mobile-first, using fluid type (`clamp`), Grid and Flexbox. The main breakpoints are 560, 640, 960 and 1100 px.

| Width | Layout |
| --- | --- |
| < 560 px | Two compact product cards per row; the best sellers scroll sideways; filter pills scroll sideways; the menu is collapsed |
| 560–959 px | Two-column grids; stacked editorial sections |
| ≥ 960 px | Three-column product grid; split image and text sections |
| ≥ 1100 px | Full navigation, 80 px page gutters, content capped at 1440 px |

The site was checked at 320, 375, 390, 425, 768, 1024, 1280, 1440 and 1920 px. There is no horizontal scrolling at any of these widths. Drawers become full-width on small phones.

## Performance and accessibility

- **Images:**
  - Every image has `width` and `height`, so cumulative layout shift is 0.
  - Images below the fold use `loading="lazy"`.
  - The hero poster is preloaded with `fetchpriority="high"`.
  - Product art is SVG; photos are compressed JPEGs of 23–170 KB.
- **Hero video:** muted, `preload="none"`, and started only after the page `load` event, so the poster paints first. It pauses while the tab is hidden and never plays for `prefers-reduced-motion`.
- **Fonts:** four Latin WOFF2 subsets of about 8 KB each, two of them preloaded, with `font-display: swap`.
- **Accessibility:**
  - A skip link and semantic landmarks, with one `h1` and an ordered heading outline.
  - Labelled icon buttons, and cart and wishlist counts included in each button's accessible name.
  - `aria-pressed` on the toggles and visible `:focus-visible` rings.
  - Text meets WCAG AA contrast.
  - Support for reduced motion and forced colours.
- **SEO and sharing:** a descriptive title, meta description, canonical URL, Open Graph and Twitter card tags, and favicons (SVG, a PNG fallback and an Apple touch icon).

## Project structure

```
index.html            Homepage
privacy.html          Privacy notice (explains the localStorage-only demo)
terms.html            Terms of use (demo storefront, no real sales)
css/styles.css        All styles; design tokens at the top
js/products.js        Catalogue data: CATEGORIES and PRODUCTS
js/app.js             Rendering, cart, wishlist, filters/search/sort, drawers, widgets
assets/fonts/Poppins/ Self-hosted Poppins (WOFF2 + TTF fallback, OFL.txt)
assets/images/        Product SVGs; photos/ (editorial photos); logo/ (brand logo and favicons)
assets/videos/        Hero video clips and their poster frames
```

`assets/images/videos/` (raw source footage) and an unused font kit are listed in `.gitignore` and are not deployed.

## Run locally

The site is fully static. Serve the folder with any static server:

```bash
npx serve .
# or
python -m http.server 8000   # then open http://localhost:8000/
```

Opening `index.html` directly from disk also works. All paths are relative.

## Deploy (Vercel)

1. In Vercel, import the GitHub repository (**Add New → Project**).
2. Set **Framework Preset** to *Other* and **Root Directory** to `./`. Leave the build, output and install commands empty.
3. Deploy. Every push to `main` redeploys automatically.

GitHub Pages and Netlify also work, with no build command and the repository root as the publish directory.

## Demo limitations

- The product data, prices, reviews, social links and contact details are placeholders.
- There are no accounts, checkout, payment or order processing.
- The newsletter form validates the address but sends and stores nothing.
- The cart and wishlist are stored per browser only. They do not follow you to another device.
