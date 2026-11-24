// SearchBar.jsx — Search input with search icon and quick clear button.
// Fires onChange on every keystroke for instant responsive filtering.

export default function SearchBar({ query, onChange }) {
  return (
    <div className="search-bar">
      <span className="search-icon" aria-hidden="true">🔍</span>
      <input
        type="text"
        placeholder="Search by username or name…"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search users"
      />
      {query ? (
        <button
          className="search-clear-btn"
          onClick={() => onChange('')}
          title="Clear search"
          type="button"
          aria-label="Clear search"
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
