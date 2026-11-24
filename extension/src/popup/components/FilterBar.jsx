// FilterBar.jsx — Tactile category filter pills with live counts.

import { FILTER } from '../../utils/constants.js';

export default function FilterBar({ active, onFilter, counts = {} }) {
  const FILTERS = [
    { value: FILTER.ALL,                label: 'All',      count: counts.all },
    { value: FILTER.NOT_FOLLOWING_BACK, label: 'Not Back', count: counts.notFollowingBack },
    { value: FILTER.MUTUALS,            label: 'Mutuals',  count: counts.mutuals },
    { value: FILTER.DONT_FOLLOW_BACK,   label: 'Fans',     count: counts.dontFollowBack }
  ];

  return (
    <div className="filter-pill-bar" role="tablist" aria-label="Audience category filters">
      {FILTERS.map((f) => {
        const isActive = active === f.value;
        return (
          <button
            key={f.value}
            role="tab"
            aria-selected={isActive}
            type="button"
            className={`filter-pill-btn ${isActive ? 'active-pill' : ''}`}
            onClick={() => onFilter(f.value)}
          >
            <span>{f.label}</span>
            {f.count !== undefined && f.count !== null && (
              <span className="filter-badge">
                {Number(f.count).toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
