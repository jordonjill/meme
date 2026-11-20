# 常驻层落点调研：各 Agent 专属的原生加载位置

> 调研日期：2026-09-30
> 目的：注入的三层结构里，"常驻层"要写进各 Agent 自己会加载的原生位置（见 [memory.md](../../design/memory.md) 6.3 节）。一个位置要能用，需要同时满足：
> 1. **专属**：只有这一家 Agent 会读，别的 Agent 不会读到；
> 2. **在代码仓库外**；
> 3. **最好不用改用户自己的文件**；
> 4. **能区分项目**，放得下项目级的内容。
>
> 第一、二部分是 Claude Code 和 Codex；第三部分起是其他 10 个 Agent（Pi、OpenCode、Cursor、Gemini CLI、Antigravity CLI、Qwen Code、Kimi Code、Hermes、OpenClaw、DeepSeek Harness），以及交叉读取表和沙箱情况。

**依据**
- **Claude Code**：
  - 本机安装的 2.1.285 版本。在隔离的 HOME 目录下，用 `claude -p "/context"` 实测列出实际加载了哪些记忆文件，同时用"指令加载"（InstructionsLoaded）hook 记录每一次加载；
  - 另外阅读了程序代码和官方文档：[memory](https://code.claude.com/docs/en/memory)、[hooks](https://code.claude.com/docs/en/hooks#instructionsloaded)、[插件清单](https://code.claude.com/docs/en/plugins/manifest-reference)、[插件组件](https://code.claude.com/docs/en/plugins/components)、[输出风格](https://code.claude.com/docs/en/output-styles)、[设置](https://code.claude.com/docs/en/settings-reference)。
- **Codex**：
  - openai/codex 源码，commit `d42056091aded7feb1d88ac7e83972108b2aa478`（2026-09-30），最新稳定版 `rust-v0.159.2`；
  - 官方文档：[AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)、[hooks](https://learn.chatgpt.com/docs/hooks)。
  - 其中三处抽查复核过：全局 AGENTS.md 的加载逻辑、沙箱的读取权限、hook 输出 2,500 token 的上限。
- 标【未验证】的是没有核实的内容。

---

## 结论

| | 用户级内容 | 项目级内容 |
|---|---|---|
| **Claude Code** | **meme 自己的新文件 `~/.claude/rules/meme.md`**：每次会话都加载，不弹审批，不改用户文件，其他 Agent 不读 | **没有**"静态、在仓库外、能按项目区分"的原生位置。最佳方案是 meme 插件的 SessionStart hook：按当前目录读出预编译好的文件并输出 |
| **Codex** | 唯一静态常驻的位置是用户自己的 `~/.codex/AGENTS.md`。它不支持引用其他文件，只能写一段由 meme 管理的区块，**需要用户同意**。不改用户文件的替代做法是 SessionStart hook | **只能用 SessionStart hook**，首次运行时需要用户审核信任 |

**Codex 的沙箱**：默认模式下**能读** `~/.meme/`，**不能写**，网络默认关闭。

**所有 Agent 汇总**（详见第三部分）：
- **项目级**：没有任何一家有"原生、在仓库外、能按项目区分、只归 meme 使用"的指令文件。所有 Agent 的项目级内容，都要走"meme 预编译的文件 + 插件或 hook 按当前目录读取"。
- **用户级**：有 7 家可以只放一个 meme 自己的文件，分别是 Claude Code、Qwen、agy、Cursor、Kimi、Gemini CLI、OpenCode，其中 OpenCode 要在配置里加一行。Pi、Hermes、OpenClaw、DeepSeek Harness 要靠代码插件；Codex 要么写进用户文件的管理区块，要么用 hook。
- **最危险的交叉读取**：Cursor 默认会加载 Claude Code 的插件和 hook，所以 meme 的 Claude Code 插件在 Cursor 里必须什么都不做。

---

## 一、Claude Code（2.1.285）

### 1.1 各候选位置

| 候选位置 | 是否专属 | 在仓库外 | 要改用户文件 | 能按项目区分 | 加载时机与上限 | 结论 |
|---|---|---|---|---|---|---|
| **`~/.claude/rules/meme.md`**（meme 新建的文件，不写 `paths:`） | 是。OpenCode、Pi、Kimi 的源码都不读 `~/.claude/rules`（已验证）；Cursor【未验证】 | 是 | 否，是在 Claude 配置目录下新增的文件 | 否 | 会话开始时加载，排在 `~/.claude/CLAUDE.md` 之后、项目文件之前；可以用 `@` 引用其他文件，不弹审批；单个文件的硬上限是 4 MiB | **可用，用户级首选** |
| `~/.claude/CLAUDE.md`，直接把内容写进去 | 否。OpenCode 在自己的全局 AGENTS.md 不存在时会读它 | 是 | 是 | 否 | 会话开始时加载 | **不可用** |
| `~/.claude/CLAUDE.md` 里只加一行 `@~/.meme/…/user.md` | 内容在 meme 的文件里；别的 Agent 如果不展开 `@`，只会看到这一行字（OpenCode 会不会展开【未验证】） | 是 | 是，只改一行 | 否 | 用户级文件里的 `@` 引用**不弹审批，直接加载**（实测）；最多嵌套 4 层；例外：Cowork 桌面会话会跳过指向工作目录以外的引用 | **有条件**：作为备选，需要用户同意 |
| `~/.claude/rules/*.md` 加 `paths:` 按路径生效 | 同上 | 是 | 否 | **否** | 路径是相对当前目录来匹配的，所以没法按项目的绝对路径区分；而且要等 Claude 读到匹配的文件才会加载 | **不能用于项目级** |
| 项目里的 `CLAUDE.local.md` | —— | **否**，在仓库目录里 | —— | 是 | 它一旦存在，Claude 就不再自动读 AGENTS.md；它引用仓库以外的文件需要审批，在无界面模式下会被静默丢弃 | **不可用** |
| auto memory 的 `~/.claude/projects/<项目>/memory/MEMORY.md` | 其他 Agent【未验证】；OpenCode 和 Pi 的源码里没看到读取 | 是 | 这个文件归 Claude 管，Claude 的模型和后台任务都会改它 | **是**，按 git 根目录区分 | 只在 auto memory 开启时加载，取前 200 行或 25KB；关闭 auto memory 后**完全不加载**；里面的 `@` 引用不展开 | **有条件**：只适合作为可选的第二通道 |
| 插件根目录的 `CLAUDE.md` | —— | —— | —— | —— | **不加载**，文档写明了；插件校验工具也会给出警告 | 不可用 |
| 插件的 `settings.json` | —— | —— | —— | —— | 只有两个键生效，其中 `agent` 会把主线程换成插件 agent 的系统提示，侵入性太强 | 不可用 |
| 插件的输出风格（强制生效） | 只有 Claude 读 | 是 | 否 | 否 | 作用在系统提示层面，会覆盖用户自己的输出风格，而且同一时间只能有一个生效 | 不推荐 |
| **插件的 SessionStart hook** | 放在插件目录里，不在 settings 文件里（Cursor 会不会加载 Claude 插件里的 hook【未验证】；注意不要写进 `~/.claude/settings.json`，否则 Cursor 可能也会执行） | 是 | 否 | **是**，按当前目录 | 在会话开始、恢复会话、清空上下文、压缩上下文后都会触发，所以压缩后会重新注入；每次最多 1 万字符，超出部分写到文件里，只给 2,000 字符的预览；命令可以只是 `cat` 一个文件，不需要 meme 常驻进程 | **可用，项目级首选** |
| 启动参数 `--append-system-prompt` | —— | —— | —— | —— | 只能在命令行或 SDK 里传，settings 里没有对应的配置项 | 需要包装脚本，不推荐 |
| 附加目录（`--add-dir` 加一个环境变量） | —— | 是 | 要改 settings | 否 | 会给 Claude 这个目录的文件访问权限 | 不推荐 |
| 管理员级位置（`/etc/claude-code/` 下） | —— | —— | 需要 root 权限 | 否 | —— | 不适合 |
| `~/.claude/skills` | 否。OpenCode 和 Kimi 都会读 | 是 | 否 | 否 | 常驻加载的只有 skill 的描述清单 | 不适合放常驻内容 |

**auto memory 目录为什么只能当第二通道**：
- 系统提示明确告诉模型："MEMORY.md 是索引，不要把记忆内容直接写进去"。
- 后台有一个抽取记忆的子 agent 会写这个目录。
- 还有一个后台整合任务，会合并、删除文件，修剪索引。
- 如果用户在用户级设置里改了 auto memory 的目录，所有项目会**共用同一个目录**。

### 1.2 几个关键行为

- **加载顺序**：
  1. 管理员级的 CLAUDE.md 和规则；
  2. `~/.claude/CLAUDE.md` 及其引用的文件；
  3. `~/.claude/rules`；
  4. 从文件系统根目录到当前目录，每一层的 CLAUDE.md、`.claude/CLAUDE.md`、`.claude/rules`、`CLAUDE.local.md`；
  5. 附加目录；
  6. MEMORY.md。
  
  这些内容作为一条用户消息注入。会话中途文件变了，不会改写前面的内容；只有在压缩上下文这类时机，才会追加一条"指令文件已重新读取"的差异消息，所以对缓存友好。
- **`@` 引用**：
  - 相对路径、绝对路径、`~/` 都支持，最多嵌套 4 层。
  - 用户级文件（`~/.claude/CLAUDE.md` 和 `~/.claude/rules`）引用 `~/.meme/...` 时，**不弹审批，直接加载**（实测）。
  - 项目级或本地文件引用仓库以外的路径时，需要用户批准过；否则会被**静默丢弃**，调试日志里也没有提示（实测）。meme 不应该替用户去改这个批准标志，它是一道安全门。
  - 之前提到的 NanoClaw 案例（9 段指令里有 8 段没生效）用的是 Agent SDK，跑在无界面的容器里，被丢弃的正是项目级 CLAUDE.md 里指向仓库外的引用。
- **"指令加载"hook（InstructionsLoaded）**：
  - 每加载一个指令文件就触发一次，能拿到文件路径、类型（用户级、项目级、本地、管理员级）和加载原因。
  - 它是异步的，不能阻止加载，输出也会被丢弃。
  - 不会为 MEMORY.md 触发。
  - **meme 可以用它确认自己的文件确实被加载了**，反馈环节可以借助这一点。
- **一键关闭**：在 `claudeMdExcludes` 里写上 `**/.claude/rules/meme.md`，就能让 Claude 不加载 meme 的规则文件。

### 1.3 推荐方案

- **用户级**：
  - 首选：meme 生成 `~/.claude/rules/meme.md`。要用真实文件，不要用软链接，因为 Cowork 会跳过指向外部的软链接；不写 `paths:`。
  - 备选：在用户的 `~/.claude/CLAUDE.md` 里加**一行** `@` 引用，需要用户同意。
- **项目级**：
  - 首选：meme 的 Claude Code 插件带一个 SessionStart hook，触发时机是会话开始、恢复会话、清空上下文和压缩上下文。命令只做一件事：按 git 根目录算出项目标识，然后输出对应的预编译文件，控制在 1 万字符以内。
    - 内容是预编译的，不需要 meme 常驻进程；同一个会话里内容稳定，对缓存友好。
    - 代价是它不算"Claude 自己读静态文件"，要依赖插件处于启用状态，每次执行一条命令。
  - 备选 1：在 auto memory 的 MEMORY.md 里放一段 meme 管理的区块。前提是 auto memory 开着，并且用户同意；要预期 Claude 或后台整合任务会改动它，meme 需要检测并自动修复。
  - 备选 2：在 `~/.claude/rules/meme.md` 里按项目分节，让模型自己挑。浪费 token，还可能把别的项目的内容带进来，只适合项目很少的情况。
- **需要用户同意的操作**：
  - 修改 `~/.claude/CLAUDE.md`；
  - 写 MEMORY.md；
  - 安装或启用插件（这一步本身就是一次同意）；
  - 往 `~/.claude/rules` 新增文件虽然不改用户文件，但仍然建议在安装时说明，或者让用户主动开启；
  - **不要**替用户修改"允许项目文件引用外部路径"的批准标志。

---

## 二、Codex CLI

### 2.1 各候选位置

| 候选位置 | 是否专属 | 在仓库外 | 要改用户文件 | 能按项目区分 | 加载时机与上限 | 结论 |
|---|---|---|---|---|---|---|
| **`~/.codex/AGENTS.md`** | 没发现其他 Agent 会自动读它（代码搜索不一定全，【未完全验证】） | 是 | **是** | 否，全局 | 作为用户消息注入，排在项目文档前面；全局文件**没有字节上限**；每一步都会重读，内容一变就会注入一条"替换之前全部内容"的消息，所以 meme 不能在会话进行中改它；**不支持引用其他文件** | **有条件**：写一段由 meme 管理的区块，需要用户同意 |
| `~/.codex/AGENTS.override.md` | 专属 | 是 | 等于接管用户的文件 | 否 | 全局只读第一个非空的文件，这个文件一存在，用户自己的 AGENTS.md 就整个失效 | **不可用** |
| 项目里的 AGENTS.md 等 | Pi 也会读项目里的 AGENTS.override.md | **否**，在仓库里 | —— | 是 | 项目文件合计默认上限 32 KiB，只算项目文件 | 不可用 |
| 配置项 `model_instructions_file` | 专属 | 是，可以指向 meme 的文件 | 要改 config.toml | 否 | **会替换**内置的基础指令，源码里注明"强烈不建议" | 不推荐 |
| 配置项 `experimental_instructions_file` | —— | —— | —— | —— | 已被删除 | 不可用 |
| 配置项 `developer_instructions` | 专属 | 是 | 是，而且只能直接写字符串，不能指向文件 | 否 | 作为开发者消息追加 | 有条件，只作兜底 |
| 配置档案（profile）和 `-c` 参数 | —— | —— | —— | 不能按项目自动选择 | 要手动指定，需要包装脚本 | 不推荐 |
| memories 功能（`memory_summary.md`、`extensions/`） | 专属 | 是 | —— | 否，全局 | 功能默认**关闭**；主 agent 只看到那份摘要（2,500 token，会被整合任务重写）；extensions 里的指令**只给整合子 agent 看**，资源文件 7 天后会被删除 | **不可用** |
| `~/.codex/skills` | **不完全专属**：Kimi 在自己的 skills 目录和 `~/.claude/skills` 都不存在时会读它 | 是 | 否 | 否 | Codex 仍会扫描，但已标为弃用；常驻加载的只有 skill 清单，预算约占上下文的 2%，最多 1 万 token | 只适合放 skill |
| `~/.agents/skills` | 共享，几乎所有 Agent 都读 | —— | —— | —— | —— | 不适合放专属内容 |
| 配置里的 `[projects."<路径>"]` | —— | 是 | 是 | —— | 只有"信任等级"一个字段 | 不可用 |
| **SessionStart hook**（放在 `~/.codex/hooks.json`、config.toml，或者 Codex 插件里） | 专属（其他 Agent 会不会读 `~/.codex/hooks.json`【未验证】） | 是 | 走插件就不用改用户文件 | **是**，按当前目录 | 功能默认开启；在会话开始、恢复、清空、压缩、分叉时触发；输出作为开发者消息注入，**默认上限 2,500 token**，超出部分写到文件里只给预览；**不是由管理员下发的 hook，都必须经用户审核信任**，hook 一改就要重新审核 | **可用**：项目级唯一的通道，需要用户同意 |
| 插件指令、MCP 指令 | —— | —— | —— | —— | 插件指令只在用户 @ 提到这个插件时才注入；MCP 指令要求 meme 一直运行 | 不适合常驻 |

### 2.2 推荐方案

- **用户级**：
  - 静态方案：在用户的 `~/.codex/AGENTS.md` 里写一段由 meme 管理的区块，用 `<!-- meme:begin -->…<!-- meme:end -->` 包起来，内容直接写在里面。需要用户同意，而且只在会话之外更新。
  - 不改用户文件的方案：用 SessionStart hook，把用户级和项目级内容一起输出。受 2,500 token 上限约束，需要用户审核信任 hook。
  - **不要**用 `AGENTS.override.md`、`model_instructions_file` 或 memories 功能。
- **项目级**：
  - 只能用 SessionStart hook，最好放在 meme 的 Codex 插件里，这样就不用改用户的 hooks.json 或 config.toml。hook 按当前目录输出对应项目的预编译文件。
  - 首次运行以及每次修改 hook 之后，都需要用户在 `/hooks` 里审核信任。
  - 备选：用包装脚本，通过 `-c developer_instructions=...` 传入。
- **需要用户同意的操作**：修改 AGENTS.md；审核信任 hook（这是 Codex 强制要求的）；如果要让沙箱里的命令写 `~/.meme`，需要把它加进可写目录。

### 2.3 Codex 沙箱能不能读 `~/.meme/`

- **能读**：默认的"只读"和"工作区可写"两种模式，都允许读取整个文件系统。macOS、Linux、Windows 的实现都已核实；Windows 只排除 `.ssh`、`.aws`、`.config`、`.docker` 这几个目录。例外情况是：用户或管理员专门配置了禁止读取 `~/.meme`。
- **不能写**：可写的范围只有项目根目录、临时目录，以及用户额外添加的可写目录。
- **网络默认关闭**：所以 `meme search` 要直接读本地文件或数据库，不能去连本机的后台服务。
- **SQLite 要注意**：在只读沙箱里，WAL 模式的数据库可能因为要写辅助文件而打不开。建议以只读或不可变方式打开，或者不用 WAL 模式。【未在 Codex 中实测，这是 SQLite 的通用行为】

---

## 三、其他 10 个 Agent

**调研方式**：
- 7 个子调研并行，逐个 Agent 阅读固定版本的源码、官方文档和更新日志。以下几处源码抽查复核过，行号和行为都对得上：Pi 的 sections 与上下文候选列表、Qwen 的默认文件名与 `~/.qwen/rules` 加载、Hermes 的 section 预算、Kimi 的 `systemPromptPath`、DeepSeek Harness 的 `systemPrompt.section`、OpenClaw 的 `prependSystemContext`、OpenClaw 内嵌 Pi 时关闭扩展、skill 和上下文文件的设置。
- Cursor 和 Antigravity CLI（下文简称 agy）是闭源的。Cursor 的结论来自解包后 IDE 3.22.12 和 cursor-agent 2026.09.28 里打包的 JS，标【代码】；agy 只能看文档和更新日志，二进制下载被网络拦截了。
- 标注：【未验证】只见于文档，或者完全没有依据；【推断】由代码推导得出；【代码】在闭源包里静态看到，没有实际运行验证。

**核对的版本**：Pi v0.99.1；OpenCode v1.18.33；Cursor IDE 3.22.12、cursor-agent 2026.09.28；Gemini CLI v0.62.0；agy 1.2.14；Qwen Code v0.24.7；Kimi Code 2.1.1；Hermes v2026.9.24（即 0.21.5）；OpenClaw v2026.9.7；DeepSeek Harness 0.2.0-rc.2。

**源码仓库**：
- Pi：https://github.com/earendil-works/pi
- OpenCode：https://github.com/anomalyco/opencode
- Gemini CLI：https://github.com/google-gemini/gemini-cli
- Qwen Code：https://github.com/QwenLM/qwen-code
- Kimi Code：https://github.com/MoonshotAI/kimi-code
- Hermes：https://github.com/NousResearch/hermes-agent
- OpenClaw：https://github.com/openclaw/openclaw
- DeepSeek Harness：https://github.com/deepseek-ai/deepseek-harness

文档和更新日志：Cursor https://cursor.com/docs/ ，agy https://antigravity.google/docs/ 。各项的文件路径与行号见调研原始报告，此处从略。

### 3.1 主要结论

1. **没有一家有"原生、在仓库外、能按项目区分、只归 meme 使用"的指令文件。**
   - 能按项目区分的原生文件只有四种（第一部分的 Claude Code auto memory 也算一种），而且都由 Agent 自己在写：
     - Gemini CLI 的 `~/.gemini/tmp/<项目>/memory/MEMORY.md`；
     - Qwen 的自动记忆目录：索引由 Qwen 自己重写，而且只有索引常驻；
     - OpenClaw 工作区里带项目标注的 MEMORY.md：主要由它的 dreaming 写入。
   - 所以**所有 Agent 的项目级常驻内容，都要走"meme 自己的文件 + 插件或 hook 按当前目录读取"**。Claude Code 和 Codex 也是这个结论。
2. **用户级内容，有 6 家可以只放一个文件、不用写代码**，而且都是 meme 自己的新文件：
   - Qwen：`~/.qwen/rules/meme.md`
   - agy：`~/.gemini/antigravity-cli/rules/meme.md`
   - Cursor：本地插件里的 `rules/*.mdc`
   - Kimi：插件的 `systemPromptPath`
   - Gemini CLI：链接到本地的扩展，用 `contextFileName` 指向 meme 的文件
   - OpenCode：在全局配置的 `instructions` 里加一行（这一家需要改用户的配置文件）

   加上 Claude Code 的 `~/.claude/rules/meme.md`，一共 7 家。
3. **Pi、Hermes、OpenClaw、DeepSeek Harness 的用户级也要靠代码插件才干净。** 它们的原生文件，要么属于用户（比如 `~/.pi/agent/AGENTS.md`、`SOUL.md`），要么会被 Agent 自己改写（比如 `memories/*.md`、`MEMORY.md`），要么优先级最低（`~/.dsh/AGENTS.md` 在 64 KiB 预算里最先被丢弃）。
4. **最危险的交叉读取**：
   - **Cursor 默认会加载 Claude Code 的 hooks、插件和 skills**（`~/.claude/settings.json`、已启用的插件、`~/.claude/skills`）。IDE 有开关，但默认开；命令行版没有开关，总是加载。所以 meme 的 Claude Code 插件必须在检测到 Cursor 时什么都不做：看环境变量 `CURSOR_VERSION`，或者 hook 输入里的 `cursor_version`。
   - **`~/.gemini/GEMINI.md` 会被 Gemini CLI 和 agy 同时读。**
   - **`~/.agents/skills` 至少有 9 家会读。**
   - **家目录作为上级目录时，`~/AGENTS.md` 和 `~/CLAUDE.md` 会被多家读到**：Claude Code 读 `~/CLAUDE.md`；Pi 和 Cursor 两个都读；Qwen 和 OpenCode 在非 git 目录下会读。
5. **两个"新建文件会盖住用户文件"的坑**：
   - 新建 `~/.config/opencode/AGENTS.md` 之后，OpenCode 就不再读 `~/.claude/CLAUDE.md` 了。
   - Pi 在 `~/.pi/agent/` 里，每个目录只取第一个命中的文件（顺序是 `AGENTS.override.md` > `AGENTS.md` > `CLAUDE.md`），新建前两个都会盖住用户放在那里的文件。
6. **各家的大小上限差别很大**，编译时要按 Agent 设上限：

   | Agent | 上限 |
   |---|---|
   | Hermes | 插件 section 每个最多 4,000 字符，所有插件合计最多 8,000 字符，超限的整段跳过、不截断（最紧） |
   | Cursor | hook 注入最多 1 万字符，超出丢弃 |
   | Kimi | 插件的系统提示每项最多 32 KiB，所有插件合计最多 64 KiB |
   | agy | 规则单个文件 24,000 字节；全局规则和始终生效的规则共享 2 万 token |
   | OpenClaw | 启动文件每个 2 万字符，合计 6 万 |
   | 其他 | 基本没有硬上限 |

   第一部分的 Claude Code（hook 输出 1 万字符）和 Codex（hook 输出约 2,500 token）也要算进来。
7. **各家给项目起标识的方法都不一样**：Gemini CLI 用当前目录名、Qwen 用 git 根目录路径、Kimi 用工作目录的哈希、OpenClaw 用规范化后的远程地址、Claude Code 由 git 仓库推导。meme 应该从 hook 或插件拿到当前目录，自己推出 git 根目录，再用规范化的远程地址和根目录路径算出统一的项目标识，不依赖各家的目录命名。

### 3.2 各 Agent 的推荐方案

| Agent | 用户级首选 | 项目级首选 | 备选 | 需要用户同意的事 |
|---|---|---|---|---|
| **Pi** | 扩展 `~/.pi/agent/extensions/meme/index.ts`，在每次提问前往系统提示里加一个 meme 用户级段落 | 同一个扩展按当前目录加项目级段落 | `~/.pi/agent/AGENTS.md` 里的管理区块，只能放用户级；绝不新建 AGENTS.override.md | 放置可执行的扩展；用 `pi install` 安装还会改它的设置文件 |
| **OpenCode** | 全局配置 `opencode.json` 的 `instructions` 指向 `~/.meme/compiled/opencode/user.md` | 插件 `~/.config/opencode/plugins/meme.ts`，用一个实验性的钩子，按工作区往系统提示里加内容 | `~/.config/opencode/AGENTS.md` 里的管理区块（要告诉用户，这样 OpenCode 就不再读 `~/.claude/CLAUDE.md`） | 修改 opencode.json；放置插件 |
| **Cursor** | 本地插件 `~/.cursor/plugins/local/meme/`，里面放一条始终生效的规则 | 同一插件的会话开始 hook（命令行版可靠）。IDE 版有会话开始注入静默丢失的 bug，所以再加一个"第一条消息时注入"作兜底（这个做法没有写进文档），并做一次自检，确认真的注入了 | `~/.cursor/rules/`（只有项目都在家目录下时才会加载）；让用户手动粘贴到云端的 User Rules | 本地插件（企业版要管理员允许）；**meme 的 Claude Code 插件在 Cursor 里必须什么都不做** |
| **Gemini CLI** | 链接一个 meme 扩展，用 `contextFileName` 指向 meme 的文件 | 同一扩展的会话开始 hook | 在 Gemini 自己的项目记忆文件里加一行 `@meme.md` 引用 | 执行 `gemini extensions link`（带 hook 时会要求确认）；**不要写 `~/.gemini/GEMINI.md`**，agy 也会读它 |
| **agy** | `~/.gemini/antigravity-cli/rules/meme.md`，设为始终生效 | 插件的"调用模型前"hook，按工作区返回要注入的内容（要先实测注入的内容会不会留在对话历史里） | `~/.gemini/config/rules/`（Antigravity 全家共用）；用规则或 skill 引导 Agent 执行 `meme search` | 修改它的设置文件，或者安装插件 |
| **Qwen Code** | `~/.qwen/rules/meme.md`（内容直接写在文件里，它不支持引用） | 通过扩展安装的会话开始 hook | 扩展的 `contextFileName`；`~/.qwen/AGENTS.md` | 链接或安装扩展；新建 rules 文件风险低，告知用户即可 |
| **Kimi Code** | 插件的 `systemPromptPath`（最多 32 KiB） | 同一插件的"用户提问时"hook，每个会话只在第一次提问时输出。它的会话开始 hook 输出会被丢掉，不能用 | `~/.kimi-code/AGENTS.md` 里的管理区块 | 用 `/plugins install` 安装；meme 更新后要重新加载 |
| **Hermes** | 插件注册一个 meme 用户级段落 | 同一插件按当前目录注册项目级段落；两段合计必须控制在 8,000 字符以内，而且和其他插件共用这个额度 | 用户没配外部记忆提供者时，可以用 MemoryProvider 接口；动态召回可以用"每次调用模型前"的钩子 | `hermes plugins enable meme`，每个配置档都要做一次；**不写** Hermes 自己的 memories 文件和 SOUL.md |
| **OpenClaw** | 插件的"构建提示前"钩子，在系统提示最前面加用户级内容，内容要跨项目保持一字不差，才能不打破缓存 | 同一钩子按当前项目，在系统提示末尾追加项目级内容【推断：这样不会打破前面的缓存】 | 它自带的"额外启动文件"钩子，零代码的备选 | 安装插件、加进允许列表，并允许插件访问会话内容 |
| **DeepSeek Harness** | 插件注册一个系统提示段落 | 同一插件按当前目录注册另一个段落 | `~/.dsh/AGENTS.md`（但预算不够时最先被丢弃） | 用 `dsh plugin add` 安装；**要明确告诉用户：它默认会把会话日志上传给 DeepSeek**，meme 注入的内容也会一起离开本机，并提供关闭方法 |

**统一的实现方式**：
- meme 的编译产物放在 `~/.meme/compiled/<Agent>/user.md` 和 `~/.meme/compiled/<Agent>/projects/<项目标识>.md`。
- 每个 Agent 的适配层只做两件事：告诉 Agent 这两个文件在哪里；运行时根据当前目录算出项目标识，读取对应的文件。
- 有原生文件位置的几家，用户级内容由 meme 直接覆写自己的文件；项目级内容一律走插件或 hook。

### 3.3 各 Agent 的候选位置明细

#### Pi（v0.99.1）

**Pi 会加载的常驻内容**：
- **上下文文件**：先读 `~/.pi/agent` 里的一份，再从当前目录一直往上找到文件系统根目录（不会停在 git 根目录）。每个目录只取第一个命中的，顺序为 `AGENTS.override.md` > `AGENTS.md` > `CLAUDE.md`。不支持引用其他文件，没有大小上限，不需要信任确认。
- **SYSTEM.md / APPEND_SYSTEM.md**：项目里的需要信任确认；没有的话才用 `~/.pi/agent` 下的。
- **扩展往系统提示里加的段落**。

| 候选位置 | 专属吗 | 在仓库外 | 改用户文件 | 按项目区分 | 加载时机与上限 | 结论 |
|---|---|---|---|---|---|---|
| 扩展 `~/.pi/agent/extensions/meme/index.ts`，在提问前往系统提示里加段落 | 专属（OpenClaw 内嵌了 Pi 的代码，但关掉了扩展） | 是 | 否，是新文件，但属于可执行代码 | 是 | 每次提问前调用；无上限；内容不变就不会产生新的改动，对缓存友好 | **可用，两级首选** |
| `~/.pi/agent/AGENTS.md` | 专属 | 是 | 是：可能已经存在；不支持引用，只能写管理区块；新建会盖住同目录的 CLAUDE.md | 否 | 启动和 `/reload` 时 | 有条件，用户级备选 |
| `~/.pi/agent/APPEND_SYSTEM.md` | 专属 | 是 | 是：只有一个文件，而且会被受信任项目里的同名文件整个替代 | 否 | 启动时 | 有条件 |
| `~/.pi/agent/skills/meme/` | 专属 | 是 | 否 | 可以按当前目录返回不同内容 | 只常驻描述 | 只适合按需层 |
| `AGENTS.override.md`、上级目录里的 AGENTS.md / CLAUDE.md、`~/.agents/skills` | 会盖住用户文件，或者不专属 | —— | —— | —— | —— | 不可用 |

#### OpenCode（v1.18.33）

**OpenCode 会加载的常驻内容**：
- **全局**：`~/.config/opencode/AGENTS.md`，不存在时读 `~/.claude/CLAUDE.md`，只取第一个。
- **项目**：依次尝试 `AGENTS.md`、`CLAUDE.md`、`CONTEXT.md`，每个都从当前目录往上找到工作区根目录。第一个有命中的文件名胜出，它在各级上级目录里的命中全部加载。
- **配置里的 `instructions` 数组**：可以写 `~` 开头的路径、绝对路径、相对路径或网址。
- **子目录**：读到子目录的文件时，会附上那个目录的 AGENTS.md 或 CLAUDE.md。
- 没有大小上限，每一步都重新读取。
- **风险**：新版引擎只读 AGENTS.md，不读 `instructions`；它是否已在默认命令行中启用【未验证】。

| 候选位置 | 专属吗 | 在仓库外 | 改用户文件 | 按项目区分 | 加载时机与上限 | 结论 |
|---|---|---|---|---|---|---|
| 插件 `~/.config/opencode/plugins/meme.ts`，用实验性钩子往系统提示里加内容 | 专属 | 是 | 否，新文件，自动加载 | 是 | 每一步都调用；会成为第二条系统消息，Anthropic 会单独给它打缓存断点；这个钩子是实验性的，文档没写 | **可用，项目级首选，也能兼做用户级** |
| 全局配置 `opencode.json` 的 `instructions` 指向 meme 的文件 | 文件本身只有 OpenCode 读 | 是 | 是，一次性加一行 | 否：配置里没有"当前目录"变量 | 每一步都重读；无上限；进入主系统提示 | **可用，用户级首选，需要同意** |
| `~/.config/opencode/AGENTS.md` | 专属 | 是 | 是：不支持引用，只能写管理区块；**新建它会让 OpenCode 不再读 `~/.claude/CLAUDE.md`** | 否 | 每一步都读 | 有条件，备选，必须告知副作用 |
| 插件通过配置钩子往 `instructions` 里加项目文件 | 专属 | 是 | 否 | 是 | 【推断，未实测】 | 有条件 |
| MCP 服务返回的指令 | 专属 | 是 | 要在配置里加 MCP | 【推断】可以 | 连接时 | 有条件 |
| `~/.config/opencode/skills/meme/` | 专属 | 是 | 否 | 否 | 只常驻描述 | 只适合按需层 |
| `~/.claude/skills`、`~/.agents/skills`、仓库里的 AGENTS.md 和 `.opencode/` | 不专属，或在仓库里 | —— | —— | —— | —— | 不可用 |

#### Cursor（IDE 3.22.12 / cursor-agent 2026.09.28）

IDE 和命令行版用的是同一套规则加载代码，行为一致【代码】。

**Cursor 会加载的常驻内容**：
- **上级目录遍历**：从工作区根目录一直往上到 `/`，每一层加载 `.cursor/rules/` 下的规则、`AGENTS.md`，以及受第三方开关控制的 `CLAUDE.md` 和 `CLAUDE.local.md`。
- **子目录的规则**：处理到对应子目录里的文件时才生效。
- **`.cursorrules`**：旧格式，只看 git 根目录。
- **插件里的规则**。
- **User Rules** 存在云端；**Team Rules** 在管理后台配置。
- **hook 注入**：会话开始时、提交提示前。

| 候选位置 | 专属吗 | 在仓库外 | 改用户文件 | 按项目区分 | 加载时机与上限 | 结论 |
|---|---|---|---|---|---|---|
| 本地插件 `~/.cursor/plugins/local/meme/`，里面放一条始终生效的规则 | 专属 | 是 | 否，新目录。必须是真实文件，指向外部的软链接会被跳过 | 否（静态） | 插件加载时生效，IDE 要重新加载窗口；每次请求都带上；没有硬上限（建议 500 行以内）；企业版默认禁用本地插件；用户可以在设置里改它的生效方式 | **可用，用户级首选** |
| 同一插件的会话开始 hook | 专属 | 是 | 否 | 是（按工作区路径） | 新会话时触发一次；**超过 1 万字符会被丢弃**；压缩上下文后保留；命令行版可靠，恢复会话时不触发；**IDE 版存在竞态，注入可能静默丢失**，官方员工已确认在跟进 | 有条件，项目级首选 |
| 同一插件的"提交提示前"hook，只在每个对话的第一条消息时注入 | 专属 | 是 | 否 | 是 | 同步执行，没有竞态；最多 1 万字符；**文档里没写**，以后可能会变 | 有条件，IDE 兜底 |
| `~/.cursor/hooks.json` 的"打开工作区"hook，返回按项目区分的插件目录 | 专属 | 是 | 是，要合并进 JSON | 是 | 打开工作区时；IDE 里有 27–114 秒的延迟，或者根本没注册上；Linux 上 hook 不执行；命令行版可靠 | 有条件，偏向命令行版 |
| `~/.cursor/rules/meme-user.mdc` | 专属 | 是 | 否 | 否 | **只有工作区在家目录下时**才会通过上级目录遍历加载，`/mnt/c` 或 `/opt` 下的项目不会加载；改动后可能要新开会话才生效 | 有条件，备选 |
| 云端 User Rules、Team Rules | 专属 | —— | 属于账号数据，没有接口 | 否 | 服务端注入 | 不可用（只能让用户手动粘贴） |
| 全局规则里写绝对路径的匹配 | —— | —— | —— | 否：匹配的是相对工作区的路径，开头的 `/` 会被去掉 | —— | 不可用 |
| `~/AGENTS.md`、`~/CLAUDE.md`、`~/.claude/settings.json` 里的 hook 和插件、`~/.agents/skills` | 不专属 | —— | —— | —— | —— | 不可用 |

#### Gemini CLI（v0.62.0）

**Gemini CLI 会加载的常驻内容，分三层**：
1. **进系统指令**：`~/.gemini/GEMINI.md`；以及它自己按项目区分的 `~/.gemini/tmp/<项目>/memory/MEMORY.md`，这个不受信任设置限制。
2. **进第一条消息**：扩展指定的上下文文件；项目里从当前目录往上到 `.git` 的 GEMINI.md（需要信任该目录）。
3. **读到子目录时再加载**：该处的 GEMINI.md。

**其他要点**：
- 上下文文件名的配置是追加，不是替换，默认只有 GEMINI.md。
- `@` 引用的允许范围是"被引用文件所在目录往上的第一个 `.git`"，而且**不展开 `~`**，所以 `~/.gemini/GEMINI.md` 没法引用 `~/.meme/` 下的文件。
- 没有大小上限。
- v0.62 里"文件夹信任"默认是开启的；文档说默认关闭，已经过时。
- 个人免费档已于 2026-06-18 停止服务，但用 API key、Workspace、Vertex 仍然可以用。

| 候选位置 | 专属吗 | 在仓库外 | 改用户文件 | 按项目区分 | 加载时机与上限 | 结论 |
|---|---|---|---|---|---|---|
| 用 `gemini extensions link` 链接一个 meme 扩展，指定 meme 的上下文文件 | 专属。agy 只在用户手动导入 Gemini 扩展，或者首次迁移时，才会一次性转换它 | 是 | 否（链接时会写扩展目录里的元数据） | 否（静态） | 会话开始时，放在第一条消息里；无上限；不受信任设置影响；`/memory reload` 可刷新 | **可用，用户级首选** |
| 同一扩展的会话开始 hook | 专属 | 是 | 否 | 是（输入里带当前目录） | 会话开始、恢复、清空时各触发一次，作为第一轮对话内容；扩展的 hook 不受信任设置限制，而写在设置文件里的 hook 在不受信任的目录下会被禁用 | **可用，项目级首选** |
| 在 Gemini 自己的项目记忆文件里加一行 `@meme.md`，同目录放 meme 的文件 | 专属【推断】 | 是 | 是：这是 Gemini 自己的记忆文件，模型和自动记忆都会改它 | 是（项目标识由当前目录名生成，从子目录启动会得到另一个标识） | 进系统指令；无上限 | 有条件（项目级唯一的原生文件方案） |
| 设置里的 `context.includeDirectories` 加上 meme 的目录 | 专属 | 是 | 是 | 否 | 需要信任该目录；这个目录会被并入工作区，模型可以往里写 | 有条件 |
| 每个项目一个扩展，只在该项目启用 | 专属 | 是 | 否 | 是（静态） | —— | 有条件，太笨重 |
| `~/.gemini/GEMINI.md` | **agy 也读** | 是 | 是 | 否 | —— | **不可用** |
| 环境变量 `GEMINI_SYSTEM_MD` | 专属 | 可以 | 要改环境变量 | 否 | 替换整个基础系统提示 | 不可用 |

#### Antigravity CLI（agy 1.2.14，闭源，以下全部来自文档）

**agy 会加载的常驻内容**：
- **全局规则**：
  - `~/.gemini/AGENTS.md`、`~/.gemini/GEMINI.md`：不需要额外标注，始终生效；
  - `~/.gemini/config/rules/*.md`：和 Antigravity 2.0、IDE 共用；
  - `~/.gemini/antigravity-cli/rules/*.md`：命令行版专有。
  - 后两个目录里的规则必须在文件头注明生效方式：始终生效、模型自行判断、按文件匹配、手动引用四选一；缺失或写错会被静默丢弃。
- **工作区**：`AGENTS.md`、`GEMINI.md`、`.agents/AGENTS.md`、`.agents/rules/*.md`，以及旧路径 `.agent/rules`，都是按需加载。
- **引用语法**：`@[标签](路径)` 会把目标文件的内容展开进来，**支持 `~`**；`@文件名` 只改成路径引用，不展开内容。
- **上限**：单个文件 24,000 字节；全局规则和始终生效的规则共用 2 万 token，超出时最大的文件降级成一行指针。排序是固定的，照顾到提示缓存。

| 候选位置 | 专属吗 | 在仓库外 | 改用户文件 | 按项目区分 | 加载时机与上限 | 结论 |
|---|---|---|---|---|---|---|
| `~/.gemini/antigravity-cli/rules/meme.md`，设为始终生效 | 按文档只有 agy 命令行版读【未验证源码】；Gemini CLI 不读 `~/.gemini` 下的子目录 | 是 | 否 | 否（静态；可以用 `@[meme](~/.meme/…)` 把 meme 的文件内容展开进来） | 每轮都进系统提示；24 KB / 2 万 token | **可用，用户级首选** |
| 插件的"调用模型前"hook，返回要注入的内容 | 专属；如果放在 `~/.gemini/config/hooks.json`，就会和 Antigravity 2.0、IDE 共用 | 是 | 放在插件里就不用改 | 是（输入里带工作区路径） | 每次调用模型前；超时 30 秒；**注入的内容会不会留在对话历史里【未验证】** | **可用，项目级首选，需要实测** |
| meme 插件（插件清单 + 规则 + hook） | 实际安装在哪个目录，文档和更新日志说法冲突【未验证】 | 是 | 否 | 通过 hook 支持 | 同规则 | 有条件 |
| `~/.gemini/config/rules/meme.md` | agy、Antigravity 2.0、IDE 都读 | 是 | 否 | 否 | 同规则 | 有条件（能接受 Antigravity 全家共用时） |
| 用户级的"按文件匹配"规则，写项目的绝对路径 | agy | 是 | 否 | 能不能用绝对路径匹配【未验证】 | 只在处理到匹配的文件时生效 | 有条件，未验证 |
| `~/.gemini/GEMINI.md`、`~/.gemini/AGENTS.md` | Gemini CLI 也读（后者有条件） | 是 | 是 | 否 | —— | **不可用** |

#### Qwen Code（v0.24.7）

**Qwen 会加载的常驻内容**：
- **上下文文件名**：默认是 `QWEN.md` 和 `AGENTS.md`，配置了就整体替换。
- **全局**：`~/.qwen/` 下同名的文件，总是读取。
- **项目**：从当前目录往上遍历，外层在前、当前目录在后，停在 git 根目录的上一级。
- **全局规则**：`~/.qwen/rules/` 下的 `.md` 文件，总是加载。
- **项目规则**：`.qwen/rules`，只在受信任的目录加载。
- **扩展指定的上下文文件**，以及 git 根目录下的 `.qwen/QWEN.local.md`。
- **自动记忆索引**：最多 200 行或 25 KB。
- **会话开始 hook 的输出**：追加在系统提示末尾。
- **上限**：不截断。超过"上下文窗口的 15%"和"1 万 token"两者中较小的那个时，只给警告。
- 文件夹信任默认关闭，也就是默认所有目录都算受信任。

| 候选位置 | 专属吗 | 在仓库外 | 改用户文件 | 按项目区分 | 加载时机与上限 | 结论 |
|---|---|---|---|---|---|---|
| `~/.qwen/rules/meme.md`（不带路径匹配） | 专属 | 是 | 否 | 否 | 启动和刷新时加载，拼在上下文文件之后；不截断；**不支持引用**；会去掉 HTML 注释；在精简模式和安全模式下跳过；不受文件夹信任限制 | **可用，用户级首选** |
| 通过扩展安装的会话开始 hook | 专属 | 是 | 走扩展就不用改；写进设置文件就要改 | 是（输入里带当前目录） | 每次会话都触发；压缩、清空、恢复时会重新触发；追加在系统提示末尾；超时 60 秒 | **可用，项目级首选** |
| 同一扩展指定的上下文文件 | 专属 | 是 | 否（链接时要确认一次） | 按工作区安装时只认精确的当前目录 | 扩展启用后就常驻 | 可用，备选 |
| `~/.qwen/rules/` 里带路径匹配的规则 | 专属 | 是 | 否 | 否：匹配的是相对项目根目录的路径，写不了绝对路径 | 命中文件后注入一次 | 有条件（适合"按文件类型"的通用经验） |
| `~/.qwen/AGENTS.md` | 专属 | 是 | 视情况（用户可能已经有这个文件） | 否 | 启动时；前提是上下文文件名里仍然包括 AGENTS.md | 有条件，备选 |
| 在 `~/.qwen/QWEN.md` 里加一行引用 | 专属 | 是 | 是：**Qwen 自己也会往这个文件里追加记忆** | 否 | 只能引用 `~/.qwen` 目录内的文件 | 有条件 |
| 自动记忆目录 `~/.qwen/projects/<项目>/memory/` | 专属 | 是 | 是：这个目录由 Qwen 管理，索引会被它重写 | 是 | 只有索引常驻（200 行或 25 KB，每项最多 120 字符），正文按相关性召回 | 不推荐 |

#### Kimi Code（2.1.1）

**Kimi 会加载的常驻内容**：
- **AGENTS 文件链**：先读 `~/.kimi-code/AGENTS.md`；再读 `~/.agents/AGENTS.md`；然后从 git 根目录到当前目录，每一层依次读 `.kimi-code/AGENTS.md` 和 `AGENTS.md`。超过 32 KiB 只给警告，不截断；不支持引用。
- **插件的系统提示**：放在系统提示末尾。
- `SYSTEM.md` 会整个替换默认的系统提示。

| 候选位置 | 专属吗 | 在仓库外 | 改用户文件 | 按项目区分 | 加载时机与上限 | 结论 |
|---|---|---|---|---|---|---|
| meme 插件用 `systemPromptPath` 指向自己的文件；安装后会被复制到 Kimi 的插件目录 | 专属 | 是 | 否，但需要用户在界面里执行一次 `/plugins install` | 否：内容是静态的，插件只能按用户级安装 | 进程启动或 `/plugins reload` 时读取；**每项最多 32 KiB，超了整段忽略；所有插件合计最多 64 KiB**；内容会固定下来，对缓存友好；更新后要重新加载或重装 | **可用，用户级首选** |
| 同一插件的"用户提问时"hook，每个会话只在第一次提问时输出 | 专属 | 是 | 否 | 是。但输入里的当前目录是进程启动时的目录；网页版有多个工作区时，要用会话 ID 反查 | 每次提问都会触发；输出会追加进对话；上限【未验证】 | **可用，项目级首选** |
| `~/.kimi-code/AGENTS.md` | 专属 | 是 | 是：可以写管理区块，不支持引用 | 否 | 会话开始时；文件被监视，改动会在进行中的会话里产生提醒 | 可用，用户级备选 |
| 会话开始 hook | —— | —— | —— | —— | 输出会被丢弃 | 不可用 |
| `~/.agents/AGENTS.md` | 在查过的开源 Agent 里只有 Kimi 读，但它名义上是跨工具共用的位置 | 是 | 是 | 否 | —— | 不可用（语义上是共用位置） |
| `~/.kimi-code/SYSTEM.md`，或者用自定义 agent 替换默认提示 | 专属 | 是 | 是：会整个接管系统提示 | 否 | —— | 不推荐 |

#### Hermes Agent（0.21.5 = v2026.9.24）

**Hermes 会加载的常驻内容**：
- **SOUL.md**：放在系统提示的稳定部分。
- **项目上下文**：只加载一种，先命中者胜：
  1. `.hermes.md` / `HERMES.md`：从当前目录往上到 git 根目录，取最近的一个；
  2. AGENTS 文件链：从 git 根目录到当前目录，每级依次尝试 `AGENTS.override.md`、`AGENTS.md`；
  3. `CLAUDE.md`：只看当前目录；
  4. `.cursorrules` 和 `.cursor/rules/`：只看当前目录。
  
  上限是模型窗口的 6%，至少 2 万字符；超限时保留开头 70%、结尾 20%。
- **内置记忆**：`MEMORY.md`（2,200 字符）和 `USER.md`（1,375 字符）。
- **插件和记忆提供者**的内容。
- 系统提示每个会话只构建一次，之后缓存复用，压缩上下文时重新构建。

| 候选位置 | 专属吗 | 在仓库外 | 改用户文件 | 按项目区分 | 加载时机与上限 | 结论 |
|---|---|---|---|---|---|---|
| 插件 `~/.hermes/plugins/meme/`，注册用户级和项目级两个系统提示段落 | 专属 | 是 | 是：启用插件会写配置文件，每个配置档都要做一次 | 是（回调参数里有当前目录） | 每个新会话生成一次后固定，压缩时重新生成；**每段最多 4,000 字符，所有插件合计最多 8,000 字符，最多 32 段，超限的整段跳过、不截断** | **可用，两级首选** |
| MemoryProvider 接口（配置里把记忆提供者设为 meme） | 专属 | 是 | 是：这是一个排他的位置，会挤掉用户已经在用的 Honcho、Mem0 等 | 是 | 静态，每个会话一次；只在记忆工具开放时注入 | 有条件 |
| `~/.hermes/skills/meme`，并在配置里设为自动加载 | 专属 | 是 | 是（改配置） | 否 | 全文放进系统提示的稳定部分 | 有条件（只能做用户级） |
| "每次调用模型前"的钩子 | 专属 | 是 | 是（启用插件） | 是 | 每轮注入到用户消息里，不在缓存的前缀里 | 有条件（适合召回层） |
| Hermes 自己的 `USER.md`、`MEMORY.md` | 专属 | 是 | 是：Hermes 的记忆工具和后台 review 都会写，还有加锁和防篡改检查 | 否 | 会话开始时固定成快照 | 不推荐 |
| `~/.hermes/SOUL.md` | 专属 | 是 | 是：这是用户的身份文件，不支持引用 | 否 | 稳定部分的第一个位置 | 不可用（最多做一个经用户同意的管理区块） |

#### OpenClaw（2026.9.7）

**OpenClaw 会加载的常驻内容**：
- **工作区里的启动文件**：按 AGENTS、SOUL、IDENTITY、USER、BOOTSTRAP、MEMORY 的顺序注入，放在缓存边界之前。
  - 工作区默认是 `~/.openclaw/workspace`，**不是代码仓库**，但它自己会用 git 管理。
  - 每个文件最多 2 万字符，USER.md 固定最多 4,000 字符，合计最多 6 万；截断时保留开头 75%、结尾 25%。
- **当前目录的 AGENTS.md**：会话目录和工作区不同时，追加当前目录下的 AGENTS.md，不往上找。
- **记忆召回小节**：来自记忆插件。
- **项目记忆块**：最多 2,000 字符，放在缓存边界之后。
- 内嵌的 Pi 关掉了上下文文件、扩展和 skill 的加载。

| 候选位置 | 专属吗 | 在仓库外 | 改用户文件 | 按项目区分 | 加载时机与上限 | 结论 |
|---|---|---|---|---|---|---|
| 插件的"构建提示前"钩子，在系统提示最前面或最后面加内容 | 专属 | 是 | 是：要安装插件、加进允许列表，并允许插件访问会话内容 | 是（能拿到当前项目标识和工作区目录） | 每轮都执行；加在最前面的内容必须一字不差地稳定，才不会打破缓存；加在最后面的在易变部分之后【推断】；上限【未验证】 | **可用，两级首选** |
| 记忆提示补充接口 | 专属 | 是 | 是（启用插件） | 否：参数里没有当前目录，也没有项目标识 | 每次完整构建提示前调用一次，放在记忆召回小节里；子 agent 没有这一节 | 有条件（只能做用户级） |
| 它自带的"额外启动文件"钩子，引入工作区里的 `.meme/AGENTS.md` | 基本专属：其他 Agent 只有在工作区目录里运行时才会读到 | 是（要在工作区的 .gitignore 里加一行） | 是（改配置） | 否 | 计入 2 万 / 6 万的预算；子 agent 也能拿到 | 有条件（零代码的备选） |
| 启动钩子追加一个指向 `~/.meme` 的启动文件 | 专属 | 是 | 是（启用钩子） | 否 | 同上 | 有条件【推断，未实测】 |
| 工作区的 MEMORY.md 里带项目标注的条目 | 专属 | 是 | 是：默认开启的 dreaming 是主要写入者 | **原生支持** | 2 万字符；项目记忆块最多 2,000 字符 | 不推荐 meme 直接写 |
| 工作区的 AGENTS.md、SOUL.md、USER.md；或者替换它的记忆插件位置 | 专属 | 是 | 是 | 否 | 替换记忆插件会失去它的 dreaming 和记忆搜索 | 不推荐 |

#### DeepSeek Harness（0.2.0-rc.2）

**DeepSeek Harness 会加载的常驻内容**：
- **指令文件**：先读 `~/.dsh/AGENTS.md`，再从项目根目录到当前目录，每层依次读 `AGENTS.md`、`CLAUDE.md`、`AGENTS.local.md`、`CLAUDE.local.md`。在第一步执行前以用户消息的形式注入，不进系统提示。预算 64 KiB，超了先丢掉最宽泛的文件，所以 `~/.dsh/AGENTS.md` 最先被丢。
- **系统提示**：由各插件注册的段落按顺序拼接而成。

| 候选位置 | 专属吗 | 在仓库外 | 改用户文件 | 按项目区分 | 加载时机与上限 | 结论 |
|---|---|---|---|---|---|---|
| meme 插件注册系统提示段落，用 `dsh plugin add` 安装 | 专属 | 是 | 否：插件列表由 dsh 自己维护，每个配置档装一次 | 是（能拿到会话的当前目录） | 每一步都重新拼接，进入系统提示；没有硬上限；内容不变，前缀就不变；会被网页版的精简预设屏蔽 | **可用，两级首选** |
| 通过它的补丁文件加一行来挂载同一个插件 | 专属 | 是 | 是：合并一行 | 是 | 对所有配置档都生效 | 可用，需要同意 |
| `~/.dsh/AGENTS.md` | 专属 | 是 | 是：写管理区块，不支持引用 | 否 | 第一步前以用户消息注入；和项目文件共用 64 KiB 预算，**最先被丢弃**；网页版的精简预设里没有它 | 有条件，用户级备选 |
| 通过它的 Claude Code hook 桥接，挂 meme 自己的 hooks.json | 专属 | 是 | 是（加一行补丁） | 是 | 它的会话开始 hook 是异步执行的，可能赶不上第一次请求 | 有条件 |
| 每次启动时用参数传入补丁文件 | 专属 | 是 | 否 | 是 | 每次都要传，需要包装脚本 | 有条件 |

**隐私提示**：它的会话日志上传插件默认开启。使用官方 API 时会上传完整的会话日志，meme 注入的内容也会一起离开本机【推断】。

---

### 3.4 最终报告的补充与更正

第 2 路调研后来又交了一份最终报告，结论与上文一致。以下是新增的内容和更正：

**更正**
- Codex **不读** `CLAUDE.local.md`。交叉读取表里原来写的是"有条件"，已改正。
- 按项目区分的原生文件一共有四种，除了上文的三种，还有 Claude Code 的 auto memory。

**新增的坑**
- **Cursor**：
  - 插件里的规则和 `~/.cursor/rules/` 只能二选一，两边都写会重复加载。
  - Cursor 的检索功能会把 `~/.cursor` 当作代码库建索引，所以插件目录里只放编译好的文本，原始的记忆数据留在 `~/.meme`。
  - Cursor 默认还会读项目里的 `.claude/commands`；`.codex/agents`、`.grok/*` 受开关控制。
- **OpenClaw**：如果它用 Claude Code 或 Codex 作为底层来运行任务，被拉起的 Claude Code 或 Codex 会再加载一次各自的 meme 内容，同样的内容可能被注入两次，需要去重。
- **Hermes**：它会扫描项目上下文文件，内容命中威胁模式时，整个文件替换成"已屏蔽"。这只针对项目里的文件，不影响 meme 插件注册的段落。
- **Qwen**：把 Claude Code 插件转换成 Qwen 扩展时，会把 md 和 sh 文件里的 `~/.claude/` 改写成 `.qwen`。如果用户把 meme 的 Claude Code 插件装进 Qwen，里面的路径会被改掉，所以 Qwen 要单独提供适配。
- **Kimi**：插件是复制安装的，meme 更新后要重新安装，或者执行 `/plugins reload`。
- **Pi**：扩展添加的段落，名字只能用小写字母、数字、连字符和下划线，并且以字母开头。
- **DeepSeek Harness**：关闭会话日志上传的方法，是在它的补丁文件里把那个插件设为 `enabled: false`。
- **Qwen 的读文件工具**：读取工作区以外的文件时会询问；它的 docker 沙箱不挂载 `~/.meme`。

**新增的实现建议**
- **用户级和项目级放在不同的段落里，用户级放在前面**：用户级内容跨项目不变，放在稳定的前缀里；项目级放在后面。这样切换项目时不会打破前面的缓存。涉及的 Agent：Pi 的段落、OpenCode 的第二条系统消息、OpenClaw 的前置和后置内容、DeepSeek Harness 的段落顺序。

**新增的未验证项**
- OpenClaw：后置的内容落在缓存边界的哪一侧；hook 里拿到的工作区目录，指的是执行目录还是它自己的 agent 工作区。

---

## 四、交叉读取表

✅ 会读；❌ 不读；⚠️ 有条件（见括号）；❓ 未验证。Claude Code 和 Codex 两列来自单独的核查。表太宽，拆成两张，行的顺序相同。

**(a) Claude Code、Codex、Pi、OpenCode、Cursor、Gemini CLI**

| 文件 / 位置 | Claude Code | Codex | Pi | OpenCode | Cursor | Gemini CLI |
|---|---|---|---|---|---|---|
| 项目里的 `CLAUDE.md` | ✅（一直往上到根目录） | ⚠️（配置了备用文件名才读，默认不读） | ⚠️（同一目录里没有 AGENTS 系列文件时；一直到根目录） | ⚠️（整条链上都没有 AGENTS.md 时；可以用开关关闭） | ⚠️（IDE 的第三方开关默认开；命令行版总是读） | ❌ |
| `CLAUDE.local.md` | ✅ | ❌ | ❌ | ❌ | ⚠️（同 CLAUDE.md） | ❌ |
| `~/.claude/CLAUDE.md` | ✅ | ❌（只在迁移时读） | ❌ | ⚠️（自己的全局 AGENTS.md 不存在时） | ❓（代码里没有，但官方员工说过会读） | ❌ |
| `~/.claude/rules/` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `.claude/rules/` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `.claude/skills` | ✅ | ❌ | ❌ | ✅（可以关闭） | ⚠️（有开关；命令行版总是读） | ❌ |
| `~/.claude/skills` | ✅ | ❌ | ❌ | ✅ | ⚠️ | ❌ |
| `~/.claude/settings.json` 里的 hook 和已启用的 Claude Code 插件 | ✅ | 本次未查 | ❌ | ❌ | **⚠️（IDE 默认开；命令行版总是读，包括插件里的 skill、hook、MCP）** | ❌（只在执行迁移命令时） |
| 项目里的 `AGENTS.md` | ⚠️（当前目录及所有上级目录都没有 CLAUDE 系列文件时才读） | ✅ | ✅ | ✅ | ✅ | ⚠️（文件名配置里包括它时） |
| `AGENTS.override.md` | ❌ | ✅ | ✅（同一目录里优先级最高） | ❌ | ❓ | ❌ |
| 家目录作为上级目录：`~/AGENTS.md`、`~/CLAUDE.md` | ⚠️（读 `~/CLAUDE.md`；没有 CLAUDE 文件时读 `~/AGENTS.md`） | ❌ | ✅ | ⚠️（只在非 git 目录下） | ✅（`~/CLAUDE.md` 受开关控制） | ❌ |
| `~/.codex/AGENTS.md` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `~/.agents/AGENTS.md` | ❌ | ❌ | ❌ | ❌ | ❓ | ❌ |
| `~/.agents/skills` | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `.agents/skills` | ❌ | ✅ | ⚠️（需要信任） | ✅ | ✅ | ⚠️（需要信任） |
| `~/.codex/skills` | ❌ | ✅（已弃用，但仍会加载） | ❌ | ❌ | ⚠️（有开关） | ❌ |
| 项目里的 `GEMINI.md` | ❌ | ⚠️（备用文件名） | ❌ | ❌ | ❌ | ✅ |
| `~/.gemini/GEMINI.md` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `~/.gemini/AGENTS.md` | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️（文件名配置里包括它时） |
| `~/.gemini/config/rules`、`~/.gemini/antigravity-cli/rules` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `QWEN.md` | ❌ | ⚠️（备用文件名） | ❌ | ❌ | ❌ | ⚠️（文件名配置） |
| `.cursor/rules/` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `.cursorrules` | ❌ | ⚠️（备用文件名） | ❌ | ❌ | ✅（旧格式） | ❌ |
| `~/.cursor/rules` | ❌ | ❌ | ❌ | ❌ | ⚠️（只在工作区位于家目录下时） | ❌ |

**(b) agy、Qwen、Kimi、Hermes、OpenClaw、DeepSeek Harness**

| 文件 / 位置 | agy | Qwen | Kimi | Hermes | OpenClaw | DeepSeek Harness |
|---|---|---|---|---|---|---|
| 项目里的 `CLAUDE.md` | ❓ | ❌ | ❌ | ⚠️（只看当前目录，而且优先级更高的文件都不存在时） | ❌ | ✅ |
| `CLAUDE.local.md` | ❓ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `~/.claude/CLAUDE.md` | ❓ | ❌ | ❌ | ❌（代码里明确拒绝） | ❌ | ❌ |
| `~/.claude/rules/` | ❓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `.claude/rules/` | ❓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `.claude/skills` | ❓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `~/.claude/skills` | ❓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `~/.claude/settings.json` 里的 hook 和已启用的 Claude Code 插件 | ❓ | ❌（只在安装 Claude Code 插件时转换） | ❌ | ❌ | ❌ | ⚠️（显式挂上桥接才读） |
| 项目里的 `AGENTS.md` | ✅ | ✅ | ✅ | ✅（有 `.hermes.md` 时不读） | ⚠️（只读当前目录下的） | ✅ |
| `AGENTS.override.md` | ❓ | ❌ | ❌ | ✅ | ❌ | ❌ |
| 家目录作为上级目录：`~/AGENTS.md`、`~/CLAUDE.md` | ❓ | ⚠️（当前目录是家目录或非 git 目录时） | ❌ | ❌ | ❌ | ❌ |
| `~/.codex/AGENTS.md` | ❓ | ❌ | ❌ | ❌ | ⚠️（只在用 Codex 作为后端、并且配置了用户范围时，由 Codex 自己读） | ❌ |
| `~/.agents/AGENTS.md` | ❓ | ❌ | ✅ | ❌ | ❌ | ❌ |
| `~/.agents/skills` | ❓ | ✅ | ✅ | ❌（要在配置里额外添加） | ✅ | ✅ |
| `.agents/skills` | ✅ | ✅ | ✅ | ⚠️（要在受信任的项目目录里） | ✅ | ✅ |
| `~/.codex/skills` | ❓ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 项目里的 `GEMINI.md` | ✅ | ⚠️（文件名配置） | ❌ | ❌ | ❌ | ❌ |
| `~/.gemini/GEMINI.md` | **✅** | ❌ | ❌ | ❌ | ❌ | ❌ |
| `~/.gemini/AGENTS.md` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `~/.gemini/config/rules`、`~/.gemini/antigravity-cli/rules` | ✅（config 这个目录和 Antigravity 2.0、IDE 共用） | ❌ | ❌ | ❌ | ❌ | ❌ |
| `QWEN.md` | ❓ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `.cursor/rules/` | ❓ | ❌ | ❌ | ⚠️（只看当前目录，优先级最低，当作纯文本拼接） | ❌ | ❌ |
| `.cursorrules` | ❓ | ❌ | ❌ | ⚠️（同上） | ❌ | ❌ |
| `~/.cursor/rules` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**补充**：
- **Cursor 还会读**：`.claude/agents`、`~/.claude/agents`、`~/.claude/commands`、`.codex/agents`、`.grok/*`，以及 `~/.claude/settings.json` 里的权限配置。IDE 的检索功能还会把 `~/.cursor` 当作代码库建索引，`~/.claude` 和 `~/.codex` 受开关控制。
- **agy 还会读**：`.agents/AGENTS.md`、`.agents/rules/`、`.agent/rules/`，都在仓库内。
- **各家自己的目录只有自家会读**，开源的几家都已经搜索核实过；Cursor 和 agy 是否会读别家的目录没有验证。这些目录包括：`~/.pi/agent/*`、`~/.config/opencode/*`、`~/.cursor/*`、`~/.qwen/*`、`~/.kimi-code/*`、`~/.hermes/*`、`~/.openclaw/*`、`~/.dsh/*`、`~/.gemini/antigravity-cli/*`。
- **一次性导入，不算运行时读取**：
  - agy 的导入命令会转换 Gemini 扩展。如果 meme 的 Gemini 扩展被导入，就会和 meme 的 agy 规则重复，agy 的适配层需要去重；
  - Qwen 安装 Claude Code 插件时，会把脚本里的 `~/.claude/` 改写成 `.qwen`；
  - Kimi、Hermes、Claude Code 各自的"从别家导入"功能，都只在用户手动执行时才会导入。

---

## 五、各 Agent 能不能运行 `meme search` 读取 `~/.meme`

| Agent | 默认是否需要审批 | 默认沙箱 | 能否读 `~/.meme` | 免审批的配置（需要用户同意） |
|---|---|---|---|---|
| Claude Code | —— | —— | 能（见第一部分） | —— |
| Codex | —— | 只读或工作区可写 | **能读，不能写**；网络默认关闭（见 2.3 节） | —— |
| Pi | 不审批，全部以启动用户的权限运行 | 没有 | 能，网络也不受限 | 不需要 |
| OpenCode | 默认放行；只对 cd、cat、rm 这类命令检查路径，路径在工作区外时会询问 | 没有系统级沙箱 | `meme search` 不会弹审批；但用 `cat ~/.meme/…` 或它的读文件工具去读会弹 | 在权限配置里允许访问 `~/.meme/**` |
| Cursor IDE | 默认"自动审查"模式 | Linux 和 macOS 都有系统级沙箱；网络默认拒绝；默认可以读工作区以外 | 能读；**写 `~/.meme` 会被拦** | 在它的权限文件里把 `meme` 加入终端命令白名单 |
| Cursor 命令行版 | 交互式确认；加参数可以跳过 | 默认值由服务端开关决定 | 能读 | 在它的命令行配置里允许 `Shell(meme)` |
| Gemini CLI | 交互模式下 shell 要确认，**非交互模式直接拒绝** | 默认关闭；macOS 的默认沙箱可以读任意文件，docker 沙箱只挂载当前目录 | 没有沙箱时能读；它的文件工具只能访问工作区 | 在设置里允许 `run_shell_command(meme)`；**扩展自带的允许规则会被忽略** |
| agy | 执行前询问；无界面模式下默认拒绝 | 终端沙箱默认关闭；开启后只能访问工作区和临时目录，而且没有网络 | 审批后能读 | 在设置里允许 `command(meme)`；开了沙箱还要允许读取 `~/.meme` |
| Qwen Code | 自动模式，由 LLM 判断；`meme` 不在只读白名单里，结果不确定【推断】；非交互模式下没有明确允许的一律拒绝 | 默认关闭；docker 沙箱只挂载工作区和 `~/.qwen` | 能 | 在设置里允许 `Bash(meme search *)` |
| Kimi Code | 默认每次执行 shell 都询问；读文件类工具读工作区外的绝对路径不需要审批 | 没有 | 能 | 在配置里加一条允许 `Bash(meme *)` 的规则 |
| Hermes | 只有危险命令才交给一个 LLM 审查，普通命令不审批 | 本地后端，没有隔离 | 能；用 docker 或远程后端时要自己挂载或安装 meme | 不需要 |
| OpenClaw | 默认不审批 | 默认关闭；开启后用 docker、没有网络、看不到工作区 | 主会话能读；沙箱会话要配置挂载 | 不需要 |
| DeepSeek Harness | 工作区可写，其他操作要确认 | 系统级沙箱，根目录只读挂载；网络不受限；名字里带 KEY、TOKEN、SECRET、PASSWORD 的环境变量会被清除 | **能读，不需要审批**；写到工作区外会被拒绝 | meme 要从自己的配置文件读取 API key，不能依赖环境变量 |

**对 meme 的影响**：
- `meme search` 应该设计成只读 `~/.meme`，这样 Codex、Cursor、DeepSeek Harness 的沙箱都不会拦。
- 需要写回的操作（比如更新计数）放到 hook 进程或后台任务里做，因为 hook 不走工具审批。
- Kimi、Gemini CLI、agy、Cursor 命令行版这 4 家默认会弹审批，Qwen 结果不确定。安装时应该提议加一条允许 `meme` 的规则，由用户同意。

---

## 六、未验证项与风险

- **agy**：闭源，全部结论来自文档。以下几点没有验证：
  - `~/.gemini/antigravity-cli/rules/` 是不是真的只有命令行版读；
  - 插件实际安装在哪个目录；
  - hook 注入的内容会不会留在对话历史里；
  - 规则能不能用绝对路径匹配；
  - 会不会读 Claude 系列的文件（交叉读取表里那一列都是 ❓）。
- **Cursor**：
  - 会不会读 `~/.claude/CLAUDE.md`：代码里没有，但官方员工说过会读，两者矛盾；
  - IDE 里会话开始时注入丢失的 bug 仍然没修；
  - "提交提示前"注入的做法没有文档；
  - 规则的大小上限没有写明。
- **OpenCode**：
  - 用来加系统提示的钩子是实验性的，版本之间可能会变；
  - 新版引擎不读 `instructions`，是否已默认启用没有验证；
  - 关闭 Claude 兼容的环境变量，文档描述和代码实际行为不一致，以代码为准：它会同时关掉 `~/.claude/CLAUDE.md` 和项目里的 CLAUDE.md。
- **Kimi**：hook 输入里的当前目录取的是进程启动时的目录【推断】；hook 输出的大小上限没有验证。
- **Hermes**：文档说插件段落在压缩上下文时保持不变，代码实际上会重新生成。
- **OpenClaw**：
  - 在系统提示前后追加内容的大小上限没有验证；
  - 启动钩子能不能指向外部路径是推断；
  - 文档说 USER.md 不按项目过滤，代码实际上会过滤。
- **Gemini CLI**：`includeDirectories` 在启动时就加载，是按代码顺序推断的；文档里"文件夹信任默认关闭"已经过时。
- **Qwen**：git 根目录的上一级也会被扫描，是推断；docker 沙箱的额外挂载在命令行里是否生效没有验证。
