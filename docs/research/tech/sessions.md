# 会话读取实测：Claude Code（WSL 和 Windows）

> 实测日期：2026-10-08；对应第一版第 1 步"读取"，arch.md 的 V1、V2、V3、V9
> 数据：作者本机的全部 Claude Code 会话。本机没有 Codex 和 Pi 的会话，那两家等有 OpenAI key 后再补。（Codex 10-08 已补，见第 7 节；Pi 不在第一版计划里，D19。）
> **2026-10-12 补**：第 5 节第 4 条"在哪装就在哪用"10-10 已改成两边对称（Windows 也读正在运行的 WSL 会话，plan.md 第 ⑤ 步）；文中写死的 `/mnt/c` 在 10-12 改为按 /etc/wsl.conf 的挂载位置（第 ⑧ 步）。
> 工具：`@letta-ai/trajectory` 0.4.3（Apache-2.0）；脚本是一次性的，放在会话的临时目录里，没有进仓库。

---

## 1. 本机有什么

| 环境 | 位置 | 项目 | 主会话 | 主文件大小 | 时间 |
|---|---|---|---|---|---|
| WSL | `~/.claude/projects/` | 4 | 8 | 19.6 MB | 09-21 至 10-08 |
| Windows | `/mnt/c/Users/<用户>/.claude/projects/` | 4 | 7 | 7.6 MB | 09-18 至 09-22 |

Claude Code 版本：2.1.274 至 2.1.285。

**一个会话不止一个文件**：

```
<项目>/<会话ID>.jsonl                       主文件：对话本身
<项目>/<会话ID>/subagents/*.jsonl、*.json   子代理各自的过程（本机 68 个）
<项目>/<会话ID>/subagents/workflows/…       工作流里的子代理（本机 111 个）
<项目>/<会话ID>/tool-results/*.txt、*.pdf    太大的工具输出，主文件里只留 2KB 预览和这个文件的路径
<项目>/<会话ID>/workflows/…                 工作流脚本
<项目>/memory/*.md                         Claude Code 自己的 auto memory（按项目，不按会话）
```

---

## 2. 主文件里有什么

共 16 种记录。真正的对话（`user`、`assistant`）约占四成，其余是附加信息和元数据。

**对话内容**

| 内容块 | 数量 | 说明 |
|---|---|---|
| 工具调用 / 工具结果 | 1,108 / 1,108 | 一一对应 |
| 推理（thinking） | 905 | **其中 859 个只有签名、没有文字**，推理过程本来就基本没以明文保存 |
| 助手文字 | 700 | —— |
| 用户文字 | 496 | 里面混着**注入的消息**：子代理交回的结果、系统提醒、压缩摘要等，靠 `isMeta`、`isCompactSummary` 标记区分 |
| 图片 | 2 | —— |

**Claude Code 自己记下、第一版可以直接用的元数据**（不需要 LLM）

| 记录 | 是什么 | 覆盖情况 |
|---|---|---|
| `ai-title` | Claude Code 自动生成的会话标题 | 15 个会话里有 11 个 |
| `custom-title` | 用户自己改的标题 | 1 个 |
| `last-prompt` | 最后一条用户提问，带指向最新消息的 ID | 几乎都有 |
| `system/away_summary` | Claude Code 的"离开期间回顾"：一两句话说明在做什么、下一步是什么 | 有，但用户可以在设置里关掉 |
| `continued-in` | 这个会话在哪个新会话里继续了 | 3 条，构成会话链 |
| 每条记录的 `cwd`、`gitBranch`、`version` | 当时的目录、分支、版本 | 都有。注意 `cwd` 会随 `cd` 变化 |
| `file-history-snapshot/delta` | 改过的文件 | 改过文件的会话都有 |
| `cost-state` | 增删行数、费用 | 部分会话 |

**结构上的坑**：消息靠 `uuid` / `parentUuid` 连成一棵树，回退、并行工具调用都会产生分叉；上下文压缩后，被保留的消息会重新挂接。在本会话里，从最新一条消息顺着父节点往回走，会**绕回自己**，所以不能自己简单地重建这棵树。

---

## 3. trajectory 读出来怎么样

**设置**：默认会把工具结果截到 2,500 字、工具参数截到 2 万字，所以要显式把两个上限设为不限，才谈得上"如实"。

**结果**

