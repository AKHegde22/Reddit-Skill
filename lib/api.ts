/**
 * Reddit API wrapper — search, subreddits, threads, profiles
 * Uses OAuth2 authentication with Reddit credentials from env
 */

import { readFileSync } from "fs";

const BASE = "https://oauth.reddit.com";
const AUTH_BASE = "https://www.reddit.com/api/v1";
const RATE_DELAY_MS = 600; // 100 QPM = 600ms between requests

let accessToken: string | null = null;
let tokenExpiry: number = 0;

interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
}

function getCredentials(): {
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
} {
    const clientId = process.env.REDDIT_CLIENT_ID;
    const clientSecret = process.env.REDDIT_CLIENT_SECRET;
    const username = process.env.REDDIT_USERNAME;
    const password = process.env.REDDIT_PASSWORD;

    if (!clientId || !clientSecret || !username || !password) {
        throw new Error(
            "Missing Reddit credentials. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD"
        );
    }

    return { clientId, clientSecret, username, password };
}

async function getToken(): Promise<string> {
    // Return cached token if still valid (with 5min buffer)
    if (accessToken && Date.now() < tokenExpiry - 5 * 60 * 1000) {
        return accessToken;
    }

    const { clientId, clientSecret, username, password } = getCredentials();

    const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString(
        "base64"
    );

    const params = new URLSearchParams({
        grant_type: "password",
        username,
        password,
    });

    const response = await fetch(`${AUTH_BASE}/access_token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "reddit-research-skill/1.0",
        },
        body: params.toString(),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OAuth2 authentication failed: ${error}`);
    }

    const data = (await response.json()) as TokenResponse;
    accessToken = data.access_token;
    tokenExpiry = Date.now() + data.expires_in * 1000;

    return accessToken!;
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface Post {
    id: string;
    title: string;
    selftext: string;
    author: string;
    subreddit: string;
    created_utc: number;
    url: string;
    permalink: string;
    upvotes: number;
    num_comments: number;
    score: number;
    over_18: boolean;
    post_url: string;
}

export interface Comment {
    id: string;
    body: string;
    author: string;
    created_utc: number;
    upvotes: number;
    score: number;
    depth: number;
    replies?: Comment[];
}

export interface User {
    name: string;
    link_karma: number;
    comment_karma: number;
    created_utc: number;
    total_karma: number;
}

interface RawResponse {
    data?: {
        children?: any[];
        after?: string;
        before?: string;
    };
    error?: string;
}

function parsePost(raw: any): Post {
    const d = raw.data || raw;
    return {
        id: d.id,
        title: d.title || "",
        selftext: d.selftext || "",
        author: d.author || "[deleted]",
        subreddit: d.subreddit,
        created_utc: d.created_utc,
        url: d.url || "",
        permalink: d.permalink,
        upvotes: d.ups || 0,
        num_comments: d.num_comments || 0,
        score: d.score || 0,
        over_18: d.over_18 || false,
        post_url: `https://reddit.com${d.permalink}`,
    };
}

function parseComment(raw: any, depth: number = 0): Comment {
    const d = raw.data;
    const comment: Comment = {
        id: d.id,
        body: d.body || "",
        author: d.author || "[deleted]",
        created_utc: d.created_utc,
        upvotes: d.ups || 0,
        score: d.score || 0,
        depth,
    };

    // Parse replies recursively
    if (d.replies && d.replies.data && d.replies.data.children) {
        comment.replies = d.replies.data.children
            .filter((c: any) => c.kind === "t1") // Only comments, not "more"
            .map((c: any) => parseComment(c, depth + 1));
    }

    return comment;
}

