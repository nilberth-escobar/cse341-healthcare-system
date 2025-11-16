# Healthcare System Management API

This API powers the Healthcare System Management project. The service exposes secured endpoints for managing patients, doctors, appointments, medical records, prescriptions, and lab orders.

## Getting started

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and fill in the required values.
4. Start MongoDB locally or provide a MongoDB connection string.
5. Run the server with `npm start` or `node server.js`.

## Environment variables

The `.env.example` file documents the environment variables used by the API. Pay special attention to the `GITHUB_CALLBACK_URL`; it **must** match both the callback route registered in your GitHub OAuth application **and** the route defined by the API (`/api/auth/github/callback`). Using a different path, such as `/github/callback`, will cause GitHub to reject the login attempt with a `redirect_uri` mismatch error.

## GitHub OAuth login

- The API exposes the GitHub OAuth flow under `/api/auth/github` and `/api/auth/github/callback`.
- When creating your GitHub OAuth application, set the **Authorization callback URL** to `http://localhost:3000/api/auth/github/callback` for local development.
- If you change the server port or deploy to another host, update both the GitHub app settings and the `GITHUB_CALLBACK_URL` in your `.env` file accordingly.

With the correct callback URL configured, you should be able to authenticate with GitHub without seeing the "redirect_uri is not associated with this application" warning.
