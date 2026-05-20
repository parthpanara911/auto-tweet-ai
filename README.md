# AutoTweetAI

AutoTweetAI is an AI-powered SaaS project that converts GitHub commit activity into human-readable tweets automatically.

The system tracks commits using GitHub webhooks, processes them in the background, and generates tweet drafts with AI. Users can review, edit, approve, or reject generated tweets before posting.

---

## Features

- GitHub OAuth authentication
- Repository tracking with GitHub webhooks
- Real-time commit tracking
- AI tweet generation using Gemini API
- Manual and auto tweet generation modes
- Draft preview and approval workflow
- Tweet history management
- Queue-based background processing
- Redis caching and deduplication
- Scalable modular backend architecture

---

## Project Workflow

GitHub Push → Webhook → Queue → Commit Processing → AI Tweet Generation → Draft Review

---

## Main Modules

### Authentication
Users log in securely using GitHub OAuth.

### Repository Tracking
Tracked repositories automatically create GitHub webhooks for commit monitoring.

### Commit Processing
Incoming commits are processed asynchronously using Bull queues and Redis.

### AI Tweet Generation
Gemini AI converts commit activity into short developer-friendly tweets.

### Tweet Management
Users can:
- Edit drafts
- Approve tweets
- Reject tweets
- View tweet history

---

## Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd autotweetai
```

### 2. Install dependencies

Install dependencies for both frontend and backend.

```bash
cd backend
npm install
```

```bash
cd ../frontend
npm install
```

### 3. Configure environment variables

Create a `.env` file in the backend folder by copying values from `.env.example`.

### 4. Start Redis & MongoDB

### 5. Run the project

```bash
npm run dev
```