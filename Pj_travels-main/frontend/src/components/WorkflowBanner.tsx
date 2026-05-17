import { motion } from 'framer-motion';
import { AGENT_STEPS } from '../hooks/useTravelPlanner';

interface Props {
  currentStep: number;
}

export default function WorkflowBanner({ currentStep }: Props) {
  const total = AGENT_STEPS.length;
  const progress = currentStep / total;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden"
    >
      <div className="px-6 py-5">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-warm-dark">Planning your journey</span>
            <span className="text-xs font-mono text-warm-mute">
              Step {currentStep} of {total}
            </span>
          </div>

          <div className="h-2.5 bg-peach/60 rounded-full overflow-hidden">
            <motion.div
              className="h-full orange-gradient rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <div className="flex justify-between mt-2">
            {AGENT_STEPS.map((step, i) => (
              <div key={step.key} className="flex flex-col items-center" style={{ flex: 1 }}>
                <motion.div
                  animate={{
                    scale: i < currentStep ? 1 : 0.8,
                    opacity: i < currentStep ? 1 : 0.35,
                  }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col items-center"
                >
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                      i < currentStep ? 'text-orange' : 'text-warm-mute'
                    }`}
                  >
                    {step.label}
                  </span>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
