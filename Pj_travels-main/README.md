# Horizon — Agentic Travel Planner

> A multi-agent AI travel planner that builds complete, research-backed itineraries from a single natural-language request. Powered by LangGraph, Groq LLMs, and Exa web search — with real-time streaming, chat follow-ups, and export to HTML/PDF/TXT.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Multi-Agent Pipeline** | 5 specialized agents (Intent → Research → Itinerary → Budget → Finalizer) orchestrated by LangGraph |
| **Real-Time Streaming** | Server-Sent Events (SSE) stream each agent's output as it completes — no waiting for the full plan |
| **Web-Backed Research** | Exa API searches the live web for real attractions, food, weather, and transport data |
| **Chat Follow-Ups** | Ask questions, request summaries, or modify plans conversationally — context is preserved across turns |
| **Validation Gates** | Each agent output is validated; failed outputs auto-retry up to 2 times with feedback |
| **Per-Agent Retry + Backoff** | Exponential backoff with jitter per agent; rate-limit aware (parses `Retry-After` headers) |
| **Context Window Management** | Automatic truncation of prompts at safe token limits to prevent overflow |
| **Over-Budget Detection** | Budget agent flags when estimated cost exceeds user's limit; one-click replan |
| **Multi-Format Export** | Download plans as **HTML** (styled page), **Plain Text**, or **JSON** |
| **Share Anywhere** | Copy summary, share via Email, or send via WhatsApp with rich formatting |
| **Instant Dashboard** | Skeleton loading with shimmer — tabs populate incrementally as agents complete |
| **Agent Transparency** | Full input/output trace for every agent — see exactly what the LLM received and produced |

---

## 📸 Screenshots

### Skeleton Loading Screen & Initial Clarification
| | |
|:---:|:---:|
| <img src="screenshots/skeleton%20loadig%20ui%20ux__.png" width="600" alt="Skeleton loading screen"> | <img src="screenshots/clarifying%20info%20about%20trip%20before%20planning.png" width="600" alt="Clarifying info before planning"> |
| **Skeleton Loading** — Shimmer placeholders keep the UI responsive while agents work in the background. Tabs populate incrementally as each agent completes. | **Smart Clarification** — Missing critical details (destination, duration, budget, travelers) are caught upfront with targeted questions before the pipeline runs. |

### Trip Overview & Itinerary
| | |
|:---:|:---:|
| <img src="screenshots/overview__.png" width="600" alt="Trip overview"> | <img src="screenshots/itenary.png" width="600" alt="Day-wise itinerary"> |
| **Trip Overview** — Executive summary, destination overview, key stats (travelers, days, budget, travel style) at a glance with tabbed navigation. | **Day-Wise Itinerary** — Detailed morning/afternoon/evening breakdown with real place names, meal suggestions, local costs, and practical notes per day. |

### Q&A & Budget Replan
| | |
|:---:|:---:|
| <img src="screenshots/qna-with%20plan.png" width="600" alt="Q&A with plan"> | <img src="screenshots/budget.png" width="600" alt="Replan if budget exceeds"> |
| **Chat Q&A** — Ask follow-up questions about your plan without rebuilding it. The LLM answers from the existing plan context — summaries, details, recommendations. | **Over-Budget Replan** — When estimated cost exceeds your budget, an amber warning shows the overshoot amount with a one-click "Replan within budget" button. |

