# meme 设计文档

这里是 meme 的产品需求、架构、两版开发计划和调研，用中文写。代码注释里的"plan §6""arch.md §6.2""memory-v0.3-draft §7.5"等，指的就是这里的文件和章节。

> 2026-11-20：设计文档从作者本机的私人仓库搬进这里，内容没改，只去掉了工号、公司内部信息和个人背景。本页是新写的索引；原来的首页（2026-10-13，第一版时写的）改名为 [m1-status.md](m1-status.md)。

---

## 1. 现在的状态

| 版本 | 做了什么 | 代码在哪 | 状态 |
|---|---|---|---|
| 第一版（M1） | 读 Claude Code、Codex、OpenCode、Pi 的会话，统一存进本地 SQLite；列表、搜索、查看；换一个 Agent 接着做 | `main`，标签 `v0.1.0` | 已发布 |
| 第二版（M2） | 记忆：写入、读取、MCP、后台流水线、按文件分的规则、跨项目记忆、综述 | `memory` 分支 | F1–F13 都做完了；**没合进 `main`，版本号还是 0.1.0，没有发布** |

所以现在按 README 装上的，是没有记忆功能的 0.1.0。

---

## 2. 先读哪几份

1. [design/prd.md](design/prd.md)：做什么、给谁、怎样算成功。
2. [design/arch.md](design/arch.md)：架构，各 Agent 怎么接，WSL 和 Windows，关键决策 D1–D20 和理由。
3. [design/plan.md](design/plan.md)：第一版的流程、命令规格、里程碑（§6），以及每一步的做法和结果。
4. [design/memory.md](design/memory.md) 和 [design/memory-v0.3-draft.md](design/memory-v0.3-draft.md)：记忆的设计。两份的关系见下面。
5. [design/plan-m2.md](design/plan-m2.md)：第二版的分步（F1–F13），以及每一步的做法和结果（§4）。

---

## 3. 每份文档是什么、现在还准不准

### 设计 `design/`

| 文件 | 是什么 | 现状 |
|---|---|---|
| [prd.md](design/prd.md) | 产品需求：目标、用户故事 U1–U9、成功标准、风险 | 现行。U9（额度提示）没做 |
| [arch.md](design/arch.md) | 概要架构和关键决策 D1–D20 | 现行。D1（用 git）、D4（不用 hook）和 §5.1 的目录结构已经过时 |
| [format.md](design/format.md) | 统一格式：会话和每条记录存什么 | 已全部实现。§4"以后再加"的每条记录的目录和分支、会话结束时的 git 状态，还没存 |
| [plan.md](design/plan.md) | 第一版开发计划和逐步记录 | 已做完（v0.1.0）。逐步记录里有实测数据、真机测试和没做的事 |
| [memory.md](design/memory.md) | 记忆设计 v0.2：读取、抽取、写入、注入，和同类的对比 | 部分被 v0.3 取代，见下 |
| [memory-v0.3-draft.md](design/memory-v0.3-draft.md) | 记忆设计 v0.3 草稿：分层存储、唯一的写入口、处理流程、交付、遗忘、WSL | 第二版按它做。没做的部分见第 4 节 |
| [plan-m2.md](design/plan-m2.md) | 第二版开发计划和逐步记录 | 已做完。§4 有实测数据和已知缺陷 |

**memory.md 和 v0.3 草稿的关系**：v0.3 是 v0.2 的增量，"已定的部分照用，只写改动"。原计划定稿后并进 memory.md、再删掉草稿，这一步一直没做。读的时候：

- 记忆的分类、存储、处理流程、交付、遗忘、WSL，以 v0.3 为准；
- 读取、抽取、写入的理由，以及和 Hindsight、Mem0、ACE 等同类的对比，只在 memory.md 里。

### 调研 `research/`

| 文件 | 是什么 | 现状 |
|---|---|---|
| [tech/sessions.md](research/tech/sessions.md) | Claude Code、Codex 会话格式实测 | 结论已进代码（`src/adapters`） |
| [tech/storage.md](research/tech/storage.md) | 镜像、增量导入、同步删除、脱敏实测 | 结论已进代码（`src/store`、`src/redact`） |
| [tech/list.md](research/tech/list.md) | 列出和搜索的设计、中文搜索实测 | 结论已进代码；保留了几种搜索方案的基准数据 |
| [tech/relay.md](research/tech/relay.md) | 接力内容的样子和小试 | 结论已进代码（`src/handoff`、`eval/v5.ts`）；交接文件和 skill 部分已作废 |
| [tech/release.md](research/tech/release.md) | 语言、打包、安装、发布 | 结论已进代码；§5 里的 npm 包名已作废（不做 npm） |
| [tech/llm-access.md](research/tech/llm-access.md) | 后台整理怎么调模型：订阅还是 API | 只做了 OpenAI 兼容 API；订阅模式没做 |
| [tech/native.md](research/tech/native.md) | 12 家 Agent 的原生加载位置、沙箱 | 只用上了 Claude Code 插件；其余各家的接入位置都在这里 |
| [market/handoff.md](research/market/handoff.md) | 跨 Agent 交接的路线、竞品，meme 的交接方案 | 不用 AI 的模式已实现；AI 摘要模式（§7）没做 |
| [market/landscape.md](research/market/landscape.md) | 跨 Agent 记忆插件的竞品和各家接入面 | 参考 |
| [market/ideas.md](research/market/ideas.md) | 差异化点子和红旗清单 | 大部分没做 |
| [market/trends.md](research/market/trends.md) | 近期 Agent 记忆动态和空白点 | 参考，时效性强 |
| [market/clients.md](research/market/clients.md)、[market/frontends.md](research/market/frontends.md) | 多 Agent 客户端、前端的空间 | 参考；"不做图形界面"的结论已体现 |
| [eval/a1-data.md](research/eval/a1-data.md) | 用公开数据验证"不同 Agent 会反复踩同样的坑" | 没做 |
| [eval/eval-survey.md](research/eval/eval-survey.md) | 记忆插件怎么证明自己有效 | 没做；做记忆评测时从这里开始 |

