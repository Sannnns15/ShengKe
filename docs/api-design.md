# ShengKe（生刻）API 设计

## 通用约定

- **Base URL:** `/api/v1`
- **认证方式:** `Authorization: Bearer <access_token>`
- **统一响应格式:**

```json
{
  "code": 0,
  "message": "success",
  "data": {},
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 100
  }
}
```

- **错误码定义:**
  - `0` — 成功
  - `100xx` — 认证相关（10001 无效Token, 10002 Token过期, 10003 权限不足, 10004 验证码错误）
  - `200xx` — 资源相关（20001 资源不存在, 20002 资源已删除, 20003 重复创建）
  - `300xx` — 权限相关（30001 无权访问该 Moment）
  - `400xx` — AI 服务错误（40001 AI 调用超时, 40002 内容违规）
  - `500xx` — 服务端错误（50001 内部错误）

- **分页:** 统一使用 `?page=1&page_size=20`，默认 `page=1, page_size=20`，最大 `page_size=100`

---

## 1. 用户认证 Auth

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| POST | `/auth/register` | 手机号注册 | N |
| POST | `/auth/login` | 密码/验证码登录 | N |
| POST | `/auth/refresh` | 刷新 Token | N（用 refresh_token） |
| POST | `/auth/logout` | 登出 | Y |
| POST | `/auth/send-code` | 发送短信验证码 | N |
| POST | `/auth/reset-password` | 重置密码 | N |

### POST /auth/register

**Request:**
```json
{
  "phone": "13800138000",
  "password": "SecureP@ss123",
  "code": "123456",
  "nickname": "小明"
}
```

**Response (200):**
```json
{
  "code": 0,
  "data": {
    "user": {
      "id": "0194f2a0-...",
      "phone": "138****8000",
      "nickname": "小明",
      "avatar_url": null
    },
    "access_token": "eyJhbGciOi...",
    "refresh_token": "eyJhbGciOi...",
    "expires_in": 900
  }
}
```

### POST /auth/login

**Request:**
```json
{
  "phone": "13800138000",
  "password": "SecureP@ss123"
}
```

**Response (200)** — 同 register 响应格式

### POST /auth/refresh

**Request:**
```json
{
  "refresh_token": "eyJhbGciOi..."
}
```

**Response (200):**
```json
{
  "code": 0,
  "data": {
    "access_token": "eyJhbGciOi...",
    "expires_in": 900
  }
}
```

### POST /auth/send-code

**Request:**
```json
{
  "phone": "13800138000",
  "type": "register"
}
```

`type` 枚举值：`register | login | reset_password`

### POST /auth/reset-password

**Request:**
```json
{
  "phone": "13800138000",
  "code": "123456",
  "new_password": "NewP@ss456"
}
```

---

## 2. 用户资料 User Profile

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| GET | `/users/me` | 获取当前用户信息 | Y |
| PATCH | `/users/me` | 更新个人信息 | Y |
| GET | `/users/{user_id}` | 查看他人主页 | Y |
| GET | `/users/me/settings` | 获取个人设置 | Y |
| PATCH | `/users/me/settings` | 更新个人设置 | Y |
| DELETE | `/users/me` | 注销账号 | Y |

### GET /users/me

**Response:**
```json
{
  "code": 0,
  "data": {
    "id": "0194f2a0-...",
    "phone": "138****8000",
    "nickname": "小明",
    "bio": "记录生活的点滴",
    "avatar_url": "https://oss.shengke.com/avatars/xxx.jpg",
    "gender": 1,
    "birthday": "2000-01-01",
    "moment_count": 128,
    "follower_count": 56,
    "following_count": 42,
    "collection_count": 5,
    "created_at": "2025-06-01T00:00:00Z"
  }
}
```

### PATCH /users/me

**Request:**
```json
{
  "nickname": "新昵称",
  "bio": "新的简介",
  "gender": 2,
  "birthday": "1999-12-25"
}
```

### GET /users/{user_id}

返回公开信息。如果被查看用户的隐私设置限制（如 mutual 仅互关可见），则只返回公开字段。

---

