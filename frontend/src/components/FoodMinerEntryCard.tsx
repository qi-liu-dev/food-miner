interface FoodMinerEntryCardProps {
  onClick: () => void;
}

export default function FoodMinerEntryCard({ onClick }: FoodMinerEntryCardProps) {
  return (
    <section className="miner-entry-card" aria-labelledby="miner-entry-title">
      <div>
        <p className="eyebrow">PERSONALIZED FOOD DISCOVERY</p>
        <h2 id="miner-entry-title">Food Miner</h2>
        <p>One catch. One meal deal built from your order history.</p>
        <button className="primary-button compact" onClick={onClick}>
          Play now
        </button>
      </div>
      <div className="miner-entry-art" aria-hidden="true">
        <span>🪝</span>
        <span>🍕</span>
        <span>🍲</span>
      </div>
    </section>
  );
}
