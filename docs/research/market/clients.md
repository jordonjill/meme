# "编码 Agent 版 Cherry Studio"的空间调研

> 调研日期：2026-10-08
> 问题：想做一个类似 Cherry Studio 的桌面客户端，把 Claude Code、Codex、Pi 等编码 Agent 集中到一个地方，并且内置跨 Agent 的记忆和续接。现有产品还有哪些问题没解决？还有没有空间？
>
> **方法**：主要依据 gh（仓库、发版、issue、讨论区）、npm 下载量、HN 搜索接口和 V2EX 搜索接口。**LinuxDO 从调研环境无法访问**，改用 V2EX；V2EX 帖子里提到的 LinuxDO 帖子都没有核实。

---

## 结论速览

- **Vibe Kanban 实际上已经停摆。** 仓库没有归档，但只剩零星的安全和依赖修复；npm 月下载量从 1 月的约 8.9 万降到约 1 万，降幅 89%。
- **"编码 Agent 版 Cherry"这一层外壳已经饱和。** AionUi（3.3 万星，支持 20 多个 Agent）、LobeHub（8.3 万星，支持 13 种 Agent）、Cherry Studio 自己（v2 内置 Agent 运行环境，外加 Code Mate）都在做。**国人项目 codeg（3.8k 星）已经做到：导入各 Agent 的本地会话，交给另一个 Agent 接着做，还能引用其他 Agent 的旧会话。**
- **跨 Agent 续接和共享记忆是真实存在、但很弱的需求。** 在十几个工具仓库里：
  - 标题里明确要求"交接"的约 72 条，点赞最多 8 个；
  - 明确要求"共享记忆"的约 79 条，点赞最多 5 个。
- **强需求在别处**：支持更多 Agent（单条最多 185 赞）、会话历史（Zed 的一条有 260 赞）、Windows / WSL 支持（137 赞）、多账号和额度（Claude Code 仓库里的一条有 1041 赞）。
- **最大的平台风险是 Anthropic 对订阅计费政策的反复调整**（4/4、5/14、6/15、10/7，一共四次）。"在终端里托管用户自己的交互式 claude，再读取本地会话记录"，是最稳妥、能继续使用订阅额度的接入方式。

---

## 一、Vibe Kanban 的现状

