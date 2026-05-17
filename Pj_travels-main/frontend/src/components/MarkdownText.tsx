import { useMemo } from 'react';

/**
 * Lightweight inline markdown renderer — no external dependency.
 * Handles: **bold**, *italic*, • bullets, ── rules, line breaks.
 */

interface Token {
  type: 'rule' | 'bullet' | 'paragraph';
  content: string;
}

function tokenize(text: string): Token[] {
  const lines = text.split('\n');
  const tokens: Token[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length > 0) {
      tokens.push({ type: 'paragraph', content: paragraphLines.join('\n') });
      paragraphLines = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Horizontal rule: 3+ consecutive dashes or underscores
    if (/^[-_]{3,}$/.test(trimmed)) {
      flushParagraph();
      tokens.push({ type: 'rule', content: '' });
      continue;
    }

    // Bullet: starts with • or * or - followed by space
    if (/^[•\*\-]\s/.test(trimmed)) {
      flushParagraph();
      tokens.push({ type: 'bullet', content: trimmed.replace(/^[•\*\-]\s*/, '') });
      continue;
    }

    paragraphLines.push(line);
  }

  flushParagraph();
  return tokens;
}

function renderInline(text: string): React.ReactNode[] {
  // Split on **bold** or *italic* markers
  const parts: React.ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // **bold**
      parts.push(
        <strong key={key++} className="font-semibold text-warm-dark">
          {match[1]}
        </strong>
      );
    } else if (match[2]) {
      // *italic*
      parts.push(
        <em key={key++} className="italic">
          {match[2]}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export default function MarkdownText({ text, className }: { text: string; className?: string }) {
  const tokens = useMemo(() => tokenize(text), [text]);

  return (
    <div className={className}>
      {tokens.map((token, i) => {
        if (token.type === 'rule') {
          return <hr key={i} className="my-2 border-border/60" />;
        }
        if (token.type === 'bullet') {
          return (
            <div key={i} className="flex items-start gap-2 ml-1 my-0.5">
              <span className="text-orange mt-0.5 flex-shrink-0">•</span>
              <span className="text-sm leading-relaxed">{renderInline(token.content)}</span>
            </div>
          );
        }
        // paragraph
        const lines = token.content.split('\n');
        return (
          <p key={i} className="text-sm leading-relaxed mb-1">
            {lines.map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {renderInline(line)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
