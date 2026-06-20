interface MineGeneratingOverlayProps {
  summary?: string[];
}

export default function MineGeneratingOverlay({
  summary = [],
}: MineGeneratingOverlayProps) {
  return (
    <div className="generating-screen" role="status" aria-live="polite">
      <div className="oracle-loader" aria-hidden="true">
        <span>🍲</span>
        <span>🍕</span>
        <span>🍗</span>
      </div>
      <p className="eyebrow">FOOD MINER</p>
      <h1>Building Emma&apos;s Food Mine…</h1>
      <p>Using recent orders and today&apos;s local deals.</p>
      {summary.length > 0 && (
        <div className="summary-chips compact-summary">
          {summary.slice(0, 4).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      )}
    </div>
  );
}
