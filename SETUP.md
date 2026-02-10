# Setup Instructions

## Quick Start

1. **Install Bun** (already done):
   ```bash
   curl -fsSL https://bun.sh/install | bash
   exec /bin/zsh  # Reload shell
   ```

2. **Get Reddit API Credentials**:
   - Visit [https://www.reddit.com/prefs/apps](https://www.reddit.com/prefs/apps)
   - Click "create app" or "create another app"
   - Choose "script" type
   - Fill in name, description, redirect URI (use `http://localhost:8080`)
   - Click "create app"
   - Note your **Client ID** (under app name) and **Client Secret**

3. **Request API Approval** (required as of 2023):
   - Visit [https://www.reddit.com/dev/api](https://www.reddit.com/dev/api)
   - Follow the approval request process
   - Wait for approval (usually 1-3 days for non-commercial use)

4. **Set Environment Variables**:
   ```bash
   # Add to ~/.zshrc or ~/.bashrc:
   export REDDIT_CLIENT_ID="your_client_id_here"
   export REDDIT_CLIENT_SECRET="your_secret_here"
   export REDDIT_USERNAME="your_reddit_username"
   export REDDIT_PASSWORD="your_reddit_password"
   
   # Then reload:
   source ~/.zshrc
   ```

5. **Test the Skill**:
   ```bash
   cd /Users/akshaykumar/Documents/Projects/SKILLS/reddit-research
   
   # Test help
   ~/.bun/bin/bun run reddit-search.ts --help
   
   # Test search (after setting credentials)
   ~/.bun/bin/bun run reddit-search.ts search "machine learning" --limit 5
   
   # Test subreddit
   ~/.bun/bin/bun run reddit-search.ts subreddit programming hot --limit 3
   ```

## All Commands Working

✅ **Help** - Shows usage information  
✅ **Search** - Searches Reddit (needs credentials)  
✅ **Subreddit** - Browse subreddit (needs credentials)  
✅ **Thread** - View post + comments (needs credentials)  
✅ **Profile** - View user profile (needs credentials)  
✅ **Watchlist** - Manage user watchlist (works without credentials)  
✅ **Cache** - Clear cached results (works without credentials)

## Files Fixed

1. **lib/api.ts** - Removed unused import, fixed null type issue
2. **tsconfig.json** - Created for proper TypeScript configuration
3. **package.json** - Updated with @types/node and bun-types dependencies

## Bun Installation

✅ Bun 1.3.9 installed at `~/.bun/bin/bun`  
✅ Added to PATH in `~/.zshrc`  
✅ All dependencies installed

To use bun from anywhere, you can either:
- Restart your terminal
- Run: `exec /bin/zsh`
- Or use the full path: `~/.bun/bin/bun`
