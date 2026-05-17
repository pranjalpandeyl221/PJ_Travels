import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PlanResponse, TabId } from '../types';
import OverviewContent from './OverviewContent';
import ItineraryContent from './ItineraryContent';
import BudgetContent from './BudgetContent';
import TipsContent from './TipsContent';
import AgentsContent from './AgentsContent';
import { generateTripHTML, generateTripTXT, generateRichPlan, generateShareWhatsApp, generateShareMailTo } from '../utils/exportPlan';

interface Props {
  response: PlanResponse;
  onSave: (destination: string) => void;
  onReplan?: (prompt: string) => void;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'itinerary', label: 'Itinerary' },
  { id: 'budget', label: 'Budget' },
  { id: 'tips', label: 'Tips' },
  { id: 'agents', label: 'Agents' },
];

function TabSkeleton({ label }: { label: string }) {
  return (
    <div className="bg-white border border-border rounded-xl p-5 card-shadow">
      <div className="shimmer h-4 w-1/2 mb-3" />
      <div className="shimmer h-3 w-full mb-2" />
      <div className="shimmer h-3 w-3/4" />
      <p className="text-xs text-warm-mute italic mt-4">Generating {label}...</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dropdown component (reused for Download & Share)
// ---------------------------------------------------------------------------

function DropdownMenu({ label, items, onItemClick }: {
  label: string;
  items: { key: string; label: string }[];
  onItemClick: (key: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="px-4 py-2 text-sm font-medium bg-warm-dark text-white rounded-lg hover:bg-warm-dark/90 transition-colors flex items-center gap-1.5"
      >
        {label}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1 left-0 bg-white border border-border rounded-xl shadow-lg overflow-hidden z-20 min-w-[160px]"
          >
            {items.map((item) => (
              <button
                key={item.key}
                onClick={() => { setOpen(false); onItemClick(item.key); }}
                className="block w-full text-left px-4 py-2.5 text-sm text-warm-body hover:bg-cream transition-colors"
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function Dashboard({ response, onSave, onReplan }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const plan = response.final_plan;
  const intent = (plan as unknown as Record<string, unknown>)?.intent as Record<string, unknown> | undefined;
  const budgetLimit = intent?.budget_limit as number | undefined;

  const handleSave = useCallback(() => {
    const dest = (plan?.intent as { destination?: string })?.destination || 'Saved trip';
    onSave(dest);
  }, [plan, onSave]);

  // ---- Download handlers ----
  const downloadJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'travel-plan.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [response]);

  const downloadHTML = useCallback(() => {
    const html = generateTripHTML(response);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'travel-plan.html';
    a.click();
    URL.revokeObjectURL(url);
  }, [response]);

  const downloadTXT = useCallback(() => {
    const txt = generateTripTXT(response);
    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'travel-plan.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [response]);

  const downloadItems = [
    { key: 'json', label: 'JSON' },
    { key: 'html', label: 'HTML Page' },
    { key: 'txt', label: 'Plain Text' },
  ];
  const onDownload = useCallback((key: string) => {
    if (key === 'json') downloadJSON();
    else if (key === 'html') downloadHTML();
    else if (key === 'txt') downloadTXT();
  }, [downloadJSON, downloadHTML, downloadTXT]);

  // ---- Share handlers ----
  const shareCopy = useCallback(async () => {
    const text = generateRichPlan(response);
    try { await navigator.clipboard.writeText(text); } catch { /* fallback */ }
  }, [response]);

  const shareEmail = useCallback(() => {
    window.open(generateShareMailTo(response), '_blank');
  }, [response]);

  const shareWhatsApp = useCallback(() => {
    window.open(generateShareWhatsApp(response), '_blank');
  }, [response]);

  const shareItems = [
    { key: 'copy', label: 'Copy Summary' },
    { key: 'email', label: 'Email' },
    { key: 'whatsapp', label: 'WhatsApp' },
  ];
  const onShare = useCallback((key: string) => {
    if (key === 'copy') shareCopy();
    else if (key === 'email') shareEmail();
    else if (key === 'whatsapp') shareWhatsApp();
  }, [shareCopy, shareEmail, shareWhatsApp]);

  // ---- Render tab ----
  const renderTab = () => {
    switch (activeTab) {
      case 'overview':
        if (!plan?.intent && !plan?.research) return <TabSkeleton label="overview" />;
        return <OverviewContent plan={plan as unknown as Record<string, unknown>} />;
      case 'itinerary': {
        const days = (plan as unknown as Record<string, unknown>)?.itinerary as unknown[];
        if (!days || days.length === 0) return <TabSkeleton label="itinerary" />;
        return <ItineraryContent days={days as import('../types').ItineraryDay[]} />;
      }
      case 'budget': {
        const budget = (plan as unknown as Record<string, unknown>)?.budget as Record<string, unknown>;
        if (!budget || (budget.total_estimated_cost as number) === undefined) return <TabSkeleton label="budget" />;
        return (
          <BudgetContent
            budget={budget as unknown as import('../types').Budget}
            budgetLimit={budgetLimit}
            onReplan={onReplan}
          />
        );
      }
      case 'tips': {
        const tips = (plan as unknown as Record<string, unknown>)?.travel_tips as string[];
        if (!tips || tips.length === 0) return <TabSkeleton label="tips" />;
        return <TipsContent tips={tips} />;
      }
      case 'agents': {
        const traces = response.agent_traces as unknown as Record<string, unknown>;
        if (!traces || Object.keys(traces).length === 0) return <TabSkeleton label="agents" />;
        return <AgentsContent traces={traces as unknown as import('../types').AgentTraces} />;
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="bg-white border border-border rounded-xl p-5 card-shadow mb-4">
        <p className="font-display text-lg text-warm-dark text-balance">
          {(plan as unknown as Record<string, unknown>)?.executive_summary as string || 'Travel plan being generated...'}
        </p>
      </div>

      <div className="flex items-center gap-2 mb-5 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-warm-dark text-white'
                : 'text-warm-body hover:text-warm-dark hover:bg-white/60 border border-transparent'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute inset-0 bg-warm-dark rounded-lg -z-10"
              />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {renderTab()}
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border flex-wrap">
        <DropdownMenu label="Download" items={downloadItems} onItemClick={onDownload} />
        <DropdownMenu label="Share" items={shareItems} onItemClick={onShare} />
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium border border-border text-warm-body rounded-lg hover:bg-cream transition-colors"
        >
          Save Trip
        </button>
      </div>

      <style>{`
        .shimmer {
          background: linear-gradient(90deg, #f0ebe4 25%, #e8e0d6 50%, #f0ebe4 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          border-radius: 0.5rem;
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </motion.div>
  );
}
