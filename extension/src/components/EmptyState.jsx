// EmptyState.jsx — Shown when a list or view has no data to display.

export default function EmptyState({ title = 'Nothing here yet', description = '' }) {
  return (
    <div className="empty-state">
      <p className="empty-title">{title}</p>
      {description && <p className="empty-desc">{description}</p>}
    </div>
  );
}