| 项目 | 结果 |
|---|---|
| 能不能读 | 13 个有内容的会话**全部成功**；2 个空会话（没有用户消息）报错 |
| 助手文字、工具调用、工具结果 | 和原文**数量完全一致** |
| 推理 | 有文字的推理全部保留 |
| 去掉的 | 斜杠命令的回显（比如 `/model`）、后台任务通知。合理 |
| 版本覆盖 | 它的审计只覆盖到 2.1.206，本机是 2.1.274 至 2.1.285，**仍然能读** |
| 速度 | 两边共 27 MB，读取加转换 0.37 秒；什么都没变时只检查文件状态，WSL 1 毫秒，Windows 23 毫秒 |

**丢掉的东西**

| 丢了什么 | 影响 |
|---|---|
| **注入消息的标记**：子代理结果、系统提醒、压缩摘要，都变成了普通的"用户消息" | **影响接力**：分不清哪些是用户真正说的话。需要用原文里的 `isMeta`、`isCompactSummary` 补上 |
| 第 2 节表里的元数据：标题、回顾、会话链、改过的文件、中途切换的模型（只留了第一个）、目录和分支的变化 | 影响 `meme ls`。需要 meme 自己从原文里提取 |
| 子代理文件、`tool-results/` 外置文件 | 不读。主文件里有子代理的最终结果和大输出的 2KB 预览 |

---

## 4. WSL 和 Windows

- **从 WSL 读 Windows 那边**：通过 `/mnt/c/...` 直接读，没问题，速度也够。
- **从 Windows 读 WSL 这边**：通过 `\\wsl.localhost\Ubuntu\...` 也能读，8 个文件 25 MB 用了 0.17 秒。WSL 里也能直接运行 Windows 程序。两个方向都通，但按下面的决定，暂时用不到。（2026-10-10：要用了，Windows 上的 meme 也读 WSL 的会话；访问停着的发行版会把它启动，所以只读正在运行的，见 plan.md 第 ⑤ 步。）
- **Claude Code 和 Codex 自己怎么认项目**（官方文档和源码，2026-10-08 查证）：
  - Claude Code：`~/.claude/projects/<项目>/` 由所在的 git 仓库决定，同一仓库的子目录和 worktree 共用一个；不在 git 仓库里就用启动目录。不看远程地址。
  - Codex：会话按日期存，不分项目；`codex resume` 默认只列出当前目录的会话，加 `--all` 才显示全部。
- **Windows 上的 Claude Code 是独立的 `claude.exe`，本机 Windows 上没有装 Node。** 所以如果 meme 以 npm 包发布，没有 Node 的 Windows 用户装不了。这是第 5 步"安装与发布"要解决的问题。

---

## 5. 对第 1 步的结论

| 验证项 | 结论 |
|---|---|
| V1 trajectory 能否如实读出 | **基本可以**：对话主体完整；但要关掉截断，要补注入消息的标记，元数据要自己提取 |
| V2 跨环境识别同一项目 | **已定**：按路径认，和 Claude Code 一致（见下面第 3 条） |
| V3 Windows 那边怎么调用 meme | **不需要了**：在哪装就在哪用（见下面第 4 条） |
| V9 速度 | **没问题**：在本机这个数据量下远低于 1 秒 |

**第 1 步的决定（2026-10-08，作者确认）**
1. **统一格式分两层**：里层是原样的 trajectory 记录，关掉截断，不改动；外层是 meme 自己补的信息，包括会话级的项目、环境、标题、回顾、会话链、原文件路径，以及每条记录的"是否注入"、模型、目录、分支。每条记录带稳定 ID。字段细节放到第 2 步。（第 3 步精简后的清单见 [format.md](../../design/format.md)：每条记录的模型、目录、分支等到第 4 步需要时再加。）
2. **子代理文件和大输出不复制**，只记路径。镜像和原会话同时存在、同时删除，原文件一直都在。
3. **项目的认法和 Claude Code 一样**：在 git 仓库里用仓库根目录，否则用启动目录。不用 git 远程地址，没用 git 也正常。同一仓库克隆了两份会被认成两个项目，用户直接指定会话就能接。
4. **在哪装就在哪用**：
   - 装在 Windows，接力 Windows 上各个 CLI 的会话；
   - 装在 WSL，接力 WSL 的会话，外加通过 `/mnt/c` 读到的 Windows 会话；接 Windows 会话时，把会话里的 `C:\...` 路径换成 `/mnt/c/...`；
   - 装在 Mac 或 Linux，接力本机的会话。

   两边各装一份，就是两份互不相干的 meme。

