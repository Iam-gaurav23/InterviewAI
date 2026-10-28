
# InterviewIQ.AI

An AI-powered mock interview platform for practising role-based interviews, receiving feedback, and tracking interview performance.

**[Live Demo](https://interview-ai-fpdn.vercel.app)** · **[GitHub Repository](https://github.com/Iam-gaurav23/InterviewAI)**

## Features

- Google authentication with Firebase
- AI-powered mock interviews and follow-up questions
- Interview history and performance reports
- Credit management and Razorpay integration

## Tech Stack

**Frontend:** React, Vite, Redux Toolkit, Axios

**Backend:** Node.js, Express.js, MongoDB, Mongoose

**Services:** Firebase, OpenRouter, Razorpay

**Deployment:** Vercel, Render

## Project Structure

```text
InterviewAI/
├── client/       # React frontend
├── server/       # Express backend
└── DEPLOYMENT.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB database
- Firebase project
- OpenRouter API key

### 1. Clone the repository

```bash
git clone https://github.com/Iam-gaurav23/InterviewAI.git
cd InterviewAI
```

### 2. Configure environment variables

Create `server/.env` using `server/.env.example` and configure your database URL, JWT secret, OpenRouter API key, and Razorpay credentials.

Create `client/.env` using `client/.env.example` and configure your Firebase settings and API URLs.

### 3. Run the backend

```bash
cd server
npm install
npm run dev
```

### 4. Run the frontend

Open a new terminal:

```bash
cd client
npm install
npm run dev
```

## Deployment

- **Frontend:** Vercel
- **Backend:** Render
- **Authentication:** Firebase

Configure the appropriate environment variables and authorized domains before deployment.

## Author

**Gaurav Prajapati**

[GitHub](https://github.com/Iam-gaurav23)
