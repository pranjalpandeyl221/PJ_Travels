export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-orange/60"
          style={{
            animation: 'bounceDot 1.2s infinite ease-in-out',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
}
