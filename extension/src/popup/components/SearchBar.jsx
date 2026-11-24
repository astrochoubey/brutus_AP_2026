// SearchBar.jsx — Integrated search input with search icon and instant clear button.

export default function SearchBar({ query, onChange }) {
  return (
    <div className="search-bar-wrap">
      <div className="search-input-box">
        <svg
          className="search-mag-icon"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="text"
          className="search-input"
          placeholder="Search accounts by handle or name…"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Search users"
          autoComplete="off"
          spellCheck="false"
        />

        {query && (
          <button
            className="search-clear-btn"
            onClick={() => onChange('')}
            title="Clear search text"
            type="button"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
