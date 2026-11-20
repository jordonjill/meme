# 多 Agent 前端与跨 Agent 会话 / 记忆共享调研

> 调研日期：2026-10-08
> 问题：做一款同时接入 Claude Code、Codex、Pi 等 Agent 的产品，市面上已有的是不是大多只是套壳，没有真正打通？也就是说，不同 Agent 之间会话、记忆不共享，也不能在这个 Agent 里聊完，换另一个接着聊。
>
> **方法**：本会话的网页搜索额度已经用完，依据来自 gh（源码、README、issue、PR）、HN 搜索接口、V2EX 搜索接口，以及能直接访问的官方文档，没有查 Reddit。
> **标注**：【源码】【官方文档】【仅营销页】【未核实】。

---

## 结论

- **"大多数产品是套壳"基本成立**：约 80% 的产品只是用 worktree 加终端并排启动多个 Agent，或者每个 Agent 一个对话线程，最多靠摘要或共享文件来交接。
- **但"没人在做真正打通"已经不对了**：T3 Code V2、VS Code、Codex 官方、Skillsync / txcript 都在做跨 Agent 续接。它们做的是"上下文交接"，不是"共享会话"：
  - 推理过程转不过去；
  - 工具调用的状态有损；
  - 多数只支持单向。
- 剩下的空白比预想的窄。

---

## 一、多 Agent 前端对比

