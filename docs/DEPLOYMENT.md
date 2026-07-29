# DEPLOYMENT.md — ShengKe 部署与构建笔记

> 记录手机 App 构建环境搭建、后端 Docker 部署的排查过程与结论。当前阶段（最初步开发）**不需要**域名/HTTPS/正式服务器，本地跑通即可，相关章节已标注「暂缓」。

---

## 一、现状结论

- ✅ 本地 iOS / Android 模拟器环境已配好，可以用 **Expo Orbit + EAS Build** 打开发版 App
- ✅ 后端 `docker-compose.prod.yml` 全套（Postgres + Redis + FastAPI + Nginx）已本地验证跑通,发现的 4 个部署 bug 已修复
- ⏸️ 域名、HTTPS、正式服务器、真实密钥——**暂缓**，等要给别人用/上架应用商店时再做

---

## 二、手机 App 构建（Expo Orbit + EAS）

### 1. 本机环境（一次性配置，已完成）

| 组件 | 用途 | 路径/说明 |
|---|---|---|
| Xcode（完整版，非 Command Line Tools） | iOS 模拟器 | `xcode-select -s /Applications/Xcode.app/Contents/Developer` |
| Android Studio + AVD | Android 模拟器 | 虚拟机名：`Pixel_10_Pro_XL` |
| JDK 17（Temurin） | Android Gradle 构建要求 17+ | 装在 `~/.jdks/jdk-17.0.20+8`（未装到系统级，免 sudo；`.zshrc`/`.zprofile` 里的 `JAVA_HOME` 被老项目锁定在 JDK 11，不能改，只能在构建命令里临时覆盖） |
| Android SDK | 编译 & adb/emulator | `~/Library/Android/sdk`，环境变量已写入 `~/.zshrc`：`ANDROID_HOME` / `ANDROID_SDK_ROOT` / `PATH` |
| `eas-cli` | 触发 EAS 构建 | `npm install -g eas-cli`，已登录账号 `xlwang3415@outlook.com` |

> ⚠️ 踩坑记录：本机默认 `JAVA_HOME` 一开始是 JDK 11（太旧）→ 换成 JDK 25（太新，Android 原生 CMake 工具链不兼容,报 "restricted method" 错误）→ 最终定在 **JDK 17** 才编译通过。以后本机跑 Android 本地构建，必须显式指定：
> ```bash
> export JAVA_HOME="$HOME/.jdks/jdk-17.0.20+8/Contents/Home"
> export ANDROID_HOME="$HOME/Library/Android/sdk"
> export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
> ```

### 2. 项目配置（已完成）

- `eas.json`：新增 `development` profile，含 `"ios": { "simulator": true }` —— **关键**：这样 iOS 构建走模拟器签名，不需要付费 Apple Developer 账号（$99/年）。真机安装/上架才需要付费账号。
- `app.json`：已写入 `extra.eas.projectId`
- `package.json`：补装 `expo-dev-client`；用 `npx expo install --fix` 把所有 Expo 包版本对齐到 SDK 57（原来 `expo-constants` 等包版本号体系对不上，导致 Android 原生编译失败：`unresolved reference 'constants'` / `overrides nothing`）

### 3. 日常构建流程

**方式一：Expo Orbit（推荐，图形界面）**
1. 打开 Orbit，用 EAS 账号登录
2. Projects → shengke → 选平台 → Build（profile 选 `development`）
3. 构建在 EAS 云端跑，完成后 Orbit 自动下载，一键装模拟器/真机

**方式二：命令行本地构建**（不消耗 EAS 云端构建额度，但本机要跑 5~15 分钟 Gradle/Xcode）
```bash
cd frontend
export JAVA_HOME="$HOME/.jdks/jdk-17.0.20+8/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
eas build --profile development --platform android --local --non-interactive
```

**安装到模拟器并连开发服务器：**
```bash
"$HOME/Library/Android/sdk/emulator/emulator" -avd Pixel_10_Pro_XL &
adb install build-xxxxx.apk
npx expo start --dev-client
```

装好的 dev client App 之后长期复用，改代码走 Metro 热更新，**不需要每次重新 Build**。

---

## 三、后端 Docker 部署

### 1. 涉及文件
- `Dockerfile` — 后端 API 镜像（多阶段构建，Python 3.11-slim）
- `docker-compose.prod.yml` — Postgres + Redis + API + Nginx 全套
- `docker-compose.dev.yml` — 本地开发只起 Postgres + Redis
- `nginx.conf` — 反向代理配置

### 2. 排查中发现并修复的问题

