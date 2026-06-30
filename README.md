# Gaurav Ghop — Studio Portfolio

A creative-studio style personal site: custom magnetic cursor, smooth scroll, a live WebGL shader background, film grain, editorial typography, and tasteful reveal/hover motion. Inspired by the vibe of [podium.global](https://podium.global/).

Built to deploy on **Vercel's free tier** as a static site — no server, no env vars required.

**Live:** https://gauravghop.vercel.app

## Tech

- **React 18 + Vite** — fast static build
- **Three.js + @react-three/fiber** — fullscreen shader background + interactive hero orb
- **Framer Motion** — entrance + scroll reveals
- **Lenis** — buttery smooth scrolling
- **Web Audio API** — generative, futuristic notes (opt-in)
- Custom cursor, magnetic buttons, React error boundaries (vanilla, no deps)

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
├── App.jsx                 # composition, loader gating, error boundaries
├── index.css               # full design system
├── data/content.js         # ← all resume content lives here
├── lib/audio.js            # Web Audio generative synth (futuristic notes)
└── components/
    ├── ErrorBoundary.jsx   # isolates features so one can't crash the app
    ├── SoundProvider.jsx   # sound state, permission prompt, hover→note
    ├── HeroOrb.jsx         # interactive WebGL orb (hover/move)
    ├── Cursor.jsx          # custom dot + lagging ring + label
    ├── SmoothScroll.jsx    # Lenis wrapper, anchor hijacking
    ├── ShaderBackground.jsx# WebGL flowing-gradient (reacts to mouse)
    ├── Loader.jsx          # 0→100% intro wipe
    ├── Magnetic.jsx        # magnetic hover wrapper
    ├── Reveal.jsx          # fade-up + split-word helpers
    ├── Nav.jsx             # nav + sound toggle
    └── sections/           # Hero, About, Work, Projects, Skills, Closing, Contact
```

## Customize

- **Content:** edit `src/data/content.js` (experience, projects, skills, stats, links).
- **Real links:** replace the placeholder `https://github.com` / `https://linkedin.com` and project `link: "#"` values.
- **Colors / vibe:** tweak the CSS variables under `:root` in `src/index.css` (`--accent`, `--bg`, `--ink`) — currently a Dune desert palette.
- **Shader palette:** edit the `sand` / `spice` / `fremen` colors in `ShaderBackground.jsx`.
- **Sand interaction:** tune grain count / physics in `SandField.jsx` (`GRID`, `RADIUS`, `PUSH`, `SPRING`, `DAMP`); sand audio lives in `lib/audio.js`.

## Robustness — features can't take the site down

Every independent feature is wrapped in a React **error boundary** (`src/components/ErrorBoundary.jsx`). If the WebGL orb, the shader background, the cursor, or any single section throws at runtime, that subtree fails silently and **the rest of the page keeps working**. The Web Audio engine is additionally wrapped in `try/catch` everywhere, so sound can never break the UI.

When you add a new feature, drop it inside its own `<ErrorBoundary name="...">` (see `App.jsx`) so a regression stays contained.

## CI/CD (GitHub Actions → Vercel)

Two workflows live in `.github/workflows/`:

| Workflow | Trigger | What it does |
|----------|---------|--------------|
| `ci.yml` | every push & PR | `npm ci` + `npm run build`; uploads the `dist` artifact. This is the gate — a broken build never ships. |
| `deploy.yml` | PR → **preview**, push to `main` → **production** | builds with the Vercel CLI and deploys; PRs get a preview URL comment; production re-points `gauravghop.vercel.app` to the new release. |

### Required repo secrets (already configured)

- `VERCEL_TOKEN` · `VERCEL_ORG_ID` · `VERCEL_PROJECT_ID`

> Best practice: rotate `VERCEL_TOKEN` to a dedicated, scoped token from
> **Vercel → Account Settings → Tokens**, then `gh secret set VERCEL_TOKEN`.

### Recommended flow (so features ship independently)

```bash
git checkout -b feat/my-thing      # branch per feature
# ...build the feature inside its own <ErrorBoundary>...
git push -u origin feat/my-thing
gh pr create                       # CI runs + a PREVIEW deploy is posted on the PR
# review the preview URL, merge when green → auto-deploys to production
```

### Rollback (instant)

Every deploy on Vercel is immutable and retained, so rollback is instant:

```bash
vercel ls                          # list recent deployments
vercel rollback <deployment-url>   # promote a previous good build
# point the clean alias back if needed:
vercel alias set <deployment-url> gauravghop.vercel.app
```

Or use the Vercel dashboard → **Deployments → … → Instant Rollback**.

## Manual deploy (fallback)

```bash
npm i -g vercel
vercel --prod
```

## Notes

- Custom cursor, smooth scroll, and heavy motion are disabled on touch / `prefers-reduced-motion`.
- Sound is **opt-in** (a prompt on first visit; preference saved in `localStorage`).
- WebGL uses `low-power` mode and capped DPR to stay light on laptops and the free tier.
