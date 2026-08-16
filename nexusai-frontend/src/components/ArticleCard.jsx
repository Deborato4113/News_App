import { ExternalLink } from 'lucide-react';

const BADGE = {
  Politics: 'badge-politics', Business: 'badge-business',
  Technology: 'badge-tech', Sports: 'badge-sports',
  Weather: 'badge-weather', Health: 'badge-health', General: 'badge-general',
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

export default function ArticleCard({ article, featured }) {
  const { title, summary, description, source, publishedAt, category, sentiment, url } = article;

  return (
    <div className={`card${featured ? ' card-featured' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <span className={`badge ${BADGE[category] || 'badge-general'}`}>{category}</span>
        <span className={`sent sent-${sentiment}`}>
          {sentiment === 'pos' ? '↑ positive' : sentiment === 'neg' ? '↓ negative' : '• neutral'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)' }}>
          {timeAgo(publishedAt)}
        </span>
      </div>

      {/* Title */}
      <p style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.45 }}>{title}</p>

      {/* Summary */}
      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>
        {summary || description || 'No summary available.'}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{source?.name || 'Unknown'}</span>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 3 }}>
            Read full <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}
