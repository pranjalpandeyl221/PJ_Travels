import { useState, useCallback, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import type { Message, PlanResponse, AgentStep, Budget, Intent, Research, StreamEvent } from '../types';
import { planTripStream } from '../api/client';

export const AGENT_STEPS: AgentStep[] = [
  { key: 'orchestrator', label: 'Orchestrator', description: 'Coordinating the multi-agent workflow' },
  { key: 'intent_agent', label: 'Intent', description: 'Extracting destination, duration, budget, travelers, and preferences' },
  { key: 'research_agent', label: 'Research', description: 'Finding attractions, expected weather, best season, and local context' },
  { key: 'itinerary_agent', label: 'Itinerary', description: 'Creating a day-wise schedule from the research output' },
  { key: 'budget_agent', label: 'Budget', description: 'Estimating travel, stay, food, activity, and contingency costs' },
  { key: 'finalizer', label: 'Finalizer', description: 'Composing the complete structured travel plan' },
];

interface PartialPlanResponse {
  session_id: string;
  request: string;
  final_plan: Record<string, unknown> | null;
  agent_outputs: Record<string, unknown>;
  agent_traces: Record<string, unknown>;
  questions: string[] | null;
}

function buildInitialPartial(): PartialPlanResponse {
  return {
    session_id: '',
    request: '',
    final_plan: null,
    agent_outputs: {},
    agent_traces: {},
    questions: null,
  };
}

function applyEvent(prev: PartialPlanResponse, event: StreamEvent): PartialPlanResponse {
  switch (event.type) {
    case 'session':
      return { ...prev, session_id: event.session_id || '', request: event.request || '' };

    case 'intent': {
      const intent = event.data as Intent;
      return {
        ...prev,
        agent_outputs: { ...prev.agent_outputs, intent_agent: intent },
        final_plan: {
          ...(prev.final_plan || {}),
          intent,
        },
      };
    }

    case 'research': {
      const research = event.data as Research;
      return {
        ...prev,
        agent_outputs: { ...prev.agent_outputs, research_agent: research },
        final_plan: {
          ...(prev.final_plan || {}),
          research,
          destination_overview: research.overview,
        },
      };
    }

    case 'itinerary': {
      const itineraryData = event.data as { days: unknown[] };
      return {
        ...prev,
        agent_outputs: { ...prev.agent_outputs, itinerary_agent: itineraryData },
        final_plan: {
          ...(prev.final_plan || {}),
          itinerary: itineraryData.days,
        },
      };
    }

    case 'budget': {
      const budget = event.data as Budget;
      return {
        ...prev,
        agent_outputs: { ...prev.agent_outputs, budget_agent: budget },
        final_plan: {
          ...(prev.final_plan || {}),
          budget,
        },
      };
    }

    case 'questions':
      return { ...prev, questions: event.data as string[] };

    default:
      return prev;
  }
}

export function useTravelPlanner() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [savedTrips, setSavedTrips] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [planning, setPlanning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [useMock, setUseMock] = useState(false);
  const [streamingPlan, setStreamingPlan] = useState<PartialPlanResponse | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setSessionId(undefined);
    setCurrentStep(0);
    setStreamingPlan(null);
  }, []);

  const saveTrip = useCallback(
    (destination: string) => {
      setSavedTrips((prev) => [destination, ...prev]);
    },
    []
  );

  const sendPrompt = useCallback(
    async (prompt: string) => {
      const userMsg: Message = {
        id: uuid(),
        role: 'user',
        type: 'text',
        content: prompt,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setPlanning(true);
      setCurrentStep(1);
      setStreamingPlan(buildInitialPartial());

      try {
        await planTripStream(
          prompt,
          (event) => {
            switch (event.type) {
              case 'session':
                setSessionId(event.session_id);
                setStreamingPlan((prev) => applyEvent(prev || buildInitialPartial(), event));
                break;

              case 'intent':
                setCurrentStep(2);
                setStreamingPlan((prev) => applyEvent(prev || buildInitialPartial(), event));
                break;

              case 'research':
                setCurrentStep(3);
                setStreamingPlan((prev) => applyEvent(prev || buildInitialPartial(), event));
                break;

              case 'itinerary':
                setCurrentStep(4);
                setStreamingPlan((prev) => applyEvent(prev || buildInitialPartial(), event));
                break;

              case 'budget':
                setCurrentStep(5);
                setStreamingPlan((prev) => applyEvent(prev || buildInitialPartial(), event));
                break;

              case 'complete': {
                const data = event.data as PlanResponse;
                setStreamingPlan(null);
                const assistantMsg: Message = {
                  id: uuid(),
                  role: 'assistant',
                  type: 'plan',
                  content: data,
                  timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, assistantMsg]);
                break;
              }

              case 'chat_reply': {
                const reply = event.data as string;
                if (event.session_id) setSessionId(event.session_id);
                setStreamingPlan(null);
                const replyMsg: Message = {
                  id: uuid(),
                  role: 'assistant',
                  type: 'text',
                  content: reply,
                  timestamp: Date.now(),
                };
                setMessages((prev) => [...prev, replyMsg]);
                break;
              }

              case 'questions': {
                const questions = event.data as string[];
                if (event.session_id) setSessionId(event.session_id);
                setStreamingPlan(null);
                for (const q of questions) {
                  const qMsg: Message = {
                    id: uuid(),
                    role: 'assistant',
                    type: 'text',
                    content: q,
                    timestamp: Date.now(),
                  };
                  setMessages((prev) => [...prev, qMsg]);
                }
                break;
              }

              case 'error':
                throw new Error(event.data as string);
            }
          },
          sessionId,
          useMock,
        );
      } catch (err) {
        if (!useMock || err instanceof Error) {
          const errorMsg: Message = {
            id: uuid(),
            role: 'assistant',
            type: 'text',
            content: err instanceof Error ? err.message : 'Failed to generate travel plan.',
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMsg]);
        }
      } finally {
        setPlanning(false);
        setCurrentStep(0);
        setStreamingPlan(null);
      }
    },
    [sessionId, useMock]
  );

  return {
    messages,
    savedTrips,
    planning,
    currentStep,
    useMock,
    setUseMock,
    streamingPlan,
    sendPrompt,
    clearConversation,
    saveTrip,
  };
}
