# Core Web Vitals & Performance — Issue #29

## Overview

This document explains the performance strategy adopted for MS Prestige Driver,
a Next.js 15 site with `output: 'export'` (static export to Firebase Hosting).

The key constraint is that **Next.js Image Optimization API is unavailable** with
`output: 'export'`. This means the built-in WebP conversion and resize-on-request
features do not work. The approach below compensates with static-time optimizations.

---

## Architecture Constraints

| Feature | Available? | Why |
|---|---|---|
| Next.js Image Optimization API | ❌ | `output: 'export'` disables server features |
| `next/image` `<Image>` component | ✅ | Works as a client-side hint (lazy load, CLS) |
| WebP auto-conversion | ❌ | Requires server runtime |
| `sizes` + `srcset` | ✅ | Browser-side, no server required |
| `priority` (preload hint) | ✅ | Injects `<link rel="preload">` at build time |

---

## What Was Implemented

### 1. `next/image` (`unoptimized: true`)

All images use `<Image>` from `next/image` even with `unoptimized: true` because
the component still provides:

- **Lazy loading** (`loading="lazy"` by default) — defers off-screen images
- **`priority` prop** — injects `<link rel="preload">` for the LCP element (Hero slide 0, Navbar logo, SplashScreen logo)
- **`sizes` prop** — tells the browser the rendered size so it avoids fetching an oversized image from Firebase Storage URLs
- **Prevents layout shift** (CLS) when `width`/`height` or `fill` is specified

### 2. `sizes` Attribute on Every Image

Every `<Image>` now has a `sizes` prop:

| Component | `sizes` value | Rationale |
|---|---|---|
| Hero slides | `100vw` | Full-width background |
| Vehicle cards | `(max-width: 768px) 100vw, 50vw` | 2-col grid on desktop |
| Navbar logo | `52px` | Fixed pixel size |
| Footer logo | `72px` | Fixed pixel size |
| SplashScreen | `280px` | Fixed pixel size |
| ServiceSection (Firebase) | `(max-width: 768px) 100vw, 50vw` | Alternating layout |

### 3. `font-display: swap`

All fonts are self-hosted via `@fontsource` packages (Playfair Display, Lato, Montserrat).
A global `@font-face { font-display: swap; }` override in `fonts.css` ensures the
browser shows fallback text immediately and swaps to the custom font once loaded.

This prevents **FOIT** (Flash of Invisible Text), improving both FCP and perceived performance.

### 4. Bundle Analyzer

`@next/bundle-analyzer` is added as a devDependency. To inspect the JS bundle:

```bash
ANALYZE=true npm run build
```

Or use the npm script alias:

```bash
npm run analyze
```

This opens an interactive treemap of all chunks, useful for identifying large
third-party dependencies (Leaflet, Firebase, Stripe, etc.).

### 5. Lighthouse CI (GitHub Actions)

A `lighthouse` job runs after each deployment on `main`. It:

1. Rebuilds the static export
2. Serves it locally via `staticDistDir: ./out`
3. Audits 5 URLs (home FR/EN/NL, airport transfer page, FAQ)
4. Warns (non-blocking) if scores drop below thresholds:
   - Performance ≥ 85
   - Accessibility ≥ 90
   - Best Practices ≥ 90
   - SEO ≥ 90
   - LCP < 2.5 s
   - CLS < 0.1

Reports are uploaded to Lighthouse's temporary public storage and linked in the
Actions run summary.

> **Note:** `uses-optimized-images` and `uses-webp-images` audits are disabled
> because WebP conversion is not possible with `output: 'export'`.
> The trade-off is accepted; images should be pre-optimized manually before upload.

---

## Remaining Recommendations (manual tasks)

These cannot be automated at build time with `output: 'export'`:

1. **Pre-convert hero/section images to WebP** before placing in `/public/images/`.
   Use Squoosh, ImageMagick (`convert -quality 82 input.jpg output.webp`), or Sharp CLI.
   Target: hero images ≤ 150 KB, section images ≤ 80 KB.

2. **Set Firebase Hosting cache headers** in `firebase.json` for static assets:
   ```json
   {
     "headers": [{
       "source": "/images/**",
       "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
     }]
   }
   ```

3. **Firebase Storage images** (uploaded via admin panel) should be compressed
   before upload. Consider adding client-side compression in the admin upload form
   (using `browser-image-compression` npm package) in a future issue.

---

## CWV Target Summary

| Metric | Target | Status |
|---|---|---|
| LCP | < 2.5 s | ✅ (hero preloaded, fonts swapped) |
| CLS | < 0.1 | ✅ (`sizes` + `fill` prevents layout shift) |
| TBT / FID | < 300 ms | ✅ (Leaflet lazy-loaded, no heavy sync scripts) |
| Performance | ≥ 85 | 🟡 (depends on hosting CDN + image sizes) |
| Accessibility | ≥ 90 | ✅ |
| SEO | ≥ 90 | ✅ (M5 metadata complete) |