| # | 问题 | 修复 |
|---|---|---|
| 1 | `nginx.conf` 用了 `limit_req zone=api` 限流，但从未定义该 zone，nginx 容器直接崩溃启动不了 | 加了 `limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;` |
| 2 | `docker-compose.dev.yml` 和 `docker-compose.prod.yml` 都用默认项目名 + 相同 volume 名 `pgdata`，两边会解析成同一个 Docker volume，**生产数据可能和本地开发数据混在一起** | prod 的 volume 显式改名 `shengke_prod_pgdata`，与 dev 完全隔离 |
| 3 | 容器里执行 `alembic upgrade head` 报错缺 `psycopg2`（迁移用同步驱动，`requirements.txt` 只装了异步驱动 `asyncpg`）；且 `DATABASE_SYNC_URL` 没传进容器 | `requirements.txt` 加 `psycopg2-binary`；`docker-compose.prod.yml` 的 `api` 服务加 `DATABASE_SYNC_URL` 环境变量 |
| 4 | 数据库迁移步骤没接入部署流程，得手动进容器执行，容易忘 | `Dockerfile` 的 `CMD` 改为先跑 `alembic upgrade head` 再启动 `uvicorn` |
| 5 | `nginx.conf` 原本有一段"前端 static 文件"配置（`root /usr/share/nginx/html`），但项目定位是纯手机 App，不需要网页版，这段是死配置 | 已删除，`nginx` 现在只做 `/api/` 反代 + `/ws` WebSocket 代理 |

### 3. 本地验证过程（已跑通，仅供参考，无需重复操作）
```bash
cd /Users/wangxuanling/Projects/ShengKe
DB_PASSWORD=xxx JWT_SECRET=xxx docker compose -f docker-compose.prod.yml up -d --build
# 验证：12 张表建好、/docs 返回 200、nginx 反代正常
docker compose -f docker-compose.prod.yml down   # 不加 -v，保留 volume
```

---

## 四、当前阶段该怎么做（最初步开发）— 完整跑通步骤

不需要服务器、域名、HTTPS。以下是本地实测跑通的完整步骤，四个终端窗口分别跑（都是常驻进程，不要在同一个窗口里顺序执行）。

### 终端 1：数据库 / 缓存

```bash
cd /Users/wangxuanling/Projects/ShengKe
docker compose -f docker-compose.dev.yml up -d

# 确认健康（等到两行都是 healthy 再往下走）
docker compose -f docker-compose.dev.yml ps
```

### 终端 2：后端

```bash
cd /Users/wangxuanling/Projects/ShengKe/backend

# 项目根目录已有共用的 .venv（backend/.venv 是软链接指向它），首次用的话：
# python3 -m venv ../.venv && source ../.venv/bin/activate && pip install -r requirements.txt
source .venv/bin/activate

# .env 已配好指向 dev 库（shengke_dev / 端口 5432、Redis 端口 6380），无需再改
alembic upgrade head          # 把库结构建到最新
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

验证：浏览器打开 `http://localhost:8000/docs`，能看到 Swagger UI 就算成功。

### 终端 3：Android 模拟器

```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
"$ANDROID_HOME/emulator/emulator" -avd Pixel_10_Pro_XL
```

等模拟器完全启动（首次 boot 会比较慢），`adb devices` 能看到 `emulator-5554  device` 就说明好了。

> App 只需要装一次（见第二节「手机 App 构建」生成的 `frontend/build-*.apk`）：
> ```bash
> "$ANDROID_HOME/platform-tools/adb" install -r frontend/build-*.apk
> ```
> 以后改代码不用重装，走终端 4 的热更新就行。

### 终端 4：前端（Metro + 拉起 App）

```bash
cd /Users/wangxuanling/Projects/ShengKe/frontend
npx expo start --dev-client --android
```

它会自动把 App 在模拟器里拉起来、连上 Metro。改 JS/TSX 代码保存后自动热更新，不需要重启任何东西。

### 关键坑：Android 模拟器访问后端不能用 `localhost`

`frontend/src/constants/config.ts` 里已经处理好了：

```ts
const DEV_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || `http://${DEV_HOST}:8000/api/v1`;
```

原因：Android 模拟器里的 `localhost` 指向模拟器自己，不是 Mac 主机；`10.0.2.2` 是模拟器内置的、专门指向宿主机的别名。**iOS 模拟器没有这个问题**（和主机共享网络栈，`localhost` 直接能用）。真机测试（不是模拟器）两边都不行，得用 Mac 的局域网 IP，并通过 `EXPO_PUBLIC_API_URL` 环境变量覆盖。

### 全部跑起来后，怎么验证是通的

```bash
# 从模拟器内部直接测后端连通性（不经过 App UI，最可靠）
"$ANDROID_HOME/platform-tools/adb" shell \
  "echo -e 'GET /docs HTTP/1.1\r\nHost: 10.0.2.2\r\nConnection: close\r\n\r\n' | nc 10.0.2.2 8000 | head -5"
# 看到 HTTP/1.1 200 OK 就说明 App ↔ 后端网络路径完全打通
```

---

## 五、以后要正式上线时再做（暂缓清单）

- [ ] 买域名，解析到服务器
- [ ] 配 HTTPS 证书（推荐 Let's Encrypt + certbot；iOS App Transport Security 强制要求 HTTPS）
- [ ] 生产环境真实密钥：`DB_PASSWORD`、`JWT_SECRET`（放服务器上不进 git 的 `.env`，docker compose 自动读取）
- [ ] 阿里 OSS / 通义千问的真实 key 填进 `.env`
- [ ] 数据库备份策略（`pgdata` 卷目前没有任何备份）
- [ ] Apple Developer Program 付费账号（$99/年）——只有要装真机/上架 App Store 时才需要，模拟器阶段不需要
- [ ] Google Play 开发者账号（$25 一次性）——上架 Android 应用商店时需要
