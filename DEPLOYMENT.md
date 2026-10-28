# InterviewIQ deployment notes

This archive excludes `node_modules`, build output, and real `.env` files. Never commit real API keys or database credentials.

## Backend (Render Web Service)
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Add environment variables from `server/.env.example` in the host dashboard, using real values.
- Set `NODE_ENV=production`, `CLIENT_URL` to the exact deployed frontend origin (no trailing slash), `MONGODB_URL`, `JWT_SECRET`, `OPENROUTER_API_KEY`, and Razorpay keys if payments are enabled.
- Ensure the MongoDB Atlas network access rules permit the deployed backend to connect.

## Frontend (Vercel or Render Static Site)
- Root directory: `client`
- Build command: `npm run build`
- Output directory: `dist`
- Set `VITE_SERVER_URL` to the deployed backend URL (no trailing slash).
- Add the Firebase and Razorpay Vite variables required by the app.
- For Vercel, add an SPA rewrite to `index.html` so routes such as `/history` and `/report/:id` work on refresh.

## After deployment
1. Put the exact frontend origin in backend `CLIENT_URL` and redeploy the backend.
2. Confirm Firebase authorized domains include the frontend domain.
3. Configure MongoDB Atlas network access securely.
4. Test Google sign-in, refresh while logged in, logout, interview answer submission, history, and payments.
5. Cross-site cookie behavior can be affected by browser privacy settings. If auth cookies are blocked between separate hosting domains, use same-site custom domains or deploy both services under a compatible same-site domain.
