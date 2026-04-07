# PrepOS — AI/ML Job Prep Dashboard

> A production-grade, dark-themed daily dashboard for AI/ML job seekers. Built with React, Tailwind CSS, and Lovable Cloud (Supabase) backend.

![PrepOS](https://img.shields.io/badge/PrepOS-AI%2FML%20Track-7c6ff7?style=for-the-badge)

---

## 🚀 Overview

PrepOS is a full-stack web application designed to help AI/ML job seekers organize their daily preparation workflow. It combines task management, spaced-repetition revision, study tracking, job application management, networking logs, and an AI-powered coaching system — all in one unified dashboard.

**Built for:** Shyam (single-user, personalized AI/ML interview prep)  
**Status:** Fully functional with persistent backend

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript 5 + Vite 5 |
| **Styling** | Tailwind CSS v3 + shadcn/ui components |
| **Backend** | Lovable Cloud (Supabase — Postgres + Auth + Edge Functions) |
| **AI Engine** | Lovable AI Gateway (Google Gemini 3 Flash Preview) |
| **State Management** | TanStack React Query v5 |
| **Routing** | React Router v6 |
| **Charts** | Recharts |
| **Markdown** | react-markdown |

---

## 🎨 Design System

Dark theme only. Professional SDE dashboard aesthetic.

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#0f0f13` | Page background |
| Surface | `#1a1a22` | Cards, panels |
| Surface Hover | `#22222e` | Interactive card states |
| Border | `rgba(255,255,255,0.07)` | Subtle borders |
| Text Primary | `#f0f0f5` | Headings, body |
| Text Muted | `#9090a8` | Secondary text |
| Accent Purple | `#7c6ff7` | Primary actions, branding |
| Success Green | `#3dba7e` | Completed items |
| Warning Amber | `#f0a832` | Due today, alerts |
| Danger Red | `#e05a5a` | Overdue, destructive |
| Info Blue | `#4fa3e8` | Informational badges |

**Fonts:**
- **Headings/Numbers:** Space Grotesk (Google Fonts)
- **Body:** DM Sans (Google Fonts)

---

## 📁 Project Structure

```
src/
├── components/
│   ├── AppSidebar.tsx          # Fixed left sidebar with navigation & streak
│   ├── DashboardLayout.tsx     # Main layout wrapper with sidebar
│   ├── NavLink.tsx             # Sidebar navigation link component
│   └── ui/                    # shadcn/ui component library (50+ components)
├── hooks/
│   ├── useAuth.tsx            # Supabase auth context & session management
│   ├── useStreak.tsx          # Daily streak tracking logic
│   ├── use-mobile.tsx         # Mobile viewport detection
│   └── use-toast.ts          # Toast notification hook
├── integrations/
│   └── supabase/
│       ├── client.ts          # Auto-generated Supabase client
│       └── types.ts           # Auto-generated TypeScript types from DB schema
├── lib/
│   ├── ai.ts                  # AI streaming chat utility (SSE/ReadableStream)
│   ├── constants.ts           # App constants, schedules, topics, AI prompt
│   └── utils.ts               # Utility functions (cn, etc.)
├── pages/
│   ├── Today.tsx              # Dashboard home — stats, schedule, tasks, check-in
│   ├── CalendarView.tsx       # Monthly calendar with daily summaries
│   ├── Revision.tsx           # Spaced-repetition revision queue
│   ├── StudyPlan.tsx          # Topic cards with subtopic checklists
│   ├── JobTracker.tsx         # Job application tracker with Kanban toggle
│   ├── NetworkLog.tsx         # Networking contacts log
│   ├── AICoach.tsx            # Full AI chat interface with quick actions
│   ├── Progress.tsx           # Analytics: heatmap, charts, AI weekly review
│   ├── Login.tsx              # Email/password authentication
│   └── NotFound.tsx           # 404 page
├── App.tsx                    # Root app with routing & auth guards
├── main.tsx                   # Entry point
└── index.css                  # Design tokens & global styles

supabase/
├── config.toml                # Supabase project configuration
├── functions/
│   └── ai-coach/
│       └── index.ts           # Edge Function: AI chat proxy with streaming
└── migrations/
    └── *.sql                  # Database schema migrations
```

---

## 🗄️ Database Schema

8 tables with Row-Level Security (RLS) — users can only access their own data.

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `tasks` | Daily to-do items | text, priority (high/med/low), done, date |
| `revision_items` | Spaced-repetition concepts | text, topic, next_rev, rev_count, rev_dates[] |
| `study_hours` | Study time logs | topic, hours, date |
| `daily_checkins` | Daily mood & notes | mood, notes, streak, date |
| `job_applications` | Job application tracker | company, role, status, applied_date, follow_up_date |
| `network_log` | Networking contacts | name, platform, note, next_action |
| `ai_chat_history` | AI Coach conversations | role, content, context_type, session_date |
| `user_progress` | Study plan completion state | studied_subtopics (JSONB) |

### RLS Policies

All tables enforce `user_id = auth.uid()` for SELECT, INSERT, UPDATE, and DELETE operations.

---

## 📱 Application Views

### 1. Today (Default Dashboard)
- **Greeting bar** with live clock and date
- **4 stat cards**: Tasks done, Revision due, Jobs applied (weekly), Study hours (daily)
- **Smart Schedule**: Timetable with "▶ NOW" badge on current time block
- **Interview Mode toggle**: Switches to interview-day schedule with blue alert banner
- **Priority Tasks**: Add/complete tasks with priority levels; completed tasks auto-create revision items
- **Revision Queue**: Today's due items with spaced-rep mark-done
- **Daily Check-in**: 5-emoji mood selector + notes textarea
- **Study Logger**: Topic dropdown + hours input → logs to database with progress bars

### 2. Calendar
- Monthly grid showing tasks (done/total), revision dots, and study hours per day
- Click any day → side panel with full details

### 3. Revision Queue
- Tabbed view: All | Overdue | Due Today | Upcoming
- Full table with topic badges, revision counts, next due dates
- **AI Revision Coach**: Button to get AI-generated tips for today's due items (streaming)
- Color-coded rows: red (overdue), amber (due today)

### 4. Study Plan
- 6 topic cards (ML, DL, Python, SQL, Statistics, Interview Prep)
- Subtopic checklists — checking a subtopic adds it to revision queue
- Weekly focus recommendation based on day of week
- Progress persisted via `user_progress` table

### 5. Job Tracker
- Stats row: Applied, Interviews, Offers, Rejected (color-coded)
- Full table with inline status updates
- Add application form
- Kanban view toggle (Applied → Interview → Offer columns)
- Motivational message when empty

### 6. Network Log
- Contact table with platform, notes, next actions
- Add contact form (LinkedIn/Twitter/Event/Cold Email/Other)
- Networking tip panel

### 7. AI Coach
- Full chat interface with streaming responses
- 4 quick-action buttons:
  - 🎯 Mock Interview
  - 📚 Explain a Concept
  - 💪 Motivate Me
  - 🔁 Revision Tips (fetches today's items)
- Chat history saved to database, loaded on page open
- Powered by Google Gemini 3 Flash Preview via Lovable AI Gateway

### 8. Progress
- Weekly study heatmap (7 boxes, purple intensity = hours)
- Topic coverage progress bars (cumulative vs target)
- Application funnel chart (Applied → Interview → Offer)
- Streak calendar (last 30 days, green dots for active days)
- **AI Weekly Review**: Button to get AI-generated performance analysis

---

## 🧠 Spaced Repetition Algorithm

Revision items follow this interval schedule:

```
Revision 1 → +1 day
Revision 2 → +4 days
Revision 3 → +7 days
Revision 4 → +14 days
Revision 5 → +30 days
Revision 6+ → +60 days
```

When a revision item is marked done:
1. `rev_count` incremented
2. `next_rev` recalculated using `SPACED_REP_INTERVALS[min(rev_count, 5)]`
3. Current date appended to `rev_dates[]`

---

## 🔥 Streak Logic

- On app load / any activity: check `daily_checkins` for today
- If today's entry doesn't exist → insert it
- Compare with yesterday's entry:
  - Yesterday exists → increment streak
  - Gap > 1 day → reset streak to 1
- Displayed in sidebar with 🔥 emoji

---

## 🤖 AI Integration

### Edge Function: `ai-coach`

Server-side proxy to the Lovable AI Gateway. Handles:
- CORS headers
- Streaming SSE responses
- Rate limiting (429) and credit exhaustion (402) error handling
- System prompt injection for PrepOS AI Coach persona

### AI Features
| Feature | Location | Trigger |
|---------|----------|---------|
| Revision Tips | Revision page | "Get today's revision tips" button |
| Mock Interview | AI Coach | Quick action button |
| Concept Explanation | AI Coach | Quick action button |
| Motivation | AI Coach | Quick action button |
| Weekly Review | Progress page | "AI Weekly Review" button |

---

## 🔐 Authentication

- Email/password authentication via Supabase Auth
- Auto-confirm enabled (no email verification required)
- Protected routes — unauthenticated users redirected to `/login`
- Session persisted in localStorage with auto-refresh

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- A Lovable Cloud project (or Supabase project)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/prepos.git
cd prepos

# Install dependencies
bun install  # or npm install

# Start development server
bun run dev  # or npm run dev
```

### Environment Variables

The following are auto-configured by Lovable Cloud:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

The Edge Function uses `LOVABLE_API_KEY` (auto-injected by Lovable Cloud).

---

## 📦 Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^18.3.1 | UI framework |
| `react-router-dom` | ^6.30.1 | Client-side routing |
| `@supabase/supabase-js` | ^2.101.1 | Backend client |
| `@tanstack/react-query` | ^5.83.0 | Data fetching & caching |
| `recharts` | ^2.15.4 | Charts & visualizations |
| `react-markdown` | ^9.0.0 | AI response rendering |
| `sonner` | ^1.7.4 | Toast notifications |
| `date-fns` | ^3.6.0 | Date utilities |
| `lucide-react` | ^0.462.0 | Icons |
| shadcn/ui components | latest | UI component library |

---

## 📄 License

MIT

---

## 🙏 Acknowledgements

- Built with [Lovable](https://lovable.dev)
- Backend powered by Lovable Cloud (Supabase)
- AI powered by Lovable AI Gateway
- UI components from [shadcn/ui](https://ui.shadcn.com)
