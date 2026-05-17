import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentTraces } from '../types';
import { AGENT_STEPS } from '../hooks/useTravelPlanner';

interface Props {
  traces: AgentTraces;
}

export default function AgentsContent({ traces }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  const toggle = (key: string) => setOpen((prev) => (prev === key ? null : key));

  return (
    <div className="space-y-2">
      {AGENT_STEPS.map((step, i) => {
        const trace = traces[step.key as keyof AgentTraces];
        if (!trace) return null;
        const isOpen = open === step.key;

        return (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-border rounded-xl overflow-hidden card-shadow"
          >
            <button
              onClick={() => toggle(step.key)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-cream/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full orange-gradient flex items-center justify-center text-white text-[10px] font-bold">
                  {i + 1}
                </span>
                <div>
                  <span className="text-sm font-semibold text-warm-dark">{step.label}</span>
                  <p className="text-xs text-warm-mute mt-0.5">{step.description}</p>
                </div>
              </div>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-warm-mute text-sm"
              >
                &#9660;
              </motion.span>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-border/50 px-5 py-4 space-y-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-orange">
                        Input
                      </span>
                      <pre className="mt-1.5 text-xs text-warm-body bg-cream/50 rounded-lg p-3 overflow-x-auto max-h-60 overflow-y-auto font-mono">
                        {JSON.stringify(trace.input, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-orange">
                        Output
                      </span>
                      <pre className="mt-1.5 text-xs text-warm-body bg-cream/50 rounded-lg p-3 overflow-x-auto max-h-60 overflow-y-auto font-mono">
                        {JSON.stringify(trace.output, null, 2)}
                      </pre>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
