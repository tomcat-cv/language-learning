# 日々（Hibi）

日々是一款面向中文用户的日语学习 Web 应用原型，从可跳过的假名入门和 JLPT N5 开始。当前词汇目录使用本地 JMdict 正式词典数据，按日期生成复习优先的每日计划，并通过 PostgreSQL 保存学习作答、完成状态、“我已掌握”、到期短测、复习结果和重新学习状态。正式文法课程尚未接入，不用示例内容填充。配置模型后，还可以测试连接和提交 AI 请求。

项目提供面向电脑和手机浏览器的响应式布局。学习者可以设置目标等级、每日文法与单词数量、学习时长，并填写 OpenAI、Anthropic、Google Gemini 或 OpenAI 兼容模型配置。

## 环境要求

- Node.js 20.9 或更高版本
- npm
- PostgreSQL 16 或更高版本（需要保存学习进度时）

## 安装

```bash
cd language-learning
npm ci
```

如果安装依赖时访问 npm 官方源较慢，可以临时使用镜像：

可以先运行 `npm config set registry https://registry.npmmirror.com`，再执行
`npm ci`。安装完成后建议恢复官方源。

## 本地开发

```bash
cp .env.example .env.local
# 修改 .env.local 中的 DATABASE_URL
npm run db:migrate
npm run db:verify
npm run content:download
npm run content:import
npm run content:catalog
npm run dev
```

打开 <http://localhost:3000>。

如果只想浏览界面，可以暂不配置数据库；进度和复习功能会明确显示为不可用。本地开发模式不要求个人访问口令。

`content:download` 从 EDRDG 官方 HTTPS 地址下载 JMdict 与 KANJIDIC2，并将压缩
快照与 SHA-256 元数据放入 Git 忽略的 `.cache/hibi-content`。`content:import`
校验文件后批量、幂等地导入 PostgreSQL。后续需要更新两份快照时运行：

```bash
npm run content:sync
```

`content:catalog` 将本地快照生成 Git 忽略的 `.local/source-catalog`，供“内容”页面
浏览词汇和汉字。N5–N2 的等级只使用 KANJIDIC2 的旧 JLPT 提示，N1 使用频率/常用词
启发式草稿；这些标签不是 JLPT 官方完整分级。未能可靠分级的条目保留在“未分级”中。

个人本地题库可以将 JLPT 官方 N1–N5 样题资料下载到 Git 忽略的
`.local/jlpt-official` 后运行 `npm run question-bank:import-official`。导入器会解压
各等级资料，将官方幻灯片转换为可读取的结构并生成每级 `questions.json`，同时保留
来源 PDF、原始幻灯片、音频引用和答案核验状态；所有结果都在 Git 忽略的
`.local/question-bank` 中。答案未能从官方样题材料可靠核验的记录会标记为
`needs-official-key`，不会被误当作可直接评分的题目。官方资料仅供个人学习使用，
具体使用范围以 JLPT 官方站点政策为准。

JMdict/KANJIDIC2 提供词典和汉字事实，并不提供当前 JLPT 的官方完整 N5–N1
清单。应用把词典事实与“日々课程分级”分开保存；尚未审核发布的分级候选不会直接
进入学习计划。

## 个人服务器部署

当前版本只适合项目所有者本人使用，不是多用户服务。服务器部署至少需要：

- PostgreSQL 和独立强密码。
- `HIBI_ACCESS_USERNAME` 与 `HIBI_ACCESS_PASSWORD`。
- Caddy、Nginx 等反向代理提供端到端 HTTPS。
- 只让 Next.js 监听 `127.0.0.1`，不要直接暴露其端口。

示例环境文件 `/etc/hibi/hibi.env`：

```dotenv
DATABASE_URL=postgresql://hibi:replace-db-password@127.0.0.1:5432/hibi
HIBI_ACCESS_USERNAME=hibi
HIBI_ACCESS_PASSWORD=replace-with-a-long-random-password
```

不要提交这个文件。两个访问口令变量只配置一个时，或生产环境两个都不配置时，应用会拒绝访问。`HIBI_ALLOW_UNAUTHENTICATED=true` 仅用于明确接受风险的本机诊断，不应出现在服务器配置中。

首次部署：

```bash
npm ci
set -a
. /etc/hibi/hibi.env
set +a
npm run db:migrate
npm run db:verify
npm run lint
npm test
npm run build
npm start -- --hostname 127.0.0.1 --port 3000
```

仓库提供 [systemd 服务模板](deploy/hibi.service) 和 [Caddy 配置示例](deploy/Caddyfile.example)。复制前应按实际用户、目录和域名修改。反向代理成功签发 HTTPS 证书后，再从手机或其他设备访问；不要在明文 HTTP 页面中输入 API Key。

