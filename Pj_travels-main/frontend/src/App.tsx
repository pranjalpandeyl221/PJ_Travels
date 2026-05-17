import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavBar from './components/NavBar';
import HeroSection from './components/HeroSection';
import ChatPanel from './components/ChatPanel';
import WorkflowBanner from './components/WorkflowBanner';
import Dashboard from './components/Dashboard';
import SidePanel from './components/SidePanel';
import FooterQuote from './components/FooterQuote';
import { useTravelPlanner } from './hooks/useTravelPlanner';
import type { PlanResponse, FinalPlan, AgentOutputs, AgentTraces } from './types';

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-border rounded-xl p-5 card-shadow mb-4">
        <div className="shimmer h-6 w-3/4" />
      </div>
      <div className="flex gap-2 mb-5">
        {['Overview', 'Itinerary', 'Budget', 'Tips', 'Agents'].map((t) => (
          <div key={t} className="shimmer h-9 w-20 rounded-lg" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="bg-white border border-border rounded-xl p-5 card-shadow">
          <div className="shimmer h-4 w-1/3 mb-3" />
          <div className="shimmer h-3 w-full mb-2" />
          <div className="shimmer h-3 w-5/6" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-border rounded-xl p-4 card-shadow">
            <div className="shimmer h-3 w-16 mb-2" />
            <div className="shimmer h-4 w-24" />
          </div>
          <div className="bg-white border border-border rounded-xl p-4 card-shadow">
            <div className="shimmer h-3 w-16 mb-2" />
            <div className="shimmer h-4 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const {
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
  } = useTravelPlanner();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastResponse, setLastResponse] = useState<PlanResponse | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg.type === 'plan') {
      const resp = lastMsg.content as PlanResponse;
      setLastResponse(resp.final_plan ? resp : null);
    }
  }, [messages]);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (planning && lastMsg?.role === 'user') {
      setShowDashboard(true);
    } else if (!planning && lastMsg?.type === 'text' && !lastResponse) {
      setShowDashboard(false);
    }
  }, [planning, messages, lastResponse]);

  const handleClear = () => {
    clearConversation();
    setLastResponse(null);
    setShowDashboard(false);
  };

  // Build a visible PlanResponse from either the final response or streaming partial data
  const visibleResponse: PlanResponse | null = (() => {
    if (lastResponse) return lastResponse;
    if (streamingPlan && streamingPlan.final_plan && Object.keys(streamingPlan.final_plan).length > 0) {
      return {
        session_id: streamingPlan.session_id,
        request: streamingPlan.request,
        final_plan: streamingPlan.final_plan as unknown as FinalPlan,
        agent_outputs: streamingPlan.agent_outputs as unknown as AgentOutputs,
        agent_traces: streamingPlan.agent_traces as unknown as AgentTraces,
        questions: streamingPlan.questions,
      };
    }
    return null;
  })();

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar
        useMock={useMock}
        onToggleMock={() => setUseMock((p) => !p)}
        onClear={handleClear}
      />

      <main className="flex-1">
        <HeroSection />

        <AnimatePresence>
          {planning && <WorkflowBanner currentStep={currentStep} />}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="px-6 pb-8"
        >
          <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-6 items-start">
            <motion.div
              layout
              className={`${
                showDashboard
                  ? 'w-full lg:w-[340px] xl:w-[380px]'
                  : 'w-full max-w-2xl mx-auto'
              } flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]`}
            >
              <div
                className={`${
                  showDashboard
                    ? 'bg-white/70 border border-border rounded-2xl p-4 card-shadow'
                    : ''
                }`}
                style={
                  showDashboard
                    ? { height: 'calc(100vh - 280px)', minHeight: 500 }
                    : {}
                }
              >
                <ChatPanel
                  messages={messages}
                  planning={planning}
                  onSend={sendPrompt}
                />
              </div>
            </motion.div>

            <AnimatePresence>
              {showDashboard && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 min-w-0 w-full"
                >
                  {visibleResponse ? (
                    <Dashboard response={visibleResponse} onSave={saveTrip} onReplan={sendPrompt} />
                  ) : (
                    <DashboardSkeleton />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>

      <FooterQuote />

      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-warm-dark text-white shadow-lg flex items-center justify-center text-sm hover:bg-warm-dark/90 transition-colors z-30"
        title="Settings & History"
      >
        &#9881;
      </button>

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .shimmer {
          background: linear-gradient(90deg, #f0ebe4 25%, #e8e0d6 50%, #f0ebe4 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          border-radius: 0.5rem;
        }
      `}</style>

      <SidePanel
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        savedTrips={savedTrips}
        messages={messages}
      />
    </div>
  );
}
