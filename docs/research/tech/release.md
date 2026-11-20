# 安装与发布：语言、打包与实测

> 日期：2026-10-08；对应第一版第 5 步"安装与发布"
> **2026-10-12 补**：第 4 节里装 skill 的部分已被 D17 取代（第一版不装 skill，`meme install` 在 `~/.meme` 以外什么都不写）；`meme forget` 已在第 ④ 步做完；打包、安装脚本和首发推迟到 plan.md"发布准备"。
> 进度：语言和发布方式已定并验证（第 1、2 节）；`meme install` / `uninstall`、skill、产品语言已定（第 4 节）；`meme forget`、兼容表、首发还没谈（第 5 节）。

---

## 1. 已定：语言和发布方式（2026-10-08，作者确认）

**用 TypeScript 写，用 Bun 打包成单文件程序；单文件为主，npm 为辅。**

| 方案 | 结论 |
|---|---|
| **A. TypeScript + Bun 单文件** | **选用**。能直接用已经验证过的 trajectory；不需要 Node，Windows 和 WSL 都能一条命令装好；Bun 自带 SQLite，启动快；Claude Code 自己的单文件也是 Bun 打包的（本机 `claude` 242 MB，里面带着 Bun 1.4.3） |
| B. TypeScript，只发 npm | 不选：没装 Node 的 Windows 用户装不了（作者的 Windows 就没有 Node） |
| C. Rust 或 Go | 不选：文件小，但用不了 trajectory，读会话要自己写或依赖竞品 txcript 的库，开发慢。Codex 是 Rust 单文件（本机 279 MB） |
| D. Python | 不选：trajectory 的 Python 接口底下还要 Node；Windows 上普遍没装 Python |

**发布**
- 先在 GitHub Releases 发各系统的单文件，配一条安装命令：Linux 和 Mac 用 curl，Windows 用 PowerShell；
- npm 包作为辅助；
- 以后再加 Homebrew、scoop、winget。

**和语言无关、换哪种语言都要自己处理的系统差异**
- 路径：Windows 是 `C:\…`，WSL 里是 `/mnt/c/…`；
- 换行符（见 [relay.md](relay.md) 第 2 节）；
- 启动 Agent：Windows 上是 `.exe` 或 `.cmd`，命令行引号规则也不同；
- SQLite 放在 `\\wsl$` 共享目录上锁不住（cc-switch 源码里专门处理过），所以数据库要放在各自系统本地，这正好符合"在哪装就在哪用"；
- 老式 Windows 命令行窗口显示中文时的编码。

---

## 2. 验证：用 Bun 打包一个"迷你 meme"

用 Bun 1.4.2（2026-09-05 发布的正式版）把一个迷你程序打包成单文件。它做三件事：用 trajectory 读本机全部 Claude Code 会话，导入 SQLite（`bun:sqlite`），搜一次"接力"。Bun 只下载到临时目录里用，没有装进系统；测完全部删除。

| 项目 | Linux 单文件（在 WSL 里跑） | Windows 单文件（从 WSL 调用 `.exe`） |
|---|---|---|
| 文件大小 | 77.6 MB | 82.2 MB（在 Linux 上交叉编译，下载 Windows 运行时用了 70 秒） |
| 只启动、马上退出 | 不到 0.01 秒 | 第一次 1.5 秒（新程序被系统检查），之后 0.16–0.2 秒（含 WSL 调用 Windows 程序的开销） |
| 读到的会话 | 16 个：WSL 的加上 `/mnt/c` 下 Windows 的 | 7 个：自动找到 `C:\Users\<用户>\.claude\projects` |
| 导入 SQLite | 2,760 条，0.36 秒 | 840 条，0.08 秒 |
| 搜一次 | 7 毫秒 | 3 毫秒 |

对照：Node 本身启动约 0.07 秒。

**结论**
- 两个系统都能跑，各系统的会话目录都能自动找到，速度够用。
- 单文件大约 80 MB，基本就是 Bun 运行时本身的大小。比 Claude Code（242 MB）和 Codex（279 MB）小得多，可以接受。

**发现的坑：在 Windows 上，刚关闭的 SQLite 文件马上删会报 `EBUSY`（文件被占用）。** `meme forget`、重建数据库、卸载时都会遇到，要稍等一下再重试。

**没测到的**
- 在真正的 Windows 终端里直接运行，包括中文显示；
- Mac 和 ARM；
- npm 那条路。

---

## 3. 待定

- 正式的 Bun 版本：先用 1.4.2，跟着正式版升级；
- `\\wsl$` 上锁不住的问题，由"数据库放在本地"规避，不用专门处理。

---

## 4. 已定：安装、skill、产品语言（2026-10-08，作者确认）

**安装**：一条命令。安装脚本先把单文件下载到 `~/.local/bin`（Windows 是 `%USERPROFILE%\.local\bin`，和 Claude Code 放的位置一样），再运行 `meme install`。

