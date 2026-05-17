import { motion, AnimatePresence } from 'framer-motion';
import type { Message } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  savedTrips: string[];
  messages: Message[];
}

export default function SidePanel({ open, onClose, savedTrips, messages }: Props) {
  const userMessages = messages.filter((m) => m.role === 'user');

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/10 z-40"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-white border-l border-border z-50 shadow-xl overflow-y-auto"
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-6">
                <span className="text-sm font-semibold text-warm-dark">Settings</span>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg border border-border flex items-center justify-center text-sm text-warm-mute hover:text-warm-dark transition-colors"
                >
                  &#10005;
                </button>
              </div>

              <div className="space-y-6">
                <section>
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-warm-mute mb-3">
                    Previous Chats
                  </h4>
                  {userMessages.length === 0 ? (
                    <p className="text-xs text-warm-mute italic">No chats yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {userMessages.slice(-6).map((msg) => (
                        <div
                          key={msg.id}
                          className="px-3 py-2 text-xs text-warm-mute bg-cream rounded-lg truncate"
                        >
                          {String(msg.content).slice(0, 50)}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-warm-mute mb-3">
                    Saved Trips
                  </h4>
                  {savedTrips.length === 0 ? (
                    <p className="text-xs text-warm-mute italic">No saved trips.</p>
                  ) : (
                    <div className="space-y-1">
                      {savedTrips.map((trip, i) => (
                        <div
                          key={i}
                          className="px-3 py-2 text-xs text-warm-body bg-cream rounded-lg"
                        >
                          &#128205; {trip}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="pt-4 border-t border-border">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-warm-mute mb-2">
                    About
                  </h4>
                  <p className="text-xs text-warm-mute leading-relaxed">
                    PJ Travels uses AI to plan your perfect trip. Get personalized itineraries, 
                    budget estimates, and travel tips instantly.
                  </p>
                </section>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
