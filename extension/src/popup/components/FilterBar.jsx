// FilterBar.jsx — Toggle buttons for relationship category filtering.
// Allowed filter values come from constants.js FILTER object.

import { FILTER } from '../../utils/constants.js';

const FILTERS = [
  { value: FILTER.ALL,               label: 'All' },
  { value: FILTER.MUTUALS,           label: 'Mutuals' },
  { value: FILTER.NOT_FOLLOWING_BACK, label: 'Not Following Back' },
  { value: FILTER.DONT_FOLLOW_BACK,  label: "Don't Follow Back" }
];

export default function FilterBar({ active, onFilter }) {
  return (
    <div className="filter-bar">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          className={`filter-btn ${active === f.value ? 'active' : ''}`}
          onClick={() => onFilter(f.value)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
