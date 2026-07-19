# DEVELOPMENT.md — ShengKe 开发规范

> 本文档面向 ShengKe（生刻）项目开发者，涵盖环境搭建、协作流程与编码标准。

---

## 一、开发环境搭建

### 1. 前置依赖
- Node.js v20+（推荐使用 [Volta](https://volta.sh) 管理版本）
- Python 3.11+（推荐使用 [pyenv](https://github.com/pyenv/pyenv) 管理）
- Docker Desktop（用于本地 PostgreSQL/Redis/OSS 模拟）
- Expo CLI（`npm install -g expo-cli`）

### 2. 启动本地服务
```bash
# 克隆仓库（确保 SSH 或 Token 权限已配置）
$ git clone git@github.com:shengke-project/shengke.git && cd shengke

# 启动数据库与缓存（Docker Compose）
$ docker compose -f docker-compose.dev.yml up -d postgres redis

# 启动后端（FastAPI）
$ cd backend
$ python -m venv .venv && source .venv/bin/activate
$ pip install -r requirements.txt
$ uvicorn main:app --reload --host 0.0.0.0:8000

# 启动异步任务（Celery）
$ celery -A tasks worker --loglevel=info --concurrency=2

# 启动前端（Expo）
$ cd ../frontend
$ npm install
$ npx expo start --localhost
```

### 3. 环境变量配置
复制 `.env.example` 并重命名为 `.env`，填写以下关键变量：
- `DATABASE_URL=postgresql://shengke:shengke@localhost:5432/shengke_dev`
- `REDIS_URL=redis://localhost:6379/0`
- `OSS_BUCKET_NAME=shengke-dev`
- `QWEN_API_KEY=sk-xxx`（通义千问 API Key）

---

## 二、分支管理规范（GitFlow 衍生）

| 分支名 | 用途 | 保护规则 |
|--------|------|----------|
| `main` | 生产发布分支，对应正式环境 | ❗ 仅允许 PR 合并，需 2 人 Code Review + CI 通过 |
| `develop` | 集成开发分支，每日构建测试环境 | ❗ 仅允许 PR 合并，需 1 人 CR + CI 通过 |
| `feature/*` | 功能开发分支（如 `feature/mood-analysis`） | ✅ 可自由推送，建议命名含 Jira ID（如 `feature/JIRA-123-login-flow`） |
| `hotfix/*` | 紧急线上修复分支（如 `hotfix/v0.1.0-db-migration`） | ✅ 直接推送到 `main` 后立即打 tag |

> 📌 所有 PR 标题格式：`[type] scope: description`（如 `[feat] auth: add phone login`）

---

## 三、代码规范

### Python（FastAPI 后端）
- ✅ 使用 `black`（v24+）自动格式化（pre-commit hook 强制）
- ✅ 类型提示全覆盖（Pydantic v2 Models、FastAPI route params、async functions）
- ✅ 错误处理统一用 `HTTPException` 或自定义 `ShengKeError`，禁止裸 `raise Exception`
- ✅ 数据库操作必须使用 SQLAlchemy 2.0+ 的 `AsyncSession`，禁用同步 ORM
- ✅ 敏感操作（删除、审核）必须记录审计日志（`audit_log` 表）

### TypeScript（Expo 前端）
- ✅ 使用 `eslint-config-airbnb-typescript` + `prettier` 统一风格
- ✅ 所有 API 调用封装为 `apiClient` 实例，统一处理 JWT、错误拦截、loading 状态
- ✅ UI 组件优先使用 `expo-router` 的 `useLocalSearchParams` + `useGlobalSearchParams`，避免手动解析 URL
- ✅ 图片加载必须带 `blurhash` 占位图（使用 `expo-blurhash` 库）
- ✅ 用户输入字段必须校验（Zod schema + formik/yup），禁止信任客户端传参

---

## 四、Commit Message 规范（Conventional Commits）

采用 [Conventional Commits 1.0.0](https://www.conventionalcommits.org/) 格式：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 支持的 type：
- `feat`: 新功能（如 `feat(auth): add phone login`）
- `fix`: Bug 修复（如 `fix(api): handle empty ai_summary`）
- `docs`: 文档变更（如 `docs(readme): update quickstart`）
- `style`: 代码格式（空格、分号等，不改变逻辑）
- `refactor`: 重构（不新增功能或修复 bug）
- `test`: 添加缺失测试或修正现有测试
- `chore`: 构建过程或辅助工具变动（如 `chore(deps): upgrade fastapi to v0.115`）

> ✅ 所有提交必须关联 Jira Issue（如 `JIRA-123`），写在 footer 行：`JIRA-123`
> ❌ 禁止使用 `update`, `fix bug`, `add feature` 等模糊描述

---

## 附录：常用命令速查
| 场景 | 命令 |
|------|------|
| 运行单元测试 | `cd backend && pytest tests/ --cov=app` |
| 生成 OpenAPI 文档 | `cd backend && python generate_openapi.py` |
| 清理本地 DB | `docker exec -it shengke-postgres psql -U shengke -c "DROP DATABASE shengke_dev; CREATE DATABASE shengke_dev;"` |
| 查看 Celery 队列 | `celery -A tasks inspect active_queues` |