# reddit-research

Reddit research agent for [Claude Code](https://code.claude.com) and [OpenClaw](https://openclaw.ai). Search, browse, analyze — all from the terminal.

## What it does

Wraps the Reddit API into a fast CLI so your AI agent (or you) can search discussions, browse subreddits, pull threads, and get sourced research without writing API requests.

- **Search** with filters, sorting, time windows
- **Browse subreddits** (hot, new, top, rising)
- **Read threads** with full comment trees
- **Monitor users** with watchlists
- **Cache** to avoid repeat API calls (15min TTL, 1hr for quick mode)
- **Free tier** — 100 queries/minute for non-commercial use

## Install

### Claude Code
```bash
# From your project
mkdir -p .claude/skills
cd .claude/skills
# Copy the reddit-research directory here
```

### OpenClaw
```bash
# From your workspace
mkdir -p skills
cd skills
# Copy the reddit-research directory here
```

## Setup

1. **Reddit Application** — Create one at [reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
   - Click "create app" or "create another app"
   - **Select "script" type** (Important: Do not select "web app"!)
   - Note Client ID (under app name) and Client Secret

2. **API Approval** — As of late 2023, new API access requires approval:
   - Visit [reddit.com/dev/api](https://www.reddit.com/dev/api)
   - Follow the approval request process
   - Wait for approval (usually quick for research/non-commercial use)

3. **Set environment variables:**
   ```bash
   export REDDIT_CLIENT_ID="your_client_id"
   export REDDIT_CLIENT_SECRET="your_client_secret"
   export REDDIT_USERNAME="your_reddit_username"
   export REDDIT_PASSWORD="your_reddit_password"
   ```
   Or save to `~/.config/env/global.env`:
   ```
   REDDIT_CLIENT_ID=your_client_id
   REDDIT_CLIENT_SECRET=your_client_secret
   REDDIT_USERNAME=your_reddit_username
   REDDIT_PASSWORD=your_reddit_password
   ```

4. **Install Bun** (for CLI tooling): https://bun.sh

## Usage

### Natural language (just talk to Claude)
- "What's Reddit saying about Claude 3.5 Sonnet?"
- "Search Reddit for Python vs Rust discussions"
- "What are developers saying about Next.js 15?"
- "Check r/programming for React 19 feedback"

### CLI commands
```bash
cd skills/reddit-research

# Search (sorted by relevance, filtered by time)
bun run reddit-search.ts search "your query" --limit 10

# Subreddit — browse posts
bun run reddit-search.ts subreddit programming hot --limit 5

# Thread — full post + comments
bun run reddit-search.ts thread POST_ID --subreddit SUBREDDIT_NAME

# Profile — user's recent posts
bun run reddit-search.ts profile username

# Watchlist
bun run reddit-search.ts watchlist add username "optional note"
bun run reddit-search.ts watchlist check

# Save research to file
bun run reddit-search.ts search "query" --save --markdown
```

### Search options
```
--subreddit NAME              Limit to specific subreddit
--sort TYPE                   relevance|hot|top|new|comments (default: relevance)
--time PERIOD                 hour|day|week|month|year|all (default: week)
--limit N                     Results to display (default: 15, max: 100)
--quick                       Quick mode (see below)
--min-upvotes N               Filter by minimum upvotes
--save                        Save to ~/clawd/drafts/
--json                        Raw JSON output
--markdown                    Markdown research doc
```

## Quick Mode

`--quick` is designed for fast, focused lookups when you just need a pulse check on a topic.

**What it does:**
- Forces single page (max 10 results) — reduces API calls
- Uses 1-hour cache TTL instead of 15 minutes
- Shows usage summary after results

**Examples:**
```bash
# Quick pulse check on a topic
bun run reddit-search.ts search "Bun vs Node.js" --quick

# Quick quality-filtered results
bun run reddit-search.ts search "AI agents" --min-upvotes 100 --quick
```

**Why it's useful:**
- Prevents excessive queries
- 1hr cache means repeat searches are instant
- Perfect for quick sentiment checks

## Rate Limits & Pricing

Reddit API uses **free tier** for non-commercial use with OAuth2 authentication.

**Free tier:**
- 100 queries per minute (QPM)
- Requires OAuth2 credentials
- No cost for research/non-commercial use
- Approval required (as of late 2023)

**How reddit-search saves API calls:**
- Cache (15min default, 1hr in quick mode) — repeat queries are free
- Targeted searches reduce unnecessary requests
- `--min-upvotes` filters client-side (no extra API calls)

## File structure

```
reddit-research/
├── SKILL.md              # Agent instructions (Claude reads this)
├── README.md             # This file
├── reddit-search.ts      # CLI entry point
├── lib/
│   ├── api.ts            # Reddit API wrapper
│   ├── cache.ts          # File-based cache
│   └── format.ts         # Terminal + markdown formatters
├── data/
│   ├── watchlist.json    # Users to monitor
│   └── cache/            # Auto-managed
└── references/
    └── reddit-api.md     # API reference
```

## Security

**Credentials handling:** reddit-search reads credentials from environment variables or `~/.config/env/global.env`. The credentials are never printed to stdout, but be aware:

- **AI coding agents** may log tool calls in session transcripts. Your credentials could appear in those logs.
- **Recommendations:**
  - Set credentials as system env vars (not inline in commands)
  - Review your agent's session log settings
  - Use a Reddit account dedicated to API access
  - Rotate credentials if you suspect exposure

## Limitations

- Read-only — never posts or interacts
- Requires Reddit API access with approval ([request here](https://www.reddit.com/dev/api))
- No NSFW content access via Data API (restricted as of July 2023)
- Rate limit: 100 QPM (free tier)

## License

MIT
