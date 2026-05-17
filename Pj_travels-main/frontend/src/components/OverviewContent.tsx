import { motion } from 'framer-motion';

interface Props {
  plan: Record<string, unknown>;
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

function ShimmerLine({ className }: { className?: string }) {
  return <div className={`shimmer ${className || 'h-4 w-full'}`} />;
}

export default function OverviewContent({ plan }: Props) {
  const intent = (plan.intent || {}) as Record<string, unknown>;
  const research = (plan.research || {}) as Record<string, unknown>;
  const destinationOverview = (plan.destination_overview as string) || (research.overview as string) || '';

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
      {intent.destination ? (
        <motion.div variants={item} className="mb-6">
          <h3 className="font-display text-2xl text-warm-dark mb-1">
            {intent.destination as string}
          </h3>
          <div className="flex flex-wrap gap-4 text-sm text-warm-body">
            {!!intent.travelers && (
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-orange" />
                {intent.travelers as number} traveler{intent.travelers !== 1 ? 's' : ''}
              </span>
            )}
            {!!intent.duration_days && (
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-orange" />
                {intent.duration_days as number} days
              </span>
            )}
            {!!intent.budget_limit && (
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-orange" />
                {intent.budget_currency as string} {(intent.budget_limit as number).toLocaleString()}
              </span>
            )}
            {!!intent.pacing && (
              <span className="flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-orange" />
                {intent.pacing as string}
              </span>
            )}
          </div>
        </motion.div>
      ) : (
        <motion.div variants={item} className="mb-6">
          <ShimmerLine className="h-6 w-1/2 mb-2" />
          <div className="flex gap-4">
            <ShimmerLine className="h-4 w-24" />
            <ShimmerLine className="h-4 w-16" />
            <ShimmerLine className="h-4 w-20" />
          </div>
        </motion.div>
      )}

      {destinationOverview ? (
        <motion.div variants={item}>
          <div className="bg-white border border-border rounded-xl p-5 card-shadow mb-5">
            <p className="text-sm text-warm-body leading-relaxed">{destinationOverview}</p>
          </div>
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <div className="bg-white border border-border rounded-xl p-5 card-shadow mb-5">
            <ShimmerLine className="h-3 w-full mb-2" />
            <ShimmerLine className="h-3 w-5/6 mb-2" />
            <ShimmerLine className="h-3 w-2/3" />
          </div>
        </motion.div>
      )}

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        <div className="bg-white border border-border rounded-xl p-4 card-shadow">
          <span className="text-[10px] font-mono uppercase tracking-widest text-warm-mute">Weather</span>
          {research.expected_weather ? (
            <p className="mt-1.5 text-sm text-warm-body leading-relaxed">
              {research.expected_weather as string}
            </p>
          ) : (
            <div className="mt-2">
              <ShimmerLine className="h-4 w-3/4" />
            </div>
          )}
        </div>
        <div className="bg-white border border-border rounded-xl p-4 card-shadow">
          <span className="text-[10px] font-mono uppercase tracking-widest text-warm-mute">Best Time</span>
          {research.best_time_to_visit ? (
            <p className="mt-1.5 text-sm text-warm-body leading-relaxed">
              {research.best_time_to_visit as string}
            </p>
          ) : (
            <div className="mt-2">
              <ShimmerLine className="h-4 w-3/4" />
            </div>
          )}
        </div>
      </motion.div>

      {!!research.top_attractions && (research.top_attractions as unknown[]).length > 0 && (
        <motion.div variants={item}>
          <div className="bg-white border border-border rounded-xl p-4 card-shadow">
            <span className="text-[10px] font-mono uppercase tracking-widest text-warm-mute">Top Attractions</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {(research.top_attractions as string[]).map((a: string) => (
                <span key={a} className="px-3 py-1 text-xs font-medium bg-peach/60 text-orange-deep rounded-full border border-orange/15">
                  {a}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
