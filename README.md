<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1t1CNBRgfljmCBW8HUj6LCO21guV6Hl8o

## Run Locally

**Prerequisites:** Node.js (front-end) and a Gemini API key (backend)

### 1) Install dependencies

- Frontend: `npm install`
- Backend: `cd backend && npm install`

### 2) Configure environment variables

- Copy `backend/.env.example` to `backend/.env` and set `GEMINI_API_KEY` to your Gemini key.
- The backend listens on port `3001`; the Vite dev server proxies `/api` requests there.

### 3) Run the app

- Backend: `cd backend && npm run dev`
- Frontend: in a separate shell, from the repo root run `npm run dev`

---

For production builds, run `npm run build` from the root. The Vite config already proxies `/api` to the backend.
