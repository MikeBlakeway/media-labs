# Media Lab — Frontend (Web App)

The **frontend web app** provides the user interface for interacting with the Media Lab platform. It is built with **Next.js 15**, **TypeScript**, and **TailwindCSS**.

---

## Overview

- Built with **Next.js App Router**
- Type-safe with **TypeScript**
- Styled using **TailwindCSS**
- Includes linting & formatting via **ESLint** and **Prettier**
- Connects to the API service to submit jobs and display results
- Hosted on **Vercel** (Hobby tier for MVP)

---

## Directory Structure

```bash
apps/web/
  ├── app/               # App Router pages & layouts
  ├── components/        # Reusable UI components
  ├── hooks/             # Custom React hooks
  ├── lib/               # API client utilities
  ├── public/            # Static assets
  ├── styles/            # Global styles (Tailwind)
  ├── .eslintrc.json     # ESLint config
  ├── next.config.js     # Next.js config
  ├── package.json       # Dependencies & scripts
  └── tsconfig.json      # TypeScript config
```

---

## Running Locally

### Prerequisites

- Node.js 20+
- pnpm / npm / yarn

### Install & Run

```bash
cd apps/web
npm install
npm run dev
```

The app will be available at: [http://localhost:3000](http://localhost:3000)

---

## Available Scripts

| Script           | Description                  |
| ---------------- | ---------------------------- |
| `npm run dev`    | Start the development server |
| `npm run build`  | Build the app for production |
| `npm run start`  | Start a production server    |
| `npm run lint`   | Run ESLint checks            |
| `npm run format` | Format code with Prettier    |

---

## Environment Variables

Create a `.env.local` file with the following values:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Usage

- Users can submit jobs (e.g., text-to-image, image-to-video) via forms.
- Progress updates are displayed in real time (polling/WebSockets).
- Results can be previewed and downloaded once complete.

---

## Deployment

- Recommended: Deploy frontend via **Vercel** (Hobby plan is free).
- Ensure `NEXT_PUBLIC_API_URL` points to your deployed API service.

---

## Roadmap

- [ ] Add job submission forms for T2I and I2V (MVP)
- [ ] Add live progress updates via WebSocket/SSE
- [ ] Implement license/watermark badges on results
- [ ] Add support for all core services (audio separation, face swap, etc.)
- [ ] Authentication and per-user job history (future)
- [ ] Dark/light mode toggle