| 产品 | 支持的 Agent | 接入方式 | 统一会话？ | 跨 Agent 续接？ | 共享记忆？ | 备注 |
|---|---|---|---|---|---|---|
| **T3 Code**（26.2k★，开源免费，10-08 仍在发版） | Codex、Claude、Cursor、Grok、OpenCode、Pi、Antigravity；V2 还能接入 ACP 注册表里的 Agent | 每家一个适配器：Codex 走 app-server，Claude 走 Agent SDK，Pi 走 RPC，OpenCode 走 server【源码】 | **部分**：一个对话中途可以换 Agent（V2 编排，目前只在测试版） | **有，但是有预算的文本交接**：默认 16k token，优先保留最近的消息和最初的请求；**不带上一家的推理、工具调用状态和附件**；Codex 在版本支持时直接收到历史消息，其他 Agent 收到一段标明来源的文本；Agent 可以用一个读取历史的 MCP 工具补查被省略的部分【官方文档】 | 没有独立的记忆层 | **目前最接近真正打通的**。相关 bug 很多。[交接文档](https://github.com/pingdotgg/t3code/blob/main/docs/user/portable-handoffs.md) |
| **VS Code**（Copilot Agents） | Copilot、Claude、Codex，外加云端 | 在 Agent Host 里运行各家 | 有统一的会话列表、跨设备同步 | **有"交接"功能**，文档写"carries the full conversation history"，但**只能从 Copilot 的本地会话发起** | 没有专门机制 | **大厂已经进场**。Claude 只能走 Copilot 订阅或自带 key，Codex 可以用 ChatGPT 登录。[文档](https://code.visualstudio.com/docs/copilot/agents/third-party-agents)【官方文档】 |
| **Conductor**（闭源 Mac 应用，本地免费，10-02 发 0.90.0） | 内置 Claude Code、Codex、OpenCode；Cursor 走它的 API | 调用内置的原版命令行 | 文档写明"每个聊天标签只用一个 Agent 和一个模型" | 只有弱交接：新标签可以附带旧聊天的摘要；可以把计划交给另一个 Agent | 有一个共享目录，放附件、计划和笔记 | 09-29 和 OpenAI 合作，接入 Sign in with ChatGPT。[文档](https://www.conductor.build/docs/reference/harnesses) |
| **Zed**（ACP 宿主） | ACP 注册表里的 Claude、Codex、Gemini、OpenCode、Copilot、Cursor、Pi 等 | ACP | **有统一的对话历史**，能把各 Agent 的会话列出来导入 | **没有**，对话绑定创建时的 Agent。社区提过"换个 Agent 继续"的 PR（用 txcript 转换），**已关闭、没有合并** | 没有 | [文档](https://zed.dev/docs/ai/external-agents)、[PR #65150](https://github.com/zed-industries/zed/pull/65150) |
| **JetBrains Air / IDE 的 ACP 支持** | Claude、Codex、Junie、Copilot、OpenCode 及任意 ACP Agent | ACP | 不清楚 | 营销页写"Switch between subscriptions – even mid-session"，能不能跨 Agent 带上下文【未核实】 | 不清楚 | [营销页](https://www.jetbrains.com/air/)【仅营销页】 |
| **Cursor 3** | 自家的本地和云端 Agent | 自研 | 汇总自家的 Agent | 只有本地和云端之间的交接 | —— | 没找到它能运行 Claude Code 或 Codex 的证据【未核实】 |
| **Happy**（24k★，桌面版 10-07 发版） | 原版命令行包装 Claude Code 和 Codex；桌面版换成自研的统一 Agent | 自研的 Agent 基于 Pi：Claude 只用来推理，禁用了它自带的工具；Codex 在内部重写；Grok 走 API【源码】 | 同一个会话里可以换模型 | 有，但前提是**放弃原生的 Claude Code 和 Codex**，改用它自己的统一 Agent | 没有 | 订阅用法处在条款的灰色地带 |
| **Vibe Kanban**（28.3k★） | 10 个以上 | 启动各家命令行，各用各的会话 | 没有 | **没有**。维护者原话："you can't go from gemini cli to claude code currently" | 没有 | **2026-04-10 宣布停运**，原因是没有商业模式。[公告](https://www.vibekanban.com/blog/shutdown) |
| Claude Squad（8.6k★） | Claude、Codex、Gemini、Aider 等 | tmux + worktree | 没有 | 没有 | 没有 | 典型的套壳 |
| Superset（15k★） | 任意命令行 Agent | 终端 + worktree | 没有 | 没有 | 没有 | 套壳 |
| Emdash（5.9k★，YC W26） | Claude、Codex、OpenCode、Amp 等 | 终端 + ACP + hooks | 没有 | 没有 | 没有 | 套壳 |
| Nimbalyst（原 Crystal，1.85k★） | Claude、Codex、OpenCode | Claude 和 Codex 的 SDK + 终端 | 会话看板，跨 Agent 搜索和恢复 | 没有 | 共享文档和任务 | —— |
| Sculptor（236★） | Claude Code、Pi、任意终端 Agent | 各家的控制协议 | 每个 Agent 一个对话，共享代码副本 | 没有 | 没有 | —— |
| AionUi（国内团队，33k★） | 20 多个命令行 Agent，外加内置 Agent | ACP | 并行会话，上下文互相独立 | 没有，团队模式只是分派子任务 | MCP 统一管理 | [GitHub](https://github.com/iOfficeAI/AionUi) |
| cc-switch（国内团队，**140k★**） | Claude Code、Codex、OpenCode、Pi 等 | 改写各家的配置 | 能浏览 9 家的会话，按标题、目录、首末消息检索，不搜正文；给出恢复命令，只能回到原来的 Agent。v3.11（2026-02）起就有【源码，10-08 更正，见 [sessions.md](../tech/sessions.md) 第 6 节】 | 没有 | **同步 MCP、Skills 和指令文件（CLAUDE.md、AGENTS.md）** | 说明"共享配置层"已经很拥挤 |
| Warp | 自家 Agent，外加第三方命令行 Agent | 终端 | 没有 | 只有自家 Agent 本地到云端的交接 | 规则只对自家 Agent 生效 | —— |
| 已停运或转型 | Terragon（2026-01-16 停运）、Omnara（转做别的方向）、opcode（只支持 Claude，2025-08 后没再发版） | —— | —— | —— | —— | —— |

---

## 二、会话迁移工具

| 工具 | 方向和范围 | 迁移得有多完整 | 链接 |
|---|---|---|---|
| **Codex 的 `/import`**（App 里另有"从其他 AI 应用导入"，可以开启保持同步） | Claude Code、Cursor → Codex，**单向**。同时导入配置、hooks、MCP、skills，以及 Claude 的 MEMORY.md | 收到的是**拍平后的全文**，损失包括【源码】：<br>- 推理过程直接丢弃；<br>- 工具调用变成文字标记，输入截到 2,000 字符，结果截到 4,000 字符；<br>- 压缩摘要被当成用户消息，会超出输入上限；<br>- 时间戳丢失；<br>- 最多导入 50 个会话；<br>- 有角色标错的问题 | [源码](https://github.com/openai/codex/tree/main/codex-rs/external-agent-migration)、[issue](https://github.com/openai/codex/issues/34656) |
| **OpenAI 官方的 Claude Code 插件**，提供 `/codex:transfer`（34k★） | 在 Claude Code 里一键转到 Codex | 用的是上面同一套导入 | [GitHub](https://github.com/openai/codex-plugin-cc) |
| **Skillsync / txcript**（YC W26；txcript 开源，154★；10-08 更新：已能列出、查看、搜索、裁剪，并带 MCP，见 [handoff.md](handoff.md)） | **双向**，支持 12 种以上的 Agent：Claude Code、Codex、OpenCode、Cursor、Pi、Grok、Antigravity、Cowork 等 | 先写成目标 Agent 的原生会话再启动它；在目标支持的情况下带上推理和工具历史。已知的损失：Codex 加密的推理会丢失；不同 Agent 的改文件工具只能尽量对应；外来的工具名会被改写；接收方遇到长会话可能会自己压缩。另外还有 Mac 应用（检索、MCP 记忆、团队空间） | [GitHub](https://github.com/skillsynchq/txcript)、[HN](https://news.ycombinator.com/item?id=49743049) |
| mem0 的 openmemory（95★，测试版） | Claude Code、Codex、OpenCode 之间互相转换；自动同步写着"即将推出" | 【未核实】 | [GitHub](https://github.com/mem0ai/openmemory) |
| letta-ai/trajectory（270★） | 只读：把 15 种来源统一成一种格式，供训练、评测、记忆使用；**不能写回** | —— | [GitHub](https://github.com/letta-ai/trajectory) |
| agentsview（6k★） | 只做检索、分析和导出，**不能续接** | —— | [GitHub](https://github.com/kenn-io/agentsview) |
| Harbor ATIF v1.7 | 评测用，能把会话加载进 Claude Code 或 Codex | 文档原话：会保留支持的消息、工具调用和结果，可能省略各家特有的细节、系统消息和非文本内容 | [GitHub](https://github.com/harbor-framework/harbor) |
| Pi | 在 Pi 内部可以换模型提供方：工具调用保留，别家的推理转成文字；另有 `/handoff` 扩展，生成摘要后开新会话 | 在 Pi 内部接近原生 | —— |
| 其他 | Supafork、usecontinuo.dev、NVIDIA NeMo-Fabric，以及 V2EX 上的 Tape、Agent Console | 【未核实】 | —— |

---

## 三、能支撑真正打通的协议

- **ACP（Agent Client Protocol）**：
  - 能做什么：新建会话、发送提示、接收更新（消息、工具调用、计划）、权限请求、文件和终端操作；能加载、恢复、列出会话。
  - **限制：会话归 Agent 所有，协议里没有"把别的 Agent 的历史注入新会话"的方法。** 所以跨 Agent 续接只能在协议之外做：先转换成目标 Agent 的原生格式再加载（Zed 那个 PR 就是这么做的），或者把历史塞进第一条消息。
  - 各家的支持情况：Claude 通过一个基于 Agent SDK 的适配器接入；Codex 通过适配器启动它的 app-server；Gemini、Cursor、OpenCode、Copilot 原生支持；Pi 有适配器。
  - 有一个"代理链"的提案（状态【未核实】），设想在客户端和 Agent 之间放一个代理，这可能是"统一会话代理"的落脚点。
- **Codex app-server：最容易注入历史的目标端。** 恢复会话时可以直接传入历史，也可以把原始条目追加到模型能看到的历史里；另外有分叉、读取、列出会话的接口。
- **Claude Agent SDK**：支持恢复、分叉、继续会话，也能列出会话和读取会话内容。它有一个会话存储接口，能给恢复会话提供历史记录，这是官方允许的注入口子；但会话文件的格式官方说明是不稳定的。
- **Pi**：有 RPC 模式，用一行一个 JSON 的命令来操作：发送提示、切换模型、新建会话、切换会话、分叉等。

**调研给出的"真正打通"架构建议**：
1. 由用户自己持有一份标准的事件日志（规范化的会话记录加文件状态），各个 Agent 的原生会话只是它的一个投影。
2. 适配器优先走结构化接口：Codex 用 app-server，Claude 用 Agent SDK（底层仍然运行原版 claude），Pi 用 RPC，其他用 ACP。
3. 切换 Agent 时分四级降级：同一个 Agent 原生恢复 → 写成目标 Agent 的原生格式再恢复或注入 → 按预算挑选上下文交接，外加检索工具 → 摘要。
4. 记忆层：用 MCP 做检索，同时写回各家的原生记忆位置，并标明来源。
5. 不要求迁移推理过程（跨厂商做不到），只迁移看得见的文本。

---

## 四、条款与政策

- **Anthropic**：
  - 法务文档原话：OAuth 只能用于"ordinary use of Claude Code and other native Anthropic applications"；不允许第三方开发者提供 Claude 账号登录，也不允许借用免费版、Pro 或 Max 的额度转发请求；不得收集或中转凭据。但同时也写了：用户用自己的订阅登录未修改的 Claude Code 程序，是允许的。[文档](https://code.claude.com/docs/en/legal-and-compliance)
  - 计费政策反复变化：5 月宣布 SDK、`claude -p` 和第三方应用要改用单独的额度 → 6 月 15 日暂停 → 10 月 7 日，Max 和 Team 套餐附带了 API 额度，同时写明"仍然可以用订阅额度运行 Agent SDK、`claude -p` 和第三方应用"。[说明](https://support.claude.com/en/articles/15036540)
  - 实际执法：OpenCode 应 Anthropic 法务的要求，删除了 Claude 订阅登录（2026-03-19）。有 HN 帖子说 Pi 也被封过，没有官方确认【未核实】。
  - 现有前端的通行做法：调用用户自己安装的、未修改的 `claude` 或 Agent SDK，由用户自己登录（Conductor、T3、Zed、Happy 都是这样）。
- **OpenAI 方向相反**：09-29 推出 Sign in with ChatGPT，第三方应用可以用用户的 ChatGPT 套餐，但要申请 client ID，开发工具包是非商业许可。Conductor 是合作方，VS Code 也支持用 ChatGPT 登录 Codex。[GitHub](https://github.com/openai/sign-in-with-chatgpt-devkit)

---

## 五、用户的声音（节选）

- "my pro plan got rate limited… i'll be stuck on that task" [Vibe Kanban #528](https://github.com/BloopAI/vibe-kanban/issues/528)
- "Agent threads currently appear bound to the agent selected when the thread was created" [Zed #58303](https://github.com/zed-industries/zed/issues/58303)
- "there is no way to import or view Codex/ChatGPT sessions from within Claude Code" [Claude Code #94572](https://github.com/anthropics/claude-code/issues/94572)
- "I have roughly 6,000 local Claude Code sessions and want to migrate…" [Codex #38117](https://github.com/openai/codex/issues/38117)
- "Easily the most annoying thing about modern Agent development across Claude, Codex" [HN](https://news.ycombinator.com/item?id=49746149)
- 有团队自己写了一个恢复用的 skill，强制 Agent 把 Claude Code 的会话文件逐段读完。[HN](https://news.ycombinator.com/item?id=49745346)
- 反方观点："syncing is trivially solved by… a work journal in markdown" [HN](https://news.ycombinator.com/item?id=49744147)
- 在 Claude Code 和 Codex 之间来回切换时，命令的前缀符号不一样，很烦。[HN](https://news.ycombinator.com/item?id=49599741)
- "要从 codex 继续原本的对话，只能从 cc 去让他自己导出，但这样会丢失细节" [V2EX](https://www.v2ex.com/t/1220680)
- "得不断地在各个代理窗口之间复制上下文" [V2EX](https://www.v2ex.com/t/1200495)
- "我往往充当一个'无情'的复制粘贴者" [V2EX](https://www.v2ex.com/t/1198247)
- "会话分散在不同平台，难以统一检索" [V2EX](https://www.v2ex.com/t/1227847)

---

## 六、结论、空白点与风险

**最接近真正打通的几家**：
- **T3 Code V2**：同一个对话里能换 Agent，按预算交接上下文，还能按需检索历史；
- **VS Code**：从 Copilot 交接给 Claude 或 Codex，带完整历史，但只能从 Copilot 发起；
- **Codex 官方**：导入功能，加上 `/codex:transfer`，都是单向的；
- **txcript**：双向的原生格式转换；
- **Happy、Pi**：用一个统一的 Agent，代价是不再使用原生的 Claude Code 和 Codex。

**仍然缺的**：
1. **由用户持有、双向而且持续的标准会话**：多个原生 Agent 都能往同一个会话里追加内容，并且来回同步。现在的方案都是一次性复制或分叉。
2. **交接本身的质量**：带过去哪些上下文；上一轮之后仓库发生了什么变化；没做完的计划和 TODO 怎么带过去；以及**用评测量化续接得有多完整**。目前没有人做。
3. **本地、基于文件的跨 Agent 记忆整合**：A 会话学到的东西，带着来源写回 B 自己的记忆。现在只有 Codex 单向导入 Claude 的 MEMORY.md，以及 mem0 的云端插件。
4. **额度用完后自动切到别的 Agent 或账号继续干**：T3 已经开始做了。
5. **把别的 Agent 的会话导入 Claude Code**：官方完全没有，目前只有 txcript。

**一个人做的风险**：
- **拥挤**：T3（26k★，免费，迭代快）、VS Code、OpenAI 官方、JetBrains、Skillsync（YC 投资）、mem0、cc-switch（140k★）都在附近。
- **很难赚钱**：Vibe Kanban 因为"绝大多数是免费用户"停运；Terragon 停运；Omnara 转型；Conductor 免费。
- **适配器维护成本高**：Claude 的会话格式官方说明不稳定，Codex 的格式也在持续变化；T3 V2 对每家都有最低版本要求，交接相关的 bug 很多。
- **条款风险**：Anthropic 这边的政策反复变化，而且有执法先例。

**调研的建议**：不要再做一个多 Agent 的图形界面。要做的话，就做"续接 + 记忆层"：没有界面的后台程序，加上命令行和 MCP，必要时做成 ACP 代理，嵌进 T3、Zed、AionUi 这些现有的前端。Claude 这边只驱动用户自己安装的原版 `claude`；Codex 这边可以考虑申请 Sign in with ChatGPT 的 client ID。

**未核实**：Cursor 是否支持第三方 Agent；JetBrains Air 中途切换能否跨 Agent 带上下文；Pi 被封是否有官方确认；Supafork、Continuo、NeMo-Fabric、openmemory 的迁移完整度；Superset 和 Conductor 云端版的价格。