---

## 6. 参照：cc-switch 4.0.4 怎么读会话

> 2026-10-08 看源码（v4.0.4，MIT 许可）。cc-switch 的会话管理从 v3.11.0（2026-02-26）就有了，v4.0 重写了阅读页。

**它没用 trajectory，9 家 Agent 都是自己写的解析器**（Rust）。`session_manager/providers/` 里解析代码约 1.06 万行、测试约 6,300 行，另外有 6 份各家的样例会话用来对照测试。

| Agent | 读哪里 | 格式 |
|---|---|---|
| Claude Code | `~/.claude/projects/`；只读一个目录（默认的，或用户指定的） | JSONL |
| Codex | `~/.codex/sessions/`、`archived_sessions/` | JSONL |
| Gemini CLI | `~/.gemini/tmp/` | 原来是 JSON，新版改成 JSONL |
| OpenCode | 数据目录下的会话文件；2.x 改成 SQLite | 文件或 SQLite |
| Hermes、MiniMax Code | 各自的 SQLite 数据库 | SQLite |
| Pi、OpenClaw、Grok Build | 各自的会话目录 | 没细看 |

**怎么读**
- **分两种读法**：会话列表只读每个文件开头 10 行、结尾 30 行，取标题、时间、目录；打开某个会话时才完整解析。不存副本，只在内存里缓存。
- **标题和摘要**：标题依次取用户自己改的标题、第一条用户消息、目录名，不用 Claude Code 自动生成的标题；摘要取最后一条消息。
- **注入消息**：
  - Claude Code：带 `isMeta` 的直接跳过，整条都是 `<system-reminder>` 的标成注入；
  - Codex：以 `# AGENTS.md instructions`、`<environment_context>`、`<user_instructions>` 开头的文字，以及 developer 角色的消息，都算注入，默认隐藏。
- **其他处理**：
  - 保留原记录的 ID（Claude Code 的 `uuid`、Codex 的 `payload.id`），并按轮编号；
  - 跳过子代理的记录（`isSidechain`）；
  - 不重建消息树，按文件里的顺序读；
  - 不识别续接产生的会话链。
- **为显示服务，不是存档**：工具输出只留前 12 行、最多 1200 字的预览，全文用引用指回原文件，要看时再读。

**维护成本**：各家格式一变就得跟着改。更新日志里的例子：
- Gemini 新版改成 JSONL 后，会话不显示了（4.0.1 修好）；
- Claude Code 的工作流功能写的 `journal.jsonl` 被当成空会话（3.20.2 修好）；
- Codex 的三个坑，见 [storage.md](storage.md) 第 4 节。

**对 meme 的启发**
- 第一版只做 Claude Code 和 Codex，仍然用 trajectory，外层信息自己补。cc-switch 的解析器当参照：trajectory 读错、漏读的地方，看它是怎么处理的。
- 它判断注入消息的规则比我们第 1 步只看 `isMeta` 全，补外层的"是否注入"时照着补齐。
- cc-switch 是 Rust 写的。第 5 步如果选 Rust，它的解析代码可以改来用。

---

## 7. Codex 实测（2026-10-08 补）

作者在 WSL 里用 VS Code 插件跑了 1 个 Codex 会话，内容是让它分析当前项目。Codex 版本 0.161.0。

| 项目 | 结果 |
|---|---|
| 在哪 | `~/.codex/sessions/2026/10/08/rollout-<时间>-<会话ID>.jsonl`，1 轮对话，107 行，1 MB |
| 标题 | 存在 `~/.codex/session_index.jsonl` 的 `thread_name` 里（"分析当前项目内容"），不在会话文件里 |
| 会话信息 | 第一行 `session_meta`：会话 ID、`cwd`、`cli_version`、`originator`（codex-tui）、`source`（vscode） |
| trajectory 能不能读 | **能**：1 条用户消息、14 条 AI 消息、10 个工具结果 |
| 系统注入的消息 | trajectory **自动去掉了**：开发者指令、技能说明、`<environment_context>` 等，并给出 `injected_context_dropped` 提示。比 Claude Code 那边省事 |
| 工具是否成功 | 10 个工具结果都**没有** `ok` 字段，Codex 的自定义工具没有可靠的成功标志 |
| 推理 | 14 条，都是加密的，带不过去 |
| 改文件 | 通过 `apply_patch`，改了哪些文件可以从补丁里的 `*** Update File:` 这几行读出来 |

