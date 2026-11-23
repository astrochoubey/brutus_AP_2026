// SearchBar.jsx — Username/name text search input.
// The parent (Popup.jsx) holds the search query in state; this just fires onChange.

export default function SearchBar({ query, onChange }) {
  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search by username…"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search users"
      />
    </div>
  );
}
