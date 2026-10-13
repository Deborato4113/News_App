// Model fallback. The Groq client is replaced by a fake, so no network.
const { createLlm, configuredModels, isFallbackWorthy } = require('../../services/agentLlm');

const ok = (text) => ({ choices: [{ message: { role: 'assistant', content: text } }], usage: { total_tokens: 7 } });
const apiError = (status, headers = {}) => Object.assign(new Error(`HTTP ${status}`), { status, headers });

// A fake client whose behaviour depends on the requested model.
function fakeClient(behaviour) {
  const calls = [];
  return {
    calls,
    getClient: () => ({
      chat: {
        completions: {
          create: async (req) => {
            calls.push(req.model);
            const out = behaviour[req.model];
            const value = typeof out === 'function' ? out(calls.filter((m) => m === req.model).length) : out;
            if (value instanceof Error) throw value;
            return value;
          },
        },
      },
    }),
  };
}

const request = { messages: [{ role: 'user', content: 'hi' }], tools: [], toolChoice: 'auto' };
const models = () => ['main', 'backup'];

describe('configuredModels', () => {
  it('defaults to a primary and a backup model', () => {
    const m = configuredModels({});
    expect(m).toHaveLength(2);
    expect(m[0]).not.toBe(m[1]);
  });
  it('honours AGENT_MODEL and AGENT_FALLBACK_MODEL', () => {
    expect(configuredModels({ AGENT_MODEL: 'a', AGENT_FALLBACK_MODEL: 'b' })).toEqual(['a', 'b']);
  });
  it('switches the fallback off only with an explicit "none"', () => {
    expect(configuredModels({ AGENT_MODEL: 'a', AGENT_FALLBACK_MODEL: 'none' })).toEqual(['a']);
    expect(configuredModels({ AGENT_MODEL: 'a', AGENT_FALLBACK_MODEL: 'OFF' })).toEqual(['a']);
  });
  it('treats blank values as "not set" (a leftover empty line in .env is harmless)', () => {
    const m = configuredModels({ AGENT_MODEL: '', AGENT_FALLBACK_MODEL: '  ' });
    expect(m).toHaveLength(2);
  });
  it('does not list the same model twice', () => {
    expect(configuredModels({ AGENT_MODEL: 'a', AGENT_FALLBACK_MODEL: 'a' })).toEqual(['a']);
  });
});

describe('isFallbackWorthy', () => {
  it('is true for rate limits, server errors and connection problems only', () => {
    expect(isFallbackWorthy({ status: 429 })).toBe(true);
    expect(isFallbackWorthy({ status: 503 })).toBe(true);
    expect(isFallbackWorthy({ status: 404 })).toBe(true); // model not available to this key
    expect(isFallbackWorthy({ name: 'APIConnectionTimeoutError' })).toBe(true);
    expect(isFallbackWorthy({ status: 400 })).toBe(false);
    expect(isFallbackWorthy({ status: 401 })).toBe(false);
    expect(isFallbackWorthy(new Error('boom'))).toBe(false);
  });
});