## 3. 生刻 Moments CRUD

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| POST | `/moments` | 创建生刻 | Y |
| GET | `/moments/{id}` | 查看单条生刻 | Y |
| PATCH | `/moments/{id}` | 编辑生刻 | Y |
| DELETE | `/moments/{id}` | 删除生刻（软删） | Y |
| GET | `/moments` | Feed 流（首页/广场） | Y |
| GET | `/users/{user_id}/moments` | 某人时刻列表 | Y |
| POST | `/moments/{id}/archive` | 归档/取消归档 | Y |
| PATCH | `/moments/{id}/privacy` | 修改隐私级别 | Y |

### POST /moments

**Request:**
```json
{
  "content": "今天阳光很好，在公园散步。\n\n路边的花都开了🌸",
  "title": "春日散步",
  "mood": "开心",
  "weather": "晴 22°C",
  "location_name": "中山公园",
  "location_lat": 31.2304,
  "location_lng": 121.4737,
  "privacy_level": 2,
  "visibility_group": [],
  "media_ids": ["uuid-1", "uuid-2"],
  "tag_names": ["春天", "散步", "自然"]
}
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "id": "0194f2a1-...",
    "created_at": "2025-06-15T10:30:00Z",
    "ai_tags": ["户外活动", "好天气"],
    "ai_summary": "记录了一次春日散步的经历",
    "ai_emotion": "positive"
  }
}
```

### GET /moments

**Query Parameters:**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| type | string | `home` | `home` 首页订阅 / `explore` 广场推荐 |
| page | int | 1 | 页码 |
| page_size | int | 20 | 每页条数 |
| before | string (ISO) | — | 时间分页：获取此时间之前的内容（用于无限滚动）|
| tag | string | — | 按标签筛选 |

**Response:**
```json
{
  "code": 0,
  "data": [
    {
      "id": "0194f2a1-...",
      "user": {
        "id": "...",
        "nickname": "小明",
        "avatar_url": "..."
      },
      "content_preview": "今天阳光很好，在公园散步。",
      "media_previews": [
        {
          "id": "...",
          "thumbnail_url": "...",
          "media_type": 1,
          "blurhash": "LKO2?U%2Tw=w]~RBVZR}"
        }
      ],
      "mood": "开心",
      "mood_emoji": "😊",
      "ai_emotion": "positive",
      "privacy_level": 2,
      "comment_count": 3,
      "like_count": 12,
      "is_liked": false,
      "created_at": "2025-06-15T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "page_size": 20,
    "total": 128,
    "has_more": true
  }
}
```

### GET /moments/{id}

返回 Moment 完整详情，含所有媒体完整 URL、评论前 3 条、AI 摘要等。

### PATCH /moments/{id}

仅作者可编辑，字段同 POST。只传需要修改的字段。不支持修改 `media_ids`（需通过 Media confirm 接口处理）。

---

## 4. 媒体上传 Media

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| POST | `/media/upload-presigned` | 获取 OSS 预签名 URL | Y |
| POST | `/media/callback` | OSS 上传回调 | N（IP 白名单验证）|
| POST | `/media/confirm` | 确认上传完成并关联 | Y |
| DELETE | `/media/{id}` | 删除媒体 | Y |

### 上传流程

```
前端                服务端                OSS
 │                   │                    │
 ├─ POST /upload-presigned ──→            │
 │ ←─ { urls[], media_ids[] }             │
 │                   │                    │
 ├─ 直传文件到 OSS ──────────────────────→│
 │                   │                    │
 │                   │ ←── callback ──────┤
 │                   │ (更新 media status)│
 │                   │                    │
 ├─ POST /confirm ──→                     │
 │ ←─ { media[] }                         │
 │                   │                    │
```

### POST /media/upload-presigned

**Request:**
```json
{
  "files": [
    {
      "file_name": "IMG_001.jpg",
      "file_size": 2097152,
      "mime_type": "image/jpeg",
      "width": 3024,
      "height": 4032
    }
  ]
}
```

**Response:**
```json
{
  "code": 0,
  "data": {
    "media": [
      {
        "media_id": "uuid-1",
        "upload_url": "https://oss.shengke.com/...?Signature=...&Expires=...",
        "object_key": "uploads/2025/06/15/uuid-1.jpg",
        "expires_in": 3600
      }
    ]
  }
}
```

### POST /media/confirm

**Request:**
```json
{
  "media_ids": ["uuid-1", "uuid-2"],
  "moment_id": "uuid-of-moment"
}
```

---

