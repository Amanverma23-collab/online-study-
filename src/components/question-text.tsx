"use client";

import React from "react";

function renderWithEmphasis(text: string): (string | React.ReactNode)[] {
  const parts: (string | React.ReactNode)[] = [];
  // Pattern 1: **bold** words (from Sentence Improvement — marks underlined word)
  // Pattern 2: ALL-CAPS words of 3+ letters optionally followed by [digit] (e.g. BACKED [1])
  const regex = /(\*\*[^*]+\*\*)|(\b[A-Z]{3,}(?:\s+\[\d+\])?\b)/g;
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      const word = match[1].replace(/\*\*/g, "");
      parts.push(
        <span
          key={key++}
          style={{
            fontWeight: "bold",
            textDecoration: "underline",
            color: "inherit",
          }}
        >
          {word}
        </span>
      );
    } else if (match[2]) {
      parts.push(
        <span
          key={key++}
          style={{
            fontWeight: "bold",
            color: "#C9A84C",
          }}
        >
          {match[2]}
        </span>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

export default function QuestionText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const lines = text.split("\n");

  return (
    <span className={className}>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {index > 0 && <br />}
          <span>{renderWithEmphasis(line)}</span>
        </React.Fragment>
      ))}
    </span>
  );
}
