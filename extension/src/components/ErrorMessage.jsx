// ErrorMessage.jsx — Displays an error with an optional retry action.

export default function ErrorMessage({ message = 'Something went wrong.', onRetry = null }) {
  return (
    <div className="error-box" role="alert">
      <p className="error-text">⚠ {message}</p>
      {onRetry && (
        <button className="btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