这个会话被拿来做了一次跨 Agent 接力的小试（交给 Claude Code），三个问题都答对了，见 [relay.md](relay.md) 第 4 节。

### 7.1 第 ③ 步实测：Codex 的几种特殊情况（2026-10-10）

> 在 `~/tmp/meme-codex-lab`（一个只有 `add.js`、`test.js` 的测试仓库）里做；能在后台做的用 `codex exec` / `codex exec resume` / `codex exec fork` / `codex archive` / `codex delete` 跑，只能在界面里做的（改名、编辑前面的消息、界面里的 `/delete`、`!` 命令）由作者按键。每步前后对 `~/.codex` 拍快照（文件、`session_index.jsonl`、`state_5.sqlite` 和 `thread_history_1.sqlite` 各表的行），只记结构和数字，不抄会话内容。Codex 0.161.0，中途自动升级到 0.162.0。

| 情况 | 实测结果 | 对 meme 的影响 |
|---|---|---|
| **当前会话的环境变量** | Codex 给工具跑的命令和界面里 `!` 跑的命令都设了 `CODEX_THREAD_ID`（和 `CODEX_SESSION_ID` 一样，就是会话 ID）；`codex exec` 里还有 `CODEX_CI=1`、`CODEX_SANDBOX_NETWORK_DISABLED=1` | 能准确排除当前 Codex 会话，不用"最近几秒还在写"的退路。另外：从 Claude Code 里启动的 Codex 会继承 `CLAUDE_CODE_SESSION_ID`，两个变量都在时两个都排除 |
| **工具调用的样子** | Codex 0.161 的模型只调用一个自定义工具 `exec`，参数是一小段 JavaScript：`tools.exec_command({cmd:"node test.js", …, max_output_tokens: 2000})`，改文件是一段 `*** Begin Patch … *** Update File: <路径> …` 的字符串；工具结果是几段文字（"Script completed / Wall time / Output: …"），没有退出码 | 适配器要从这段代码里取出命令和改过的文件，不然每一步都显示成 JavaScript。`max_output_tokens` 由模型自己定（见到 2000、4000、20000） |
| **标题** | 只有改过名的会话在 `session_index.jsonl` 里有一行（`thread_name`，追加写）；`codex exec` 跑的会话没有这一行。`state_5.sqlite` 的 `threads.title` 是第一条消息，`threads.name` 是改的名 | 标题照计划：`session_index.jsonl` 的名字 → 第一条用户消息，不用读数据库 |
| **来源** | `session_meta.source`：界面是 `vscode`（`originator` 是 `codex-tui`），`codex exec` 是 `exec` | 不影响 |
| **分叉**（`codex exec fork`） | 新文件**不重放**上级的历史（`history_mode: paginated`），只有自己的 32 行；`session_meta` 里有 `forked_from_id`、`forked_from_ordinal_exclusive`（96）和 `history_base: {thread_id, end_ordinal_exclusive, end_byte_offset}` | 分叉出来的会话 = 上级文件 `end_byte_offset` 之前的部分 + 自己的文件。trajectory 给 Codex 记录的 ID 就是字节位置，所以按位置就能截出上级的那一段，不用原文比对（原计划的"原文比对"只留给旧格式里会重放历史的分叉） |
| **回退**（界面里按两次 Esc 编辑第 3 条消息） | 多出一个文件 `rollout-<时间>-<会话ID>_<文件ID>.jsonl`，`session_meta.id` 还是原会话 ID；`history_base` 指回原文件第 68 行之前（`end_byte_offset` 正好是第 3 轮开始的位置）；`threads.rollout_path` 改指新文件；原文件第 3 轮之后成了废弃的分支 | 一个会话对应几个文件：当前对话 = 原文件到回退点 + 新文件。原文件回退点之后的部分不算进当前对话 |
| **归档**（`codex archive <ID>`） | 文件从 `sessions/年/月/日/` 挪到 `archived_sessions/`（不分日期目录），`threads.archived = 1`、`rollout_path` 跟着改 | 照计划：照样列出来，暗色标 archived |
| **删除**（命令行 `codex delete`） | 没有终端时要 `--force` 加会话 UUID。删掉：会话文件、`threads` 那一行、`thread_history_1.sqlite` 里这个会话的轮次和条目；日志库里也没有剩下它的记录 | 第 ④ 步的 `forget` 对 Codex 会话调用 `codex delete --force <UUID>`，不自己改 Codex 的数据库 |
| **删除**（界面里 `/delete`） | 删掉会话文件、`threads` 那一行、历史库里的行，以及 `session_index.jsonl` 里改名留下的那一行；留下：`history.jsonl` 里作者输入过的那句话（Codex 自己的输入历史）、`tui-thread-reference-capabilities/<ID>` 一个空文件 | 和命令行删除效果一样，`forget` 照着做即可 |
| **界面里的 `!` 命令** | 记成一条用户消息 `<user_shell_command><command>…</command><result>Exit code: 0 … Output: …</result></user_shell_command>`，**不调用模型**（没有回复、没有 token 计数），也就没有后续的工具调用；这次 2,800 字的接力内容完整记下来了 | 和 Claude Code 不同：在 Codex 里 `! meme continue <编号>` 之后，用户还要说一句（比如"接着做"），模型才会去看接力内容 |
| **输出上限** | `!` 命令和工具输出按模型的 `truncation_policy` 截断（源码 `codex-rs/core/src/user_shell_command.rs`；Codex 认不出的模型兜底是 10,000 字节，`models-manager/src/model_info.rs`；`config.toml` 里的 `tool_output_token_limit` 可以调大）。**作者这台机器实测**（0.162、自定义的服务商）：`! seq 1 20000`（108,894 字节）被截成 10,000 token，Codex 按"字节数 ÷ 4"算 token（记成 27,224），只留开头和结尾（约 4 万字节），中间写 "…17224 tokens truncated…"，最前面加 "Warning: truncated output"；`! meme continue a62bd8b9`（21,066 字、28,937 字节，约 7,200 token）完整记下 | 在 Codex 里，接力内容要在 4 万字节以内才不会被截断。按现在的上限（1.5 万 token、2.5 万字符），以中文为主的接力内容最多约 4.5 万字节，可能被截掉中间一段。另外，Codex 的模型自己跑 `meme continue` 时，`exec_command` 的 `max_output_tokens` 由模型定（见过 2000），可能截得更短 |

