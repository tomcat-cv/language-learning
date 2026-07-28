# 日々（Hibi）服务器开发接手记录

## 1. 文档用途

本文记录 2026-07-28 开发会话的实际状态，供项目迁移到服务器后继续开发。接手时仍须先完整阅读：

1. `AGENTS.md`
2. `PROJECT.md`
3. `README.md`
4. 本文与任务相关源码

本文是一次性交接记录，不替代 `PROJECT.md` 的长期产品状态。

## 2. 用户最新指示

- 停止在当前 Mac 上继续启动服务、Docker 或数据库。
- 用户将把整个项目迁移到服务器继续开发。
- 服务器端应继续完成 PostgreSQL、固定单用户以及“我已掌握 → 到期短测 → 重新调度”的最小闭环。

## 3. Git 与远端状态

远端已绑定并首次推送成功：

```text
origin  git@github.com:tomcat-cv/language-learning.git
branch  main
```

已推送到远端的最新提交：

```text
5b4a4d7 docs: refine learning roadmap and mastery flow
```

该提交只包含产品文档变更：

- N4–N1 调整为 N5 最小闭环后的紧接阶段。
- 文法和单词增加“我已掌握”产品规则。
- 增加模拟考试目标、流程和路线图。

重要：下文所述 PostgreSQL 与学习闭环代码目前仍是未提交工作区改动，尚未推送到 GitHub。如果服务器只执行 `git clone`，不会得到这些实现和本文。迁移时需要复制完整工作目录（包含未提交文件），或者先在合适环境中检查、提交并推送这些改动。

## 4. 当前未提交实现

### 4.1 依赖与开发配置

已加入：

- `drizzle-orm`
- `pg`
- `drizzle-kit`
- `@types/pg`
- `vitest`

新增脚本：

```text
npm test
npm run db:generate
npm run db:migrate
```

新增配置：

- `.env.example`
- `compose.yaml`
- `drizzle.config.ts`
- `vitest.config.ts`

`compose.yaml` 使用 `postgres:17-alpine`，本地默认连接为：

```text
postgresql://hibi:hibi@127.0.0.1:5432/hibi
```

该凭据只用于本地或可信开发环境；服务器部署时应替换为独立强密码，并避免把真实值提交到 Git。

### 4.2 数据库与迁移

新增 Drizzle schema：

```text
src/db/schema.ts
src/db/client.ts
```

当前表：

- `users`
- `knowledge_points`
- `mastery_declarations`
- `review_states`
- `attempts`
- `review_logs`

固定单用户 ID：

```text
local-user
```

已成功生成迁移文件：

```text
drizzle/0000_lean_amazoness.sql
```

迁移尚未在真实 PostgreSQL 上执行。

### 4.3 调度领域逻辑

新增：

```text
src/domain/review.ts
src/domain/review.test.ts
```

当前规则：

- 用户声明“我已掌握”后，状态为 `self_declared`。
- 首次短测安排在声明后的第 1 天。
- 首次短测通过后进入 `review`，下次间隔为 3 天。
- 已进入复习的项目通过后，间隔按 2 倍增长，最多 365 天。
- 短测失败后进入 `learning`，不再作为已掌握项目继续调度。
- 普通学习完成后的初始复习规则已写成纯函数，但尚未接入页面或 API。

### 4.4 服务端 API

新增：

```text
GET  /api/progress
POST /api/progress/mastery
GET  /api/reviews
POST /api/reviews
```

相关文件：

```text
src/lib/progress-service.ts
src/lib/api-response.ts
src/lib/knowledge.ts
src/app/api/progress/route.ts
src/app/api/progress/mastery/route.ts
src/app/api/reviews/route.ts
```

实现内容：

- 服务端校验静态知识点 ID。
- 首次写入时创建固定本地用户与知识点引用。
- 声明掌握、状态变更、短测作答均写入数据库记录。
- 短测答案在服务端判定。
- 未配置 `DATABASE_URL` 时返回可识别的 503 降级响应。
- 未向客户端返回数据库连接信息或内部错误详情。

### 4.5 页面与交互

新增组件：

```text
src/components/ProgressProvider.tsx
src/components/MasteryButton.tsx
src/components/ReviewQueue.tsx
```

当前页面变化：

- 每个现有 N5 文法卡片增加“我已掌握，跳过学习”。
- 每个现有 N5 单词卡片增加“我已掌握，跳过学习”。
- 保存后显示状态和首次短测日期。
- 复习页从静态占位改为读取真实到期队列。
- 到期短测使用四选一含义题。
- 答对后重新调度；答错后回到学习状态。
- 今日页到期数量改为读取持久化状态，不再固定显示 12 项。
- 数据库不可用时显示错误和重试，不阻塞其他静态内容浏览。

