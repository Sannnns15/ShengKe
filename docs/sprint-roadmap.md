# ShengKe Sprint 路线图

> 最后更新：2026-07-21

---

## 已完成 Sprint 回顾

| Sprint | 范围 | 交付物 |
|--------|------|--------|
| **Sprint 1** | 项目脚手架 + 用户认证 | 后端 FastAPI 骨架、数据库层、JWT 双 Token 认证、前端 Auth flow（登录/注册/Token 刷新） |
| **Sprint 2** | Moment CRUD + 数据库 | Moment 完整 CRUD、Alembic 迁移、前端发布页、类型定义 |
| **Sprint 3** | 媒体上传 + Feed Hook | 媒体上传 API、Collections/Tags、前端创建页增强、useMomentFeed hook |
| **Sprint 4** | Feed 流 + 隐私过滤 + 点赞 | Feed 排序（latest/hot）、游标分页、隐私过滤、FeedItem schema（含 author 信息 + is_liked）、点赞 toggle |
| **Sprint 5** | 用户主页 + 关注 + 资料编辑 | 用户 Moment 列表、likes_received_count、profile/[id] 路由、头像上传、关注/取消关注交互、toggleLike bug 修复 |

---

## 未实现的功能模块（总清单）

对照架构文档，以下功能尚未实现或仅 partial：

1. **前端组件库** — 6 个组件目录全部为空（common/moment/user/social/media/ai）
2. **Moment 编辑器增强** — 富文本、位置选择、媒体网格布局、心情选择器 UI
3. **评论 UI 组件化** — CommentList/CommentItem/CommentComposer 无独立组件
4. **WebSocket 实时推送** — 通知目前是轮询，无实时推送
5. **数据导出** — POST/GET /users/me/export 端点未实现
6. **用户设置 API** — GET/PATCH /users/me/settings 未实现
7. **内容审核** — 阿里云内容安全集成未接入
8. **OSS 直传** — 媒体上传走服务端中转，未实现预签名 URL 直传
9. **Blurhash 占位图** — 图片加载无模糊占位
10. **Redis 缓存** — Feed/热点数据无缓存层
11. **测试覆盖** — 仅 4 个认证测试，覆盖率低
12. **前端状态管理** — 仅 authStore，缺少 uiStore/draftStore/filterStore
13. **搜索优化** — 当前使用 PostgreSQL ILIKE，未使用 tsvector 全文检索
14. **系统设置** — 暗黑模式、通知偏好、数据管理等
15. **画廊/媒体浏览** — 无独立媒体大图浏览页面
16. **@提及** — Moment/评论中无 @用户 功能
17. **AI 分析 UI** — 情绪图表、标签编辑、AI 对话 UI 可进一步打磨
18. **用户反馈** — 意见反馈、App 评分引导

---

## Sprint 6 — 前端组件化与 Moment 编辑器增强

**目标：** 完成前端组件库的搭建，补全 Moment 编辑器周边 UI

| 任务 | 端 | 说明 |
|------|----|------|
| `components/common/` 通用组件 | Frontend | Button, Input, Avatar, Card, Badge, EmptyState, Toast, BottomSheet, IconButton, SegmentedControl |
| `components/moment/` Moment 组件 | Frontend | MomentCard（抽离为独立组件）、MoodSelector、LocationPicker、MediaGrid、MomentPrivacySelector |
| `components/media/` 媒体组件 | Frontend | ImageViewer（大图浏览）、VideoPlayer |
| `components/user/` 用户组件 | Frontend | UserCard, UserList, ProfileHeader, AvatarPicker |
| `components/social/` 社交组件 | Frontend | LikeButton, CommentList（可复用）、CommentComposer, FollowButton |
| `components/ai/` AI 组件 | Frontend | AIChatBubble, MoodChart |
| 补充前端 stores | Frontend | uiStore（Toast/BottomSheet/主题）, draftStore（草稿持久化）, filterStore（Feed 筛选条件） |

**验收标准：**
- 所有组件在 `components/` 下有独立文件，可被页面引用
- 首页 Feed 改用 `MomentCard` 组件
- Comments 使用 `CommentList` + `CommentComposer` 组件
- Follow/Like 使用专用组件
- 新建 store 有基本读写操作

---

## Sprint 7 — 评论系统完善 + WebSocket 实时通知

**目标：** 前端评论 UI 完整化，引入 WebSocket 实时推送通知

| 任务 | 端 | 说明 |
|------|----|------|
| 评论树形展示 | Frontend | 嵌套回复缩进显示、"查看全部 N 条回复" 折叠 |
| 评论点赞 | Frontend | CommentItem 集成 LikeButton |
| CommentComposer 回复态 | Frontend | @回复提示、输入框聚焦、发送后清除 |
| WebSocket 服务 | Backend | FastAPI WebSocket 端点，用户连接管理 |
| 实时通知推送 | Backend | 点赞/评论/关注时推送到端 |
| WebSocket 客户端 | Frontend | useWebSocket hook，断线重连 |
| 通知页增强 | Frontend | 从轮询改为 WebSocket 驱动实时更新 |
| GET/PATCH /users/me/settings | Backend | 通知偏好、隐私默认值等设置 |

**验收标准：**
- 评论支持嵌套回复，树形展示
- 评论可点赞
- 用户在线时收到实时通知推送
- 通知页实时更新，无需下拉刷新
- 用户设置可读写

---

## Sprint 8 — 数据导出 + OSS 直传 + 内容审核

**目标：** 数据导出功能、媒体上传架构优化、内容安全接入

