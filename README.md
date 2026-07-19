# ShengKe（生刻）

> 融合私密日记、选择性社区分享与 AI 智能陪伴的个人生活记录平台

## 一句话简介
ShengKe（生刻）是一款以「真实记录」为内核的轻社交日记平台：日记默认仅自己可见，用户可主动选择将 Moment 发布到社区；同时由 AI 提供标签提取、情绪分析与陪伴式对话，让记录不止于存储，更成为被理解的生活伙伴。

## 核心功能
- ✅ **私密日记**：端到端加密草稿箱 + 本地缓存 + 可选时间锁，确保绝对私密性
- ✅ **社区分享**：以 Moment 为单位发布图文/短视频，支持话题订阅、轻量互动（无点赞压力），默认不推送通知
- ✅ **AI 陪伴**：基于通义千问的智能体，自动摘要、生成标签、识别情绪趋势，并支持自然语言对话式回顾与建议

## 技术栈
| 层级 | 技术选型 |
|------|----------|
| 客户端 | React Native + Expo SDK 51+（iOS/Android/Web 三端统一） |
| 接入层 | 阿里云 CDN + WAF + ALB（应用负载均衡） |
| 应用层 | FastAPI + Uvicorn（REST API）、Celery + Redis（异步任务）、WebSocket（实时推送） |
| 数据层 | PostgreSQL（RDS 主从）、Redis（缓存/队列）、阿里云 OSS（对象存储） |
| AI 层 | 通义千问（灵积 API）、向量数据库（用于语义检索）、阿里云内容安全（审核） |

## 快速开始（开发环境）
```bash
# 1. 克隆仓库
$ git clone https://github.com/shengke-project/shengke.git && cd shengke

# 2. 启动后端（FastAPI + Celery）
$ cd backend && pip install -r requirements.txt && uvicorn main:app --reload
$ # 在另一终端启动 Celery worker：celery -A tasks worker --loglevel=info

# 3. 启动前端（Expo）
$ cd ../frontend && npm install && npx expo start

# 4. 默认访问 http://localhost:8000 (API) 和 http://localhost:19002 (Expo Dev Server)
```

## 目录结构
```
ShengKe/
├── README.md                 # 本文件
├── CHANGELOG.md              # 版本变更日志
├── DEVELOPMENT.md            # 开发规范与流程
├── docs/                     # 架构/设计文档
│   ├── architecture.md       # 系统整体架构
│   ├── data-model.md         # 数据模型与实体关系
│   └── api-spec.md           # OpenAPI 3.1 规范（自动生成）
├── backend/                  # FastAPI 后端服务
├── frontend/                 # Expo 前端（React Native）
└── scripts/                  # 工具脚本（DB 迁移、CI 测试等）
```