**`meme install`**
1. 找到本机的 Agent（Claude Code、Codex）。装在 WSL 里时，还会找到 `/mnt/c` 下 Windows 那边的会话来源。
2. 放 skill：
   - `~/.claude/skills/meme/`：Claude Code、OpenCode 读，Cursor 部分情况下读；
   - `~/.agents/skills/meme/`：Codex（V6 已验证）、Pi、OpenCode、Cursor、Gemini CLI 等至少 9 家读。
   - OpenCode 和 Cursor 两个目录都读，可能看到两份一样的 skill，不碍事。
3. **首次导入全部会话**，不只是最近 30 天：实测全部导入约 2 秒，而且 Claude Code 默认 30 天清理一次旧会话。
4. 规矩：
   - 只放 skill，不改用户的任何文件（CLAUDE.md、AGENTS.md、settings.json），不装 hook；
   - 已经有同名 skill 就跳过并提示，不覆盖；
   - 可以重复运行，只补缺的、更新 skill；升级 meme 就是再跑一遍安装命令；
   - 在哪装就在哪用：装在 WSL 里，只给 WSL 里的 Agent 放 skill。

**`meme uninstall`**
- 只删带 meme 标记的 skill；
- 经确认后删掉 `~/.meme`（都是从原会话转出来的副本和接力文件，原会话不动）；
- 告诉用户怎么删掉程序本身；
- Windows 上遇到"文件被占用"时自动重试。

> **2026-10-10 更新：第一版不装 skill**（作者选定，见 arch D17）。接力改为由用户通过命令选择：终端交互列表；Claude Code 里 `! meme continue` 看编号、`! meme continue <编号>` 直接放进对话；推送用 `@接力文件`。实测依据：skill 里的 `` !`命令` `` 和第一条消息里的 `@文件` 都不经过模型（Claude Code 2.1.294）；`!` 的输出默认最多 3 万字符，可调到 15 万。下面安装里放 skill 的几条、这一节 skill 的内容，留作以后需要时参考。

**skill：叫 `meme`，只有一个**（第一版不装）
- 一个 skill 里分两节：接着做另一个会话、查以前的会话。第二版的记忆功能以后也放进来。
- 描述里要写明"接的是**另一个**会话"。中文的"继续"很常用，常常只是让 Agent 接着当前的事干，要避免被误触发。
- V6 测过的那份 `meme-continue` 当底稿。

**产品语言：英文**
- 用户看得到的产品内容一律用英文：命令输出和报错、skill、接力内容里的标题和说明文字、README、发布说明、代码注释和提交信息。
- 接力内容里引用的原话保持原样，不翻译。
- **已定**：`docs/meme/` 下的设计文档和本项目下的内容用中文；meme 程序本身以英文为主（命令输出、skill、接力内容的标题和说明、代码、README），另附一份中文 README。

**`meme forget`**（作者确认）
- **双向删除**：
  - 在 Agent 里删（比如 Codex 的 `/delete`），meme 下次运行时镜像跟着删，这是第 2 步定的严格同步；
  - 用 `meme forget` 删，原会话也删，Agent 的 `/resume` 里也就看不到了。
- **删之前讲清风险**：
  - 列出要删的会话：标题、来源、时间、所有文件路径，包括子代理和大输出的目录；
  - 写明删了找不回、Agent 里也看不到了；
  - 会话最近几分钟还在写的，额外警告它可能还在运行；
  - 用户输入 `yes` 才删。
- **另外两条**（作者回复"好的"，按同意处理）：
  - Agent 在后台运行时没法确认，必须加 `--yes` 才执行；skill 里写明：只有用户明确要求、并在对话里确认过，才可以加 `--yes`；
  - 删 Codex 的会话要连 `session_index.jsonl` 里的那条一起处理，具体照 Codex 自己的 `/delete` 来，要先实测它删了什么。

> **不生成接力文件**（2026-10-10，作者定）：接力内容每次要用时现场从会话里算好，直接输出给 Agent，不落盘；去掉 `~/.meme/handoffs/`、7 天清理、`@文件`。终端推送时，新 Agent 的第一条消息让它自己先运行 `meme continue <id>`。内容控制在 2.5 万字符以内，免得 Claude Code 里 `!` 和 Bash 的输出被截断（默认上限 3 万字符）。另外，Claude Code 里 `!` 的结果会立刻发给 Agent（作者实测），所以只看列表时，meme 在列表最后加一句给 Agent 的话，让它只问用户接哪个，不要自己挑。所以下面 forget 不用再删接力文件。

**`meme forget` 要删哪些地方**（2026-10-10 补查，第 ④ 步交给开发窗口）
- **Claude Code**：没有删除命令，meme 直接删文件。按会话存的东西一共 4 处：
  - `~/.claude/projects/<项目>/<会话ID>.jsonl`：会话本身；
  - `~/.claude/projects/<项目>/<会话ID>/`：子代理的过程、太大的工具输出；
  - `~/.claude/file-history/<会话ID>/`：**改文件前的备份**（回退功能用的，里面是代码的旧版本）；
  - `~/.claude/session-env/<会话ID>/`：会话的环境信息。

  `~/.claude.json` 里没有引用会话 ID。