## 5. 社区互动 Social

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| POST | `/moments/{id}/comments` | 发表评论 | Y |
| GET | `/moments/{id}/comments` | 获取评论列表（树形） | Y |
| DELETE | `/comments/{id}` | 删除自己的评论 | Y |
| POST | `/moments/{id}/like` | 点赞/取消点赞 Moment | Y |
| POST | `/comments/{id}/like` | 点赞/取消点赞评论 | Y |
| POST | `/moments/{id}/reaction` | 其他 Reaction | Y |
| GET | `/users/me/liked-moments` | 我点赞过的生刻 | Y |

### POST /moments/{id}/comments

**Request:**
```json
{
  "content": "真好，我也想去散步！",
  "parent_id": null
}
```

嵌套回复时传入 `parent_id` 为父评论 ID。

### GET /moments/{id}/comments

**Query Parameters:** `?sort=latest|oldest&page=1&page_size=20`

**Response:**
```json
{
  "code": 0,
  "data": [
    {
      "id": "...",
      "user": { "id": "...", "nickname": "小红", "avatar_url": "..." },
      "content": "真好！",
      "like_count": 3,
      "is_liked": false,
      "created_at": "2025-06-15T11:00:00Z",
      "replies": [
        {
          "id": "...",
          "user": { "id": "...", "nickname": "小明", "avatar_url": "..." },
          "content": "谢谢～",
          "like_count": 1,
          "created_at": "2025-06-15T11:05:00Z"
        }
      ]
    }
  ]
}
```

### POST /moments/{id}/like

幂等操作。如果已点赞则取消点赞。

**Request:** 空 body

**Response:**
```json
{
  "code": 0,
  "data": {
    "is_liked": true,
    "like_count": 13
  }
}
```

### POST /moments/{id}/reaction

**Request:**
```json
{
  "reaction_type": "love"
}
```

`reaction_type` 枚举：`like | love | laugh | sad | wow | angry`

---

## 6. 关注系统 Follow

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| POST | `/users/{user_id}/follow` | 关注/取关 | Y |
| GET | `/users/{user_id}/followers` | 获取粉丝列表 | Y |
| GET | `/users/{user_id}/following` | 获取关注列表 | Y |
| GET | `/users/me/follow-suggestions` | 推荐关注 | Y |
| GET | `/users/me/friends` | 互关好友列表 | Y |

### POST /users/{user_id}/follow

幂等操作。如果已关注则取消关注。

**Response:**
```json
{
  "code": 0,
  "data": {
    "is_following": true,
    "is_mutual": false
  }
}
```

---

## 7. 合集 Collection

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| POST | `/collections` | 创建合集 | Y |
| GET | `/collections/{id}` | 合集详情（含生刻列表） | Y |
| PATCH | `/collections/{id}` | 编辑合集 | Y |
| DELETE | `/collections/{id}` | 删除合集 | Y |
| GET | `/users/{user_id}/collections` | 查看某人的合集 | Y |
| POST | `/collections/{id}/moments` | 向合集添加生刻 | Y |
| DELETE | `/collections/{id}/moments/{moment_id}` | 从合集移除生刻 | Y |

### POST /collections

**Request:**
```json
{
  "title": "2025 春天回忆",
  "description": "记录这个美好的春天",
  "is_public": true,
  "cover_media_id": "uuid-cover"
}
```

### POST /collections/{id}/moments

**Request:**
```json
{
  "moment_ids": ["uuid-1", "uuid-2", "uuid-3"]
}
```

---

## 8. 通知 Notification

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| GET | `/notifications` | 获取通知列表 | Y |
| POST | `/notifications/read-all` | 全部标为已读 | Y |
| POST | `/notifications/{id}/read` | 单条标为已读 | Y |
| GET | `/notifications/unread-count` | 未读通知数 | Y |

### GET /notifications

**Query Parameters:** `?page=1&page_size=20`

**Response:**
```json
{
  "code": 0,
  "data": [
    {
      "id": "...",
      "type": 1,
      "actor": { "id": "...", "nickname": "小红", "avatar_url": "..." },
      "content": "小红 赞了你的生刻",
      "target_type": 1,
      "target_id": "moment-uuid",
      "is_read": false,
      "created_at": "2025-06-15T12:00:00Z"
    }
  ],
  "meta": {
    "unread_count": 5,
    "page": 1,
    "page_size": 20,
    "total": 42
  }
}
```

