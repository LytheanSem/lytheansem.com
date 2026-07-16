# lytheansem.com

Personal portfolio of **Lythean Sem (Zen)** — full-stack engineer, Phnom Penh.

A calm, autumn-samurai themed site where Three.js is the star: a living WebGL
dusk scene (procedural maple, falling momiji leaves that answer the wind of
your cursor, a samurai in the grass) plus eight interactive 3D emblems — one
sculptural metaphor per project — and a "smaller works" strip linking the
GitHub archive.

## Stack

- **Next.js 16** (App Router, Turbopack) · React 19 · TypeScript
- **Tailwind CSS v4**
- **Three.js** via @react-three/fiber + drei
- Fully static — no database, no CMS, zero runtime dependencies
- Fonts: Shippori Mincho B1 (display), Zen Kaku Gothic New (body)

## Architecture notes

- **One shared WebGL canvas** for the entire site (`src/components/gl/CanvasRoot.tsx`),
  with every scene rendered through drei `<View>` scissors — the hero scene and
  all six project emblems share a single GL context (iOS context limits).
- Emblem interaction (hover-to-ignite, drag-to-rotate) is **DOM-driven**, not
  raycast-driven — robust with many views on one canvas.
- All geometry is procedural. No models, no textures fetched over the network —
  first paint is fast and the whole page prerenders statically.
- Project copy is data-driven: edit `src/data/portfolio.ts` to add or reword
  projects without touching components.

## Develop

```bash
npm run dev    # http://localhost:3000
npm run build  # production build (static)
npm run lint
```

## Samurai model (optional upgrade)

The hero's samurai is procedural by default. To swap in a real 3D model, drop
a GLB at `public/models/samurai.glb` — it is automatically forced to an ink
silhouette, scaled to the scene, grounded at its feet, and its idle animation
(if present) plays slow. No code changes needed; if the file is absent or
broken, the procedural figure renders instead.

Good free sources (check each model's license; CC-BY requires credit):

- Sketchfab (free account to download): search "samurai low poly", filter
  Downloadable + CC license. Download as glTF/GLB, rename to `samurai.glb`.
- If the license is CC-BY, add the credit line here:

> Current model credit: This work is based on
> ["RONIN"](https://sketchfab.com/3d-models/ronin-1ba5693b714c4e9fbf5f3689b16909ae)
> by [dj256](https://sketchfab.com/dj256), licensed
> [CC-BY-4.0](http://creativecommons.org/licenses/by/4.0/). Mesh simplified
> and textures stripped for silhouette rendering.
> NOTE: internal node names suggest this model derives from Ghost of
> Tsushima game assets — consider replacing before wide promotion.

## Deploy (Vercel)

```bash
npm i -g vercel
vercel         # first deploy — link the project
vercel --prod  # production
```

Or push this repo to GitHub and import it at vercel.com/new.

### Domain (lytheansem.com, registered at Cloudflare)

1. Vercel → Project → Settings → Domains → add `lytheansem.com` and `www.lytheansem.com`.
2. In Cloudflare DNS, add the records Vercel shows you (A `76.76.21.21` for the
   apex, CNAME `cname.vercel-dns.com` for `www`) — set them to **DNS only**
   (grey cloud), so Vercel can issue SSL.
3. Email for `hi@lytheansem.com`: Cloudflare → Email → Email Routing → forward
   `hi@lytheansem.com` to your personal inbox (free, ~2 minutes).
