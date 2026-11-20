# meme 后台整理的模型调用方式：订阅模式与 API 模式

> 调研日期：2026-09-30
> 背景：meme 每天在后台跑一次整理任务，读取用户过去的会话，用 LLM 提炼经验。meme 不托管模型，只用用户自己的模型额度。
>
> **2026-10-08 说明**：
> - **用途变了**：按 [PRD v0.6](../../design/prd.md)，第一版完全不调用 LLM；会话卡、提炼经验都在第二版。本文留作第二版的依据，结论不变：默认用 API。
> - **条款有新变化**，本文没有覆盖：2026-10-07，Anthropic 给 Max 和 Team 套餐附带了 API 额度，同时写明"仍可以用订阅额度运行 Agent SDK、`claude -p` 和第三方应用"（[说明](https://support.claude.com/en/articles/15036540)，转引自 [frontends.md](../market/frontends.md)）。下文关于 Claude 订阅模式的部分需要按这条重新核对。
> - **A. 订阅模式**：在后台以无界面模式调用用户已安装的 Agent CLI（`claude -p`、`codex exec`），用的是用户的 Claude 或 ChatGPT 订阅。
> - **B. API 模式**：用户自己配置 API key（Anthropic、OpenAI、DeepSeek、OpenRouter 等）。

**标注说明**
- 【一手】：官方文档、条款、帮助中心、官方仓库、员工发帖。
- 【二手】：媒体报道、社区讨论。
- 【推断】：根据已有事实推出的结论。
- 【未核实】：没能用一手来源确认。

**核实范围**
- 为了不消耗订阅额度，**没有实际运行** `claude -p` 和 `codex exec`。参数来自官方文档，以及本机 `claude --help`（v2.1.285）。
- 其他 Agent 的订阅情况和各记忆插件的做法，由子 agent 查阅源码和文档；Gemini 停服公告、claude-mem 和 Hindsight 的源码做过抽查复核。

---

## 一、结论

- **API 模式所有厂商都明确允许**，而且很便宜：用便宜的模型，每月约 1–36 美元（见第五节）。
- **订阅模式按厂商分三种情况：**
  - **Codex 可以用**：官方有文档支持用 ChatGPT 额度做自动化。
  - **Claude 属灰色、偏可行**：允许用户用自己登录的官方 `claude` 程序跑 `-p`，但官方更希望第三方工具用 API key，并保留把这类用量改从"额外用量"里扣费的权利。
  - **Kimi 和 Qwen 的条款明确禁止**非交互使用订阅；Gemini CLI 的个人订阅已经停服。
- **绝对不能碰用户的登录凭证**：读取、复制、注入 OAuth token 都属于明确禁止的行为。

---

## 二、对比表

| 模式 / Agent | 是否允许 | 额度与计费 | 关键参数 | 主要风险 |
|---|---|---|---|---|
| **Claude 订阅**：meme 调用用户自己安装的官方 `claude -p` | **灰色，偏可行**。官方写明 `claude -p` 计入订阅额度；明确禁止的是在第三方 app 里提供 Claude 登录、代转请求、收集或转手 token。但帮助中心说第三方工具（含开源项目）"首选" API key，并保留把第三方工具的用量改从额外用量里扣的权利 | 5 小时窗口 + 每周上限，与 claude.ai、Claude Code、Cowork 共用一个额度池；官方没有公布具体数字 | `--safe-mode --no-session-persistence --tools "" --max-turns 1 --model <固定> --output-format json --json-schema` | 2026 年政策改了 6 次以上；服务端分类器曾把官方 CLI 的请求误判为第三方，改扣额外用量；官方预告 `--bare` 将成为 `-p` 的默认，而 bare 模式不读订阅登录 |
| Claude 订阅：自己读取 OAuth token 或 keychain 再调 API；或在自己的 app 里提供 Claude 登录 | **明确禁止**（除非事先获批） | —— | —— | 请求被拒、封号 |
| Claude API key | **明确允许** | 按 token 计费 | `claude --bare -p` + `ANTHROPIC_API_KEY`，或直接调 Messages API / Batch API | 只有费用 |
| **Codex 订阅**：`codex exec`（ChatGPT 登录） | **允许，有文档**。官方说自动化首选 API key，但另有一篇"用 ChatGPT/Codex 额度跑 CI"的进阶指南。使用条款里"禁止程序化提取输出"是通用条款，官方 CLI 的 exec 模式应视为明示许可【推断】 | 5 小时窗口 + 每周窗口；CLI、SDK、IDE 的本地消息与云端任务共用额度。Plus 和标准 Business 按模型给出估算区间；Pro 目前没有 5 小时限制 | `--ephemeral --disable hooks --disable plugins --json -o --output-schema -s read-only --skip-git-repo-check -C <空目录> -m` | 没查到针对"第三方工具调用 codex exec"的执法；额度估算会变 |
| ChatGPT "Sign in with ChatGPT"（2026-09-29 推出） | 允许，但要申请 client ID；处于 preview，仅限 Plus/Pro 用户 | 用户可以给每个 app 设周上限 | —— | 需要审批；目前只对合作方开放 |
| OpenAI / DeepSeek / OpenRouter API key | **明确允许** | 按量计费；DeepSeek 错峰时段半价 | `CODEX_API_KEY`，或直接调 API | 只有费用 |
| Antigravity CLI（`agy -p`） | 以无界面模式调用官方程序，条款里没有禁止【推断】；**明确禁止**第三方软件借用它的 OAuth | 免费档按周刷新；Pro/Ultra 为 5 小时 + 每周上限，无具体数字 | `-p --output-format json --json-schema`；没有"不落盘"或"跳过 hook"的参数 | 无界面模式 bug 多；2026-02 出现过封号潮 |
| Gemini CLI 个人订阅 | **已不可用**（2026-06-18 停服） | 只剩 API key 或企业版 | —— | —— |
| Kimi Code 会员 | 技术上能用，但社区准则写明订阅"仅限交互式使用"，用脚本批量调用超出正常范畴，**按字面属于违规** | 5 小时窗口，约 300–1200 次请求 | `kimi -p --output-format stream-json` | 限流、封号 |
| Qwen Code | 免费 OAuth 已于 2026-04-15 下线；Coding Plan **明文禁止**自动化脚本和非交互调用 | 订阅不能用于这个场景 | `qwen -p -o json --safe-mode`，只适合配 API key 使用 | 暂停订阅 |
| Pi / OpenCode 作为宿主 | 本身没有模型订阅。在其中用 ChatGPT 登录得到 OpenAI 认可；用 Claude OAuth 不被 Anthropic 认可 | 取决于接的是哪家模型 | `pi -p --mode json --no-session -ne -ns -nc -nt`；`opencode run --format json --pure` | 通过它们用 Claude 订阅属于违规，或被改扣额外用量 |

---

## 三、分厂商说明

### 3.1 Anthropic / Claude Code

**条款原文**

- **Consumer Terms**（生效日 2025-10-08）：禁止"通过自动化或非人工方式……bot、script 等访问服务"。例外是"通过 Anthropic API Key，或我们另行明确允许的情形"。【一手】https://www.anthropic.com/legal/consumer-terms
  - 【推断】`claude -p` 有官方文档，并且明确计入订阅，属于"另行明确允许"。
- **Claude Code 的 Legal and compliance 页**（当前版本）【一手】https://code.claude.com/docs/en/legal-and-compliance
  - "Advertised usage limits for Pro and Max plans assume ordinary, individual usage of Claude Code and the Agent SDK."
  - "Anthropic does not permit third-party developers to offer Claude.ai login into their own applications, or to route requests through Free, Pro, or Max plan credentials on behalf of their users. Moreover, developers may not collect, store, or intermediate Claude.ai credentials or session tokens"
  - "Nor does it prevent an end user from signing in to the unmodified Claude Code binary with their own Claude subscription"
  - "may do so without prior notice"
- **这一页的变更历史**（用 Wayback 核对）
  - 2026-02-18 到至少 2026-05-13 的快照里有这句："Using OAuth tokens obtained through Claude Free, Pro, or Max accounts in any other product, tool, or service — including the Agent SDK — is not permitted and constitutes a violation of the Consumer Terms of Service."
  - 年中这句被删掉，确切日期【未核实】，几次抓到的快照不一致。
  - 到 2026-08-30 的快照，已加上 "Can customers offer Claude Code in their products?"、"Nor does it prevent…"、"collect, store, or intermediate" 三段。
- **Agent SDK 概览页的提示**【一手】https://code.claude.com/docs/en/agent-sdk/overview
  - 当前原文："Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK. Use the API key authentication methods described in the Quickstart instead."
  - 措辞演变：2025-10-01 写的是 "apply Claude.ai rate limits"；2025-12 改为 "offer Claude.ai login or rate limits"；2026-02 起改为 "Anthropic does not allow…"。
- **帮助中心 "Log in to your Claude account"**（更新于 2026-05-19）【一手】https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account
  - "The preferred way to access Anthropic services using third-party software, tools, or services ('third-party tools'), including open-source projects, is through API key authentication"
  - "Applications that misrepresent their identity to Anthropic's servers, attempt to route third-party traffic against subscription limits, or otherwise violate applicable terms or policies are prohibited"
  - 另外说明：对于开通了 usage credits 的订阅用户，Anthropic "may at its discretion allow" 他们使用某些第三方工具，但 "reserves the right to draw use of such third-party tools from usage credits rather than subscription limits"。
- **归纳**
  - 明确允许：用户自己登录未修改的 `claude` 程序，用 `-p` 运行。
  - 明确禁止：提取或转手 token；在第三方 app 里提供 Claude 登录；伪装身份。
  - 不明确：第三方工具启动用户自己的 `claude -p`。既没被点名禁止，也没被点名认可，可能落入"第三方工具"的范围，被改扣额外用量。

**2026 年的执法事件**

- **2026-01-09**：服务端开始拒绝在 Claude Code 之外使用订阅 OAuth token，报错 "This credential is only authorized for use with Claude Code…"。【一手】https://github.com/RooCodeInc/Roo-Code/issues/10566
- **2026-01**：员工 Thariq Shihipar："Third-party harnesses using Claude subscriptions … are prohibited by our Terms of Service"。【二手】https://www.theregister.com/2026/02/20/anthropic_clarifies_ban_third_party_claude_access/
- **2026-03-19**：OpenCode 以 "legal requests" 为由删除了 Anthropic 登录。【一手】https://github.com/anomalyco/opencode/pull/18186
- **2026-04-04**：OpenClaw 等第三方 harness 不再占用订阅额度，改为额外用量按量计费。Boris Cherny："subscriptions weren't built for the usage patterns of these third-party tools"。【二手】https://techcrunch.com/2026/04/04/anthropic-says-claude-code-subscribers-will-need-to-pay-extra-for-openclaw-support/ ，https://venturebeat.com/technology/anthropic-cuts-off-the-ability-to-use-claude-subscriptions-with-openclaw-and
- **与 meme 直接相关的误判案例**：2026-04-09 有人**用官方 `claude` 程序**，加了一段类似第三方 harness 的 `--append-system-prompt`，结果收到 "Third-party apps now draw from your extra usage"。说明服务端会根据提示词特征做分类。【一手，issue 已关闭】https://github.com/anthropics/claude-code/issues/45911 。HN 上也有人报告在临时 VM 里跑 `claude -p` 遇到同样的报错。【二手】https://news.ycombinator.com/item?id=47844269
- **2026-04-21**：OpenClaw 文档称 Anthropic 员工表示 "Claude CLI reuse / `claude -p`" 可以用。这是 OpenClaw 的转述，不是 Anthropic 官方公告。【二手/未核实】https://docs.openclaw.ai/providers/anthropic

**额度**

- **`claude -p` 计入同一个订阅额度池。**
  - 2026-05-13 曾宣布：从 6 月 15 日起，Agent SDK、`claude -p`、GitHub Actions、以及"通过 Agent SDK 用 Claude 订阅认证的第三方 app"改用独立的月度 credit（Pro $20 / Max5x $100 / Max20x $200，按 API 价格计费）。
  - 这项调整在 2026-06-15 被暂停。帮助中心原文："Claude Agent SDK, `claude -p`, and third-party app usage still draw from your subscription's usage limits."（更新于 2026-06-16，之后没查到新方案）【一手】https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan
- **计量方式**
  - Pro 和 Max 都是"5 小时会话限额 + 每周限额"，Max 5x 和 20x 分别是 Pro 每会话额度的 5 倍和 20 倍。【一手】https://support.claude.com/en/articles/11049741-what-is-the-max-plan
  - Claude Code 与 claude.ai 共用额度（更新于 2026-08-19）。【一手】https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan
- **2026 年的调整**
  - 2026-05-06：Claude Code 的 5 小时限额翻倍，并取消高峰时段降额。【一手】https://www.anthropic.com/news/higher-limits-spacex
  - 2026-09-14：每周限额在"标准值"基础上永久 +25%，取代 5 月起的临时 +50%，相当于比 9 月前的实际额度少约 17%。【一手】https://x.com/ClaudeDevs/status/2093742321473065266 【二手】https://www.bleepingcomputer.com/news/artificial-intelligence/anthropic-is-cutting-claude-codes-current-weekly-limits-by-17-percent/
  - 官方没有公布具体的 token 数。

**非交互参数与防止自己记录自己**

来源【一手】：https://code.claude.com/docs/en/headless ，https://code.claude.com/docs/en/cli-reference ，https://code.claude.com/docs/en/env-vars

- **`--bare`**
  - 跳过 hooks、skills、plugins、MCP、auto memory、CLAUDE.md。
  - 但 "bare mode doesn't use your subscription login"，只认 `ANTHROPIC_API_KEY` 或 `apiKeyHelper`，所以**只适合 API 模式**。
  - 文档写明它 "will become the default for `-p` in a future release"，这对订阅模式是个隐患。
- **`--safe-mode`（等价于 `CLAUDE_CODE_SAFE_MODE=1`）是订阅模式的关键**
  - 会关闭 CLAUDE.md、skills、plugins、hooks、MCP、自定义命令和 agent、output styles、workflows、auto memory。
  - 原文："Authentication, model selection, built-in tools, and permissions work normally"。
  - 管理员下发的 managed policy hooks 仍会执行。
  - 社区实测：`--setting-sources ''` 在 2.1.270 上会把登录一起丢掉，改用 `--safe-mode` 才能保住登录。【二手】https://github.com/danielmiessler/LifeOS/pull/2120
- **其他参数**
  - `--no-session-persistence`：不写会话记录。另外 `CLAUDE_CODE_SKIP_PROMPT_HISTORY` 在任何模式下效果相同。
  - 限制工具和轮次：`--tools ""`、`--disallowedTools "mcp__*"`、`--strict-mcp-config`、`--disable-slash-commands`、`--max-turns`。
  - `--max-budget-usd`：只是客户端估算。
  - 输出：`--output-format json|stream-json`，`--json-schema`（结果在 `structured_output` 字段里）。
  - 模型和提示：`--model`、`--fallback-model`、`--system-prompt(-file)`。
  - 权限：`--permission-mode dontAsk`、`--permission-prompts none`、`--restricted`。
  - stdin 上限 10MB。
- **容易踩的坑**
  - **只要环境里设了 `ANTHROPIC_API_KEY`，`-p` 一定用这个 key 计费**，即使已经用订阅登录。
  - 不加 bare 或 safe 时，`-p` 会执行项目 `.claude/settings.json` 里的 hooks，并连接 `.mcp.json` 里的 MCP，而且没有信任提示。
  - 从 hook 里启动的子进程会继承 `CLAUDECODE=1` 和 `CLAUDE_CODE_CHILD_SESSION=1`。
  - 在 `stream-json` 的 `system/init` 事件里能读到 `plugins` 和 `mcp_servers`，可以用来自检。

### 3.2 OpenAI / Codex

- **是否允许**
  - 官方原文："Use API key authentication for programmatic Codex CLI workflows, such as CI/CD jobs"。【一手】https://learn.chatgpt.com/docs/auth
  - 同时官方有一篇进阶指南，写明适用于 "users who need ChatGPT/Codex rate limits instead of API key usage"，教你在可信 runner 上维护 `auth.json`。【一手】https://developers.openai.com/codex/auth/ci-cd-auth
  - OpenAI 使用条款（非美国地区版，生效日 2026-01-01）有两条通用禁令："Automatically or programmatically extract data or Output"，以及 "may not share your account credentials"。【一手，Wayback 快照】https://openai.com/policies/row-terms-of-use/
  - 【推断】官方文档化的 `codex exec` 属于例外。**没有查到**任何针对第三方工具调用 `codex exec` 的执法。
- **额度**【一手】https://learn.chatgpt.com/docs/pricing
  - 套餐：Free / Go $8 / Plus $20 / Pro $100、$200、$500 / Business 每席 $20。
  - "Local messages and cloud chats share your plan's usage allowance. Weekly limits may also apply"。本地消息包括 CLI、SDK、IDE，所以 `codex exec` 也计入同一个额度池。
  - Plus 和标准 Business 每 5 小时的估算：GPT-6 Luna 350–3,000 条，GPT-6.1 Sol 15–160 条，GPT-6 Astra 5–45 条。
  - Pro："currently have no five-hour limit"。
  - 帮助中心确认同时有 5 小时窗口和每周窗口。【一手，Wayback】https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan
- **Sign in with ChatGPT（DevDay，2026-09-29）**
  - Plus/Pro 用户可以授权第三方 app 使用自己的 ChatGPT 额度，并给每个 app 设周上限。开发者要申请 client ID，目前处于 preview；Pi、OpenCode、OpenClaw、T3 已经接入。【一手】https://learn.chatgpt.com/docs/sign-in-with-chatgpt ，https://developers.openai.com/siwc 【二手】https://techcrunch.com/2026/09/29/openais-latest-features-take-direct-aim-at-the-app-store-model/
  - 这是 OpenAI 认可的"第三方 app 使用 ChatGPT 额度"的正规途径，meme 以后可以申请。
- **参数**（对照 main 分支源码 `codex-rs/exec/src/cli.rs`、`utils/cli/src/shared_options.rs` 和 features 定义核对）【一手】https://github.com/openai/codex/blob/main/codex-rs/exec/src/cli.rs ，https://learn.chatgpt.com/docs/non-interactive-mode
  - 输出：`--json`（JSONL）、`-o/--output-last-message`、`--output-schema`。
  - 不落盘：`--ephemeral`（"Run without persisting session files to disk"）。
  - 沙箱与目录：`-s read-only`（默认）、`--skip-git-repo-check`、`-C`。
  - 配置：`--ignore-user-config`（不读 config.toml，但 "auth still uses CODEX_HOME"）、`--ignore-rules`、`-m`、`-p/--profile`、`-c k=v`。
  - `--thread-source`：内置的来源值里有一个是 `memory_consolidation`。
  - **跳过 hooks 和插件**：`--disable hooks`、`--disable plugins`，等价于 `-c features.<name>=false`，两者都是 Stable 且默认开启。`plugin_hooks` 已被移除，插件自带的 hook 统一受 `features.hooks` 控制。`memories` 默认关闭。
  - **不要**用 `--dangerously-bypass-hook-trust`。
  - Hook 会收到 `session_id` 和 `transcript_path`。【一手】https://learn.chatgpt.com/docs/hooks
  - 社区先例：t3code 调用时传 `--config features.codex_hooks=false --config features.hooks=false`。【二手】https://github.com/pingdotgg/t3code/pull/14217
  - AGENTS.md 仍会加载。在空的临时目录里运行可以避开项目级的 AGENTS.md，但用户级 `~/.codex/AGENTS.md` 能否屏蔽【未核实】。

### 3.3 其他 Agent

- **Gemini CLI**
  - 2026-06-18 起停止为个人账号（免费、AI Pro、AI Ultra）提供服务，建议迁移到 Antigravity CLI。【一手，已复核】https://github.com/google-gemini/gemini-cli/discussions/28017 ，https://developers.google.com/gemini-code-assist/docs/deprecations/code-assist-individuals
  - 之后只剩 API key、Vertex 和 Code Assist 企业版。
- **Antigravity CLI（`agy -p`）**
  - 支持无界面模式，但要先交互式登录一次。【一手】https://antigravity.google/docs/cli/headless/
  - 条款原文："Using third party software … to access the Service (e.g. using OpenClaw with Antigravity OAuth) is a breach"。【一手】https://antigravity.google/terms/
  - 2026-02 出现过 OAuth 滥用引发的封号潮。【一手】https://github.com/google-gemini/gemini-cli/discussions/20632
  - 已知 bug：无界面模式可能返回空结果却报 SUCCESS，也可能忽略 allow 规则。
- **Kimi Code**
  - Plus 档以上会员可用，支持 `kimi -p`。
  - 社区准则原文："Kimi Code 订阅仅限交互式使用"；"通过脚本批量执行…超出了正常使用范畴"。【一手】https://www.kimi.com/code/docs/kimi-code/community-guidelines.html
- **Qwen Code**
  - 免费 OAuth 于 2026-04-15 下线。【一手】https://github.com/QwenLM/qwen-code/issues/3203
  - Coding Plan 原文："禁止以 API 调用的形式用于自动化脚本…或任何非交互式批量调用场景"。【一手】https://help.aliyun.com/zh/model-studio/coding-plan
- **Pi**
  - 本身没有订阅，通过 `/login` 接入 Claude、ChatGPT、Copilot、Kimi 等；Gemini 和 Antigravity 登录已于 0.71.0 移除。
  - 无界面调用：`pi -p`、`--mode json`、`--no-session`。【一手】https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/cli.md
- **OpenCode**
  - GitHub Copilot 官方支持。【一手】https://github.blog/changelog/2026-01-16-github-copilot-now-supports-opencode/
  - OpenCode Go 订阅 $10/月；无界面调用 `opencode run --format json`。【一手】https://opencode.ai/docs/go/

---

## 四、现有记忆插件怎么调用 LLM

按各项目 2026-09 main 分支的源码核对；claude-mem 和 Hindsight 做过抽查复核。

| 项目 | 调用方式 | 订阅 / API | 默认模型 | 怎么防止自己记录自己 |
|---|---|---|---|---|
| **Mem0** 插件 | 本地只负责采集，抽取在 Mem0 云平台的服务端做 | 只能用 `MEM0_API_KEY`；开源版默认用 OpenAI | gpt-5-mini | 本地不启动子进程，不需要 |
| **Hindsight** | 服务端或本地 daemon 调 LLM | **两种都支持**：`claude-code` provider 用 Agent SDK 走 Pro/Max 登录；`openai-codex` provider **直接读 `~/.codex/auth.json` 调 ChatGPT 后端**；另外支持十几家 API | 默认 OpenAI gpt-4o-mini；claude-code provider 为 sonnet-4.5 | 给子进程一个临时的 `CLAUDE_CONFIG_DIR`，另设 `CLAUDE_SECURESTORAGE_CONFIG_DIR=""` 以保住 keychain 登录；`tools=[]`、`max_turns=1`。#1751 是一次递归事故；#2881 发现不指定模型会在 Pro/Max 上跑 Opus |
| **claude-mem** | 后台 worker 用 **Claude Agent SDK 的 `query()`** | **默认用订阅**（`CLAUDE_MEM_CLAUDE_AUTH_METHOD=subscription`）：启动子进程时**从 keychain 读 OAuth token，注入 `CLAUDE_CODE_OAUTH_TOKEN`**；也可以用 Anthropic、Gemini、OpenRouter 的 key | claude-haiku-4-5-20251001 | 设 `CLAUDE_MEM_INTERNAL=1`，hook 检测到就提前退出；工作目录固定在专用目录；`settingSources:[]`、`strictMcpConfig`、`tools:[]`；不把 `ANTHROPIC_API_KEY` 传给子进程 |
| **agentmemory** | 默认不调 LLM | Agent SDK 路径需要用户主动开启（README 承认它"曾导致无界 Stop-hook 递归"）；否则用 OpenAI、Anthropic 等的 key | 各 provider 分别设定（Agent SDK 路径实际没有传模型） | `AGENTMEMORY_SDK_CHILD=1`，并检查 `entrypoint==="sdk-ts"` |
| **memU** | 插件本身不调 LLM；定时以无界面模式运行 `claude -p` 或 Codex 定时任务，**由宿主 Agent 自己完成提炼** | 用宿主 CLI 的登录（订阅或 key） | 宿主 CLI 的默认模型 | `MEMU_BRIDGING_RUN=1`，并记下自己的 session id，永远不导入这些会话；Codex 这边缺少这层防护 |
| **Letta Code** | 本身就是 Agent，由反思子 agent 继承主模型 | 支持 ChatGPT、Kimi、zAI 等订阅，**不支持 Claude Pro/Max** | 默认 `auto`。`deepseek/deepseek-v4.1-flash` 只出现在初始化记忆的 skill 里，作为只读的分析子 agent，并注明不要用它来写记忆，**不是全局默认** | 不存在调用外部 CLI 递归的问题 |
| **ECC** | 可选的后台 observer（默认关闭）启动 `claude --model haiku --max-turns N -p`；`/learn` 在主会话里提炼 | 用 `claude` CLI 当前的登录 | haiku | `ECC_SKIP_OBSERVE=1` 等环境变量，检测到就提前退出；没用 bare 或 safe 模式，hooks 仍会加载 |

**两个做法 meme 不宜照搬**【推断】
- claude-mem 从 keychain 读 token 再注入，已经接近 Anthropic 禁止的 "collect … intermediate … session tokens"。
- Hindsight 直接拿 `~/.codex/auth.json` 调 ChatGPT 后端，属于在非官方客户端里复用 OAuth，而不是走 Sign in with ChatGPT。

主要来源：
- https://github.com/thedotmack/claude-mem/blob/main/src/shared/SettingsDefaultsManager.ts#L193-L209
- https://github.com/thedotmack/claude-mem/blob/main/src/shared/EnvManager.ts#L183-L193
- https://github.com/vectorize-io/hindsight/blob/main/hindsight-api-slim/hindsight_api/engine/providers/claude_code_llm.py#L36-L60
- https://github.com/NevaMind-AI/memU/blob/main/README.md
- https://github.com/letta-ai/letta-code/blob/main/src/skills/builtin/initializing-memory/SKILL.md
- https://github.com/affaan-m/ECC/blob/main/skills/continuous-learning-v2/agents/observer-loop.sh#L384-L401
- https://github.com/rohitg00/agentmemory/blob/main/src/hooks/sdk-guard.ts

---

## 五、成本粗估

假设每次整理：输入 20 万–100 万 token，输出 2–4 万 token。

| 模型 | 单价（输入 / 输出，每百万 token） | 每天 | 每月 |
|---|---|---|---|
| Claude Haiku 4.5 | $1 / $5；Batch 半价 | 约 $0.30–1.20 | 约 $9–36 |
| Claude Sonnet 5 | $2 / $10 | 约 $0.60–2.40 | —— |
| GPT-6 Luna | 短上下文 $0.10 / $0.50；Batch 半价 | 约 $0.03–0.12 | 约 $1–4 |
| DeepSeek `deepseek-flash`（服务端实际是 V4.1-Flash；旧名 `deepseek-v4-flash` 仍可用） | 高峰 $0.30 / $1.20，错峰半价 | 高峰约 $0.08–0.35；错峰约 $0.04–0.17 | —— |

- 价格来源：Anthropic【一手】https://platform.claude.com/docs/en/about-claude/pricing ；OpenAI（2026-09-29 的 Wayback 快照）【一手】https://developers.openai.com/api/docs/pricing ；DeepSeek【一手】https://api-docs.deepseek.com/quick_start/pricing
- Claude 4.7 及之后的模型换了 tokenizer，同样的文本约多 30% 的 token；Haiku 4.5 用的是旧 tokenizer。
- OpenAI "long context" 的分界线【未核实】。

---

## 六、对 meme 的建议

**1. 默认模式：用宿主的官方 CLI，首次运行时明确征得用户同意**
- **Codex**：用 `codex exec`。风险低，有文档支持。
- **Claude**：用 `claude -p`。属于灰色地带，但每天一次、用量小，而且只调用用户自己安装、未修改的程序。
- **API 模式要做成一等公民**。文档里写明："Anthropic 官方首选 API key；用量大或想零风险的用户，请用 API 模式。"
- **Kimi、Qwen、Gemini CLI 不提供订阅模式**：前两家条款禁止，Gemini 已停服。Antigravity 标为实验性。
- 以后可以申请 Sign in with ChatGPT 的 client ID。

**2. 绝对不要做的事**
- 读取、复制、注入 OAuth token 或 keychain，包括 `setup-token`。
- 直接调用各家后端 API 时冒用 CLI 的身份。
- 修改 CLI 程序。
- 把提示词写得像其他 harness（比如照搬 OpenClaw 风格的系统提示），这会触发 #45911 那类误判。

**3. 做成可配置项**
- 模式：`host-cli` 或 `api`；provider、base URL（DeepSeek 和 OpenRouter 有兼容 Anthropic 或 OpenAI 格式的接口）。
- **显式固定模型**，比如 `haiku`、GPT-6 Luna 或 `deepseek-flash`。不固定的话，Pro/Max 用户可能会跑 Opus（见 Hindsight #2881）。
- 每次运行的 token 上限、会话数上限、裁剪策略；提供 dry-run 模式，先估算 token。
- 运行时间：默认放在夜间或错峰时段。DeepSeek 错峰半价，也不和用户白天的 5 小时窗口抢额度。
- 超时和限流退避；遇到 "extra usage"、"Not logged in" 这类错误时**立即停止**，不要重试。
- CLI 路径和额外参数；API 模式下可选 Batch API。

**4. 要提醒用户的事**
- 后台任务和交互使用占**同一个额度池**：Claude 与 claude.ai、Claude Code 共用；Codex 的本地和云端共用。
- 环境里只要设了 `ANTHROPIC_API_KEY`，`claude -p` 就会**按 API 计费**。
- 如果开启了 Claude 的 usage credits 或自动充值，可能被计入额外用量。
- 2026 年各家政策变动频繁；`--bare` 未来会成为 `-p` 的默认，届时订阅模式可能失效。
- 会话内容会发给所选的模型厂商，请用户检查自己消费级账号的"数据用于训练"设置。

**5. 防止 meme 记录自己的整理任务**
- **Claude 订阅模式**：
  ```
  claude -p --safe-mode --no-session-persistence --tools "" --strict-mcp-config --disable-slash-commands --max-turns 1 --model <固定> --output-format json --json-schema <schema>
  ```
  - 工作目录设为 meme 专用的空目录，如 `~/.meme/run/`。
  - 输入通过 stdin 分块传入（上限 10MB）。
  - 启动前清掉 `ANTHROPIC_API_KEY`、`CLAUDECODE`、`CLAUDE_CODE_CHILD_SESSION` 这几个环境变量。
- **Claude API 模式**：用 `--bare`，并且只把 key 注入这一个子进程；或者直接调 Messages API 或 Batch API，最简单。
- **Codex**：
  ```
  codex exec --ephemeral --disable hooks --disable plugins --disable memories -s read-only --skip-git-repo-check -C <空目录> -m <固定> --json -o out.json --output-schema schema.json
  ```
- **多层防护**
  - 整理任务由系统调度器触发（cron、launchd、systemd --user timer、Windows 任务计划），不要从 Agent 的 hook 里直接启动。
  - 子进程设 `MEME_INTERNAL=1`，meme 的所有 hook 检测到它就立即退出。
  - 采集时跳过三类会话：工作目录是 meme 运行目录的；从 `-p` 或 SDK 入口启动的；JSON 输出里返回的 `session_id`。这些会话维护在一份排除名单里。
  - 给 meme 自己注入的记忆块打上标签，提炼前先去掉，避免把自己注入的内容又学回去（Hindsight 的做法）。
  - Claude 可以先用 `stream-json` 读取 `system/init` 事件，确认 `plugins` 列表里没有 meme 再继续，否则中止。

---

## 七、上线前需要实测的点

- `--safe-mode` 在 `-p` 下能否保住订阅登录：目前只有 CLI 帮助文本和社区 PR 佐证，没有实际运行过。
- Codex 的用户级 `~/.codex/AGENTS.md` 能否屏蔽。
- Anthropic 法律页删掉那句禁令的确切日期。
- OpenClaw 转述的"Anthropic 员工认可复用 `claude -p`"，没有 Anthropic 官方出处。
