// FilterBar.jsx — Dark pill filter bar with dynamic live count badges.

import { FILTER } from '../../utils/constants.js';

export default function FilterBar({ active, onFilter, counts = {} }) {
  const FILTERS = [
    { value: FILTER.ALL,                label: 'ALL',      count: counts.all },
    { value: FILTER.NOT_FOLLOWING_BACK, label: 'NOT BACK', count: counts.notFollowingBack },
    { value: FILTER.MUTUALS,            label: 'MUTUALS',  count: counts.mutuals },
    { value: FILTER.DONT_FOLLOW_BACK,   label: 'FANS',     count: counts.dontFollowBack }
  ];

  return (
    <div className="filter-pill-container" role="tablist" aria-label="Audience category filters">
      {FILTERS.map((f) => {
        const isActive = active === f.value;
        return (
          <button
            key={f.value}
            role="tab"
            aria-selected={isActive}
            type="button"
            className={`category-pill ${isActive ? 'is-active' : ''}`}
            onClick={() => onFilter(f.value)}
          >
            <span>{f.label}</span>
            {f.count !== undefined && f.count !== null && (
              <span className="pill-counter">
                {Number(f.count).toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
