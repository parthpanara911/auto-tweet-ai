# AutoTweetAI

AutoTweetAI turns your GitHub commits into ready-to-review tweet drafts. Sign in with GitHub, track your public repositories, and let AI write short developer-style tweets from your work. You can edit, approve, or reject every draft before anything goes further.

Built with **Node.js, Express, React, MongoDB, Redis, and the Gemini API**.

---

## What it can do

- **Sign in with GitHub:** log in with GitHub OAuth and stay signed in with secure cookie sessions.
- **Track repositories:** browse and search your public repositories, then turn tracking on or off with one click. Tracking creates a GitHub webhook for you.
- **Commit tracking:** every push to a tracked repository is received, checked, and saved in the background.
- **Manual tweets:** pick a repository, select 1 to 5 commits, and generate a tweet draft.
- **Auto tweets:** when you push commits starting with `feat` or `refactor`, a draft is created for you automatically.
- **Review workflow:** edit, approve, or reject drafts. Rejecting a draft puts its commits back so you can use them again.
- **Tweet history:** see all your tweets with status labels, search, and pagination.

> Posting tweets directly to X (Twitter) is not built yet. Approved tweets stay in your history for now.

---

## How it works

```
GitHub push → Webhook → Queue → Commit processing → AI tweet generation → Draft review
```

1. You turn on tracking for a repository. The API registers a webhook on GitHub with its own secret.
2. When you push code, GitHub sends the event to the API. The API verifies the signature and ignores duplicates.
3. Each new commit is added to a **Bull queue**. A background processor fetches the commit details from GitHub (changed files, lines added and removed) and saves them to MongoDB.
4. For auto tweets, a tweet job is queued after a short delay so commits can finish processing first. For manual tweets, the job starts when you click **Generate Tweet**.
5. The Gemini API writes a tweet of up to 280 characters. It is saved as a **draft**.
6. The dashboard checks for new drafts every few seconds, so your draft appears without a page refresh.

Tweet statuses: `draft` → `approved` → `posted` (or `rejected`).

### Limits to know about

- 1 to 5 commits per tweet.
- Auto tweets only use commits whose message starts with `feat` or `refactor`.
- Auto tweets are limited to 6 per repository per hour.
- Manual generation is limited to 5 requests per hour per user.
- Only public repositories are shown.

### Background jobs

Two [Bull](https://github.com/OptimalBits/bull) queues run on Redis:

- **Commit processing:** fetches and saves commit details, with automatic retries.
- **Tweet generation:** creates drafts for manual, auto, and scheduled requests, with automatic retries.

A Bull Board dashboard for monitoring queues is available at `/admin/queues` (admin accounts only).

### Security

- GitHub OAuth login using a one-time exchange code, so tokens never appear in URLs.
- JWT access and refresh tokens stored in httpOnly cookies, with refresh rotation.
- GitHub access tokens and webhook secrets are encrypted before being saved (AES-256-GCM).
- Webhook requests are verified with HMAC-SHA256 signatures and timing-safe comparison.
- Duplicate webhook deliveries and duplicate commits are skipped.
- Redis-backed rate limiting on login, tweet generation, and other write endpoints.
- Users can only access their own repositories, commits, and tweets.

---

## Tech stack

| Area | Tools |
| --- | --- |
| Frontend | React (Vite), Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Cache, rate limits, queues | Redis, Bull |
| AI | Google Gemini API |
| Auth | GitHub OAuth (Passport), JWT, cookies |
| Integrations | GitHub REST API and Webhooks |

---

## Getting started

### Requirements

- Node.js 18 or newer
- MongoDB (local or Atlas)
- Redis (local or a hosted instance)
- A [GitHub OAuth App](https://github.com/settings/developers)
- A free [Gemini API key](https://aistudio.google.com/app/apikey) from Google AI Studio
- [ngrok](https://ngrok.com/download) (free account is enough)

### 1. Create your GitHub OAuth App

Go to **GitHub → Settings → Developer settings → OAuth Apps → New OAuth App** and use:

- **Homepage URL:** `http://localhost:5173`
- **Authorization callback URL:** `http://localhost:5000/api/auth/github/callback`

Copy the **Client ID** and generate a **Client Secret**. You will need both in the next step.

### 2. Install and configure the backend

```bash
cd backend

# Install dependencies
npm install

# Create your environment file
cp .env.example .env
# Then fill in your own values
```

### 3. Install and configure the frontend

```bash
cd frontend

# Install dependencies
npm install
```

### 4. Expose your server with ngrok (required)

GitHub sends webhook events over the internet, so it cannot reach `localhost`. Without a public URL, tracked repositories will never send commits to your app.

```bash
# One time: connect your ngrok account
ngrok config add-authtoken <YOUR_NGROK_TOKEN>

# Start a tunnel to the backend port
ngrok http 5000
```

ngrok prints a public address like `https://abcd-1234.ngrok-free.app`. Put it in `backend/.env`:

```
WEBHOOK_BASE_URL=https://abcd-1234.ngrok-free.app
```

AutoTweetAI registers webhooks at `WEBHOOK_BASE_URL/api/webhooks/github`.

### 5. Start everything

Open separate terminals:

```bash
# 1. Make sure MongoDB and Redis are running

# 2. Backend (also starts the queue workers)
cd backend
npm run dev

# 3. Frontend
cd frontend
npm run dev

# 4. ngrok tunnel
ngrok http 5000
```

Open `http://localhost:5173`, sign in with GitHub, and you are ready to go.

### 6. Try it out

1. Go to **Repositories** and click **Track Repo** on one of your public repositories.
2. Push a commit to it, for example `feat: add dark mode`.
3. Open the **Dashboard**, choose that repository, select the commit, and click **Generate Tweet**. Pushing a `feat` or `refactor` commit also creates an auto draft after about a minute.
4. Review the draft, then edit, approve, or reject it.

---

## Admin access

The queue dashboard at `/admin/queues` needs an admin account. Log in with GitHub at least once, then run:

```bash
# Grant admin
npm run user:role -- --githubId=<GITHUB_ID>

# Revoke admin
npm run user:role -- --githubId=<GITHUB_ID> --role=user
```

To run this against production, pass `MONGODB_URI` for that single command only.

---

## Troubleshooting

| Problem | What to check |
| --- | --- |
| No commits appear after a push | Is ngrok running? Does `WEBHOOK_BASE_URL` match the current ngrok address? On GitHub, open the repo's **Settings → Webhooks → Recent Deliveries** to see what happened. |
| Webhook shows a `401` or `404` error | The webhook was created with an old address or secret. Untrack and track the repository again. |
| Commits exist but no auto draft | Auto drafts only use commits starting with `feat` or `refactor`. Other commits can still be used manually. |
| Draft never appears | Check that Redis is running and that `GEMINI_API_KEY` is valid. Look at `/admin/queues` for failed jobs. |
| Login redirects back with an error | Make sure the GitHub OAuth callback URL and `FRONTEND_URL` match the values above exactly. |

---