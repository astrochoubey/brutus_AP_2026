// FilterBar.jsx — Toggle buttons for relationship category filtering.
// Includes live count badges for each category.

import { FILTER } from '../../utils/constants.js';

export default function FilterBar({ active, onFilter, counts = {} }) {
  const FILTERS = [
    { value: FILTER.ALL,                label: 'All',      count: counts.all },
    { value: FILTER.NOT_FOLLOWING_BACK, label: 'Not Back', count: counts.notFollowingBack },
    { value: FILTER.MUTUALS,            label: 'Mutuals',  count: counts.mutuals },
    { value: FILTER.DONT_FOLLOW_BACK,   label: 'Fans',     count: counts.dontFollowBack }
  ];

  return (
    <div className="filter-bar">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          className={`filter-btn ${active === f.value ? 'active' : ''}`}
          onClick={() => onFilter(f.value)}
        >
          {f.label}
          {f.count !== undefined && f.count !== null && (
            <span className="filter-count"> ({Number(f.count).toLocaleString()})</span>
          )}
        </button>
      ))}
    </div>
  );
}