### Export & Share
| |
|:---:|
| <img src="screenshots/downloading%20plans.png" width="800" alt="Download and share plan"> |
| **Download & Share** — Export the full plan as HTML, Plain Text, or JSON. Share instantly via WhatsApp, Email, or copy a formatted summary to clipboard. |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + Vite)                    │
│                                                                     │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ ChatPanel│  │ Dashboard    │  │ SidePanel    │  │ Export/    │  │
│  │          │  │  Overview    │  │  Settings    │  │ Share      │  │
│  │          │  │  Itinerary   │  │  History     │  │ Dropdowns  │  │
│  │          │  │  Budget      │  │              │  │            │  │
│  │          │  │  Tips        │  │              │  │            │  │
│  │          │  │  Agents      │  │              │  │            │  │
│  └────┬─────┘  └──────┬───────┘  └──────────────┘  └────────────┘  │
│       │               │                                             │
│       │  SSE Stream   │  PlanResponse (JSON)                        │
│       ▼               ▼                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                    useTravelPlanner Hook                      │   │
│  │  planTripStream() → ReadableStream → applyEvent() → state    │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────┘
                              │  POST /api/v1/trips/plan/stream
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI)                             │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              TravelPlannerService                           │   │
│  │                                                             │   │
│  │  plan_trip_stream() ──► graph.stream() ──► event_generator │   │
│  │  plan_trip()        ──► graph.invoke()                     │   │
│  │                                                             │   │
│  │  Chat Follow-ups:                                           │   │
│  │  _classify_followup() → summary / question / replan        │   │
│  │  _summarize_trip() / _answer_question()                    │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  LangGraph StateGraph                        │   │
│  │                                                             │   │
│  │  START → Orchestrator → Intent Agent → Validate Intent ─┐   │   │
│  │                              ↑                          │   │   │
│  │                              └── (retry ≤ 2) ───────────┘   │   │
│  │                                                             │   │
│  │  → Research Agent → Validate Research ─┐                    │   │
│  │                    ↑                   │                    │   │
│  │                    └── (retry ≤ 2) ────┘                    │   │
│  │                                                             │   │
│  │  → Itinerary Agent → Validate Itinerary ─┐                  │   │
│  │                      ↑                   │                  │   │
│  │                      └── (retry ≤ 2) ────┘                  │   │
│  │                                                             │   │
│  │  → Budget Agent → Validate Budget → Finalizer → END         │   │
│  │                                                             │   │
│  │  Checkpointer: InMemorySaver (session-based state)          │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│              ┌──────────────┼──────────────┐                       │
│              ▼              ▼              ▼                       │
│  ┌────────────────┐ ┌──────────────┐ ┌────────────────┐           │
│  │  GroqLLM       │ │  Exa API     │ │  Validators    │           │
│  │  (LLM calls)   │ │  (Web search)│ │  (Quality gate)│           │
│  │                │ │              │ │                │           │
│  │  • Retry/backoff│ │  • 5 queries│ │  • Intent      │           │
│  │  • Rate-limit  │ │  • 3 results│ │  • Research    │           │
│  │    aware       │ │    per query│ │  • Itinerary   │           │
│  │  • Per-agent   │ │  • Content  │ │  • Budget      │           │
│  │    config      │ │    fetch    │ │                │           │
│  └────────────────┘ └──────────────┘ └────────────────┘           │
└─────────────────────────────────────────────────────────────────────┘
```

### Agent Pipeline Flow

```
User Request
    │
    ▼
┌─────────────┐
│ Orchestrator│  Extracts hints: destination, duration, budget, travelers, interests
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Intent Agent│  Structured output: destination, days, budget_limit, travelers, style
└──────┬──────┘
       │
       ▼
┌──────────────┐
│ Validate     │  Checks: destination present? duration valid? → retry if failed
│ Intent       │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Research     │  Exa web search → 5 categories × 3 results → content fetch
│ Agent        │  Produces: attractions, food, weather, tips, cautions
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Validate     │  Checks: overview ≥ 20 chars? attractions present? → retry if failed
│ Research     │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Itinerary    │  Day-by-day plan: morning/afternoon/evening, meals, costs, notes
│ Agent        │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Validate     │  Checks: correct day count? no empty days? → retry if failed
│ Itinerary    │
└──────┬───────┘
       │
       ▼
┌─────────────┐
│ Budget      │  Calculates: transport, accommodation, food, activities, contingency
│ Agent       │  Flags: within_budget = true/false
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Validate    │  Logs over-budget warning (no auto-retry — user decides)
│ Budget      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Finalizer   │  Composes: executive_summary, travel_tips, final_plan
└──────┬──────┘
       │
       ▼
   TravelPlanResponse → SSE stream → Frontend Dashboard
```

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Python | ≥ 3.11 |
| Node.js | ≥ 18 |
| Groq API Key | [Get one →](https://console.groq.com/keys) |
| Exa API Key | [Get one →](https://dashboard.exa.ai/) |

### 1. Clone & Install

```bash
git clone <repo-url>
cd Pj_travels-main
```

### 2. Backend Setup

```bash
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -e ".[dev]"

# Configure environment
copy .env.example .env          # Windows
# cp .env.example .env          # macOS/Linux
```

Edit `.env` with your API keys:

```env
GROQ_API_KEY=gsk_your_groq_key_here
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_BASE_URL=https://api.groq.com/openai/v1
EXA_KEY=your_exa_key_here
APP_ENV=development
```

### 3. Frontend Setup

```bash
cd frontend
npm install
```

### 4. Run

**Terminal 1 — Backend:**
```bash
cd backend
uvicorn app.main:app --reload --port 8002
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📡 API Reference

### Plan a Trip (Blocking)

```bash
curl -X POST http://127.0.0.1:8002/api/v1/trips/plan \
  -H "Content-Type: application/json" \
  -d '{"user_request": "Plan a 5-day budget trip to Goa under 20000 INR for 2 people"}'
```

### Plan a Trip (Streaming)