## 5. 已完成验证

在未连接数据库的情况下，以下检查已经通过：

```text
npm run lint   通过
npm test       通过，2 个测试文件、7 个测试
npm run build  通过
```

生产构建成功生成以下新增动态接口：

```text
/api/progress
/api/progress/mastery
/api/reviews
```

Drizzle schema 生成迁移成功，识别到 6 张表。

## 6. 未完成与必须继续验证的事项

### 6.1 数据库集成尚未验证

当前 Mac 上首次执行：

```text
docker compose up -d postgres
```

失败原因是 Docker daemon 未运行。之后执行过：

```text
open -a Docker
```

该命令可能已经打开 Docker Desktop，但后续 `docker info` 检查被用户中止。没有成功启动或验证本项目的 PostgreSQL 服务，也没有执行数据库迁移。服务器接手时必须从头验证数据库状态，不能把迁移写成“已通过”。

### 6.2 当前闭环仍有缺口

- 普通学习完成后的持久化 API 和页面动作尚未接入。
- 短测失败后虽然会切换为 `learning`，但还没有从该状态完成重新学习并再次进入复习的持久化路径。
- “我已掌握”的主动撤销路径尚未实现。
- 当前只有静态示例知识点；正式内容版本与导入流程尚未实现。
- 首次短测固定在次日，尚未提供测试时钟或开发用日期推进工具。
- 尚未进行真实 PostgreSQL API 集成测试。
- 尚未进行浏览器桌面和移动端交互验证。
- `PROJECT.md` 仍把该能力列为未实现；只有在真实数据库闭环验证完成后才能更新状态。

### 6.3 依赖锁文件

本次 `npm install` 造成 `package-lock.json` 较大范围变化。服务器端提交前应确认：

- 锁文件版本与服务器 npm 版本兼容。
- 依赖树没有无关升级。
- `npm install` 或 `npm ci` 能稳定复现。

不要为了缩小 diff 使用破坏性 Git 命令覆盖当前工作区。

## 7. 服务器建议接手顺序

1. 复制完整工作目录后，运行 `git status --short`，确认未提交文件完整存在。
2. 阅读本文件列出的新增代码和 `drizzle/0000_lean_amazoness.sql`。
3. 配置服务器开发用 PostgreSQL，不要沿用示例弱密码。
4. 设置 `DATABASE_URL`。
5. 运行 `npm install`，确认依赖与锁文件。
6. 运行 `npm run db:migrate`。
7. 启动 Next.js 开发服务。
8. 通过 API 或页面声明一个知识点“我已掌握”，确认数据库写入。
9. 使用可控测试时间或测试数据把项目推进到到期日，分别验证答对与答错路径。
10. 补齐“重新学习 → 完成学习 → 再次进入复习”的闭环。
11. 增加 PostgreSQL 集成测试和浏览器关键路径测试。
12. 再次运行：

```text
npm run lint
npm test
npm run build
```

13. 更新 `PROJECT.md` 的实现状态和验证记录。
14. 检查 `git diff`、`git status` 和敏感信息后再提交、推送。

## 8. 建议的最小验收标准

服务器端完成本任务至少应证明：

- PostgreSQL 从空数据库可通过迁移建立结构。
- 用户对任一文法或单词声明“我已掌握”后，刷新页面状态不丢失。
- 数据库存在对应声明、复习状态和日志。
- 到期项目会进入复习队列。
- 答对会产生 Attempt 与 ReviewLog，并延长下一次间隔。
- 答错会产生 Attempt 与 ReviewLog，并进入可实际完成的重新学习路径。
- 服务重启后全部状态仍然存在。
- 缺少数据库配置或数据库不可用时，页面能安全降级。
- lint、单元测试、数据库集成测试和生产构建通过。

## 9. 当前工作区文件概览

已修改的跟踪文件包括：

```text
.gitignore
package.json
package-lock.json
src/app/globals.css
src/app/grammar/page.tsx
src/app/review/page.tsx
src/app/vocabulary/page.tsx
src/components/AppShell.tsx
src/components/TodayDashboard.tsx
```

主要新增文件包括：

```text
.env.example
compose.yaml
drizzle.config.ts
drizzle/
src/app/api/progress/
src/app/api/reviews/
src/components/MasteryButton.tsx
src/components/ProgressProvider.tsx
src/components/ReviewQueue.tsx
src/db/
src/domain/
src/lib/api-response.ts
src/lib/knowledge.ts
src/lib/knowledge.test.ts
src/lib/progress-service.ts
vitest.config.ts
```

本文件本身也尚未提交。
