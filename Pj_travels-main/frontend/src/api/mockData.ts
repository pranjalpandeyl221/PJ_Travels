import type { PlanResponse, Intent, Research, ItineraryDay, Budget, AgentTraces, FinalPlan } from '../types';

const intent: Intent = {
  destination: 'Gwalior',
  duration_days: 4,
  budget_currency: 'INR',
  budget_limit: 12000,
  origin: null,
  travelers: 2,
  travel_style: 'balanced',
  interests: ['heritage', 'forts', 'local food'],
  constraints: ['budget-conscious'],
  pacing: 'balanced',
  lodging_preference: 'budget hotel',
};

const research: Research = {
  destination: 'Gwalior',
  overview:
    'Gwalior is a historic city in Madhya Pradesh known for its hilltop fort, rich musical heritage, and blend of Mughal and Maratha architecture.',
  best_time_to_visit: 'October to March',
  expected_weather: 'Cool winters and warm summers. Best visited between Oct and Mar.',
  top_attractions: ['Gwalior Fort', 'Jai Vilas Palace', 'Sas Bahu Temple', 'Tomb of Mohammad Ghaus', 'Sun Temple'],
  food_highlights: ['bedai kachori', 'dal bafla', 'bhutte ka kees', 'gajak'],
  local_transport: ['auto-rickshaws', 'local buses', 'cycle rickshaws', 'app-based cabs'],
  travel_tips: ['Visit the fort early to avoid crowds', 'Try bedai at Sarafa Bazaar', 'Carry cash for smaller vendors'],
  cautions: ['Beware of touts at major monuments', 'Confirm auto fares before boarding'],
};

const itinerary: ItineraryDay[] = [
  {
    day: 1,
    title: 'Arrival and Gwalior Fort',
    morning: 'Arrive in Gwalior, check into budget hotel near railway station.',
    afternoon: 'Visit Gwalior Fort — explore Man Mandir Palace, Gujari Mahal, and the fort museum.',
    evening: 'Stroll through Sarafa Bazaar and try local street food.',
    meals: ['local breakfast', 'fort-side lunch', 'street food dinner'],
    estimated_local_cost: 1500,
    notes: ['Wear comfortable walking shoes for the fort.'],
  },
  {
    day: 2,
    title: 'Palaces and Temples',
    morning: 'Explore Jai Vilas Palace and its museum showcasing royal memorabilia.',
    afternoon: 'Visit Sas Bahu Temple and the nearby Teli Ka Mandir.',
    evening: 'Free time at City Centre or Phool Bagh.',
    meals: ['breakfast', 'thali lunch', 'light dinner'],
    estimated_local_cost: 1800,
    notes: ['Jai Vilas is closed on Mondays.'],
  },
  {
    day: 3,
    title: 'Cultural Immersion',
    morning: 'Visit the Tomb of Mohammad Ghaus and the Sun Temple.',
    afternoon: 'Explore local markets for handicrafts and souvenirs.',
    evening: 'Enjoy a sound-and-light show at Gwalior Fort (if available).',
    meals: ['bedai kachori', 'market snacks', 'dinner near fort'],
    estimated_local_cost: 1600,
    notes: ['Check show timings in advance.'],
  },
  {
    day: 4,
    title: 'Departure',
    morning: 'Visit Tansen Tomb and the nearby memorials.',
    afternoon: 'Last-minute shopping and check out.',
    evening: 'Head to railway station or bus stand for departure.',
    meals: ['breakfast', 'packed lunch'],
    estimated_local_cost: 1000,
    notes: ['Keep buffer time for station transfer.'],
  },
];

const budget: Budget = {
  currency: 'INR',
  transportation: 2000,
  accommodation: 4500,
  food: 3000,
  activities: 1500,
  local_transport: 500,
  contingency: 500,
  total_estimated_cost: 12000,
  within_budget: true,
  savings_tips: ['Use shared auto-rickshaws', 'Eat at local eateries instead of tourist spots', 'Book train tickets in advance'],
  assumptions: ['Budget is for two travelers on a budget trip', 'Accommodation at budget hotels or guesthouses'],
};

const finalPlan: FinalPlan = {
  executive_summary: '4-day balanced trip to Gwalior for 2 travelers, estimated at INR 12,000 and within budget.',
  destination_overview: research.overview,
  intent,
  research,
  itinerary,
  budget,
  travel_tips: [...research.travel_tips, ...budget.savings_tips],
  assumptions: budget.assumptions,
};

const agentTraces: AgentTraces = {
  orchestrator: {
    input: { user_request: '', session_id: 'mock' },
    output: { normalized_request: '', previous_plan: null },
  },
  intent_agent: { input: { normalized_request: '' }, output: intent },
  research_agent: { input: { intent }, output: research },
  itinerary_agent: { input: { intent, research }, output: { days: itinerary } },
  budget_agent: { input: { intent, itinerary: { days: itinerary } }, output: budget },
  finalizer: {
    input: { intent, research, itinerary: { days: itinerary }, budget },
    output: finalPlan,
  },
};

export function mockResponse(prompt: string): PlanResponse {
  const now = Date.now();
  return {
    session_id: `mock-${now}`,
    request: prompt,
    final_plan: finalPlan,
    agent_outputs: {
      intent_agent: intent,
      research_agent: research,
      itinerary_agent: { days: itinerary },
      budget_agent: budget,
    },
    agent_traces: agentTraces,
    questions: null,
  };
}