```bash
curl -X POST http://127.0.0.1:8002/api/v1/trips/plan/stream \
  -H "Content-Type: application/json" \
  -d '{"user_request": "Plan a 5-day budget trip to Goa under 20000 INR for 2 people"}'
```

**SSE Events:**

| Event Type | Payload | Description |
|------------|---------|-------------|
| `session` | `{session_id, request}` | Session initialized |
| `intent` | `IntentDetails` | Trip requirements extracted |
| `research` | `DestinationResearch` | Web research results |
| `itinerary` | `ItineraryPlan` | Day-by-day schedule |
| `budget` | `BudgetBreakdown` | Cost breakdown |
| `complete` | `TravelPlanResponse` | Full assembled plan |
| `questions` | `string[]` | Clarification needed |
| `chat_reply` | `string` | Follow-up answer/summary |
| `error` | `string` | Error message |

### Follow-Up (Chat)

```bash
curl -X POST http://127.0.0.1:8002/api/v1/trips/plan \
  -H "Content-Type: application/json" \
  -d '{
    "user_request": "Summarize the trip",
    "session_id": "abc-123-def"
  }'
```

---

## 💡 Sample Inputs & Outputs

### Input 1 — Simple Request

```
Plan a 5-day budget trip to Goa under 20000 INR for 2 people
```

**Output — Dashboard Preview:**

```
┌─────────────────────────────────────────────────────────────┐
│  Goa                                                        │
│  5-day budget trip to Goa for 2 traveler(s), estimated at   │
│  INR 18,500 and currently within budget.                    │
├─────────────────────────────────────────────────────────────┤
│  [Overview] [Itinerary] [Budget] [Tips] [Agents]            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Day 1: Arrival & Beach Vibes                               │
│  🌅 Morning: Check in at Calangute, walk along the shore    │
│  ☀️ Afternoon: Lunch at Britto's, try Goan fish curry       │
│  🌙 Evening: Sunset at Baga Beach, beach shacks             │
│                                                             │
│  Day 2: Old Goa Heritage                                    │
│  🌅 Morning: Basilica of Bom Jesus, Se Cathedral            │
│  ☀️ Afternoon: Lunch at Mum's Kitchen, explore Fontainhas   │
│  🌙 Evening: Mandovi River cruise                           │
│                                                             │
│  ...                                                        │
├─────────────────────────────────────────────────────────────┤
│  Your Budget          Trip Cost                             │
│  INR 20,000           INR 18,500  ✅ Within budget          │
└─────────────────────────────────────────────────────────────┘
```

### Input 2 — Follow-Up Question

```
What are the best beaches in Goa?
```

**Output — Chat Response:**

```
🌍 *TRIP TO GOA*
──────────────────────────
Based on your plan, here are the top beaches:

**Calangute Beach** — The "Queen of Beaches", great for water sports
**Baga Beach** — Lively nightlife, beach shacks, and sunset views
**Anjuna Beach** — Famous for its flea market and rocky coastline
**Palolem Beach** — Serene crescent-shaped beach in South Goa
**Agonda Beach** — Quiet, pristine, perfect for relaxation

💡 Tip: Visit Calangute early morning for the best experience.
```

### Input 3 — Modification Follow-Up

```
Add one more person, he will contribute 12k
```

**Output — Updated Plan:**

```
┌─────────────────────────────────────────────────────────────┐
│  Goa                                                        │
│  5-day budget trip to Goa for 3 traveler(s), estimated at   │
│  INR 27,200 and currently within budget.                    │
├─────────────────────────────────────────────────────────────┤
│  Your Budget          Trip Cost                             │
│  INR 32,000           INR 27,200  ✅ Within budget          │
│  (20k + 12k contribution)                                   │
└─────────────────────────────────────────────────────────────┘
```

### Input 4 — Clarification Flow

```
Plan a trip
```

**Output:**

```
Where would you like to go?
How many days?
What's your approximate budget?
```

---

## 📁 Project Structure

