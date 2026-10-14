# Ask NexusAI — evaluation results

Run on 2026-10-14 · main model `openai/gpt-oss-20b` · 20 fixed questions

| Metric | Result |
|---|---|
| Chose the right tool(s) | **95%** |
| Finished with an answer (no timeout / step limit) | **100%** |
| Cited sources (when articles were found) | **100%** (10 applicable) |
| Average response time | 2.2s (median 1.6s) |
| Average tool calls per question | 1.3 |
| Average tokens per question | 3489 |
| Made-up source links caught and removed | 1 |
| Runs that crashed | 0 |
| Not graded: AI provider quota/size limit | 1 of 20 (excluded from the percentages above) |

## Tool choice by category

| Category | Correct | |
|---|---|---|
| news | 6/6 | 100% |
| multi-tool | 1/1 | 100% |
| quiz history | 3/3 | 100% |
| quiz | 2/2 | 100% |
| compare | 2/2 | 100% |
| briefing | 2/2 | 100% |
| bookmark | 0/1 | 0% |
| small talk | 2/2 | 100% |

## Every question

| ID | Right tools | Answered | Cited | Time | Tools used |
|---|---|---|---|---|---|
| news-01 | ✅ | ✅ | ✅ | 1.6s | search_news |
| news-02 | ✅ | ✅ | ✅ | 1.3s | search_news |
| news-03 | ✅ | ✅ | ✅ | 2.1s | search_news |
| news-04 | ✅ | ✅ | ✅ | 5.2s | search_news |
| news-05 | ✅ | ✅ | ✅ | 2.3s | search_news |
| news-06 | ✅ | ✅ | ✅ | 3.3s | search_news, get_article |
| news-07 | ❌ | ❌ | – | 0.0s | not graded (quota): 429 {"error":{"message":"Rate limit reached for model `openai/gpt-oss-20b` in organization `org_01kv50cvb7e53911xjwxdstf0n` service tier `on_demand` on tokens per day (TPD): Limit 200000, Used 197525, |
| multi-01 | ✅ | ✅ | ✅ | 2.7s | search_news, get_quiz_history |
| history-01 | ✅ | ✅ | – | 1.4s | get_quiz_history |
| history-02 | ✅ | ✅ | – | 1.3s | get_quiz_history |
| history-03 | ✅ | ✅ | – | 1.6s | get_quiz_history |
| quiz-01 | ✅ | ✅ | – | 4.6s | generate_quiz |
| quiz-02 | ✅ | ✅ | – | 4.2s | generate_quiz |
| compare-01 | ✅ | ✅ | ✅ | 1.4s | compare_regions |
| compare-02 | ✅ | ✅ | – | 1.4s | compare_regions |
| briefing-01 | ✅ | ✅ | ✅ | 1.3s | daily_briefing |
| briefing-02 | ✅ | ✅ | ✅ | 1.9s | daily_briefing |
| save-01 | ❌ | ✅ | – | 1.7s | search_news |
| chat-01 | ✅ | ✅ | – | 0.9s | none |
| chat-02 | ✅ | ✅ | – | 0.8s | none |
