interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onHome?: () => void;
}

export default function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  onHome,
}: ErrorStateProps) {
  return (
    <section className="error-state" role="alert">
      <div className="error-icon">!</div>
      <h1>{title}</h1>
      <p>{message}</p>
      {onRetry && (
        <button className="primary-button" onClick={onRetry}>
          Retry
        </button>
      )}
      {onHome && (
        <button className="text-button" onClick={onHome}>
          Back home
        </button>
      )}
    </section>
  );
}
