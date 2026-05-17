# PJ Travels - Agentic Travel Planner

A multi-agent AI travel planner that builds complete, research-backed itineraries from a single natural-language request.

## ✨ Features

- **Multi-Agent Pipeline**: 5 specialized agents (Intent → Research → Itinerary → Budget → Finalizer) orchestrated by LangGraph
- **Real-Time Streaming**: Server-Sent Events (SSE) stream each agent's output as it completes
- **Web-Backed Research**: Exa API searches the live web for real attractions, food, weather, and transport data
- **Chat Follow-Ups**: Ask questions, request summaries, or modify plans conversationally
- **Validation Gates**: Each agent output is validated; failed outputs auto-retry up to 2 times with feedback
- **Over-Budget Detection**: Budget agent flags when estimated cost exceeds user's limit
- **Multi-Format Export**: Download plans as HTML, Plain Text, or JSON
- **Share Anywhere**: Copy summary, share via Email, or send via WhatsApp
- **Agent Transparency**: Full input/output trace for every agent

## 📸 Screenshots

See the `screenshots/` folder for UI demonstrations including:
- Skeleton loading screens
- Trip overview and day-wise itinerary
- Q&A with plan functionality
- Budget replanning when costs exceed limits
- Export and share options

## 🏗️ Architecture

The project consists of:
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: FastAPI with LangGraph for agent orchestration
- **Agents**: 5 specialized agents for intent, research, itinerary, budget, and finalization
- **LLM**: Groq (llama-3.3-70b-versatile)
- **Web Search**: Exa API
- **Streaming**: Server-Sent Events (SSE)

## 🚀 Quick Start

### Prerequisites
- Python ≥ 3.11
- Node.js ≥ 18
- Groq API Key
- Exa API Key

### Setup

1. **Clone & Install**
```bash
git clone <repository-url>
cd Pj_travels-main
```

2. **Backend Setup**
```bash
# Create virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -e ".[dev]"

# Configure environment
copy .env.example .env  # Windows
# cp .env.example .env  # macOS/Linux
```

Edit `.env` with your API keys:
```env
GROQ_API_KEY=gsk_your_groq_key_here
GROQ_MODEL=llama-3.3-70b-versatile
EXA_KEY=your_exa_key_here
APP_ENV=development
```

3. **Frontend Setup**
```bash
cd frontend
npm install
```

4. **Run**
```bash
# Terminal 1 - Backend
cd backend
uvicorn app.main:app --reload --port 8002

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

## 📁 Project Structure

```
Pj_travels-main/
├── backend/
│   └── app/
│       ├── api/
│       │   └── routes/
│       │       └── trips.py
│       ├── agents/
│       │   ├── __init__.py
│       │   ├── _utils.py
│       │   ├── budget_agent.py
│       │   ├── finalizer.py
│       │   ├── intent_agent.py
│       │   ├── itinerary_agent.py
│       │   ├── orchestrator.py
│       │   ├── research_agent.py
│       │   └── validators.py
│       ├── core/
│       │   └── config.py
│       ├── graph/
│       │   ├── builder.py
│       │   └── state.py
│       ├── models/
│       │   └── schemas.py
│       ├── services/
│       │   ├── llm.py
│       │   ├── planner.py
│       │   └── json_utils.py
│       └── tools/
│           └── web_search.py
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
├── screenshots/
├── tests/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── Dockerfile
├── pyproject.toml
└── README.md
```

## 🔧 Configuration

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ | Groq API key for LLM inference |
| `EXA_KEY` | ✅ | Exa API key for web search |
| `GROQ_MODEL` | — | LLM model (default: llama-3.3-70b-versatile) |
| `APP_ENV` | — | Environment (development/production) |

## 📄 License

MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [LangGraph](https://langchain-ai.github.io/langgraph/) for agent orchestration
- Powered by [Groq](https://groq.com/) for fast LLM inference
- Web search via [Exa AI](https://exa.ai/)
- UI built with [React](https://reactjs.org/), [Vite](https://vitejs.dev/), and [Tailwind CSS](https://tailwindcss.com/)