"use client";

import { useState } from "react";

export function ReadMore({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  if (text.length <= 120) {
    return <div className="quest-detail">{text}</div>;
  }

  return (
    <div className="quest-detail">
      {expanded ? text : `${text.slice(0, 120)}...`}
      <button className="btn" style={{ marginTop: 8 }} onClick={() => setExpanded((v) => !v)}>
        {expanded ? "折りたたむ" : "続きを読む"}
      </button>
    </div>
  );
}
