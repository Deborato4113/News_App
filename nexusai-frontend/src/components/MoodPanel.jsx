import { Link } from 'react-router-dom';
import { Hash } from 'lucide-react';
import { sentimentMix, topWords } from '../lib/text';

// The tone of the stories on screen, and the words that keep coming up in
// their headlines. Both are worked out from the loaded articles, nothing is guessed.
export default function MoodPanel({ articles, region }) {
  const mix = sentimentMix(articles);
  const words = topWords(articles);
  if (mix.total < 3) return null;

  return (
    <section className="mood" aria-label={`Mood in ${region}`}>
      <div className="mood-main">
        <div className="mood-head">
          <span className="mood-title">Mood in {region}</span>
          <span className="meta">{mix.total} stories</span>
        </div>
        <div className="mood-bar" role="img"
          aria-label={`${mix.posPct}% positive, ${mix.neuPct}% neutral, ${mix.negPct}% negative`}>
          {mix.pos > 0 && <span className="m-pos" style={{ flexGrow: mix.pos }} />}
          {mix.neu > 0 && <span className="m-neu" style={{ flexGrow: mix.neu }} />}
          {mix.neg > 0 && <span className="m-neg" style={{ flexGrow: mix.neg }} />}
        </div>
        <div className="mood-legend">
          <span><i className="dot m-pos" />Positive {mix.posPct}%</span>
          <span><i className="dot m-neu" />Neutral {mix.neuPct}%</span>
          <span><i className="dot m-neg" />Negative {mix.negPct}%</span>
        </div>
      </div>

      {words.length > 0 && (
        <div className="mood-topics">
          <span className="mood-title">In today&apos;s headlines</span>
          <div className="chip-row" style={{ marginTop: 8, marginBottom: 0 }}>
            {words.map(({ word, count }) => (
              <Link key={word} to={`/search?q=${encodeURIComponent(word)}`} className="chip">
                <Hash size={11} aria-hidden="true" />{word} <span className="count">{count}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
