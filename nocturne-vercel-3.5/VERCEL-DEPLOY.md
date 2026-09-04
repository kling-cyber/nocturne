# NOCTURNE 3.5 Vercel-ready deployment

## Important architecture

The `frontend/` folder is designed for Vercel. The `backend/` folder is the live Node.js + Socket.IO game server.

Do not deploy the current Express/Socket.IO server as a plain Vercel static site. Vercel can run WebSocket workloads in newer Fluid Compute/WebSocket capabilities, but the current NOCTURNE server uses a long-lived Node process and in-memory rooms. For the first online beta, deploy `frontend/` to Vercel and `backend/` to a persistent Node host such as Render, Railway, Fly.io, or a VPS.

## Vercel frontend

1. Import this repository/folder into Vercel.
2. Set the project root to `frontend/` if deploying from the repository root.
3. No build command is required.
4. The included `config.js` must contain the public backend URL.
5. Deploy.

## Backend

Deploy `backend/` to a Node.js host. Start command: `npm start`.
Set:
- `NODE_ENV=production`
- `FRONTEND_URL=https://YOUR-VERCEL-DOMAIN.vercel.app`
- `OPENAI_API_KEY` optionally, on the server only

After the backend is live, replace `YOUR-NOCTURNE-BACKEND.example.com` in `frontend/config.js` with its HTTPS URL and redeploy the frontend.

Players then visit only the Vercel URL. They do not install Node.js or the game.
