// Friendly empty / error state with an icon, message and optional action.
export default function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="empty-state">
      {Icon && <span className="es-icon"><Icon size={26} /></span>}
      <h2 className="es-title">{title}</h2>
      {children && <p className="es-text">{children}</p>}
      {action}
    </div>
  );
}
