# ConsentScan

Cookie consent auditor: scan a URL, see banner/buttons/policies, cookies before and after consent, save into named locations, export to Excel, share via invite links.

## Run locally
1. Create a free MongoDB Atlas cluster and copy its connection string.
2. Backend:
   cd backend && cp .env.example .env   (fill MONGODB_URI and JWT_SECRET)
   npm install && npx playwright install chromium && npm run dev
3. Frontend (new terminal):
   cd frontend && cp .env.example .env && npm install && npm run dev
4. Open http://localhost:5173

## Deploy free
- Database: MongoDB Atlas M0 (allow network access 0.0.0.0/0).
- Backend: Hugging Face Space (Docker) using the backend folder, or Render. Set env vars from backend/.env.example. FRONTEND_URL must be your Vercel URL.
- Frontend: Vercel, root directory "frontend", env VITE_API_URL = your backend URL.
- Email: Brevo SMTP (free) or leave SMTP empty (emails print in server logs).
- Keep awake: UptimeRobot pinging <backend>/health every 5 minutes.
