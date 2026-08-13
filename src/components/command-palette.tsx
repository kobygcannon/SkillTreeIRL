"use client";

import { useEffect, useState } from "react";
import { Plus, Search, X } from "lucide-react";

type Result = { id: string; type: string; label: string };

export default function CommandPalette({
  close,
  onQuickAdd,
  onSelect,
}: {
  close: () => void;
  onQuickAdd: () => void;
  onSelect: (result:Result) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const searchable = query.trim().length >= 2;

  useEffect(() => {
    if (!searchable) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/v1/search?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((body) => setResults(body.data || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchable]);

  const visibleResults = searchable ? results : [];
  return (
    <div
      className="modal-wrap"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <div
        className="quick-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
      >
        <div className="modal-head">
          <div>
            <span className="eyebrow">SEARCH & COMMANDS</span>
            <h2>Find anything</h2>
          </div>
          <button
            className="icon-btn"
            onClick={close}
            aria-label="Close search"
          >
            <X />
          </button>
        </div>
        <label className="search">
          <Search />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Goals, skills, quests, habits, achievements, activities, or journal"
            aria-label="Search your SkillTree"
          />
        </label>
        <div className="quick-grid">
          <button className="featured" onClick={onQuickAdd}>
            <span>
              <Plus />
            </span>
            <div>
              <b>Quick add</b>
              <small>Create or log something meaningful</small>
            </div>
          </button>
          {visibleResults.map((result) => (
            <button key={`${result.type}-${result.id}`} onClick={()=>onSelect(result)}>
              <span>{result.type.slice(0, 1).toUpperCase()}</span>
              <div>
                <b>{result.label}</b>
                <small>{result.type}</small>
              </div>
            </button>
          ))}
        </div>
        {searchable && loading && <p className="modal-tip">Searching…</p>}
        {searchable && !loading && !visibleResults.length && (
          <p className="modal-tip">No matching records.</p>
        )}
      </div>
    </div>
  );
}
