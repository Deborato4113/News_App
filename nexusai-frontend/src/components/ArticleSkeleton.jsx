// Placeholder cards shown while news loads (shape matches ArticleCard).
export default function ArticleSkeleton({ count = 4 }) {
  return (
    <div style={{ display: 'grid', gap: 10 }} aria-busy="true" aria-label="Loading articles">
      {Array.from({ length: count }, (_, i) => (
        <div className="sk-card" key={i}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="skeleton sk-pill" />
            <div className="skeleton sk-pill" style={{ width: 64 }} />
          </div>
          <div className="skeleton sk-line" style={{ width: '82%', height: 16 }} />
          <div className="skeleton sk-line" style={{ width: '100%' }} />
          <div className="skeleton sk-line" style={{ width: '64%' }} />
        </div>
      ))}
    </div>
  );
}
