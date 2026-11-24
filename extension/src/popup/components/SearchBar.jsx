// SearchBar.jsx — Dark search input with gold focus glow and clear button.

export default function SearchBar({ query, onChange }) {
  return (
    <div className="search-wrap">
      <div className="search-box">
        <svg
          className="search-icon"
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
          className="search-field"
          placeholder="Search accounts by handle or name…"
          value={query}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Search users"
          autoComplete="off"
          spellCheck="false"
        />

        {query && (
          <button
            className="search-clear"
            onClick={() => onChange('')}
            title="Clear search"
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
