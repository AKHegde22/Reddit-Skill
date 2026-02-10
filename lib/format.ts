/**
 * Format Reddit posts and comments for terminal or markdown output.
 */

import type { Post, Comment, User } from "./api";

function compactNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
}

function timeAgo(unixTime: number): string {
    const diff = Date.now() - unixTime * 1000;
    const mins = Math.floor(diff / 60_000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
}

/**
 * Format a single post for terminal (monospace-friendly).
 */
export function formatPostTerminal(
    p: Post,
    index?: number,
    opts?: { full?: boolean }
): string {
    const prefix = index !== undefined ? `${index + 1}. ` : "";
    const engagement = `${compactNumber(p.upvotes)}⬆ ${compactNumber(p.num_comments)}💬`;
    const time = timeAgo(p.created_utc);

    const title = opts?.full || p.title.length <= 150 ? p.title : p.title.slice(0, 147) + "...";

    let out = `${prefix}r/${p.subreddit} • u/${p.author} (${engagement} • ${time})\n${title}`;

    if (p.selftext && opts?.full) {
        const text = p.selftext.length <= 300 ? p.selftext : p.selftext.slice(0, 297) + "...";
        out += `\n${text}`;
    }

    out += `\n${p.post_url}`;

    return out;
}

/**
 * Format a list of posts for terminal.
 */
export function formatResultsTerminal(
    posts: Post[],
    opts: { query?: string; limit?: number } = {}
): string {
    const limit = opts.limit || 15;
    const shown = posts.slice(0, limit);

    let out = "";
    if (opts.query) {
        out += `🔍 "${opts.query}" — ${posts.length} results\n\n`;
    }

    out += shown.map((p, i) => formatPostTerminal(p, i)).join("\n\n");

    if (posts.length > limit) {
        out += `\n\n... +${posts.length - limit} more`;
    }

    return out;
}

/**
 * Format a single post for markdown (research docs).
 */
export function formatPostMarkdown(p: Post): string {
    const engagement = `${p.upvotes}⬆ ${p.num_comments}💬`;
    const title = p.title.replace(/\n/g, " ");

    let out = `- **r/${p.subreddit}** by u/${p.author} (${engagement}) [Post](${p.post_url})\n  > ${title}`;

    if (p.selftext) {
        const text = p.selftext.replace(/\n/g, "\n  > ").slice(0, 200);
        out += `\n  > ${text}${p.selftext.length > 200 ? "..." : ""}`;
    }

    return out;
}

/**
 * Format a comment for terminal.
 */
export function formatCommentTerminal(c: Comment, indent: number = 0): string {
    const prefix = "  ".repeat(indent);
    const engagement = `${compactNumber(c.upvotes)}⬆`;
    const time = timeAgo(c.created_utc);

    const body = c.body.length <= 200 ? c.body : c.body.slice(0, 197) + "...";
    const cleanBody = body.replace(/\n/g, `\n${prefix}  `);

    let out = `${prefix}u/${c.author} (${engagement} • ${time})\n${prefix}  ${cleanBody}`;

    if (c.replies && c.replies.length > 0) {
        out += "\n" + c.replies.map((r) => formatCommentTerminal(r, indent + 1)).join("\n");
    }

    return out;
}

/**
 * Format results as a full markdown research document.
 */
export function formatResearchMarkdown(
    query: string,
    posts: Post[],
    opts: {
        subreddit?: string;
        apiCalls?: number;
    } = {}
): string {
    const date = new Date().toISOString().split("T")[0];

    let out = `# Reddit Research: ${query}\n\n`;
    out += `**Date:** ${date}\n`;
    if (opts.subreddit) out += `**Subreddit:** r/${opts.subreddit}\n`;
    out += `**Posts found:** ${posts.length}\n\n`;

    out += `## Top Results (by engagement)\n\n`;
    out += posts
        .slice(0, 30)
        .map(formatPostMarkdown)
        .join("\n\n");
    out += "\n\n";

    out += `---\n\n## Research Metadata\n`;
    out += `- **Query:** ${query}\n`;
    out += `- **Date:** ${date}\n`;
    if (opts.apiCalls) out += `- **API calls:** ${opts.apiCalls}\n`;
    out += `- **Posts scanned:** ${posts.length}\n`;
    out += `- **Rate limit:** 100 QPM (Free tier)\n`;

    return out;
}

/**
 * Format a user profile for terminal.
 */
export function formatProfileTerminal(user: User, posts: Post[]): string {
    let out = `👤 u/${user.name}\n`;
    out += `${compactNumber(user.link_karma)} link karma • ${compactNumber(user.comment_karma)} comment karma\n`;
    out += `Account age: ${timeAgo(user.created_utc)}\n`;
    out += `\nRecent posts:\n\n`;
    out += posts
        .slice(0, 10)
        .map((p, i) => formatPostTerminal(p, i))
        .join("\n\n");

    return out;
}