```
Pj_travels-main/
├── backend/
│   └── app/
│       ├── api/
│       │   └── routes/
│       │       └── trips.py              # REST + SSE endpoints
│       ├── agents/
│       │   ├── __init__.py
│       │   ├── _utils.py                 # truncate_context, summarize_previous_plan
│       │   ├── budget_agent.py           # Cost estimation agent
│       │   ├── finalizer.py              # Plan composition
│       │   ├── intent_agent.py           # Requirement extraction
│       │   ├── itinerary_agent.py        # Day-by-day scheduling
│       │   ├── orchestrator.py           # Request analysis & hint extraction
│       │   ├── research_agent.py         # Web research via Exa
│       │   └── validators.py             # Quality gates per agent
│       ├── core/
│       │   └── config.py                 # Settings (env vars)
│       ├── graph/
│       │   ├── builder.py                # LangGraph StateGraph construction
│       │   └── state.py                  # PlannerState TypedDict
│       ├── models/
│       │   └── schemas.py                # Pydantic models
│       ├── services/
│       │   ├── llm.py                    # GroqLLM with retry/backoff
│       │   ├── planner.py                # TravelPlannerService (stream + chat)
│       │   └── json_utils.py             # JSON extraction from LLM output
│       └── tools/
│           └── web_search.py             # Exa API integration
├── frontend/
│   └── src/
│       ├── api/
│       │   ├── client.ts                 # planTrip(), planTripStream()
│       │   └── mockData.ts               # Mock responses for dev
│       ├── components/
│       │   ├── AgentsContent.tsx         # Agent trace viewer
│       │   ├── BudgetContent.tsx         # Budget breakdown + over-budget warning
│       │   ├── ChatMessage.tsx           # Chat bubble with markdown rendering
│       │   ├── ChatPanel.tsx             # Chat interface
│       │   ├── Dashboard.tsx             # Tabbed dashboard + download/share
│       │   ├── HeroSection.tsx           # Landing hero
│       │   ├── ItineraryContent.tsx      # Day-by-day itinerary
│       │   ├── MarkdownText.tsx          # Lightweight markdown renderer
│       │   ├── NavBar.tsx                # Top navigation
│       │   ├── OverviewContent.tsx       # Trip overview with shimmer loading
│       │   ├── SidePanel.tsx             # Settings & history drawer
│       │   ├── TipsContent.tsx           # Travel tips
│       │   └── WorkflowBanner.tsx        # Agent progress indicator
│       ├── hooks/
│       │   └── useTravelPlanner.ts       # State management + SSE handling
│       ├── utils/
│       │   └── exportPlan.ts             # HTML/TXT generators + share helpers
│       ├── types.ts                      # TypeScript interfaces
│       ├── App.tsx                       # Root component
│       └── main.tsx                      # React entry point
├── tests/
│   ├── test_budget_fallback.py           # Budget zeros edge case
│   ├── test_followup_flows.py            # Streaming, chat, replan, over-budget
│   ├── test_json_utils.py                # JSON extraction
│   └── test_planner_api.py               # End-to-end plan endpoint
├── .env.example                          # Environment template
├── .gitignore                            # Git ignore rules
├── docker-compose.yml                    # Docker compose file
├── Dockerfile                            # Backend Docker image
├── LICENSE                               # MIT license
├── pyproject.toml                        # Python dependencies
└── README.md                             # This file
```

---

## 🧪 Running Tests

```bash
# All tests
pytest tests/ -v

# Specific test file
pytest tests/test_followup_flows.py -v

# With coverage
pytest tests/ --cov=app --cov-report=term-missing
```

**18 tests** covering: streaming SSE events, clarification flow, chat follow-ups (summary/question), modification replans, over-budget detection, JSON extraction, and budget edge cases.

---

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | ✅ | — | Groq API key for LLM inference |
| `EXA_KEY` | ✅ | — | Exa API key for web search |
| `GROQ_MODEL` | — | `llama-3.3-70b-versatile` | Model to use |
| `GROQ_BASE_URL` | — | `https://api.groq.com/openai/v1` | API base URL |
| `APP_ENV` | — | `development` | `development` or `production` |

### Per-Agent Retry Configuration

| Agent | Max Attempts | Base Backoff | Notes |
|-------|--------------|--------------|-------|
| Intent | 3 | 1.0s | Simple extraction, fewer retries needed |
| Research | 4 | 2.0s | Web-dependent, more retries for reliability |
| Itinerary | 4 | 1.5s | Complex generation, benefits from extra attempts |
| Budget | 3 | 1.0s | Straightforward calculation |

### Context Window Limits

| Context | Max Characters | Applied In |
|---------|----------------|------------|
| Normalized request | 2,000 | Intent agent prompt |
| Web context | 6,000 | Research agent prompt |
| Attractions/food lists | 1,500 | Itinerary agent prompt |
| Combined follow-up | 3,000 | Planner service |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite 6, Tailwind CSS, Framer Motion |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic |
| **Orchestration** | LangGraph (StateGraph, InMemorySaver, conditional edges) |
| **LLM** | Groq (llama-3.3-70b-versatile) via OpenAI-compatible SDK |
| **Web Search** | Exa AI (search + content fetch) |
| **Streaming** | Server-Sent Events (SSE) via FastAPI `StreamingResponse` |
| **Testing** | pytest, FastAPI `TestClient` |

---

## 📄 License

MIT

--- 

> **Note**: This README reflects the current state of the PJ Travels agentic travel planner system. For the most up-to-date information, please refer to the source code and inline documentation.
