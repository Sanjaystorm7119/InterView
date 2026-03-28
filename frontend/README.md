# HireEva — AI-Powered Recruitment Platform

HireEva automates the hiring interview process using AI. Recruiters create AI-driven interviews, candidates interview with a voice AI assistant (Eva), and the platform automatically analyzes transcripts, scores responses, and matches resumes to job descriptions.

---

## Features

- **AI Interview Generation** — Generates tailored interview questions from job descriptions
- **Voice AI Interviews** — Candidates interview with Eva, a real-time voice AI assistant (powered by Vapi)
- **Automatic Feedback Analysis** — Transcripts are analyzed by AI to produce ratings and detailed feedback
- **Resume Parsing** — Extracts structured candidate data from PDF/DOCX resumes
- **Resume-to-JD Matching** — Scores candidate resumes against job descriptions with skill gap analysis
- **Interview Invitations** — Sends branded email invitations to candidates via Resend
- **Credit System** — Recruiters consume 1 credit per interview created (default: 10 credits)
- **Dashboard & Analytics** — Overview of interviews, candidates, and hiring stats

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| Next.js 16 + React 19 | App framework |
| TypeScript | Type safety |
| Tailwind CSS 4 | Styling |
| Shadcn/ui + Radix UI | UI components |
| Framer Motion | Animations |
| Vapi AI Web SDK | Voice interview integration |
| Axios | HTTP client with JWT interceptors |
| Sonner | Toast notifications |

### Backend
| Technology | Purpose |
|---|---|
| FastAPI | REST API framework |
| SQLAlchemy 2 + Alembic | ORM + database migrations |
| PostgreSQL | Primary database |
| PyJWT + Passlib/bcrypt | Authentication & password hashing |
| OpenAI SDK (via OpenRouter) | AI model access |
| python-docx + PyPDF2 | Document parsing |
| Resend | Transactional email |

### AI & External Services
| Service | Purpose |
|---|---|
| OpenRouter | AI model gateway (Google Gemini Flash models) |
| Vapi | Real-time voice AI interviews |
| Resend | Email delivery |

---

## Project Structure

```
HApg/
├── frontend/               # Next.js application
│   ├── app/
│   │   ├── (auth)/         # Login & register pages
│   │   ├── (main)/         # Protected recruiter dashboard routes
│   │   │   ├── dashboard/
│   │   │   ├── create-interview/
│   │   │   ├── all-interview/
│   │   │   ├── scheduled-interview/
│   │   │   ├── resume-bank/
│   │   │   ├── job-details-bank/
│   │   │   ├── resume-matcher/
│   │   │   └── settings/
│   │   └── interview/[id]/ # Public candidate interview pages
│   ├── components/ui/      # Shadcn/ui component library
│   ├── context/            # AuthContext, InterviewDataContext
│   ├── hooks/
│   └── lib/api.ts          # Axios instance with auto token refresh
│
└── backend/                # FastAPI application
    ├── app/
    │   ├── main.py         # App entry point & CORS config
    │   ├── api/            # Route handlers
    │   ├── models/         # SQLAlchemy ORM models
    │   ├── schemas/        # Pydantic request/response schemas
    │   ├── services/       # AI & email service clients
    │   └── utils/          # JWT, security, dependency injection
    └── alembic/            # Database migration scripts
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL database
- API keys for OpenRouter, Vapi, and Resend

---

### Backend Setup

1. **Install dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure environment variables** — create `backend/.env`:
   ```env
   # Database
   DATABASE_URL=postgresql://postgres:password@localhost/hireeva

   # JWT
   SECRET_KEY=your-strong-random-secret-key
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   REFRESH_TOKEN_EXPIRE_DAYS=7

   # AI Services
   OPENROUTER_API_KEY=sk-or-v1-...

   # Email
   RESEND_API_KEY=re_...
   RESEND_FROM_EMAIL=onboarding@resend.dev

   # URLs
   FRONTEND_URL=http://localhost:3000
   ```

3. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

4. **Start the server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   API available at `http://localhost:8000`

---

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment variables** — create `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   NEXT_PUBLIC_HOST_URL=http://localhost:3000/interview
   NEXT_PUBLIC_VAPI_PUBLIC_KEY=your-vapi-public-key
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

   App available at `http://localhost:3000`

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new recruiter account |
| POST | `/api/auth/login` | Login and receive JWT tokens |
| POST | `/api/auth/refresh` | Refresh an expired access token |

### Interviews
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/interviews/` | Create an interview |
| GET | `/api/interviews/` | List all interviews (paginated) |
| GET | `/api/interviews/{id}` | Get interview details |
| PUT | `/api/interviews/{id}` | Update interview |
| DELETE | `/api/interviews/{id}` | Delete interview |
| GET | `/api/interviews/public/{id}` | Public endpoint for candidates |
| POST | `/api/interviews/save-transcript` | Save Vapi interview transcript |
| GET/POST | `/api/interviews/{id}/feedback` | Get or create candidate feedback |

### AI
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ai/generate-questions` | Generate interview questions from JD |
| POST | `/api/ai/generate-feedback` | Analyze transcript and generate feedback |
| POST | `/api/ai/company-summary` | Generate Eva's company intro speech |
| POST | `/api/ai/parse-document` | Extract structured data from JD file |
| POST | `/api/ai/parse-resume` | Extract structured data from resume file |

### Resume & Job Description Bank
| Method | Endpoint | Description |
|---|---|---|
| POST/GET | `/api/resumes/` | Upload or list resumes |
| GET/DELETE | `/api/resumes/{id}` | Get or delete a resume |
| POST/GET | `/api/job-descriptions/` | Upload or list job descriptions |
| GET/DELETE | `/api/job-descriptions/{id}` | Get or delete a job description |

### Matching & Email
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/matching/match` | Score a resume against a job description |
| GET | `/api/matching/history` | Retrieve match history |
| POST | `/api/email/send-invitation` | Send interview invitation to a candidate |

---

## Interview Workflow

```
Recruiter creates interview
        │
        ▼
AI generates questions from job description
        │
        ▼
Recruiter sends email invitation to candidate
        │
        ▼
Candidate joins public interview link
        │
        ▼
Vapi conducts live voice interview
        │
        ▼
Transcript saved to backend
        │
        ▼
AI analyzes transcript → ratings & feedback generated
        │
        ▼
Recruiter reviews results in dashboard
```

---

## Available Scripts (Frontend)

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run start` | Run production server |
| `npm run lint` | Run ESLint |

---

## AI Models Used

| Model | Usage |
|---|---|
| `google/gemini-2.5-flash-lite` | Question generation, summaries, document extraction |
| `google/gemini-2.5-flash` | Detailed feedback analysis |
| `google/gemma-3n-e2b-it:free` | Resume and document parsing |

All models are accessed via [OpenRouter](https://openrouter.ai).
#