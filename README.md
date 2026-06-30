# Gaurav Ghop — Studio Portfolio

A creative-studio style personal site: custom magnetic cursor, smooth scroll, a live WebGL shader background, film grain, editorial typography, and tasteful reveal/hover motion. Inspired by the vibe of [podium.global](https://podium.global/).

Built to deploy on **Vercel's free tier** as a static site — no server, no env vars required.

## Tech

- **React 18 + Vite** — fast static build
- **Three.js + @react-three/fiber + drei** — fullscreen GLSL shader background
- **Framer Motion** — entrance + scroll reveals
- **Lenis** — buttery smooth scrolling
- Custom cursor & magnetic buttons (vanilla, no deps)

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
```

Build / preview the production bundle:

```bash
npm run build
npm run preview
```

## Project structure

```
src/
├── App.jsx                 # composition + loader gating
├── index.css               # full design system
├── data/content.js         # ← all resume content lives here
└── components/
    ├── Cursor.jsx          # custom dot + lagging ring + label
    ├── SmoothScroll.jsx    # Lenis wrapper, anchor hijacking
    ├── ShaderBackground.jsx# WebGL flowing-gradient (reacts to mouse)
    ├── Loader.jsx          # 0→100% intro wipe
    ├── Magnetic.jsx        # magnetic hover wrapper
    ├── Reveal.jsx          # fade-up + split-word helpers
    ├── Nav.jsx
    └── sections/           # Hero, About, Work, Projects, Skills, Closing, Contact
```

## Customize

- **Content:** edit `src/data/content.js` (experience, projects, skills, stats, links).
- **Real links:** replace the placeholder `https://github.com` / `https://linkedin.com` and project `link: "#"` values.
- **Colors / vibe:** tweak the CSS variables under `:root` in `src/index.css` (`--accent`, `--bg`, `--ink`).
- **Shader palette:** edit the `lime` / `blue` / `rust` colors in `ShaderBackground.jsx`.

## Deploy to Vercel (free)

Option A — Git:

1. Push this folder to a GitHub repo.
2. On vercel.com → **New Project** → import the repo.
3. Framework auto-detects **Vite**; defaults are correct (`npm run build` → `dist`). Deploy.

Option B — CLI:

```bash
npm i -g vercel
vercel        # follow prompts
vercel --prod
```

## Notes

- The custom cursor and smooth scroll are disabled on touch / reduced-motion for accessibility.
- The shader uses `low-power` mode and capped DPR to stay light on laptops and the free tier.
