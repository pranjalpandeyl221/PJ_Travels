import { motion } from 'framer-motion';
import type { ItineraryDay } from '../types';

interface Props {
  days: ItineraryDay[];
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function ItineraryContent({ days }: Props) {
  if (!days || days.length === 0) {
    return (
      <p className="text-sm text-warm-mute italic">No itinerary available.</p>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.1 } } }}
      className="space-y-3"
    >
      {days.map((day) => (
        <motion.div
          key={day.day}
          variants={item}
          className="bg-white border border-border rounded-xl overflow-hidden card-shadow hover:card-shadow-hover transition-shadow"
        >
          <div className="flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-peach/30 to-transparent border-b border-border/50">
            <span className="w-8 h-8 rounded-full orange-gradient flex items-center justify-center text-white text-xs font-bold">
              {day.day}
            </span>
            <div>
              <h4 className="font-display text-base text-warm-dark">{day.title}</h4>
              <span className="text-[10px] font-mono text-warm-mute uppercase tracking-wider">
                Day {day.day}
              </span>
            </div>
          </div>

          <div className="px-5 py-4 space-y-2.5">
            {day.morning && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-orange">
                  Morning
                </span>
                <p className="text-sm text-warm-body mt-0.5">{day.morning}</p>
              </div>
            )}
            {day.afternoon && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-orange">
                  Afternoon
                </span>
                <p className="text-sm text-warm-body mt-0.5">{day.afternoon}</p>
              </div>
            )}
            {day.evening && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-orange">
                  Evening
                </span>
                <p className="text-sm text-warm-body mt-0.5">{day.evening}</p>
              </div>
            )}
          </div>

          <div className="px-5 py-2.5 bg-cream/50 border-t border-border/50 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-warm-mute">
            {day.meals && day.meals.length > 0 && (
              <span>Meals: {day.meals.join(', ')}</span>
            )}
            {day.estimated_local_cost > 0 && (
              <span>Est. cost: INR {day.estimated_local_cost.toLocaleString()}</span>
            )}
            {day.notes && day.notes.length > 0 && (
              <span className="italic">Note: {day.notes.join(' ')}</span>
            )}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
