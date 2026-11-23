// Loading.jsx — Reusable loading spinner shown while async data is being fetched.

export default function Loading({ message = 'Loading…' }) {
  return (
    <div className="loading-wrap">
      <div className="loading-spinner" aria-label="Loading" />
      <p className="loading-text">{message}</p>
    </div>
  );
}
