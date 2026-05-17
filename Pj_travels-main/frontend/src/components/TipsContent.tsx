import { motion } from 'framer-motion';

interface Props {
  tips: string[];
}

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function TipsContent({ tips }: Props) {
  if (!tips || tips.length === 0) {
    return <p className="text-sm text-warm-mute italic">No tips available.</p>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      className="grid grid-cols-1 sm:grid-cols-2 gap-3"
    >
      {tips.map((tip, i) => (
        <motion.div
          key={i}
          variants={item}
          className="bg-white border border-border rounded-xl p-4 card-shadow hover:card-shadow-hover transition-shadow flex items-start gap-3"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange mt-1.5 flex-shrink-0" />
          <p className="text-sm text-warm-body leading-relaxed">{tip}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}