---

## 9. AI 功能 AI

| 方法 | 路径 | 说明 | 需认证 | 同步/异步 |
|------|------|------|--------|-----------|
| POST | `/ai/moments/{id}/suggest-tags` | 为 Moment 建议标签 | Y | 同步（实时返回）|
| POST | `/ai/moments/{id}/summarize` | 生成摘要 | Y | 异步（Celery）|
| POST | `/ai/chat` | AI 陪伴对话 | Y | 同步（流式/SSE）|
| GET | `/ai/mood-report` | 情绪分析报告 | Y | 同步 |
| POST | `/ai/moments/{id}/similar` | 推荐相似时刻 | Y | 同步 |

### POST /ai/moments/{id}/suggest-tags

调用时机：创建 Moment 时服务端自动调用，无需客户端主动请求。

**Response:**
```json
{
  "code": 0,
  "data": {
    "tags": ["户外活动", "好天气", "个人记录"],
    "emotion": "positive",
    "confidence": 0.92
  }
}
```

### POST /ai/moments/{id}/summarize

异步任务，第一次请求返回 `task_id`，客户端轮询任务状态。

**Response (202):**
```json
{
  "code": 0,
  "data": {
    "task_id": "async-task-uuid",
    "status": "processing"
  }
}
```

查询任务状态: `GET /ai/tasks/{task_id}`

### POST /ai/chat

使用 SSE (Server-Sent Events) 实现流式输出。

**Request:**
```json
{
  "message": "今天心情不太好，想聊聊",
  "context_moment_ids": []
}
```

**Response:** `text/event-stream`，每行一个 data 事件。

```text
data: {"type": "start", "session_id": "chat-session-uuid"}
data: {"type": "token", "content": "我注意到你今天提到过……"}
data: {"type": "token", "content": "要和我聊聊发生了什么吗？"}
data: {"type": "done", "token_usage": 256}
```

### GET /ai/mood-report

**Query Parameters:** `?period=week&start_date=2025-06-01&end_date=2025-06-15`

**Response:**
```json
{
  "code": 0,
  "data": {
    "period": "week",
    "summary": "本周整体情绪积极，周三有短暂低谷",
    "emotion_distribution": {
      "positive": 0.65,
      "neutral": 0.25,
      "negative": 0.10
    },
    "daily_moods": [
      { "date": "2025-06-09", "dominant_emotion": "开心", "mood_score": 4 },
      { "date": "2025-06-10", "dominant_emotion": "平静", "mood_score": 3 }
    ],
    "top_keywords": ["工作", "家人", "散步", "美食"]
  }
}
```

---

## 10. 搜索 Search

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| GET | `/search/moments` | 全文搜索生刻 | Y |
| GET | `/search/users` | 搜索用户 | Y |

### GET /search/moments

**Query Parameters:** `?q=关键词&page=1&page_size=20&tag=春天`

后端使用 PostgreSQL tsvector 全文检索。

---

## 11. 数据导出

| 方法 | 路径 | 说明 | 需认证 |
|------|------|------|--------|
| POST | `/users/me/export` | 请求数据导出 | Y |
| GET | `/users/me/export/{task_id}` | 查询导出进度 | Y |
| GET | `/users/me/export/{task_id}/download` | 下载导出文件 | Y |

### POST /users/me/export

**Request:**
```json
{
  "include_media": true,
  "date_range": { "start": "2025-01-01", "end": "2025-12-31" }
}
```

**Response (202):**
```json
{
  "code": 0,
  "data": {
    "task_id": "export-task-uuid",
    "estimated_size": "256MB",
    "status": "queued"
  }
}
```

---

## 附录：认证与鉴权说明

1. **双 Token 机制**
   - Access Token: JWT, 有效期 15 分钟
   - Refresh Token: 不透明字符串, 有效期 7 天
   - 前端存储：`expo-secure-store`（RN）/ localStorage（Web）

2. **Token 刷新流程**
   - API 返回 `401` → 前端用 refresh_token 调 `/auth/refresh`
   - 刷新成功 → 更新 access_token，重试原请求
   - 刷新失败 → 清除 token，跳转登录页

3. **权限校验**
   - Moment 可见性在 API 层统一校验（privacy_level + 关注关系）
   - 写操作校验资源所有权
   - 敏感操作（注销、数据导出）额外校验身份
