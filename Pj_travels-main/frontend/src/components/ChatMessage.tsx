import { motion } from 'framer-motion';
import type { Message } from '../types';
import MarkdownText from './MarkdownText';

interface Props {
  message: Message;
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 ${
          isUser
            ? 'bg-night-800 text-white'
            : 'ocean-gradient text-white'
        }`}
      >
        {isUser ? 'U' : 'P'}
      </span>

      <div
        className={`max-w-[85%] px-3.5 py-2.5 ${
          isUser
            ? 'bg-night-800 text-white rounded-2xl rounded-tr-sm'
            : 'bg-white border border-ocean-100 rounded-2xl rounded-tl-sm card-shadow'
        }`}
      >
        {message.type === 'plan' ? (
          <p className="text-xs font-medium">
            <span className={isUser ? '' : 'text-ocean'}>Trip plan ready!</span>
            <span className={isUser ? ' opacity-70' : ' text-ocean-500'}>
              {' '}&mdash; check the dashboard
            </span>
          </p>
        ) : isUser ? (
          <p className="text-sm leading-relaxed text-white/90">
            {String(message.content)}
          </p>
        ) : (
          <MarkdownText text={String(message.content)} />
        )}
      </div>
    </motion.div>
  );
}
