export default function MascotCard({ image, title, text, badge = 'Kograph Mascot', compact = false }) {
  return (
    <div className={`mascot-card ${compact ? 'compact' : ''}`}>
      <div className="mascot-copy">
        <span className="eyebrow">{badge}</span>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
      <div className="mascot-figure">
        <img src={image} alt={title} />
      </div>
    </div>
  );
}
