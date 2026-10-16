// A slow-moving strip of the latest headlines. Pauses on hover/focus.
// The list is rendered twice so the loop is seamless (track moves -50%).
export default function HeadlineTicker({ articles }) {
  const items = articles.filter((a) => a.title).slice(0, 10);
  if (items.length < 3) return null;

  const row = (suffix) => items.map((a, i) => (
    <a
      key={`${suffix}-${a._id || i}`}
      className="ticker-item"
      href={a.url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={suffix === 'b' ? -1 : 0}
      aria-hidden={suffix === 'b' ? true : undefined}
    >
      {a.title}
    </a>
  ));

  return (
    <div className="ticker" role="region" aria-label="Latest headlines">
      <span className="ticker-live"><i /> Live</span>
      <div className="ticker-view">
        <div className="ticker-track" style={{ '--dur': `${items.length * 7}s` }}>
          {row('a')}{row('b')}
        </div>
      </div>
    </div>
  );
}
