import { API_BASE } from './axios';

// Reads one Server-Sent-Events block ("event: x\ndata: {...}") into
// { event, data }. Comment lines (": ping") and junk give null.
function parseBlock(block) {
  let event = 'message';
  const dataLines = [];
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
  }
  if (!dataLines.length) return null;
  try {
    return { event, data: JSON.parse(dataLines.join('\n')) };
  } catch {
    return null;
  }
}

function failure(message, status) {
  return Object.assign(new Error(message), { status });
}

// Asks the agent a question and reports progress as it works.
//   onEvent(evt)  called for every live step (model_start, tool_start, ...)
//   resolves with the final result payload (same JSON as POST /agent/ask)
// We use fetch + a stream reader instead of EventSource because EventSource
// can only make GET requests and can't send the Authorization header.
export async function streamAsk({ question, history, signal, onEvent }) {
  const token = localStorage.getItem('nexusai_token');

  let res;
  try {
    res = await fetch(`${API_BASE}/agent/ask/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: JSON.stringify({ question, history }),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw failure('Could not reach the server. Check your connection and try again.');
  }

  // Problems found before the stream starts (not logged in, too many
  // questions, invalid input) arrive as ordinary JSON errors.
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('nexusai_token');
      window.dispatchEvent(new CustomEvent('nexusai:unauthorized'));
    }
    let message = '';
    try { message = (await res.json()).message || ''; } catch { /* not JSON */ }
    if (res.status === 400) message = 'Please check your question and try again.';
    throw failure(message || 'Something went wrong. Please try again.', res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result = null;

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let end;
    while ((end = buffer.indexOf('\n\n')) !== -1) {
      const evt = parseBlock(buffer.slice(0, end));
      buffer = buffer.slice(end + 2);
      if (!evt) continue;
      if (evt.event === 'result') result = evt.data;
      else if (evt.event === 'error') throw failure(evt.data?.message || 'Something went wrong.', evt.data?.status);
      else onEvent?.(evt.data);
    }
  }

  if (!result) throw failure('The connection closed before the answer arrived. Please try again.');
  return result;
}
