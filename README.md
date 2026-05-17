# PJ Travels - Agentic Travel Planner

> A multi-agent AI travel planner that builds complete, research-backed itineraries from a single natural-language request. Powered by LangGraph, Groq LLMs, and Exa web search — with real-time streaming, chat follow-ups, and export to HTML/PDF/TXT.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Agent Pipeline](#agent-pipeline)
- [Screenshots](#screenshots)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Testing](#testing)
- [License](#license)
- [Acknowledgments](#acknowledgments)

## Overview

PJ Travels is an advanced AI-powered travel planning system that transforms simple natural language requests into comprehensive, research-backed travel itineraries. Unlike traditional travel planners that rely on static databases, PJ Travels uses live web search and multi-agent AI reasoning to provide up-to-date, personalized travel plans.

The system employs a sophisticated 5-agent pipeline where each agent specializes in a different aspect of travel planning, working together to create cohesive, validated itineraries that consider budget, preferences, and real-world constraints.

## Features

### Core Capabilities

- **Multi-Agent Pipeline**: 5 specialized agents (Intent → Research → Itinerary → Budget → Finalizer) orchestrated by LangGraph
- **Real-Time Streaming**: Server-Sent Events (SSE) stream each agent's output as it completes — no waiting for the full plan
- **Web-Backed Research**: Exa API searches the live web for real attractions, food, weather, and transport data
- **Chat Follow-Ups**: Ask questions, request summaries, or modify plans conversationally — context is preserved across turns
- **Validation Gates**: Each agent output is validated; failed outputs auto-retry up to 2 times with feedback
- **Per-Agent Retry + Backoff**: Exponential backoff with jitter per agent; rate-limit aware (parses `Retry-After` headers)
- **Context Window Management**: Automatic truncation of prompts at safe token limits to prevent overflow
- **Over-Budget Detection**: Budget agent flags when estimated cost exceeds user's limit; one-click replan
- **Multi-Format Export**: Download plans as **HTML** (styled page), **Plain Text**, or **JSON**
- **Share Anywhere**: Copy summary, share via Email, or send via WhatsApp with rich formatting
- **Instant Dashboard**: Skeleton loading with shimmer — tabs populate incrementally as agents complete
- **Agent Transparency**: Full input/output trace for every agent — see exactly what the LLM received and produced

### User Experience

- **Smart Clarification**: Missing critical details (destination, duration, budget, travelers) are caught upfront with targeted questions before the pipeline runs
- **Executive Summary**: Clear overview with destination, duration, budget status, and key metrics
- **Day-Wise Itinerary**: Detailed morning/afternoon/evening breakdown with real place names, meal suggestions, local costs, and practical notes per day
- **Interactive Q&A**: Chat interface that answers questions about your plan without rebuilding it
- **Budget Controls**: Real-time budget tracking with visual indicators and replanning capabilities
- **Export Options**: Multiple formats for different use cases (HTML for sharing, JSON for integration, TXT for simplicity)
- **Share Integration**: One-click sharing to WhatsApp, Email, or clipboard copying

## Architecture

### System Overview

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

## Screenshots

See the `screenshots/` folder for visual demonstrations:

### Loading & Initial State
| Skeleton Loading Screen | Initial Clarification |
|-------------------------|-----------------------|
| <img src="screenshots/skeleton%20loadig%20ui%20ux__.png" width="600" alt="Skeleton loading screen"> | <img src="screenshots/clarifying%20info%20about%20trip%20before%20planning.png" width="600" alt="Clarification"> |
| *Skeleton Loading* — Shimmer placeholders keep UI responsive | *Smart Clarification* — Targeted questions for missing info |

### Main Interface
| Trip Overview | Day-wise Itinerary |
|---------------|--------------------|
| <img src="screenshots/overview__.png" width="600" alt="Trip overview"> | <img src="screenshots/itenary.png" width="600" alt="Day-wise itinerary"> |
| *Executive Summary* — Key stats and travel style | *Detailed Planning* — Hour-by-hour schedule with locations |

### Interaction Features
| Q&A with Plan | Budget Replanning |
|---------------|-------------------|
| <img src="screenshots/qna-with%20plan.png" width="600" alt="Q&A with plan"> | <img src="screenshots/budget.png" width="600" alt="Budget replanning"> |
| *Conversational AI* — Ask questions about your plan | *Smart Budgeting* — One-click replan when over budget |

### Export & Sharing
| Download & Share Options |
|--------------------------|
| <img src="screenshots/downloading%20plans.png" width="800" alt="Download and share plan"> |
| *Multiple Formats* — HTML, JSON, TXT with sharing to WhatsApp/Email |

## Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18, TypeScript, Vite 6, Tailwind CSS, Framer Motion | User interface and interactions |
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic | API server and business logic |
| **Orchestration** | LangGraph (StateGraph, InMemorySaver, conditional edges) | Agent workflow management |
| **LLM** | Groq (llama-3.3-70b-versatile) via OpenAI-compatible SDK | Natural language processing |
| **Web Search** | Exa AI (search + content fetch) | Real-time travel information |
| **Streaming** | Server-Sent Events (SSE) via FastAPI `StreamingResponse` | Real-time updates to frontend |
| **Testing** | pytest, FastAPI `TestClient` | Unit and integration testing |
| **DevOps** | Docker, docker-compose | Containerization and deployment |

## Installation

### Prerequisites

Before you begin, ensure you have installed:
- [Python](https://www.python.org/downloads/) ≥ 3.11
- [Node.js](https://nodejs.org/) ≥ 18 (with npm)
- [Git](https://git-scm.com/downloads)

You'll also need API keys for:
- [Groq](https://console.groq.com/keys) (for LLM inference)
- [Exa AI](https://dashboard.exa.ai/) (for web search)

### Step-by-Step Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/pranjalpandeyl221/PJ_Travels.git
cd PJ_Travels
```

#### 2. Backend Setup
```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

# Install Python dependencies
pip install -e ".[dev]"

# Configure environment variables
copy .env.example .env  # Windows
# cp .env.example .env  # macOS/Linux
```

Edit `.env` with your actual API keys:
```env
GROQ_API_KEY=gsk_your_actual_groq_key_here
GROQ_MODEL=llama-3.3-70b-versatile
EXA_KEY=your_actual_exa_key_here
APP_ENV=development
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
```

#### 4. Run the Application

**Terminal 1 - Start Backend:**
```bash
cd backend
uvicorn app.main:app --reload --port 8002
```
The backend will be available at `http://localhost:8002`

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```
The frontend will be available at `http://localhost:5173`

Open your browser and navigate to `http://localhost:5173` to use the application.

## Configuration

### Environment Variables

The application uses environment variables for configuration. Copy `.env.example` to `.env` and modify the values:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GROQ_API_KEY` | ✅ | — | Groq API key for LLM inference |
| `EXA_KEY` | ✅ | — | Exa API key for web search |
| `GROQ_MODEL` | — | `llama-3.3-70b-versatile` | LLM model to use |
| `GROQ_BASE_URL` | — | `https://api.groq.com/openai/v1` | Groq API base URL |
| `APP_ENV` | — | `development` | Application environment (`development` or `production`) |

### Per-Agent Retry Configuration

Each agent in the pipeline has configurable retry behavior:

| Agent | Max Attempts | Base Backoff | Notes |
|-------|--------------|--------------|-------|
| Intent | 3 | 1.0s | Simple extraction, fewer retries needed |
| Research | 4 | 2.0s | Web-dependent, more retries for reliability |
| Itinerary | 4 | 1.5s | Complex generation, benefits from extra attempts |
| Budget | 3 | 1.0s | Straightforward calculation |
| Finalizer | 2 | 1.0s | Simple composition task |

### Context Window Limits

To prevent token overflow and manage costs:

| Context | Max Characters | Applied In |
|---------|----------------|------------|
| Normalized request | 2,000 | Intent agent prompt |
| Web context | 6,000 | Research agent prompt |
| Attractions/food lists | 1,500 | Itinerary agent prompt |
| Combined follow-up | 3,000 | Planner service |

## Usage

### Planning a Trip

1. Open the application at `http://localhost:5173`
2. Enter your travel request in natural language, for example:
   - "Plan a 5-day budget trip to Goa under 20000 INR for 2 people"
   - "I want a luxury weekend in Paris for couples under 50000 INR"
   - "Plan a 10-day family trip to Japan with kids"
3. The system will ask clarifying questions if any critical information is missing
4. Watch as each agent processes your request in real-time via the streaming interface
5. Review the generated itinerary, budget, and recommendations
6. Use the chat feature to ask follow-up questions or request modifications
7. Export your plan in your preferred format or share it directly

### Example Requests

#### Simple Request
```
Plan a 5-day budget trip to Goa under 20000 INR for 2 people
```

#### Detailed Request
```
Plan a 7-day cultural trip to Kyoto for 4 people with a budget of 150000 INR, 
focusing on temples, traditional cuisine, and avoiding crowded tourist spots
```

#### Follow-Up Questions
After receiving your plan, you can ask:
- "What are the best restaurants for vegetarian food?"
- "Can you suggest alternatives if it rains?"
- "How much would it cost to upgrade to 4-star hotels?"
- "Summarize the daily transportation costs"

#### Plan Modifications
You can also request changes:
- "Add one more person who will contribute 15000 INR"
- "Change the dates to next month"
- "Make it more adventure-focused"
- "Reduce the budget by 20%"

## API Reference

### Plan a Trip (Blocking Endpoint)

```http
POST /api/v1/trips/plan
Content-Type: application/json

{
  "user_request": "Plan a 5-day budget trip to Goa under 20000 INR for 2 people"
}
```

Response:
```json
{
  "trip_summary": "Goa 5-day trip for 2 people...",
  "agents": {
    "intent": { /* Intent agent output */ },
    "research": { /* Research agent output */ },
    "itinerary": { /* Itinerary agent output */ },
    "budget": { /* Budget agent output */ },
    "finalizer": { /* Finalizer agent output */ }
  },
  "travel_plan": { /* Complete travel plan */ }
}
```

### Plan a Trip (Streaming Endpoint)

```http
POST /api/v1/trips/plan/stream
Content-Type: application/json

{
  "user_request": "Plan a 5-day budget trip to Goa under 20000 INR for 2 people"
}
```

Returns: `text/event-stream` with Server-Sent Events:

| Event Type | Description |
|------------|-------------|
| `session` | Session initialized with request details |
| `intent` | Intent agent output (destination, dates, budget, etc.) |
| `research` | Research findings from web search |
| `itinerary` | Day-by-day itinerary plan |
| `budget` | Cost breakdown and budget analysis |
| `complete` | Final assembled travel plan |
| `questions` | Clarification questions if info is missing |
| `chat_reply` | Response to follow-up questions |
| `error` | Error message if something went wrong |

### Follow-Up (Chat)

```http
POST /api/v1/trips/plan
Content-Type: application/json

{
  "user_request": "Summarize the trip for me",
  "session_id": "abc-123-def"
}
```

## Project Structure

```
Pj_travels-main/
├── backend/                    # Python/FastAPI backend
│   └── app/
│       ├── api/               # API endpoints
│       │   └── routes/
│       │       └── trips.py   # Trip planning endpoints (REST + SSE)
│       ├── agents/            # Specialized AI agents
│       │   ├── __init__.py
│       │   ├── _utils.py      # Helper functions (context truncation, summarization)
│       │   ├── budget_agent.py    # Cost estimation and validation
│       │   ├── finalizer.py       # Plan composition and finalization
│       │   ├── intent_agent.py    # Requirement extraction from natural language
│       │   ├── itinerary_agent.py # Day-by-day scheduling
│       │   ├── orchestrator.py    # Initial request analysis
│       │   ├── research_agent.py  # Web research via Exa API
│       │   └── validators.py      # Quality gates for each agent's output
│       ├── core/              # Core configuration
│       │   └── config.py      # Settings management (environment variables)
│       ├── graph/             # LangGraph workflow
│       │   ├── builder.py     # StateGraph construction
│       │   └── state.py       # PlannerState definition (TypedDict)
│       ├── models/            # Pydantic models
│       │   └── schemas.py     # Request/response schemas
│       ├── services/          # Business logic services
│       │   ├── llm.py         # Groq LLM wrapper with retry/backoff
│       │   ├── planner.py     # Main TravelPlannerService
│       │   └── json_utils.py  # JSON extraction from LLM responses
│       └── tools/             # External service integrations
│           └── web_search.py  # Exa API wrapper
├── frontend/                  # React/Vite frontend
│   ├── public/                # Static assets
│   ├── src/                   # Source code
│   │   ├── api/               # API service layer
│   │   │   ├── client.ts      # API client (planTrip, planTripStream)
│   │   │   └── mockData.ts    # Mock responses for development
│   │   ├── components/        # Reusable UI components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils/               # Utility functions
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── App.tsx              # Root React component
│   │   └── main.tsx             # React entry point
├── screenshots/               # UI demonstration images
├── tests/                     # Test suite
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── docker-compose.yml         # Docker Compose configuration
├── Dockerfile                 # Backend Docker image
├── LICENSE                    # MIT license
├── pyproject.toml             # Python dependencies and project metadata
└── README.md                  # This file
```

## Testing

### Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_followup_flows.py -v

# Run tests with coverage
pytest tests/ --cov=app --cov-report=term-missing
```

### Test Coverage

The test suite includes 18 tests covering:
- Streaming Server-Sent Events functionality
- Clarification flow for missing information
- Chat follow-ups (summaries, questions, modifications)
- Budget replanning when over budget
- Over-budget detection and warnings
- JSON extraction from LLM output
- Edge cases (zero budget, invalid inputs)
- Agent validation and retry mechanisms

### Testing Strategy

- **Unit Tests**: Individual agent functions and utilities
- **Integration Tests**: API endpoints and agent interactions
- **End-to-End Tests**: Complete trip planning flows
- **Mocking**: External APIs (Groq, Exa) are mocked for reliable testing

## Deployment

### Docker Deployment

The application can be deployed using Docker Compose:

```bash
# Build and start all services
docker-compose up --build

# Start in detached mode
docker-compose up -d

# Stop and remove containers
docker-compose down
```

### Manual Deployment

For production deployment:

1. **Backend**:
   - Use a production WSGI server (Gunicorn, uWSGI) instead of uvicorn's development server
   - Set `APP_ENV=production` in environment variables
   - Consider using a reverse proxy (NGINX) for SSL termination

2. **Frontend**:
   - Build for production: `npm run build`
   - Serve the built assets with a static file server (NGINX, Apache, etc.)

3. **Environment**:
   - Ensure all required environment variables are set
   - Use secure methods for storing API keys (secret managers, etc.)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [LangGraph](https://langchain-ai.github.io/langgraph/) - For powerful agent orchestration capabilities
- [Groq](https://groq.com/) - For providing fast LLM inference that enables real-time streaming
- [Exa AI](https://exa.ai/) - For high-quality web search that powers the research capabilities
- [React](https://reactjs.org/), [Vite](https://vitejs.dev/), and [Tailwind CSS](https://tailwindcss.com/) - For the modern, responsive user interface
- [FastAPI](https://fastapi.tiangolo.com/) - For the high-performance Python API framework
- [pytest](https://docs.pytest.org/) - For the comprehensive testing framework

## Support

For questions, issues, or contributions:
1. Check the existing documentation in this README
2. Review the code comments for implementation details
3. Submit issues or pull requests on the GitHub repository

Enjoy planning your perfect trip with AI-powered intelligence!