### 其他

| 文件 | 是什么 |
|---|---|
| [m1-status.md](m1-status.md) | 原来的首页（2026-10-13）。状态和路线图已过时；§5 问题清单里仍有有用的内容，比如 §5.2 第 1 条：研究显示全局记忆反而更差 |

---

## 4. 没做完的事

### 发布第二版

- 把 `memory` 合进 `main`，改版本号，打标签，出发布包。

### 记忆（第二版之后）

- MCP 只做了 4 个工具：`context`、`recall`、`remember`、`explain`。`search`、`tasks`、`handoff`、`feedback` 没做（memory-v0.3-draft §7.5，plan-m2 F4）。
- 注入记录和反馈（memory-v0.3-draft §4.4）。
- 命令：`memory review`（在 meme 之外手改记忆文件后的确认）、`memory upload`、`memory schedule`、`memory pending`/`apply`、`task done`（memory-v0.3-draft）。
- `derived/` 里的索引和预编译、召回触发词（memory-v0.3-draft §3.4、§7.4）。
- 第一条消息时按任务召回经验的 hook；跨会话的整合；别的命令运行时顺带在后台起流水线（plan-m2 F5、F6）。
- 别家 Agent 的插件：现在只有 Claude Code 的（memory-v0.3-draft §7.6，research/tech/native.md）。
- 记忆评测：`eval/` 里只有交接评测和大小统计（memory-v0.3-draft §11，research/eval/）。
- memory.md 里设计了但没做的：按 Agent 记"有用/有害"的反馈、会话卡、用代码锚点判断过时、skill 候选、按来源 Agent 整批撤回。

### 第一版留下的

- `show --hidden` 读子代理的过程（plan §3.2、§6 ⑧.2）。
- §6 ⑨ 定为"以后再说"的几条：R21、R27、R30 剩下的部分、R31。
- 发布：Homebrew、scoop、winget 没做；Mac 签名和 SmartScreen 没测；首发帖没发（plan "发布准备（功能完整以后再做）"）。npm 不做（2026-10-26 作者定，见 plan 开头的版本记录 v2.26），research/tech/release.md §5 里"定 npm 包名"那条已作废。
- U9 额度提示（prd.md）；AI 摘要模式的交接（research/market/handoff.md §7）。

---

## 5. 已知问题

- `forget` 不是一步完成的：先删证据，再删结论，最后写删除记录，中途被杀掉会停在一半（plan-m2 §4 F2）。
- 被取代的条目被遗忘以后，取代它的那条只去掉指向它的那一行，不会恢复原样（plan-m2 §4 F2）。
- 在 meme 之外手改记忆文件，改了就生效，没有确认这一步（`memory review` 没做）。
- Windows 上偶尔慢 10 秒，原因没查清；嫌疑是 SQLite 的 `busy_timeout` 或 Defender（plan §6 ⑤、arch §6.2）。
- Claude Desktop 连远程 SSH 时，会话在 `projects/ssh-*` 下，被跳过，看不到（plan §6 ⑪ F10）。
- Pi 用 `/fork` 分出来的会话历史会重复；Pi 设置里的 `sessionDir` 不认；直接装在 Windows 上的 OpenCode、Pi 没实测（plan §6 ⑩）。

## 6. 从没在真机上验证过的（plan-m2 §4）

- 插件真的装进 Claude Code：hook 的输出会不会进到会话里，`meme mcp` 会不会被拉起来（F6）。
- 真的 Agent 通过 MCP 接入；各家客户端自报的名字是猜的（F4）。
- `meme install` 往另一边装（F7）。
- 在真的 Claude Code 里用 `! meme remember`（F10）。
- 后台进程在 Windows 上、在 Agent 的沙箱里能不能起来（F9）；Codex 沙箱里 MCP 服务能不能联网问模型（F8）。
- Windows 上的 `meme.exe` 和 WSL 里的 `meme` 同时写（F6）。

---

## 7. 维护时要记得的

- **Agent 升级**：先跑 `MEME_REAL_SESSIONS=1 bun test test/unit/real-sessions.test.ts`，再按 plan §7、§8 检查。`~/.claude/sessions` 和 Codex 的 `thread-writer-locks` 都是没有文档的内部做法，哪天不再登记了，meme 会把开着的会话当成关着的。
- **trajectory 停止维护时的退路**：先把补丁提交上游；两周没修好，或三个月没有提交，就把用到的约 1000 行（Apache-2.0）复制进来（arch §6.1）。
- **测试只用合成数据**，不提交真实会话（见仓库的 CLAUDE.md）。
