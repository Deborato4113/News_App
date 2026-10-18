// Numbers from a real `npm run eval` run of the agent in nexusai-news-backend.
// Update these after you re-run it; the About page shows exactly what is here
// and nothing else.
export const EVAL = {
  graded: 19,        // questions that were graded in the run
  rightTool: 95,     // % where the agent picked the expected tool(s)
  finished: 100,     // % that finished with an answer (no timeout / step limit)
  cited: 100,        // % of answerable questions that cited a source
};
