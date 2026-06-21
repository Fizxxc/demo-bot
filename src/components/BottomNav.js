export default function BottomNav({ items = [] }) {
  return (
    <nav className="bottom-nav" aria-label="Bottom navigation">
      {items.map((item) => (
        <a key={item.href} href={item.href} className="bottom-nav-item">
          <span className="bottom-nav-icon" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  );
}
