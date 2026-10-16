import { useCallback, useMemo, useState } from 'react';
import { ReaderContext } from '../context/readerContext';
import ArticleDrawer from './ArticleDrawer';

// Holds which article is open in the reading drawer and the list it came from,
// so J/K (and the arrows) can move through that list.
export default function ReaderProvider({ children }) {
  const [state, setState] = useState(null); // { list, index }

  const open = useCallback((article, list = []) => {
    const items = list.length ? list : [article];
    const index = Math.max(0, items.findIndex((a) => (a._id || a.url) === (article._id || article.url)));
    setState({ list: items, index });
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <ReaderContext.Provider value={value}>
      {children}
      {state && (
        <ArticleDrawer
          key={state.list[state.index]?._id || state.index}
          article={state.list[state.index]}
          position={state.index + 1}
          total={state.list.length}
          onPrev={state.index > 0 ? () => setState((s) => ({ ...s, index: s.index - 1 })) : null}
          onNext={state.index < state.list.length - 1 ? () => setState((s) => ({ ...s, index: s.index + 1 })) : null}
          onClose={() => setState(null)}
        />
      )}
    </ReaderContext.Provider>
  );
}
