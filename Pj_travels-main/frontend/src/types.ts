export interface Intent {
  destination: string;
  duration_days: number;
  budget_currency: string;
  budget_limit: number;
  origin: string | null;
  travelers: number;
  travel_style: string;
  interests: string[];
  constraints: string[];
  pacing: string;
  lodging_preference: string;
}

export interface Research {
  destination: string;
  overview: string;
  best_time_to_visit: string;
  expected_weather: string;
  top_attractions: string[];
  food_highlights: string[];
  local_transport: string[];
  travel_tips: string[];
  cautions: string[];
}

export interface ItineraryDay {
  day: number;
  title: string;
  morning: string;
  afternoon: string;
  evening: string;
  meals: string[];
  estimated_local_cost: number;
  notes: string[];
}

export interface Budget {
  currency: string;
  transportation: number;
  accommodation: number;
  food: number;
  activities: number;
  local_transport: number;
  contingency: number;
  total_estimated_cost: number;
  within_budget: boolean;
  savings_tips: string[];
  assumptions: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

export interface AgentTrace {
  input: Json;
  output: Json;
}

export interface AgentTraces {
  orchestrator: AgentTrace;
  intent_agent: AgentTrace;
  research_agent: AgentTrace;
  itinerary_agent: AgentTrace;
  budget_agent: AgentTrace;
  finalizer: AgentTrace;
}

export interface FinalPlan {
  executive_summary: string;
  destination_overview: string;
  intent: Intent;
  research: Research;
  itinerary: ItineraryDay[];
  budget: Budget;
  travel_tips: string[];
  assumptions: string[];
}

export interface AgentOutputs {
  intent_agent: Intent;
  research_agent: Research;
  itinerary_agent: { days: ItineraryDay[] };
  budget_agent: Budget;
}

export interface PlanResponse {
  session_id: string;
  request: string;
  final_plan: FinalPlan | null;
  agent_outputs: AgentOutputs;
  agent_traces: AgentTraces;
  questions: string[] | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  type: 'text' | 'plan';
  content: string | PlanResponse;
  timestamp: number;
}

export interface AgentStep {
  key: string;
  label: string;
  description: string;
}

export type TabId = 'overview' | 'itinerary' | 'budget' | 'tips' | 'agents';

export type StreamEventType = 'session' | 'intent' | 'research' | 'itinerary' | 'budget' | 'complete' | 'questions' | 'chat_reply' | 'error';

export interface StreamEvent {
  type: StreamEventType;
  session_id?: string;
  request?: string;
  data?: unknown;
}
