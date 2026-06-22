export default function BottomNav({ items = [] }) {
  return (
    <nav className="bottom-nav" aria-label="Bottom navigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <a key={item.href} href={item.href} className="bottom-nav-item">
            <span className="bottom-nav-icon" aria-hidden="true">{Icon ? <Icon size={18} strokeWidth={2} /> : null}</span>
            <span>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}
