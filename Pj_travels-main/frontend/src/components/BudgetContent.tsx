import { motion } from 'framer-motion';
import type { Budget } from '../types';

interface Props {
  budget: Budget;
  budgetLimit?: number;
  onReplan?: (prompt: string) => void;
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const CATEGORIES: { key: keyof Budget; label: string }[] = [
  { key: 'accommodation', label: 'Accommodation' },
  { key: 'transportation', label: 'Transportation' },
  { key: 'food', label: 'Food' },
  { key: 'activities', label: 'Activities' },
  { key: 'local_transport', label: 'Local Transport' },
  { key: 'contingency', label: 'Contingency' },
];

function formatMoney(amount: number | string, currency = 'INR'): string {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(n)) return `${currency} 0`;
  return `${currency} ${n.toLocaleString()}`;
}

export default function BudgetContent({ budget: b, budgetLimit, onReplan }: Props) {
  const total = b.total_estimated_cost || 0;
  const allZero = CATEGORIES.every(({ key }) => !(b[key] as number));
  const overBudget = budgetLimit != null && total > budgetLimit;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.06 } } }}
    >
      {allZero ? (
        <motion.div variants={item} className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 card-shadow mb-6">
          <p className="text-sm text-yellow-800">
            Budget breakdown is being computed. Check back shortly or adjust your preferences.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Budget vs Cost comparison */}
          {budgetLimit != null && (
            <motion.div variants={item} className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white border border-border rounded-xl p-3 text-center card-shadow">
                <p className="font-display text-lg text-warm-dark font-bold">
                  {formatMoney(budgetLimit, b.currency)}
                </p>
                <p className="text-[10px] font-mono uppercase tracking-widest text-warm-mute mt-0.5">
                  Your Budget
                </p>
              </div>
              <div className="bg-white border border-border rounded-xl p-3 text-center card-shadow">
                <p className="font-display text-lg text-orange font-bold">
                  {formatMoney(total, b.currency)}
                </p>
                <p className="text-[10px] font-mono uppercase tracking-widest text-warm-mute mt-0.5">
                  Trip Cost
                </p>
              </div>
            </motion.div>
          )}

          {/* Over-budget warning */}
          {overBudget && (
            <motion.div variants={item} className="bg-amber-50 border border-amber-300 rounded-xl p-5 card-shadow mb-6">
              <div className="flex items-start gap-3">
                <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">&#9888;</span>
                <div>
                  <h4 className="font-semibold text-amber-900 text-sm mb-1">
                    Trip cost exceeds your budget
                  </h4>
                  <p className="text-sm text-amber-800 mb-3">
                    Estimated cost {formatMoney(total, b.currency)} is{' '}
                    {formatMoney(total - budgetLimit, b.currency)} over your budget of{' '}
                    {formatMoney(budgetLimit, b.currency)}.
                  </p>
                  {onReplan && (
                    <button
                      onClick={() =>
                        onReplan(
                          `Revise the plan to stay within my budget of ${budgetLimit} ${b.currency}. Keep the same destination, duration, and number of travelers.`
                        )
                      }
                      className="px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Replan within budget
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Cost breakdown */}
          <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-white border border-border rounded-xl p-3 text-center card-shadow">
              <p className="font-display text-xl text-orange font-bold">
                {formatMoney(total, b.currency)}
              </p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-warm-mute mt-0.5">
                Total
              </p>
            </div>
            {CATEGORIES.map(({ key, label }) => {
              const val = b[key] as number;
              return (
                <div key={key} className="bg-white border border-border rounded-xl p-3 text-center card-shadow">
                  <p className="font-display text-base text-warm-dark font-semibold">
                    {formatMoney(val, b.currency)}
                  </p>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-warm-mute mt-0.5">
                    {label}
                  </p>
                </div>
              );
            })}
          </motion.div>

          {/* Allocation bars */}
          <motion.div variants={item} className="bg-white border border-border rounded-xl p-5 card-shadow mb-5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-warm-mute block mb-4">
              Allocation
            </span>
            <div className="space-y-3">
              {CATEGORIES.map(({ key, label }) => {
                const val = b[key] as number;
                const pct = total > 0 ? (val / total) * 100 : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs text-warm-body mb-1">
                      <span>{label}</span>
                      <span className="font-mono">{formatMoney(val, b.currency)}</span>
                    </div>
                    <div className="h-2 bg-peach/60 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full orange-gradient rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Savings tips */}
          {b.savings_tips && b.savings_tips.length > 0 && (
            <motion.div variants={item} className="bg-white border border-border rounded-xl p-5 card-shadow">
              <span className="text-[10px] font-mono uppercase tracking-widest text-warm-mute block mb-3">
                Savings Tips
              </span>
              <ul className="space-y-1.5">
                {b.savings_tips.map((tip, i) => (
                  <li key={i} className="text-sm text-warm-body pl-3 border-l-2 border-orange/40">
                    {tip}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
}
