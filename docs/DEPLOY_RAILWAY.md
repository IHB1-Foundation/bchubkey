# Railway Deploy (MySQL)

This project uses **Prisma + MySQL**. Railway is a good fit because it provides managed MySQL and a long-running service for the bot.

## 1) Create Railway services

1. Create a new Railway project
2. Add a **MySQL** database to the project
3. Add a **service** for this repo (GitHub deploy)

## 2) Configure environment variables

Set these variables on the Railway service:

- `TELEGRAM_BOT_TOKEN`
- `BOT_PUBLIC_NAME`
- `DATABASE_URL` (MySQL connection string)

Tip: Railway’s MySQL plugin exposes connection variables. Set `DATABASE_URL` to the plugin’s connection string.

## 3) Build + start commands

- Build: `npm run build`
- Start: `npm run start:railway`

`start:railway` runs `prisma migrate deploy` before starting the bot process.

Note: Prisma CLI (`prisma`) is a devDependency. Make sure your Railway install step includes devDependencies (e.g. don’t omit dev deps during install).

## Optional: Admin dashboard

The admin dashboard is disabled by default. To enable it on Railway, set:

- `ADMIN_PORT=${PORT}`