- **Codex**：调用 `codex delete <会话 ID>`（0.161 自带，还有 `archive`、`unarchive`、`fork`），由 Codex 自己清理它的文件和数据库。A5 会验证它是否删干净；不能用时，只提示用户在 Codex 里用 `/delete`，meme 不碰 Codex 的数据库。
- **meme 自己**：数据库里这个会话的镜像和文件记录（secure_delete）。（接力文件已经不生成了，D18）
- **安全规则**（2026-10-10 补充，第 ④ 步交给开发窗口）：
  - **当前会话直接拒绝删除**：用 `CLAUDE_CODE_SESSION_ID`、`CODEX_THREAD_ID` 认出正在运行 meme 的那个会话；
  - 最近几分钟还在写的会话，可能正在别的窗口里运行，额外警告并要求再确认一次；
  - **先删原会话，成功后再删镜像**：原会话没删掉，镜像也不动，因为镜像会照着原会话重新导入；
  - **Codex 只删本环境的会话**：WSL 里的 meme 不用 WSL 的 `codex` 去删 Windows 上的 Codex 会话，只提示用户在 Windows 那边删，WSL 里的镜像会自动跟着删；
  - 先检查 `codex delete` 能不能用（旧版没有）；不能用或执行失败时，不碰 Codex 的任何文件，只提示用户在 Codex 里用 `/delete`；
  - 风险说明里写明"将调用 `codex delete --force <id>`"（后台运行要加 `--force`；用户已在 meme 里输入 `yes`）；
  - Claude Code 的会话是普通文件，WSL 里可以直接删 `/mnt/c` 下 Windows 的会话（4 处都在 `C:\Users\<用户>\.claude` 下）。

**兼容表**：先不做，遇到问题再修（作者，2026-10-08）。目前实测过 Claude Code 2.1.274–2.1.294、Codex 0.161.0。

**名字**：产品名叫 `meme`（作者确认）。
- 作者想过组织名和域名叫 `fishai`，取"鱼的记忆"的意思。
- 查到的情况：GitHub 的 `FishAI` 是别人 2019 年注册的账号，没法建同名组织；fishai.com、.ai、.dev、.io、.cn、.org 都已被注册；npm 上不带作用域的 `fishai` 还没人用。
- 英文里 fish-ai 容易读成 fishy（可疑），也容易让人联想到 phishing（钓鱼诈骗），对一个会读会话的工具不利。
- **已定**：组织名先不定，第一版放在作者自己的 GitHub 账号下（本机 gh 登录的是 `jordonjill`），不需要域名。"鱼的记忆"可以用在介绍里，比如 "Your coding agents have goldfish memory. meme fixes that."。

## 5. 首发前要定的

| 事项 | 说明 |
|---|---|
| npm 包名 | 现在不用定，第一次往 npm 发布之前再定。不带作用域的 `meme` 已被占；用 `@xxx/meme` 要先确认 npm 上的 `xxx` 归作者所有（`@jihd` 还没确认）。命令名都叫 `meme`，和包名无关 |
| 组织名、域名 | 先不定；以后有第二个项目时再说 |
| README（英文 + 中文版）、LinuxDO 首发帖 | 首发前写 |
| Windows 安装体验（2026-10-10 补充） | 用户只输入 `meme`，不输入 `.exe`。所以 `install.ps1` 要做到：把 `meme.exe` 放到 `%USERPROFILE%\.local\bin\`（和 Claude Code 一样，不需要管理员权限）；**自动把这个目录加进用户 PATH**（作者机器上 `claude.exe` 就在这个目录，但目录不在 PATH 里，PowerShell 找不到 `claude`，只有 Git Bash 能用）；装完提示"请重新打开终端"；最后运行一次 `meme` 自检。npm、winget、scoop 都会自动处理 PATH |
| 同类工具怎么分发（2026-10-10 查） | 都是"每个系统一个单文件程序 + 几种安装渠道"：Claude Code（TypeScript，Bun 打包，本机 242 MB；官方安装脚本放到 `~/.local/bin`，另有 npm、Homebrew、WinGet）、Codex（Rust；GitHub Releases 发各系统单文件，另有官方安装脚本、npm、Homebrew）、Pi（TypeScript；GitHub 上发 6 个系统包加 `SHA256SUMS`，和 meme 的计划几乎一样）、OpenCode（TypeScript，Bun 打包；还多发 `baseline` 和 `musl` 版） |
| `baseline` 版 | Bun 默认的 x64 程序要求 CPU 支持 AVX2，太老的电脑跑不起来。OpenCode 另发了 `baseline` 版，meme 发布时也要多打一份 |
| Windows 图标和信息 | Bun 支持 `--windows-icon`、`--windows-title`、`--windows-publisher`、`--windows-version`、`--windows-description`、`--windows-copyright`。命令行工具的图标只在文件夹里看得到，可以顺手加，不急。要实测从 Linux 交叉打包时这些选项能不能生效 |
| 跨系统打包 | Bun 在一台机器上就能打出 5 种目标（Linux x64/arm64、macOS Intel/Apple 芯片、Windows x64），已在 WSL 里打出过 Windows 版。Mac 上没签名的程序可能被拦，要找一台 Mac 实测；没签名的 `.exe` 用浏览器下载时可能弹出 SmartScreen 警告 |