| 方面 | 情况 |
|---|---|
| **关停** | 2026-04-10 发文告别。原话："绝大多数是免费用户，我们找不到一个能让自己兴奋的商业模式。"云端功能保留 30 天后改为纯本地，已付费的用户已退款，本地工作区还能继续用。[公告](https://www.vibekanban.com/blog/shutdown) |
| **引发众怒的版本** | 0.1.44（04-24）把项目功能改成只能导出，连自己部署的用户也一起断了，用户只能回退到 0.1.43。[#3396](https://github.com/BloopAI/vibe-kanban/issues/3396) |
| **仓库状态** | 没有归档，2.83 万星，544 个未关闭的 issue。4 月之后停了将近 5 个月，9 月中旬只做了一些安全和依赖修复 |
| **社区版** | 创始人 6 月发起讨论，说"不想要一份只是追赶大厂的路线图"，至今没有正式路线图。[讨论 #3424](https://github.com/BloopAI/vibe-kanban/discussions/3424) |
| **使用量** | npm 月下载：1 月 8.88 万 → 4 月 2.8 万 → 5 月 9,900 → 9 月 1.02 万 |
| **后继者** | 分支项目都没做起来，最多几十个星。替代品里势头最好的是 kdlbs/kandev（909 星），本地运行、不收集数据 |
| **用户最怀念的** | "这么多个 Agent 终端里，哪个在做哪件事？""休息回来，我做到哪了？"另外还有：worktree 管理、提示词预设、PR 状态可见、在一个地方找到所有服务商的 Agent 会话、纯本地项目 |
| **关停前的主要抱怨** | 新界面砍掉了看板（33 赞）；迁移到云端、强制登录；不支持自己部署的 GitLab（26 赞）；worktree 自动清理（19 赞）；Agent 启动失败 |

**启示**：2.8 万星也救不了"没有商业模式加维护负担"。改成云端、强制登录，会直接赶走用户。**用户真正怀念的是"会话台账"：哪个会话在做什么、我做到哪了**，而不是"同时运行几个 Agent"本身。

---

## 二、类 Cherry 桌面客户端的对比

| 产品 | 星 / 最近发版 | 能不能托管编码 Agent | 怎么接入 | 跨 Agent 共享会话或记忆 | 跨 Agent 续接 | 主要抱怨 |
|---|---|---|---|---|---|---|
| **Cherry Studio** | 5.24 万 / v2.1.4（09-30），v2.0 于 08-05 发布 | **能**。一是内置 Agent 运行环境：Claude Code（通过 Agent SDK）、Pi、DeepSeek Harness，外加一个自研循环；二是 **Code Mate**：一键给 Claude Code、Codex、Gemini CLI、OpenCode、Antigravity、Hermes、DeepSeek Harness 配好服务商，在外部终端里启动 | Agent SDK + 外部终端启动 | 记忆是每个 Agent 各一套文件，**不跨 Agent**；知识库可以共享。**v1 的"全局记忆"在 v2 被删掉了**，原因是"配置复杂，质量撑不起开销" | **不能**：分叉只能在同一个运行环境内。有人提了"切换模型时可编辑的交接""创建后切换运行环境"，都只有 1 个赞 | v2 退化，有人说"version 1 was better"；卡顿；Agent 输出中断；Claude Code 超时或报错；收集使用数据（16 赞） |
| **AionUi** | 3.34 万 / v2.2.2（09-09） | 能，20 多个命令行 Agent | **ACP**，外加内置引擎 | **没有**共享记忆 | 不能；"导入命令行历史"的请求都还没解决 | 见第四节 |
| **LobeHub** | 8.3 万 / v2.2.19（10-07） | 能。桌面版的"异构 Agent"（2026-04-27 上线）支持 Claude Code、Codex、OpenCode、Pi、Amp、Cursor、Droid、Devin、Trae、Grok Build、Kimi Code、Qoder、CodeBuddy | 启动命令行后解析它的输出；能显示 Codex、Kimi 的额度并切换账号；能从自己的库里重建 Claude Code 的会话记录，供恢复会话使用 | LobeHub 自己有用户记忆，但会不会注入到这些 Agent 里【未核实】 | 没看到这个功能，虽然它已经有解析和重建会话记录的基础 | 没有深挖 |
| ChatWise | 闭源，最后一次更新 07-01 | 没发现【未核实】 | —— | —— | —— | —— |
| NextChat | 8.88 万 / 2025-07 | 不能，基本停更 | —— | —— | —— | —— |
| Jan | 4.48 万 / 07-23 | 不能。它自己是一个 ACP Agent（实验性），不是宿主 | —— | —— | —— | —— |
| AnythingLLM | 6.68 万 / 10-01 | 不能 | —— | —— | —— | —— |
| Chatbox | 4.2 万 / 09-24 | 不能 | —— | —— | —— | —— |
| Kelivo | 4,200 / 09-22 | 不能托管外部命令行；有自己的工作区 Agent，能用 ChatGPT（Codex）和 Kimi Code 账号作为模型来源 | —— | 有全局或按助手的长期记忆 | —— | —— |
| **codeg**（国人项目，参照） | 3,800 / v0.34.0（10-07），每月发 15–27 个版本 | 能，内置 15 个，外加任意 ACP Agent | ACP + 用 Rust 写的各家会话解析器 | 能导入和搜索各命令行工具的本地历史 | **能**：导入、搜索、恢复会话，然后交给另一个 Agent；还能引用其他 Agent 写的旧会话 | 最多的 issue 都是"支持某某 Agent" |
| T3 Code、Paseo（参照） | 2.62 万 / 2.0 万 | 能 | SDK、app-server；Paseo 还有终端模式 | —— | T3 V2 有切换 Agent 时的交接和读取历史；Paseo 有交接命令 | 见第三节 |
| cc-switch（参照） | 14.09 万 / v4.0.4（10-07） | 不托管 | 改写配置 + 本地路由和故障切换 | 会话管理从 v3.11（2026-02）就有，v4 重写了阅读页：能浏览 9 家的会话；列表只按标题、最后一条消息、目录、会话 ID 搜索，不搜正文；只给出同一工具的恢复命令（一键在终端打开只支持 Mac）；删除会删原会话文件（10-08 看源码更正，见 [sessions.md](../tech/sessions.md) 第 6 节）。另有用量和费用统计；同步 MCP、Skills、提示词 | 不能 | 最多的 issue 是支持新的命令行工具：Antigravity（43 赞）、ZCode（19 赞） |

链接：[Cherry 的记忆文档](https://github.com/CherryHQ/cherry-studio/blob/main/docs/references/memory/overview.md)、[LobeHub 异构 Agent 更新日志](https://github.com/lobehub/lobehub/blob/main/docs/changelog/2026-04-27-heterogeneous-agent.zh-CN.mdx)、[codeg](https://github.com/spacering-net/codeg)

---

## 三、跨 Agent 工具的痛点（GitHub issue 统计）

**口径**：在 T3 Code、Zed（只算 ACP 和 Codex 相关）、AionUi、Superset、Emdash、Nimbalyst、cc-switch、Happy、Conductor、Cherry 这 10 个仓库里，按关键词统计 issue 数量（包括已关闭的），只能看相对量级，有噪声。"交接"和"记忆"两行另外按标题精确检索，范围再加上 codeg、Paseo、Vibe Kanban、LobeHub。

| 痛点 | 大约数量 | 代表 issue（赞 / 评论） | 用户原话 |
|---|---|---|---|
| **支持新的 Agent** | 约 440（标题） | T3：Copilot CLI（185/40）、OpenCode（130）；Happy：OpenCode（55）；cc-switch：Antigravity（43） | 需求最强的一类 |
| **会话历史、恢复、导入** | 约 1,110 | **Zed #37074 "Support history with external ACP agents"（260/82）**；T3：加载已有的 Codex 对话（26） | "none of the threads I've created have been saved to the history list" |
| **跨 Agent 续接、交接** | 关键词约 430；**标题里明确提的只有 72 条，最多 8 赞** | T3 #3797 "Switch provider mid-conversation via transcript handoff"（8）；Cherry 的交接请求（1） | T3 官方说明：交接是"在预算内挑选内容，不是摘要……重要的约束请自己再说一遍" |
| **跨 Agent 记忆** | 关键词约 280；**标题里明确提的 79 条，最多 5 赞**，多数是 Cherry v1 全局记忆的 bug | AionUi 三层共享记忆（1 赞 / 7 评论）；**反例：Claude Code 支持 AGENTS.md 的请求有 6,685 赞，已于 08-17 完成** | "没有公共记忆？跨对话后，以前的约定就找不到了，需要重新指定。" |
| 额度、限流、多账号 | 约 450 | T3 用量可见（37）；T3 多个 Codex 账号（17）；Claude Code 多账号（1,041） | "the thread is silently dead and only a full restart recovers it" |
| **Windows / WSL** | 约 660（标题） | **T3 #192 WSL（137）**；Zed（16）；Superset（14） | —— |
| Linux 打包 | 约 270 | Superset（23）；AionUi AppImage（11） | —— |
| 权限和审批 | 约 295 | T3 审批通知（64）；Happy 的 Codex 权限卡住（19/18） | —— |
| 成本和用量 | 约 355 | T3 "Extremely high usage"（20/48） | —— |
| 国产模型、中转站、自定义服务商 | 约 2,550（其中 cc-switch 占 1,657） | Zed 接 Kimi 时报错（13/31）；Cherry 接 DeepSeek V4 的问题 | Claude Code 已经在请求里加了隐写标记，用来对付转售和中转（HN 2,445 分） |
| **Agent 升级后适配失效** | 约 1,390 | Zed（46）；Zed 里 Gemini CLI 一直加载不出来（36/59）；T3 从 V1 升到 V2（50/37）；Happy 从 0.12 起恢复会话失效（15） | AionUi 的后端几乎每隔几天就有一次"适配新版 Claude Code"的提交，这就是适配的维护成本 |
| 性能 | 约 280 | T3 "比 Codex 慢"（31/26）；AionUi 占用 80G 内存 | "Codex completed the task in 4m35s, while T3 Code took 15+ minutes" |
| 手机、远程、SSH | 约 880 | Superset SSH（34）；T3（32） | —— |
| **强制登录、收集使用数据** | 约 470（噪声大） | Superset "Make login non-required"（22）；T3 使用数据（19）；Cherry（16）；AionUi | "强制登录，这是一款号称24/7、免费、开源的软件，恶心人的开始！" |

**HN 上的对照**：跨 Agent 记忆类的 Show HN 项目（Termem、Sibyl、Lore、LedgerSync、memento 等）都只有 0–5 分；"在 Claude Code、Codex、OpenCode 之间互相恢复会话"的项目 14 分；Emdash 的 Show HN 206 分。

---

## 四、AionUi 深挖

- **架构**：前端是 Electron；2026-05-25 后端迁到 Rust 写的 AionCore，还有一个内置引擎。外部 Agent 全部走 ACP：Claude Code 和 Codex 各用一个 ACP 适配器，长尾的 Agent 走 ACP 注册表，版本锁定。
- **功能**：
  - 团队模式：一个领头 Agent 加若干队友，通过共享的任务板和信箱协作；
  - MCP 统一注入；
  - 网页版，以及 Telegram、飞书、钉钉、微信接入；
  - 定时任务；
  - 生成 PPT、Word、Excel；
  - 扩展市场；
  - 8 月底新增"跨会话消息"：一个会话里的 Agent 可以给另一个会话（可以是不同的 Agent）发消息。**这是"协作"，不是"续接"。**
- **缺的东西**：
  - 没有记忆层，维护者只回了一句"会跟踪"；
  - 不能导入或续接命令行工具的历史；
  - 新会话不继承权限偏好；
  - 团队模式不稳定；
  - Linux 打包、Windows 下自定义 ACP 启动、内存占用、远程 ACP 和 SSH 都有问题。
  - **issue 的点赞普遍很低，最多才 11 个**，和 3.3 万星的体量不太相称；几次 Show HN 也只有 1–2 分。（这只是观察，不是指控。）
- **强制登录风波**：大约从 8 月初的 v2.1.49 开始，必须用 Google 账号登录，维护者的解释是"为未来的账号级数据管理"。断网或内网环境的用户因此无法使用，引发了不少不满。
- **发版节奏**：2026 年 1–8 月每月发 12–19 个版本，9 月只发了 2 个，**9 月 9 日之后前端仓库再没有提交和发版**（后端仓库最后一次提交在 9/30）。原因不明，可能在重构，或者精力转到了别的项目（推测）。
- **路线图**：规划文档里有浏览器 Agent、助手、对话、定时任务、宠物、远程、团队、工作区，**没有记忆和续接**。

---

## 五、中文社区的声音（V2EX）

- **cc-switch 是事实标准**：V2EX 上 2025 年以来大约 106 个帖子，话题集中在接 DeepSeek、GLM、Kimi，配置中转站，多账号，额度统计；也有人担心"全局路由会不会触发 Anthropic 的风控"。同期 AionUi 只有 5 个帖子，codeg 有 23 个。
- **Cherry Studio**：多数帖子只是把它当作"用中转 API 的客户端之一"，有人抱怨"越来越沉"；没看到有人把它当作编码 Agent 的宿主来讨论。
- **多 Agent 工作台很多，但几乎没人回帖**：Cetus、YCode、Runner、Fello、Gold-Band、BotBus、Pebrel、Agent studio，以及 codeg 的几次发版帖，回复大多只有 0–4 条。典型的质疑：
  - "跟终端开多个标签页感觉没多大区别？"
  - "感觉自己没有多 Agent Runtime 的需要，反而想要一个支持自定义模型的 Agent 桌面端。"
- **国内大厂也在做自己的桌面 Agent**：智谱 ZCode（7,500 星，9 月 21 日开源，但伴随"上传用户代码"的隐私争议）、DeepSeek Harness、Kimi、MiMo Code、Qoder、CodeBuddy / WorkBuddy。有帖子问"接下来是智能体桌面端的百花齐放……最后谁来大一统？"，也有人讨论"大模型厂商的客户端会不会吃掉 Agent 应用"。
- **大家对统一客户端的需求，更多是统一配置、额度和账号**（这块 cc-switch 已经覆盖），而不是统一会话和记忆。确实有人想要跨 Agent 共享上下文，但没有形成热议。

---

## 六、调研的结论

**(a) 还有没有空间？**
- **做通用外壳（多 Agent 图形界面 + worktree + 改动对比）基本没有空间了**：AionUi、LobeHub、Cherry、T3、Paseo、codeg、Superset、Emdash，还有官方的 Codex 应用、Claude 桌面版、ZCode 都在做。Vibe Kanban 有 2.8 万星都没活下来。
- **真正的空位是"与 Agent 无关、归用户所有、本地可审计的项目大脑"，也就是"会话台账 + 经验记忆"**：
  - AionUi 没有记忆；
  - Cherry 删掉了全局记忆；
  - codeg 和 T3 只做续接，不做"学到的教训"；
  - 官方的迁移都是单向的：Codex 能导入 Claude 的 MEMORY.md，也能把会话从 Claude Code 转过去。

**(b) 把"记忆 + 续接"放在核心，能不能脱颖而出？**
- **只做续接不够**：T3、codeg、Paseo、txcript、Codex 官方都已经做了，而且 issue 里的需求很弱（最多 8 赞）。
- **记忆在技术上有区分度，但在传播上是个弱钩子**：共享指令这一层的需求（AGENTS.md，6,685 赞）已经被各家原生解决了；自动学习型的记忆有明确的失败先例（Cherry 因为质量问题删掉了它）。
- **能讲清楚、站得住的差异化是"可以量化的效果"**：比如在 Claude Code 里一条命令转到 Codex，30 秒内接上，而且 Codex 自动避开上周在这个仓库踩过的坑；再配一个公开的评测，衡量"重复犯错率、需要重复解释的次数"。
- **要让用户愿意装，最好以插件或 MCP 的形式嵌进他们已有的工具里**（Claude Code、Codex、OpenCode、Pi，甚至 AionUi、Cherry、T3），而不是要求用户换掉整个客户端。这和 meme 的方向一致：**先做引擎，外壳以后再说。**

**(c) 一个人能做的现实范围**
1. **先做三个 Agent**：
   - Claude Code：在终端里托管它，读它的本地会话记录，这样能继续用订阅额度；
   - Codex：用官方的 app-server，或者读它的会话文件；
   - OpenCode 和 Pi 二选一：都对第三方友好，用国产模型的用户多。
   
   Gemini CLI 正在被 Antigravity 取代，先不做。其他长尾的 Agent 以后走 ACP，ACP 已经是事实标准。
2. **形态**：
   - 先做本地的命令行、后台服务、MCP 加 hooks，用 Markdown + git 存储，方便审计；
   - 以后再做一个轻量的网页或桌面面板；
   - **完全离线、不用登录、不收集数据，从第一天就支持 Windows 和 WSL**（这是痛点里量最大的几类之一）；
   - 服务商和中转站的配置直接读 cc-switch 的，不要重新造一套。
3. **里程碑**：
   - 第一步：跨 Agent 的会话台账，回答"哪个会话在做什么、我做到哪了"，这正是 Vibe Kanban 用户最怀念的；
   - 第二步：按预算交接，加上一个读取历史的 MCP；
   - 第三步：经验提炼，输出兼容 AGENTS.md 的文件，加上 MCP 召回，并配上评测。

**(d) 最大的风险**
1. **Anthropic 的政策反复**：4 月第三方工具改走额外用量；5 月宣布 SDK 和 `claude -p` 改用专门额度；6 月暂停；10 月 Max 和 Team 套餐附带 API 额度。官方页面目前写的是"仍可使用订阅额度"，但 HN 上已经有人解读为"强制走 API"。Paseo 社区的应对办法，就是在终端里托管交互式的 claude，再读取会话记录。
2. **被官方吸收**：Codex 的记忆导入和会话转移、Claude Code 支持 AGENTS.md，还有国内厂商各自的桌面 Agent。
3. **适配的维护成本**：命令行工具每周都在更新，Zed、T3、AionUi 都被升级打断过。
4. **注意力已经饱和**：同类项目在 V2EX 上发帖几乎没人回复。
5. **记忆的质量和隐私**：记忆被污染、过时（Cherry 的教训）；ZCode 的上传争议说明用户对代码外传非常敏感。
6. **不要强制登录，不要云化**：Vibe Kanban、AionUi、Superset 都因此被骂过。
