# AI Mystery Room

A full-stack mystery game built from the project specification in `SPEC.md`.

## Stack

- Frontend: React + Vite + Tailwind
- Backend: Node.js + Express
- Database: MongoDB via Mongoose with in-memory fallback for local development
- AI: Gemini via `@google/genai`
- Validation: Zod

## Local setup

### 1. Frontend

```bash
cd client
npm install
npm run dev
```

### 2. Backend

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

The service runs at `http://localhost:5000` and the frontend typically runs at `http://localhost:5173`.

## Features

- Create a custom mystery from a premise and difficulty
- Investigate suspects and clues
- Request a limited number of hints
- Make a final accusation
- See score and verdict only after completion
- Server-side logic keeps solution data hidden until accusation

## Notes

- The project includes an in-memory fallback for local demos when MongoDB is not running.
- If a Gemini API key is not configured, the app generates a deterministic local case so the app remains testable offline.

## Deploy to Render

This setup deploys the React frontend and Express API together as one Render web service. MongoDB Atlas stores cases persistently. Gemini is optional; without its API key, the app uses its deterministic local case generator.

### 1. Push the project to GitHub

Render deploys from a connected Git repository. Push the project and make sure the latest changes, including `render.yaml`, are on the branch you want to deploy.

### 2. Create a MongoDB Atlas database

1. Sign in to [MongoDB Atlas](https://www.mongodb.com/atlas) and create a free database deployment.
2. Create a database user and save its username and password.
3. In **Network Access**, add `0.0.0.0/0`. Render's outbound IP addresses can change; use a restricted IP range if your Render plan provides static outbound IPs.
4. Choose **Connect** → **Drivers**, copy the Node.js connection string, and replace the password placeholder. URL-encode special characters in the password.
5. Add a database name such as `ai_mystery_room` to the connection URI. It should look like `mongodb+srv://<user>:<password>@<cluster-host>/ai_mystery_room?retryWrites=true&w=majority`.

### 3. Create the Render service

1. Sign in to [Render](https://render.com), choose **New** → **Blueprint**, and connect the GitHub repository.
2. Select the branch containing `render.yaml` and create the service.
3. When prompted, enter the Atlas URI for `MONGODB_URI`. Render sets `NODE_ENV=production` from the Blueprint.
4. Wait for the build and deploy to finish. The Blueprint installs both apps, builds the frontend, and starts the API, which serves the built frontend.

### 4. (Optional) Enable Gemini-generated cases

Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey). In Render, open the service's **Environment** settings, add `GEMINI_API_KEY`, and save. Render will redeploy the service. Keep the key in Render's environment settings; do not put it in frontend variables or commit it to Git.

### 5. Verify the deployment

Open the service URL shown by Render to load the game. Open `<your-render-url>/api/health`; a healthy service responds with JSON containing `"ok": true`. Try creating and completing a case to verify the app and database.

### Troubleshooting and operating notes

- If the deploy fails during startup, check that `MONGODB_URI` is set and that Atlas allows the Render service to connect. The service intentionally does not start with in-memory-only case storage in production.
- If the build fails, check the Render build logs for the failing install or build command. The service requires Node.js 20.19 or later.
- Render's free web service can spin down when idle, so the first request after inactivity may take longer. Cases remain in Atlas across restarts.
- Keep `GEMINI_API_KEY` and the Atlas database password private. Rotate them if they are ever exposed.