服务仅监听 `127.0.0.1` 且尚未配置 HTTPS 时，可以从自己的电脑建立 SSH 隧道：

```bash
ssh -L 3000:127.0.0.1:3000 user@server-address
```

保持该连接打开，然后访问 <http://127.0.0.1:3000>。这种方式无需对外开放应用端口；仍应使用应用访问口令。

### 备份与恢复

至少每天使用 `pg_dump --format=custom` 备份数据库，并将备份复制到服务器之外。示例：

```bash
pg_dump --format=custom --file=/var/backups/hibi/hibi-$(date +%F).dump "$DATABASE_URL"
```

恢复前先停止应用，并在独立测试数据库演练：

```bash
pg_restore --clean --if-exists --dbname="$DATABASE_URL" /path/to/hibi.dump
npm run db:verify
```

`db:verify` 会检查必要数据表，在事务内测试关键表写入，然后回滚验证数据。

仓库还提供每日备份模板：

- [backup-database.sh](scripts/backup-database.sh)：生成自定义格式备份、校验归档，并删除超过 14 天的本机旧备份。
- [hibi-db-backup.service](deploy/hibi-db-backup.service)：systemd 一次性备份服务。
- [hibi-db-backup.timer](deploy/hibi-db-backup.timer)：每天约 03:15 执行，错过时间后补跑。

模板中的用户、项目路径和环境文件路径必须按服务器实际情况修改。即使启用本机自动备份，也应将备份同步到另一台设备或对象存储。

## 快速体验

1. 从“内容”页面查看本地正式词汇、汉字和数据源分级状态。
2. 进入“假名入门”，点击假名播放日语读音。
3. 从今日计划进入文法或单词学习，答对含义题后建立次日复习状态。
4. 从“单词”目录浏览正式 JMdict 词汇；对熟悉内容选择“我已掌握”，次日进入短测。
5. 短测未通过时回到相应目录补学，完成后重新安排复习。
6. 在“我的”页面调整每日学习数量、时长和目标等级；新设置从下一份日期计划开始生效。
7. 配置模型后，可在文法学习页提交可选的日语造句反馈请求。

## 模型配置

进入应用的“我的”页面，选择模型服务商并填写模型名称和 API Key。当前已提供以下配置选项和调用适配器：

- OpenAI
- Anthropic
- Google Gemini
- OpenAI 兼容接口

API Key 当前保存在该站点的浏览器 localStorage 中。提交造句或测试连接时，浏览器会将密钥发送到同源的 `/api/ai` 服务端接口，再由该接口调用所选的第三方模型服务。只应在可信设备上使用，并确认访问地址来自你控制的服务。

清除密钥的方法：

1. 在“我的”页面清空 API Key 并保存；或
2. 在浏览器设置中清除该站点的站点数据。

不要将 API Key 写入源码、提交到 Git、输入到他人部署的未知实例，或通过不受信任的网络传输。

## 常用脚本

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动本地开发服务 |
| `npm run lint` | 检查代码规范 |
| `npm test` | 运行单元测试 |
| `npm run test:integration` | 使用 `.env.local` 的 PostgreSQL 运行隔离集成测试 |
| `npm run test:e2e` | 构建应用并运行桌面与手机视口浏览器测试 |
| `npm run build` | 创建生产构建 |
| `npm start` | 启动构建后的服务 |
| `npm run db:migrate` | 执行 PostgreSQL 迁移 |
| `npm run db:verify` | 验证数据库结构和事务写入 |
| `npm run content:download` | 下载并校验 JMdict/KANJIDIC2 快照 |
| `npm run content:import` | 将本地快照幂等导入 PostgreSQL |
| `npm run content:sync` | 下载并导入两份最新官方快照 |
| `npm run content:catalog` | 将本地 JMdict/KANJIDIC2 快照生成可浏览的词汇/汉字目录 |
| `npm run question-bank:import-official` | 导入本机的 JLPT N1–N5 官方资料包 |

首次运行浏览器测试前需要安装 Chromium 及其系统依赖：

```bash
npx playwright install --with-deps chromium
```

集成测试和浏览器测试会创建并删除独立的临时 PostgreSQL schema，不会清空当前用户的学习数据。

## 内容来源与许可

- JMdict：日语词条、读音、词性和多语言释义候选。
- KANJIDIC2：汉字、读音、含义、笔画及相关检索信息。

两份文件均由 Electronic Dictionary Research and Development Group（EDRDG）维护，
按 Creative Commons Attribution-ShareAlike 4.0 International 使用。应用在“我的”
页面展示当前导入版本、记录数、项目主页、许可和必要署名。分发重要摘录或衍生词表
时仍需遵守 EDRDG 的完整许可条件和定期更新要求。