| 任务 | 端 | 说明 |
|------|----|------|
| 数据导出 API | Backend | POST/GET /users/me/export，异步任务打包数据 |
| 数据导出前端 | Frontend | 导出请求页、进度查询、下载 |
| OSS 预签名直传 | Backend | 生成预签名 URL，App 直传 OSS |
| OSS 直传客户端 | Frontend | uploadMedia 改为预签名流程，progress 回调 |
| 内容安全集成 | Backend | 阿里云内容安全检测图片/文本，Moment 发布时自动审核 |
| 内容审核状态 UI | Frontend | 图片审核中/通过/失败的状态指示 |
| Blurhash 占位图 | Frontend + Backend | 上传时生成 blurhash，返回前端做图片占位 |
| 用户设置前端页 | Frontend | 通知偏好开关、隐私默认值、数据管理入口 |

**验收标准：**
- 数据导出可请求、查询进度、下载 ZIP 包
- 媒体上传经过 OSS 预签名 URL，不经过服务端中转
- 图片/文本发布时触发内容安全审核
- 审核失败的内容标记状态，用户可查看
- 图片加载有 blurhash 占位

---

## Sprint 9 — 搜索优化 + 系统设置 + 测试覆盖

**目标：** 搜索性能提升、系统设置完整化、补全测试

| 任务 | 端 | 说明 |
|------|----|------|
| PostgreSQL 全文检索 | Backend | tsvector 索引 + 搜索排序（rank） |
| 搜索页面增强 | Frontend | 结果分类（Moment/User）、高亮关键词、筛选（tag/时间） |
| 搜索历史 | Frontend | 本地存储搜索历史，最近搜索展示 |
| 系统设置完整化 | Frontend | 暗黑模式切换（接入系统）、清除缓存、通知设置、关于页面 |
| 后端测试 | Backend | Moment CRUD、Comments、Likes、Follows 核心路径测试 |
| 前端测试 | Frontend | 组件单元测试（vitest）、hooks 测试 |
| 性能基准 | Both | SQL 慢查询分析、前端渲染性能 profile |

**验收标准：**
- 搜索 Moment 和用户返回相关性排序结果
- 搜索结果有关键词高亮
- 暗黑模式正常工作
- 核心 API 路径有集成测试（>80% 覆盖率）
- 搜索响应时间 < 500ms

---

## Sprint 10 — AI 功能增强 + @提及 + 画廊浏览

**目标：** AI 能力深化、社交功能补全、媒体浏览体验

| 任务 | 端 | 说明 |
|------|----|------|
| AI 情绪图表、趋势分析 | Frontend | MoodReport 增强：情绪趋势折线图、周报/月报 |
| AI 标签可视化 | Frontend | 标签词云、编辑/删除标签 |
| AI 对话增强 | Frontend | 流式输出动画、推荐 prompt、对话历史 |
| AI 分析调度优化 | Backend | Moment 创建后异步 AI 分析（已有 Celery 任务，补充调度细节） |
| @提及用户 | Backend + Frontend | 搜索用户、解析 @ 提及、发通知 |
| 画廊/媒体大图浏览 | Frontend | 九宫格展开、左右滑动、手势缩放、分享 |
| Vector Store 集成 | Backend | 语义搜索、相似 Moment 推荐 |
| 用户反馈 | Frontend | 意见反馈入口（邮件/表单）、App 评分引导 |

**验收标准：**
- 情绪报告有可视化图表，周/月趋势
- @提及用户可搜索选择，对方收到通知
- 媒体浏览支持手势缩放和滑动切换
- AI 对话流畅，有流式输出
- 反馈可提交

---

## Sprint 11 — 性能优化与上线准备

**目标：** Redis 缓存接入、生产环境打磨、性能压测

| 任务 | 端 | 说明 |
|------|----|------|
| Redis 缓存层 | Backend | Feed 缓存（热点数据 TTL）、用户时间线缓存 |
| 缓存失效策略 | Backend | 写操作时精准失效关联缓存 |
| 图片懒加载 + 预加载 | Frontend | FlatList 性能优化、图片预加载策略 |
| 首屏加载优化 | Frontend | 关键路径拆分、代码分割 |
| 生产环境 Docker Compose | Devops | 多 Stage 构建、健康检查、日志聚合 |
| CI/CD 完善 | Devops | 自动化测试 → 构建 → 部署 pipeline |
| 性能压测 | QA | 并发用户 1000+ 场景，定位瓶颈 |
| 上线清单 | PM | 域名/证书/OSS/数据库/监控告警 检查 |
| 隐私合规 | PM | 用户协议、隐私政策、数据删除流程 |

**验收标准：**
- Feed 响应 < 200ms（缓存命中时）
- FlatList 滚动 60fps，200+ 条不卡顿
- Docker Compose 一键部署到阿里云 ECS
- CI/CD pipeline 完整运行
- 压测通过：1000 并发 5 分钟无错误

---

## 路线图总览

```
Sprint 6 ── 前端组件化 + Moment 编辑器增强
Sprint 7 ── 评论完善 + WebSocket 实时通知
Sprint 8 ── 数据导出 + OSS 直传 + 内容审核
Sprint 9 ── 搜索优化 + 系统设置 + 测试覆盖
Sprint 10 ─ AI 增强 + @提及 + 画廊浏览
Sprint 11 ─ 性能优化 + 上线准备
```

**总进度：** 5 / 11 sprints complete ✅（Sprint 1-5 done）
**剩余：** 6 sprints（Sprint 6-11）
**预估工期：** 每个 sprint 约 2-3 个工作日，总计约 2-3 周
