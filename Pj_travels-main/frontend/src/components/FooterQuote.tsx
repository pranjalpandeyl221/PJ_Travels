export default function FooterQuote() {
  return (
    <footer className="px-6 py-10 mt-8 border-t border-ocean-100">
      <div className="max-w-[1440px] mx-auto text-center">
        <p className="font-display italic text-base text-ocean-600/70">
          &ldquo;The real voyage of discovery consists not in seeking new landscapes,
          but in having new eyes.&rdquo;
        </p>
        <cite className="mt-2 block text-[10px] font-mono tracking-widest text-ocean-400/50 uppercase">
          &mdash; Marcel Proust
        </cite>
      </div>
    </footer>
  );
}