async function apiGet(endpoint: string): Promise<any> {
    const token = await getToken();

    const response = await fetch(`${BASE}${endpoint}`, {
        headers: {
            Authorization: `Bearer ${token}`,
            "User-Agent": "reddit-research-skill/1.0",
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Reddit API error: ${response.status} ${error}`);
    }

    await sleep(RATE_DELAY_MS); // Rate limiting
    return response.json();
}

/**
 * Search posts across Reddit or within a subreddit
 */
export async function search(
    query: string,
    opts: {
        subreddit?: string;
        sort?: "relevance" | "hot" | "top" | "new" | "comments";
        time?: "hour" | "day" | "week" | "month" | "year" | "all";
        limit?: number;
        after?: string;
    } = {}
): Promise<{ posts: Post[]; after?: string }> {
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("sort", opts.sort || "relevance");
    if (opts.time) params.set("t", opts.time);
    params.set("limit", String(opts.limit || 25));
    if (opts.after) params.set("after", opts.after);
    params.set("raw_json", "1");

    const endpoint = opts.subreddit
        ? `/r/${opts.subreddit}/search?${params}`
        : `/search?${params}`;

    const data = await apiGet(endpoint);
    const posts = (data.data?.children || []).map((c: any) => parsePost(c));

    return {
        posts,
        after: data.data?.after,
    };
}

/**
 * Get posts from a subreddit
 */
export async function subreddit(
    name: string,
    sort: "hot" | "new" | "top" | "rising" = "hot",
    opts: {
        time?: "hour" | "day" | "week" | "month" | "year" | "all";
        limit?: number;
        after?: string;
    } = {}
): Promise<{ posts: Post[]; after?: string }> {
    const params = new URLSearchParams();
    if (opts.time) params.set("t", opts.time);
    params.set("limit", String(opts.limit || 25));
    if (opts.after) params.set("after", opts.after);
    params.set("raw_json", "1");

    const endpoint = `/r/${name}/${sort}?${params}`;
    const data = await apiGet(endpoint);
    const posts = (data.data?.children || []).map((c: any) => parsePost(c));

    return {
        posts,
        after: data.data?.after,
    };
}

/**
 * Fetch a post with its comment tree
 */
export async function thread(
    subreddit: string,
    postId: string,
    opts: {
        depth?: number;
        limit?: number;
        sort?: "confidence" | "top" | "new" | "controversial" | "old";
    } = {}
): Promise<{ post: Post; comments: Comment[] }> {
    const params = new URLSearchParams();
    if (opts.depth !== undefined) params.set("depth", String(opts.depth));
    if (opts.limit) params.set("limit", String(opts.limit));
    if (opts.sort) params.set("sort", opts.sort);
    params.set("raw_json", "1");

    const endpoint = `/r/${subreddit}/comments/${postId}?${params}`;
    const data = await apiGet(endpoint);

    // Reddit returns [listing with post, listing with comments]
    const postListing = data[0];
    const commentListing = data[1];

    const post = parsePost(postListing.data.children[0]);
    const comments = (commentListing.data?.children || [])
        .filter((c: any) => c.kind === "t1")
        .map((c: any) => parseComment(c, 0));

    return { post, comments };
}

/**
 * Get user profile and recent posts
 */
export async function profile(
    username: string,
    opts: { count?: number } = {}
): Promise<{ user: User; posts: Post[] }> {
    // Get user info
    const userEndpoint = `/user/${username}/about`;
    const userData = await apiGet(userEndpoint);
    const u = userData.data;

    const user: User = {
        name: u.name,
        link_karma: u.link_karma || 0,
        comment_karma: u.comment_karma || 0,
        created_utc: u.created_utc,
        total_karma: u.total_karma || 0,
    };

    // Get user's recent posts
    const params = new URLSearchParams();
    params.set("limit", String(opts.count || 10));
    params.set("raw_json", "1");

    const postsEndpoint = `/user/${username}/submitted?${params}`;
    const postsData = await apiGet(postsEndpoint);
    const posts = (postsData.data?.children || []).map((c: any) => parsePost(c));

    return { user, posts };
}

/**
 * Sort posts by engagement metric
 */
export function sortBy(
    posts: Post[],
    metric: "upvotes" | "comments" | "score" = "upvotes"
): Post[] {
    return [...posts].sort((a, b) => {
        if (metric === "upvotes") return b.upvotes - a.upvotes;
        if (metric === "comments") return b.num_comments - a.num_comments;
        return b.score - a.score;
    });
}

/**
 * Filter posts by minimum engagement
 */
export function filterEngagement(
    posts: Post[],
    opts: { minUpvotes?: number; minComments?: number }
): Post[] {
    return posts.filter((p) => {
        if (opts.minUpvotes && p.upvotes < opts.minUpvotes) return false;
        if (opts.minComments && p.num_comments < opts.minComments) return false;
        return true;
    });
}

/**
 * Deduplicate posts by ID
 */
export function dedupe(posts: Post[]): Post[] {
    const seen = new Set<string>();
    return posts.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
    });
}
