# Kuldeep Thakur — AI Engineer & Software Developer

A statically exported Next.js portfolio for applied AI engineering, LLM applications, agentic AI and intelligent automation.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The portfolio is content-driven from `src/data/portfolio.ts`. The assistant is a local question-and-answer demo; it does not connect to a hosted model or require an API key.

## Production build

```bash
npm run build
```

Next.js exports a static site to `out/`. There is no database, server function, external API or environment variable requirement.

## Deploy on Vercel

1. Push this repository to a GitHub account.
2. Import the repository in Vercel.
3. Keep the detected Next.js build settings; the static export is written to `out/`.
4. Deploy and use the assigned `*.vercel.app` address. No custom domain is configured by this project.

Vercel currently describes Hobby as intended for personal, non-commercial use. Check the current plan terms for your intended use before deployment.

## Content and assets

- Update profile, skills, project descriptions, education and experience in `src/data/portfolio.ts`.
- No resume file or project repository/demo URLs were supplied, so the site does not invent downloads, links, metrics or outcomes.
- Add verified project imagery under `public/projects/` if available. The current project panels are original CSS illustrations and editable placeholders.
