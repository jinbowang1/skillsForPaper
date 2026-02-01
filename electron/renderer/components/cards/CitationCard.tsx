import React from "react";

interface Citation {
  source: string;
  title: string;
  authors: string;
  year?: string;
  cited?: string;
}

interface Props {
  citations: Citation[];
}

export default function CitationCard({ citations }: Props) {
  if (!citations.length) return null;

  return (
    <div className="cite-group">
      {citations.map((cite, i) => (
        <div key={i} className="cite-card">
          <div className="cite-source">{cite.source}</div>
          <div className="cite-title">{cite.title}</div>
          <div className="cite-meta">
            <span className="cite-year">{cite.authors}</span>
            {cite.cited && (
              <>
                <span>·</span>
                <span>Cited {cite.cited}</span>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
