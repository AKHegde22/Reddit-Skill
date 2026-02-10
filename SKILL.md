---
name: reddit-research
description: >
  General-purpose Reddit research agent. Searches Reddit for discussions,
  community sentiment, technical insights, product feedback, and expert opinions.
  Works like a web research agent but uses Reddit as the source.
  Use when: (1) user says "reddit research", "search reddit for", "what's reddit saying",
  "check reddit for", "/reddit-research", (2) user is working on something where Reddit
  discussions would provide useful context (library comparisons, tech debates, community
  sentiment, product reviews), (3) user wants to find what communities/devs think about a topic.
  NOT for: posting, account management. Note: requires Reddit API credentials (OAuth2).
  Free tier: 100 queries/minute for non-commercial use.
---

# Reddit Research

General-purpose agentic research over Reddit. Decompose any research question into targeted searches, browse subreddits, follow threads, and synthesize into a sourced briefing.

For Reddit API details (endpoints, operators, response format): read `references/reddit-api.md`.

## CLI Tool

All commands run from this skill directory:

```bash
cd ~/skills/reddit-research  # or appropriate path
source ~/.config/env/global.env
```

### Search

```bash
bun run reddit-search.ts search "<query>" [options]
```

**Options:**
- `--subreddit NAME` — limit to specific subreddit
- `--sort relevance|hot|top|new|comments` — sort order (default: relevance)
- `--time hour|day|week|month|year|all` — time filter (default: week)
- `--limit N` — results to display (default: 15, max: 100)
- `--quick` — quick mode: 1 page, max 10 results, 1hr cache
- `--min-upvotes N` — filter by minimum upvotes
- `--save` — save results to `~/clawd/drafts/reddit-research-{slug}-{date}.md`
- `--json` — raw JSON output
- `--markdown` — markdown output for research docs

**Examples:**
```bash
bun run reddit-search.ts search "machine learning roadmap" --limit 10
bun run reddit-search.ts search "python vs rust" --subreddit programming --sort top
bun run reddit-search.ts search "best IDE 2026" --time month --save
bun run reddit-search.ts search "AI agents" --min-upvotes 100 --quick
```

### Subreddit

```bash
bun run reddit-search.ts subreddit <name> [hot|new|top|rising]
```

Browse posts from a specific subreddit.

**Examples:**
```bash
bun run reddit-search.ts subreddit programming hot --limit 5
bun run reddit-search.ts subreddit askreddit top --time week
```

### Thread

```bash
bun run reddit-search.ts thread <post_id> --subreddit <name>
```

Fetch full post + comment tree.

**Options:**
- `--subreddit NAME` (required)
- `--depth N` — max comment depth (0-8, default: 5)
- `--limit N` — max comments (default: 50)
- `--sort confidence|top|new|controversial|old` (default: confidence)

### Profile

```bash
bun run reddit-search.ts profile <username> [--count N]
```

Fetches recent posts from a specific user.

### Watchlist

```bash
bun run reddit-search.ts watchlist                    # Show all
bun run reddit-search.ts watchlist add <user> [note]  # Add user
bun run reddit-search.ts watchlist remove <user>       # Remove user
bun run reddit-search.ts watchlist check               # Check recent from all
```

Watchlist stored in `data/watchlist.json`. Use for monitoring key community members.

### Cache

```bash
bun run reddit-search.ts cache clear    # Clear all cached results
```

15-minute TTL (1-hour for quick mode). Avoids re-fetching identical queries.

## Research Loop (Agentic)

When doing deep research (not just a quick search), follow this loop:

### 1. Decompose the Question into Queries

Turn the research question into 3-5 targeted queries:

- **Core query**: Direct keywords for the topic
- **Subreddit-specific**: Target relevant communities (r/programming, r/machinelearning, etc.)
- **Time-filtered**: Recent discussions (`--time day` or `--time week`)
- **Engagement-filtered**: High-quality posts (`--min-upvotes 50`)
- **Comparative**: "X vs Y", "best X for Y", "X alternatives"

### 2. Search and Extract

Run each query via CLI. After each, assess:
- Signal or noise? Adjust filters (`--min-upvotes`, `--time`).
- Key discussions worth deep-diving via `thread` command?
- Relevant subreddits to explore via `subreddit` command?
- Users worth monitoring via `watchlist` command?

### 3. Follow Threads

When a post has high engagement or detailed discussion:
```bash
bun run reddit-search.ts thread <post_id> --subreddit <name>
```

### 4. Synthesize

Group findings by theme, not by query:

```
### [Theme/Finding Title]

[1-2 sentence summary]

- r/programming by u/username: "[key insight]" (500⬆ 45💬) [Post](url)
- r/learnprogramming by u/username2: "[another perspective]" (200⬆ 30💬) [Post](url)

Key takeaways:
- Point 1
- Point 2
```

### 5. Save

Use `--save` flag or save manually to `~/clawd/drafts/reddit-research-{topic-slug}-{YYYY-MM-DD}.md`.

## Refinement Heuristics

- **Too much noise?** Add `--min-upvotes`, narrow time window (`--time day`), target specific subreddit
- **Too few results?** Broaden keywords, remove filters, expand time window (`--time year`)
- **Want expert takes?** Use `--min-upvotes 100`, search in specialized subreddits
- **Recent discussions only?** Use `--time day` or `--time week`
- **Comparative research?** Search "X vs Y", "X alternatives", "switching from X to Y"

## File Structure

```
skills/reddit-research/
├── SKILL.md           (this file)
├── reddit-search.ts   (CLI entry point)
├── lib/
│   ├── api.ts         (Reddit API wrapper: search, subreddit, thread, profile)
│   ├── cache.ts       (file-based cache, 15min TTL)
│   └── format.ts      (terminal + markdown formatters)
├── data/
│   ├── watchlist.json (users to monitor)
│   └── cache/         (auto-managed)
└── references/
    └── reddit-api.md  (Reddit API endpoint reference)
```

## Rate Limits & Cost

- **Free tier**: 100 queries per minute (QPM) with OAuth2 authentication
- **Requires**: Reddit account + registered application (OAuth2 credentials)
- **No cost** for non-commercial research use
- **Approval required**: As of late 2023, new API access requires approval request
- **Limitations**: No NSFW content access via Data API
