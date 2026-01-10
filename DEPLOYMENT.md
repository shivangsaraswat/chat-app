# Deployment Guide

This project is a monorepo containing a backend (Express), a client app (Next.js), and an admin dashboard (Next.js).

## 🚀 Backend Deployment (Render)

1. **Create a New Web Service** on Render.
2. **Connect your Repository**.
3. **Configure Service**:
   - **Runtime**: `Node`
   - **Build Command**: `npm install -g pnpm && pnpm install --prod=false && pnpm render-build`
   - **Start Command**: `pnpm run start --filter=backend`
4. **Environment Variables**:
   Add the following variables in the Render dashboard:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: Your Neon PostgreSQL connection string.
   - `JWT_SECRET`: A long random string.
   - `JWT_REFRESH_SECRET`: Another long random string.
   - `IMAGEKIT_PUBLIC_KEY`: From your ImageKit dashboard.
   - `IMAGEKIT_PRIVATE_KEY`: From your ImageKit dashboard.
   - `IMAGEKIT_URL_ENDPOINT`: From your ImageKit dashboard.
   - `SMTP_HOST`: e.g., `smtp.resend.com` or `smtp.gmail.com`.
   - `SMTP_PORT`: `587`
   - `SMTP_USER`: Your SMTP username.
   - `SMTP_PASS`: Your SMTP password/API key.
   - `EMAIL_FROM`: The email address to send OTPs from.
   - `APP_URL`: The URL of your deployed client app (e.g., `https://chat-app-client.vercel.app`).
   - `ADMIN_URL`: The URL of your deployed admin dashboard (e.g., `https://chat-app-admin.vercel.app`).
   - `API_URL`: The URL of your Render backend (e.g., `https://chat-app-backend.onrender.com`).

5. **Database Migration**:
   - The build command runs `prisma generate`.
   - Before the first deployment, you should run `pnpm db:push` from your local machine with the `DATABASE_URL` set to your production database to create the tables.

---

## 💻 Client App Deployment (Vercel)

1. **New Project** on Vercel.
2. **Select the Repository**.
3. **Configure Settings**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `app`
4. **Environment Variables**:
   Add the following variables:
   - `NEXT_PUBLIC_API_URL`: The URL of your Render backend (e.g., `https://chat-app-backend.onrender.com`).
5. **Build & Deploy**.

---

## 🛠 Admin Dashboard Deployment (Vercel)

1. **New Project** on Vercel.
2. **Select the Repository**.
3. **Configure Settings**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `admin`
4. **Environment Variables**:
   Add the following variables:
   - `NEXT_PUBLIC_API_URL`: The URL of your Render backend (e.g., `https://chat-app-backend.onrender.com`).
5. **Build & Deploy**.

---

## 📝 Important Notes

- **CORS**: Make sure `APP_URL` and `ADMIN_URL` are correctly set in the backend environment variables, otherwise the frontends won't be able to communicate with the API.
- **Prisma**: The build command automatically runs `prisma generate`.
- **Database**: Ensure your Neon database allows connections from Render's IP addresses (or use `sslmode=require`).
