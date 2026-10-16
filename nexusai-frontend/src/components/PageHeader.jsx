// Consistent page title block: icon tile, title, subtitle, optional right-side actions.
export default function PageHeader({ icon: Icon, title, sub, children }) {
  return (
    <header className="ph">
      <div className="ph-main">
        {Icon && <span className="ph-icon"><Icon size={20} /></span>}
        <div>
          <h1 className="page-title">{title}</h1>
          {sub && <p className="page-sub">{sub}</p>}
        </div>
      </div>
      {children && <div className="ph-actions">{children}</div>}
    </header>
  );
}
