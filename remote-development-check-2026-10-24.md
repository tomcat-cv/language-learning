# 47.251.181.177 远程开发验证

检测日期：2026-10-24（Asia/Shanghai）

## 结论

具备 SSH 远程操作和远程 Codex 模型调用条件；尚未具备可直接使用的完整 Codex App 远程开发条件。两个已确认阻塞是非交互式登录 PATH 未加载 NVM，以及 Codex Linux 沙箱启动失败。

## 实测结果

| 项目 | 结果与证据 |
|---|---|
| 本机 | macOS arm64；OpenSSH 10.3p1；Codex CLI 0.147.0，显示 Logged in using ChatGPT |
| 目标配置 | 本机已有 SSH 别名 aliyun，指向 admin@47.251.181.177:22 |
| TCP 与 SSH | 22 端口可达；BatchMode 公钥登录成功；StrictHostKeyChecking=yes 使用已有主机记录通过 |
| 账号 | admin，普通用户；家目录权限检查显示当前用户可写，未执行写入测试 |
| 系统 | Ubuntu 24.04.2 LTS，Linux x86_64，glibc 2.39 |
| 资源 | 2 个逻辑 CPU，内存约 1.6 GiB、可用约 1.0 GiB；无 Swap；根文件系统剩余约 23 GiB |
| 基础工具 | Git 2.43.0、Python 3.12.3、curl、tar、gcc、make 已找到；当前登录 PATH 未找到 Docker、unzip |
| 远程 Node | 已安装于 /home/admin/.nvm/versions/node/v24.18.0；临时加载 NVM 后 Node v24.18.0、npm 11.16.0 可运行 |
| 远程 Codex | 同一 NVM 版本目录下已安装 codex-cli 0.147.0；临时加载 NVM 后显示 Logged in using ChatGPT |
| 认证文件 | 远程已有 auth.json，属主 admin，权限 600；未读取内容或复制任何凭据 |
| 登录路径 | 普通 SSH 与 bash -lc 都找不到 codex/node/npm；.bashrc 第 6–8 行非交互式提前 return，NVM 初始化位于第 123–125 行，未执行 |
| 远程 OpenAI API | 无代理访问 /v1/models 返回 HTTP 401，TLS 验证结果 0；证明可达，不单独证明认证有效 |
| 远程 npm | HTTPS 请求包元数据返回 HTTP 200 |
| 远程 ChatGPT 首页 | HTTP 403；该网页响应不能据此推断 Codex 不可用，实际模型请求成功 |
| 模型调用 | 临时加载 NVM，执行 ephemeral、read-only 的最小 Codex 请求；返回“远程连接正常”，退出码 0 |
| Codex 工具执行 | 要求只执行一次 /usr/bin/true；Codex 报告 bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted。外层 Codex 进程退出码 0 不代表工具执行成功 |
| 命名空间 | unshare -Ur true 失败，写 /proc/self/uid_map 被拒绝；unprivileged_userns_clone=1，apparmor_restrict_unprivileged_userns=1，max_user_namespaces=6177；bwrap 已安装 |
| SSH 反向转发 | 显式申请 127.0.0.1 随机端口成功，分配端口 37921，连接随即结束；只证明转发权限，不证明代理转发端到端可用 |
| 本机出网与代理 | 本机直连 OpenAI API 在 6 秒连接窗口内超时；127.0.0.1:7890 连接被拒绝；发现 Clash 进程监听 49756，但未确认该端口用途，因此没有当作 HTTP 代理使用 |
| App 接入 | 未执行 GUI 添加 SSH 主机或项目；已保存项目列表未显示该服务器项目，不能据此判定是否存在未保存的主机连接 |

## 开发方案与下一步

1. 使用现有 aliyun 别名直连服务器。远程实际 Codex 请求已成功，当前不需要按文章照搬本机代理和反向隧道配置。
2. 修复远程非交互式登录环境：可在 /home/admin/.profile 中、现有 .bashrc 加载语句之后，加载现有 NVM，或明确将现有 Node bin 目录加入 PATH。此处只给出修复方向，未修改文件。NVM 加载方案应先确认所需默认 Node 版本。
3. 重新验证 ssh aliyun 'bash -lc "command -v node; command -v codex; codex --version; codex login status"'，应不再依赖手动临时加载。
4. 排查 bwrap 所需的用户与网络命名空间权限，检查适用的 AppArmor 策略及宿主机/容器限制。现有证据表明这些能力受限，但不能仅凭 sysctl 值认定唯一根因。应修复适用策略或换用支持隔离能力的开发环境；本次未更改系统安全策略，也未用关闭沙箱替代验证。
5. 修复后重新验证 Codex 在 read-only 下运行 true，再验证受限可写开发工作区的正常命令。通过后，在应用的 Settings > Connections 添加/启用 aliyun，选择实际项目目录并验证 App Server 启动、文件读取与变更审查。
6. 资源适合轻量脚本和小型项目；大型构建、容器和高内存任务需要按项目评估。当前尚未提供具体项目目录，因此没有验证项目依赖、构建或测试。

## 检测边界

最初沙箱内 TCP 探测被本机权限策略拦截；网络与 SSH 结论来自后续获准的沙箱外检测。未安装软件、修改启动文件、修改 SSH 配置、调整内核/AppArmor、复制凭据、开放永久端口或修改项目文件。Codex 最小测试采用临时会话；CLI 自身可能产生运行日志和常规运行状态。本报告是唯一主动创建的交付文件。

## 参考

- [用户指定文章：Codex App 通过 SSH 连接远程 Linux 开发环境](https://jishuzhan.net/article/2096487021414633474)
- [OpenAI 官方 Remote connections](https://learn.chatgpt.com/docs/remote-connections)：要求 SSH 可用、远程安装并认证 Codex，且远程登录 Shell 的 PATH 能找到 codex；应用通过 SSH 管理远程 App Server。

文章提供的方案与官方 SSH 接入流程方向一致；是否需要代理、重新安装工具或复制认证必须依实际检测决定。本环境无需重新安装已存在的 Node/Codex，也无需复制本机 auth.json。