describe('createLlm', () => {
  it('uses the main model and reports which model answered', async () => {
    const c = fakeClient({ main: ok('from main'), backup: ok('from backup') });
    const llm = createLlm({ getClient: c.getClient, getModels: models });
    const out = await llm.chat(request);
    expect(out).toMatchObject({ model: 'main', usage: { total_tokens: 7 } });
    expect(out.message.content).toBe('from main');
    expect(c.calls).toEqual(['main']);
  });

  it('falls back to the backup model when the main one is rate-limited', async () => {
    const c = fakeClient({ main: apiError(429, { 'retry-after': '20' }), backup: ok('from backup') });
    const onFallback = jest.fn();
    const llm = createLlm({ getClient: c.getClient, getModels: models, onFallback });
    const out = await llm.chat(request);
    expect(out.model).toBe('backup');
    expect(c.calls).toEqual(['main', 'backup']);
    expect(onFallback).toHaveBeenCalledWith(expect.objectContaining({ from: 'main', to: 'backup', status: 429 }));
  });

  it('falls back on a server error too', async () => {
    const c = fakeClient({ main: apiError(503), backup: ok('ok') });
    expect((await createLlm({ getClient: c.getClient, getModels: models }).chat(request)).model).toBe('backup');
  });

  it('does NOT fall back for a malformed-request error (another model would fail the same way)', async () => {
    const c = fakeClient({ main: apiError(400), backup: ok('ok') });
    await expect(createLlm({ getClient: c.getClient, getModels: models }).chat(request)).rejects.toMatchObject({ status: 400 });
    expect(c.calls).toEqual(['main']);
  });

  it('skips a rate-limited model until its retry-after passes, then tries it again', async () => {
    let clock = 1_000_000;
    const c = fakeClient({ main: (n) => (n === 1 ? apiError(429, { 'retry-after': '20' }) : ok('main again')), backup: ok('from backup') });
    const llm = createLlm({ getClient: c.getClient, getModels: models, now: () => clock });

    await llm.chat(request);                       // main 429 → backup
    clock += 5_000;
    expect((await llm.chat(request)).model).toBe('backup');
    expect(c.calls).toEqual(['main', 'backup', 'backup']); // main was skipped, not called a 2nd time

    clock += 20_000;                                // 25s later: main is allowed again
    expect((await llm.chat(request)).model).toBe('main');
  });

  it('throws the FIRST (main model) error when every model fails', async () => {
    const first = apiError(429, { 'retry-after': '9' });
    const c = fakeClient({ main: first, backup: apiError(503) });
    await expect(createLlm({ getClient: c.getClient, getModels: models }).chat(request)).rejects.toBe(first);
  });

  it('still tries the models when ALL of them are temporarily blocked', async () => {
    let clock = 0;
    const c = fakeClient({ main: apiError(429, { 'retry-after': '60' }), backup: apiError(429, { 'retry-after': '60' }) });
    const llm = createLlm({ getClient: c.getClient, getModels: models, now: () => clock });
    await expect(llm.chat(request)).rejects.toMatchObject({ status: 429 });
    await expect(llm.chat(request)).rejects.toMatchObject({ status: 429 });
    expect(c.calls).toHaveLength(4);                // second question tried both again instead of giving up silently
  });

  it('a backup that 404s does not hide the main model\'s 429 (so the caller can wait out retry-after)', async () => {
    const limited = apiError(429, { 'retry-after': '12' });
    const c = fakeClient({ main: limited, backup: apiError(404) });
    await expect(createLlm({ getClient: c.getClient, getModels: models }).chat(request)).rejects.toBe(limited);
  });

  it('falls back when the main model is not available (404) and stops calling it for a while', async () => {
    let clock = 0;
    const c = fakeClient({ main: apiError(404), backup: ok('from backup') });
    const llm = createLlm({ getClient: c.getClient, getModels: models, now: () => clock });
    expect((await llm.chat(request)).model).toBe('backup');
    clock += 60_000;
    await llm.chat(request);
    expect(c.calls).toEqual(['main', 'backup', 'backup']);
  });

  const toolFail = () => Object.assign(new Error('400 Tool choice is none, but model called a tool'), { status: 400, error: { error: { code: 'tool_use_failed' } } });

  it('final "no tools" round: if the model still calls a tool, retries the same model with tools removed', async () => {
    const seen = [];
    const getClient = () => ({ chat: { completions: { create: async (r) => {
      seen.push(r);
      if (r.tools) throw toolFail();
      return ok('final answer');
    } } } });
    const out = await createLlm({ getClient, getModels: () => ['main'] }).chat({ messages: [], tools: [{ type: 'function' }], toolChoice: 'none' });
    expect(out.message.content).toBe('final answer');
    expect(seen).toHaveLength(2);
    expect(seen[1]).not.toHaveProperty('tools');
  });

  it('a malformed tool call from one model falls back to the next model', async () => {
    const c = fakeClient({ main: toolFail(), backup: ok('fine') });
    expect((await createLlm({ getClient: c.getClient, getModels: models }).chat(request)).model).toBe('backup');
  });

  it('sends tools only when there are some', async () => {
    const seen = [];
    const getClient = () => ({ chat: { completions: { create: async (r) => { seen.push(r); return ok('x'); } } } });
    const llm = createLlm({ getClient, getModels: models });
    await llm.chat({ messages: [], tools: [], toolChoice: 'auto' });
    await llm.chat({ messages: [], tools: [{ type: 'function' }], toolChoice: 'none' });
    expect(seen[0]).not.toHaveProperty('tools');
    expect(seen[1]).toMatchObject({ tool_choice: 'none' });
  });
});
