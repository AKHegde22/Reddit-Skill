# Reddit API Reference

## Authentication

Reddit uses OAuth2 for API authentication. This skill uses the "password grant" flow for script-type applications.

### Credentials

Four environment variables required:
- `REDDIT_CLIENT_ID` — from app registration
- `REDDIT_CLIENT_SECRET` — from app registration  
- `REDDIT_USERNAME` — your Reddit username
- `REDDIT_PASSWORD` — your Reddit password

### Token Endpoint

```
POST https://www.reddit.com/api/v1/access_token
Authorization: Basic <base64(client_id:client_secret)>
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=<username>&password=<password>
```

**Response:**
```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 3600,
  "scope": "*"
}
```

Tokens expire after 1 hour. Re-authenticate when expired.

### Authenticated Requests

All API requests use the access token:

```
GET https://oauth.reddit.com/{endpoint}
Authorization: Bearer <access_token>
User-Agent: reddit-research-skill/1.0
```

## Search Endpoint

```
GET /r/{subreddit}/search  (subreddit-specific)
GET /search                 (site-wide - omit /r/{subreddit})
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | required | Search query |
| `sort` | enum | `relevance` | `relevance`, `hot`, `top`, `new`, `comments` |
| `t` | enum | none | Time filter: `hour`, `day`, `week`, `month`, `year`, `all` |
| `limit` | int | 25 | Results per page (max: 100) |
| `after` | string | none | Pagination token for next page |
| `before` | string | none | Pagination token for previous page |
| `raw_json` | int | 0 | Set to 1 to prevent HTML escaping |

### Response Structure

```json
{
  "kind": "Listing",
  "data": {
    "after": "t3_abc123",
    "dist": 25,
    "children": [
      {
        "kind": "t3",
        "data": {
          "id": "abc123",
          "title": "Post title",
          "selftext": "Post body",
          "author": "username",
          "subreddit": "subreddit_name",
          "created_utc": 1707523200,
          "url": "https://...",
          "permalink": "/r/subreddit/comments/abc123/...",
          "ups": 500,
          "downs": 0,
          "score": 500,
          "num_comments": 45,
          "over_18": false
        }
      }
    ]
  }
}
```

## Subreddit Listings

```
GET /r/{subreddit}/hot
GET /r/{subreddit}/new
GET /r/{subreddit}/top
GET /r/{subreddit}/rising
GET /r/{subreddit}/controversial
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | int | 25 | Results per page (max: 100) |
| `t` | enum | none | Time filter (for top/controversial): `hour`, `day`, `week`, `month`, `year`, `all` |
| `after` | string | none | Pagination token |
| `before` | string | none | Pagination token |
| `raw_json` | int | 0 | Set to 1 for unescaped JSON |

Response structure same as search endpoint.

## Comments Endpoint

```
GET /r/{subreddit}/comments/{article_id}
```

Fetches a post and its full comment tree.

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `depth` | int | none | Maximum depth of comment tree (0-8) |
| `limit` | int | none | Maximum number of comments |
| `sort` | enum | `confidence` | `confidence`, `top`, `new`, `controversial`, `old`, `random`, `qa`, `live` |
| `raw_json` | int | 0 | Set to 1 for unescaped JSON |

### Response Structure

Array with two listings:
1. Post listing (single post)
2. Comment listing (comment tree)

```json
[
  {
    "kind": "Listing",
    "data": {
      "children": [
        {
          "kind": "t3",
          "data": { /* post data */ }
        }
      ]
    }
  },
  {
    "kind": "Listing",
    "data": {
      "children": [
        {
          "kind": "t1",
          "data": {
            "id": "comment_id",
            "body": "Comment text",
            "author": "username",
            "created_utc": 1707523200,
            "ups": 50,
            "score": 50,
            "replies": {
              "kind": "Listing",
              "data": {
                "children": [ /* nested comments */ ]
              }
            }
          }
        }
      ]
    }
  }
]
```

**Thing types:**
- `t1` — Comment
- `t3` — Post/Link
- `t5` — Subreddit

## User Endpoints

### User Info

```
GET /user/{username}/about
```

Returns user profile data (karma, account age, etc).

### User Posts

```
GET /user/{username}/submitted
```

### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | int | 25 | Results per page (max: 100) |
| `after` | string | none | Pagination token |
| `sort` | enum | `new` | `hot`, `new`, `top`, `controversial` |
| `t` | enum | none | Time filter (for top/controversial) |

## Rate Limits

**Free tier (OAuth2):**
- 100 queries per minute (QPM)
- Averaged over 10-minute window
- Shared across all requests from same OAuth client ID

**Monitoring headers:**
```
X-Ratelimit-Used: 50
X-Ratelimit-Remaining: 50
X-Ratelimit-Reset: 1707523800
```

**Best practices:**
- Space requests ~600ms apart (100 QPM = 600ms per request)
- Monitor `X-Ratelimit-Remaining` header
- Implement exponential backoff if rate limited (429 status)

## Pagination

Reddit uses `after` and `before` tokens for pagination:

```
GET /r/programming/hot?limit=25&after=t3_abc123
```

The `after` value comes from the previous response's `data.after` field.

**Important:**
- Reddit has a ~1000 post limit for pagination
- After ~1000 posts, `after` token becomes unreliable
- For research, first 100-200 posts usually sufficient

## Error Responses

**401 Unauthorized:**
```json
{
  "message": "Unauthorized",
  "error": 401
}
```
→ Invalid or expired access token. Re-authenticate.

**403 Forbidden:**
```json
{
  "message": "Forbidden",
  "error": 403
}
```
→ Insufficient permissions or trying to access restricted content (e.g., NSFW when not allowed).

**429 Too Many Requests:**
```json
{
  "message": "Too Many Requests",
  "error": 429
}
```
→ Rate limit exceeded. Wait until `X-Ratelimit-Reset` time.

**404 Not Found:**
```json
{
  "message": "Not Found",
  "error": 404
}
```
→ Subreddit, user, or post doesn't exist.

## Constructing URLs

**Post URL:**
```
https://reddit.com{permalink}
```

Where `permalink` is from the post data (e.g., `/r/programming/comments/abc123/post_title/`).

**Comment URL:**
```
https://reddit.com/r/{subreddit}/comments/{post_id}/_/{comment_id}
```

## limitations

1. **NSFW Content**: Restricted via Data API as of July 2023
2. **Deleted/Removed**: Posts and comments may show as `[deleted]` or `[removed]`
3. **Shadow-banned users**: Their content may not appear in listings
4. **Private subreddits**: Inaccessible without moderator permissions
5. **API Approval**: New applications require approval (as of late 2023)

## Useful Subreddits for Research

**Technology:**
- r/programming — General programming discussions
- r/learnprogramming — Beginner questions & resources
- r/webdev — Web development
- r/MachineLearning — ML/AI research & applications
- r/Python, r/javascript, r/rust — Language-specific

**Product Feedback:**
- r/SaaS — SaaS product discussions
- r/Entrepreneur — Startup & business feedback
- r/ProductManagement — PM discussions

**General:**
- r/AskReddit — General questions
- r/explainlikeimfive — Simple explanations
- r/todayilearned — Knowledge sharing