另外：Codex 在测试仓库里跑过以后，往 `~/.codex/config.toml` 加了一段 `[projects."/home/jihd/tmp/meme-codex-lab"] trust_level = "trusted"`（Codex 自己的行为）。

> **2026-10-12 补（第 ⑤ 步真机测试、第 ⑧.3 步）**
> - Claude Code 的 `!` 和 Bash 工具把超过约 3 万**字节**的输出存成文件，只给模型看开头 2KB（"Output too large (37.6KB). Full output saved to: … Preview (first 2KB):"；作者本机 2.1.280–2.1.296，存成文件的最小 29.8KB、没存的最大 28,197 字节）。所以 meme 在 Claude Code 里的上限改成 2.7 万字节。
> - Claude Code 把开着的会话登记在 `~/.claude/sessions/<pid>.json`（2.1.296：`sessionId`、`pid`、`procStart`、`status` 等；`procStart` 就是 `/proc/<pid>/stat` 的第 22 项），正常退出时删掉，被杀掉（`wsl --shutdown`）时留下。没有文档。`meme forget` 用它判断会话开没开着。Windows 上的 `~\.claude\sessions` 也有，没见过内容。
> - Codex 0.162.1 的程序里有"thread writer lock"（`~/.codex/thread-writer-locks`，"already has an active writer"）。第 ⑧.4 步实测：会话开着时（闲着也一样）Codex 进程一直开着会话文件和 `thread-writer-locks/<会话 id>.lock`，锁文件上有它的 `flock`（`/proc/locks` 里能看到 pid 和 inode）；`/quit` 时删掉锁文件；只打开界面、不发消息时两样都没有。`meme forget` 用它判断 Codex 的会话开没开着。从 Windows 经 `\\wsl.localhost` 读不了 `/proc/<pid>/fd` 的链接，但 `proc\locks` 读得到，inode 也和 Linux 里一样。
