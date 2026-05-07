# Project Plan Template Generator

A browser-based project plan generator built with Next.js, React, and TypeScript. Create structured project plans with timelines, Gantt charts, deliverable overviews, and exportable Excel spreadsheets — all without a backend.

## Features

- Interactive project plan form with phases, milestones, and deliverables
- Automatic timeline and date calculation
- Visual Gantt chart
- Deliverable overview panel
- Export to Excel (`.xlsx`) directly from the browser
- Light/dark theme support
- Fully static — no server or database required

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (static export) |
| Language | TypeScript |
| UI Components | Radix UI + shadcn/ui |
| Styling | Tailwind CSS 4 |
| Forms | React Hook Form + Zod |
| Spreadsheet export | ExcelJS |
| Package manager | pnpm |

---

## Local Development

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>

# 2. Install dependencies
pnpm install

# 3. Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start local development server |
| `pnpm build` | Build static export to `./out` |
| `pnpm lint` | Run ESLint |

---

## Deploying to GitHub Pages

### How it works

The project uses `output: 'export'` in `next.config.mjs`, which tells Next.js to produce a fully static site in the `./out` directory on build. A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the project and publishes the `./out` folder to GitHub Pages automatically on every push to `main`.

The `basePath` is set dynamically at build time using the `NEXT_PUBLIC_BASE_PATH` environment variable, which the workflow sets to `/<repo-name>` automatically using `${{ github.event.repository.name }}`. No manual configuration is needed.

### Step-by-step setup

**1. Push the code to GitHub**

Create a new repository on GitHub, then push this project:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

**2. Enable GitHub Pages**

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under **Source**, select **GitHub Actions**
4. Click **Save**

**3. Trigger a deployment**

The workflow runs automatically on every push to `main`. To trigger it manually:

1. Go to **Actions** tab in your repository
2. Select **Deploy to GitHub Pages**
3. Click **Run workflow** → **Run workflow**

**4. Access your site**

Once the workflow completes (typically 1–2 minutes), your site will be live at:

```
https://<your-username>.github.io/<repo-name>/
```

You can find the exact URL on the **Actions** tab after a successful deployment, or under **Settings** → **Pages**.

### Deployment workflow overview

```
Push to main
    │
    ▼
.github/workflows/deploy.yml
    │
    ├── Checkout code
    ├── Install pnpm + Node.js 20
    ├── pnpm install
    ├── pnpm build  (sets NEXT_PUBLIC_BASE_PATH=/<repo-name>)
    │       └── outputs static files to ./out
    ├── Upload ./out as Pages artifact
    └── Deploy artifact to GitHub Pages
```

### Troubleshooting

| Problem | Fix |
|---|---|
| Workflow fails with "Pages not enabled" | Enable GitHub Pages under Settings → Pages → Source → GitHub Actions |
| Site loads but assets (CSS/JS) are missing | Confirm the `basePath` matches your repo name exactly — check the `NEXT_PUBLIC_BASE_PATH` value in the Actions log |
| `pnpm: command not found` during build | The workflow installs pnpm automatically via `pnpm/action-setup@v4` — no manual setup needed |
| Build error `Cannot find module` | Run `pnpm install` locally and commit the updated `pnpm-lock.yaml` |
| Blank page after deploy | Open browser DevTools → Console. A 404 on a JS chunk usually means a `basePath` mismatch |

---

## Project Structure

```
project-plan-template-generator/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions deployment workflow
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata)
│   ├── page.tsx                # Main application page
│   └── globals.css             # Global styles
├── components/
│   ├── ui/                     # Radix UI / shadcn base components
│   ├── project-form.tsx        # Project input form
│   ├── consolidated-project-form.tsx
│   ├── project-plan-display.tsx
│   ├── project-timeline.tsx
│   ├── gantt-chart.tsx
│   ├── deliverable-overview.tsx
│   ├── theme-provider.tsx
│   └── icons.tsx
├── lib/
│   ├── types.ts                # Shared TypeScript types
│   ├── project-calculator.ts   # Timeline and phase calculations
│   ├── excel-export.tsx        # Browser-side Excel generation
│   ├── consolidated-export.ts
│   ├── date-utils.ts
│   └── utils.ts
├── hooks/                      # Custom React hooks
├── public/                     # Static assets
├── next.config.mjs             # Next.js config (static export + basePath)
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Notes

- **No backend required.** All processing — including Excel file generation — happens in the browser.
- **`@vercel/analytics`** is listed as a dependency (from the original v0 scaffold) but has no effect on GitHub Pages. It can be safely removed if desired.
- The `ignoreBuildErrors: true` TypeScript setting is inherited from the original scaffold. You can remove it once any existing type errors are resolved.
