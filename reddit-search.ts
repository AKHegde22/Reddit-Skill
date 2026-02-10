#!/usr/bin/env bun
/**
 * reddit-search — CLI for Reddit research.
 *
 * Commands:
 *   search <query> [options]      Search Reddit posts
 *   subreddit <name> [sort]       Browse subreddit
 *   thread <post_id>              Fetch post + comments
 *   profile <username>            User's recent posts
 *   watchlist [action]            Manage watchlist
 *   cache clear                   Clear cached results
 *
 * Options (search):
 *   --subreddit NAME              Limit to specific subreddit
 *   --sort relevance|hot|top|new|comments  (default: relevance)
 *   --time hour|day|week|month|year|all    (default: week)
 *   --limit N                     Results to display (default: 15, max: 100)
 *   --quick                       Quick mode (1 page, 10 results, 1hr cache)
 *   --min-upvotes N               Filter by minimum upvotes
 *   --save                        Save to ~/clawd/drafts/
 *   --json                        Raw JSON output
 *   --markdown                    Markdown output
 */

import { existsSync, writeFileSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";
import * as api from "./lib/api";
import * as cache from "./lib/cache";
import * as fmt from "./lib/format";

const SKILL_DIR = import.meta.dir;
const WATCHLIST_PATH = join(SKILL_DIR, "data", "watchlist.json");
const DRAFTS_DIR = join(process.env.HOME!, "clawd", "drafts");

// --- Arg parsing ---

const args = process.argv.slice(2);
const command = args[0];

function getFlag(name: string): boolean {
    return args.includes(`--${name}`);
}

function getOpt(name: string): string | undefined {
    const index = args.findIndex((a) => a === `--${name}`);
    if (index === -1 || index === args.length - 1) return undefined;
    return args[index + 1];
}

// --- Watchlist ---

interface Watchlist {
    users: { username: string; note?: string; addedAt: string }[];
}

function loadWatchlist(): Watchlist {
    if (!existsSync(WATCHLIST_PATH)) return { users: [] };
    return JSON.parse(readFileSync(WATCHLIST_PATH, "utf-8"));
}

function saveWatchlist(wl: Watchlist) {
    writeFileSync(WATCHLIST_PATH, JSON.stringify(wl, null, 2));
}

// --- Commands ---

async function cmdSearch() {
    const query = args[1];
    if (!query) {
        console.error("Usage: reddit-search search <query> [options]");
        process.exit(1);
    }

    const isQuick = getFlag("quick");
    const subreddit = getOpt("subreddit");
    const sort = (getOpt("sort") || "relevance") as any;
    const time = (getOpt("time") || "week") as any;
    const limit = parseInt(getOpt("limit") || (isQuick ? "10" : "15"));
    const minUpvotesStr = getOpt("min-upvotes");
    const minUpvotes = minUpvotesStr ? parseInt(minUpvotesStr) : undefined;
    const asJson = getFlag("json");
    const asMarkdown = getFlag("markdown");
    const shouldSave = getFlag("save");

    const ttl = isQuick ? 60 * 60 * 1000 : 15 * 60 * 1000; // 1hr vs 15min
    const cacheKey = `search:${query}:${subreddit || "all"}:${sort}:${time}:${limit}`;

    // Check cache
    let posts = cache.get(cacheKey, "", ttl);
    let fromCache = false;

    if (!posts) {
        const result = await api.search(query, { subreddit, sort, time, limit });
        posts = result.posts;
        cache.set(cacheKey, "", posts);
    } else {
        fromCache = true;
    }

    // Apply filters
    if (minUpvotes) {
        posts = api.filterEngagement(posts, { minUpvotes });
    }

    // Output
    if (asJson) {
        console.log(JSON.stringify(posts, null, 2));
    } else if (asMarkdown) {
        const md = fmt.formatResearchMarkdown(query, posts, {
            subreddit,
            apiCalls: fromCache ? 0 : 1,
        });
        console.log(md);
    } else {
        console.log(fmt.formatResultsTerminal(posts, { query, limit }));
    }

    // Save if requested
    if (shouldSave) {
        if (!existsSync(DRAFTS_DIR)) mkdirSync(DRAFTS_DIR, { recursive: true });
        const slug = query.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const date = new Date().toISOString().split("T")[0];
        const filename = `reddit-research-${slug}-${date}.md`;
        const path = join(DRAFTS_DIR, filename);

        const md = fmt.formatResearchMarkdown(query, posts, {
            subreddit,
            apiCalls: fromCache ? 0 : 1,
        });
        writeFileSync(path, md);
        console.log(`\n✅ Saved to ${path}`);
    }

    // Stats
    if (isQuick) {
        console.log(
            `\n📊 Quick mode: ${posts.length} results, ${fromCache ? "cached" : "API call"}, FREE (100 QPM tier)`
        );
    }
}

async function cmdSubreddit() {
    const name = args[1];
    const sort = (args[2] || "hot") as "hot" | "new" | "top" | "rising";

    if (!name) {
        console.error("Usage: reddit-search subreddit <name> [hot|new|top|rising]");
        process.exit(1);
    }

    const time = getOpt("time") as any;
    const limit = parseInt(getOpt("limit") || "15");

    const cacheKey = `subreddit:${name}:${sort}:${time || ""}:${limit}`;
    let posts = cache.get(cacheKey);

    if (!posts) {
        const result = await api.subreddit(name, sort, { time, limit });
        posts = result.posts;
        cache.set(cacheKey, "", posts);
    }

    console.log(`r/${name} — ${sort}\n`);
    console.log(fmt.formatResultsTerminal(posts, { limit }));
}

async function cmdThread() {
    const postId = args[1];
    if (!postId) {
        console.error("Usage: reddit-search thread <post_id>");
        process.exit(1);
    }

    // Extract subreddit and post ID from URL or ID
    // For simplicity, ask user to provide both or look up post first
    const subreddit = getOpt("subreddit");
    if (!subreddit) {
        console.error(
            "Error: --subreddit required for thread command (e.g., --subreddit programming)"
        );
        process.exit(1);
    }

    const depth = parseInt(getOpt("depth") || "5");
    const limit = parseInt(getOpt("limit") || "50");
    const sort = (getOpt("sort") || "confidence") as any;

    const { post, comments } = await api.thread(subreddit, postId, {
        depth,
        limit,
        sort,
    });

    console.log(fmt.formatPostTerminal(post, undefined, { full: true }));
    console.log(`\n--- ${comments.length} comments ---\n`);
    console.log(comments.map((c) => fmt.formatCommentTerminal(c)).join("\n\n"));
}

async function cmdProfile() {
    const username = args[1];
    if (!username) {
        console.error("Usage: reddit-search profile <username>");
        process.exit(1);
    }

    const count = parseInt(getOpt("count") || "10");

    const cacheKey = `profile:${username}:${count}`;
    let data = cache.get(cacheKey);

    if (!data) {
        data = await api.profile(username, { count });
        cache.set(cacheKey, "", data);
    }

    console.log(fmt.formatProfileTerminal(data.user, data.posts));
}

async function cmdWatchlist() {
    const action = args[1];

    if (!action || action === "list") {
        const wl = loadWatchlist();
        console.log("📋 Watchlist:\n");
        if (wl.users.length === 0) {
            console.log("(empty)");
        } else {
            wl.users.forEach((u) => {
                console.log(`  u/${u.username}${u.note ? ` — ${u.note}` : ""}`);
            });
        }
        return;
    }

    if (action === "add") {
        const username = args[2];
        const note = args.slice(3).join(" ");
        if (!username) {
            console.error("Usage: reddit-search watchlist add <username> [note]");
            process.exit(1);
        }

        const wl = loadWatchlist();
        if (wl.users.find((u) => u.username === username)) {
            console.log(`u/${username} already in watchlist`);
            return;
        }

        wl.users.push({
            username,
            note,
            addedAt: new Date().toISOString(),
        });
        saveWatchlist(wl);
        console.log(`✅ Added u/${username} to watchlist`);
        return;
    }

    if (action === "remove") {
        const username = args[2];
        if (!username) {
            console.error("Usage: reddit-search watchlist remove <username>");
            process.exit(1);
        }

        const wl = loadWatchlist();
        wl.users = wl.users.filter((u) => u.username !== username);
        saveWatchlist(wl);
        console.log(`✅ Removed u/${username} from watchlist`);
        return;
    }

    if (action === "check") {
        const wl = loadWatchlist();
        console.log(`🔍 Checking ${wl.users.length} watchlist users...\n`);

        for (const u of wl.users) {
            try {
                const { user, posts } = await api.profile(u.username, { count: 3 });
                console.log(`\n--- u/${u.username} ${u.note ? `(${u.note})` : ""} ---`);
                posts.forEach((p, i) => console.log(fmt.formatPostTerminal(p, i)));
            } catch (e: any) {
                console.log(`\n--- u/${u.username} ---`);
                console.log(`Error: ${e.message}`);
            }
        }
        return;
    }

    console.error(
        "Usage: reddit-search watchlist [list|add|remove|check] [args]"
    );
    process.exit(1);
}

function cmdCache() {
    const action = args[1];

    if (action === "clear") {
        const count = cache.clear();
        console.log(`✅ Cleared ${count} cached entries`);
        return;
    }

    console.error("Usage: reddit-search cache clear");
    process.exit(1);
}

function usage() {
    console.log(`reddit-search — Reddit research CLI

Commands:
  search <query> [options]      Search Reddit posts
  subreddit <name> [sort]       Browse subreddit (hot|new|top|rising)
  thread <post_id>              Fetch post + comments
  profile <username>            User's recent posts
  watchlist [action]            Manage watchlist (add|remove|check|list)
  cache clear                   Clear cached results

Search Options:
  --subreddit NAME              Limit to specific subreddit
  --sort TYPE                   relevance|hot|top|new|comments (default: relevance)
  --time PERIOD                 hour|day|week|month|year|all (default: week)
  --limit N                     Results to display (default: 15, max: 100)
  --quick                       Quick mode (1 page, 10 results, 1hr cache)
  --min-upvotes N               Filter by minimum upvotes
  --save                        Save to ~/clawd/drafts/
  --json                        Raw JSON output
  --markdown                    Markdown output

Examples:
  reddit-search search "machine learning" --limit 10
  reddit-search search "python tips" --subreddit learnpython --sort top
  reddit-search subreddit programming hot --limit 5
  reddit-search profile spez --count 5
  reddit-search watchlist add awildsketchappeared "Artist"
  reddit-search watchlist check
`);
}

// --- Main ---

async function main() {
    if (!command || command === "help" || command === "--help") {
        usage();
        process.exit(0);
    }

    try {
        switch (command) {
            case "search":
                await cmdSearch();
                break;
            case "subreddit":
                await cmdSubreddit();
                break;
            case "thread":
                await cmdThread();
                break;
            case "profile":
                await cmdProfile();
                break;
            case "watchlist":
                await cmdWatchlist();
                break;
            case "cache":
                cmdCache();
                break;
            default:
                console.error(`Unknown command: ${command}`);
                usage();
                process.exit(1);
        }
    } catch (error: any) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
}

main();
