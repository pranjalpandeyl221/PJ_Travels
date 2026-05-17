import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const QUOTES = [
  { text: 'The world is a book, and those who do not travel read only one page.', author: 'Saint Augustine' },
  { text: 'Travel is the only thing you buy that makes you richer.', author: 'Anonymous' },
  { text: 'Not all those who wander are lost.', author: 'J.R.R. Tolkien' },
  { text: 'Life is either a daring adventure or nothing at all.', author: 'Helen Keller' },
  { text: 'Once a year, go someplace you\'ve never been before.', author: 'Dalai Lama' },
  { text: 'The journey not the arrival matters.', author: 'T.S. Eliot' },
];

export default function HeroSection() {
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setQuoteIndex((i) => (i + 1) % QUOTES.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative px-6 pt-12 pb-8 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-ocean-200/30 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-coral-light/50 rounded-full translate-y-1/2" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-accent/10 rounded-full -translate-x-1/2" />
      </div>

      <div className="relative max-w-[1440px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl"
        >
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.08] text-night-800 text-balance">
            Your perfect trip,{' '}
            <span className="italic ocean-gradient-text">crafted in seconds</span>
          </h1>
          <p className="mt-4 text-base md:text-lg text-night-600 leading-relaxed max-w-xl">
            AI-powered travel planning that understands your style. 
            Just tell us where you want to go — we&apos;ll handle the rest.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 relative"
        >
          <div className="relative inline-block">
            <div className="absolute -left-4 top-0 bottom-0 w-0.5 ocean-gradient rounded-full" />
            <div className="pl-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={quoteIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <p className="font-display italic text-lg md:text-xl text-night-600/70 leading-relaxed">
                    &ldquo;{QUOTES[quoteIndex].text}&rdquo;
                  </p>
                  <cite className="mt-2 block text-xs font-mono tracking-widest text-ocean-500 uppercase">
                    — {QUOTES[quoteIndex].author}
                  </cite>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}