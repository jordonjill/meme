# meme

[English](README.md)

把编程 Agent 的会话放在一起，换哪个 Agent 都能接着做。

meme 读取 **Claude Code** 和 **Codex** 的会话，镜像到本地的一个 SQLite 文件里，
让你在一处列出、查看、搜索它们。想在另一个 Agent（或同一个 Agent 的新会话）里接着做时，
meme 负责交接：新 Agent 运行 `meme continue <id>`，拿到一份逐字取自原会话的交接内容。

它同时照顾 **WSL 和 Windows**：WSL 里的 meme 能看到 Windows 上的会话，
Windows 上的 meme 也能看到正在运行的 WSL 发行版里的会话。

> 现状：早期版本（0.1.0）。还没有现成的安装包和安装脚本，需要从源码打包（见下文）。

## 能做什么

- **一个列表。** `meme ls` 按时间倒序列出当前项目的会话，两种 Agent、两边的平台都在；
  在终端里是一个全屏的选择列表。
- **查看和搜索。** `meme show` 把每一轮折成一行，选中哪轮展开哪轮；
  `meme search` 像 `rg` 一样搜你和 AI 说过的话。
- **换个 Agent 接着做。** `meme continue` 在会话的项目目录里启动 Claude Code 或 Codex，
  让它自己拉取交接内容：你说过的话（每句后面一行写 AI 做了什么）、最后几轮的每一步、
  改过的文件、最近的命令、最后一次测试或构建。会话本身是从别的会话接过来的，
  会带上前面那些会话里你说过的话；Agent 压缩过上下文的，会带上它自己写的摘要。
  meme 不用大模型做摘要，也不往磁盘写任何文件。
- **彻底删除。** `meme forget` 先列出要删的全部内容，确认后从 Agent 和 meme 里一起删掉。

## 从源码安装

需要 [Bun](https://bun.sh) 1.4.2 或更新的版本。

```sh
git clone <本仓库> meme && cd meme
bun install
bun scripts/build.ts linux-x64      # 或：linux-arm64、darwin-x64、darwin-arm64、windows-x64
```

`bun scripts/build.ts` 不带参数时打出全部 5 个版本，并写出 `dist/SHA256SUMS`。
每个版本都是一个 60–90 MB 左右的单文件，不需要再装别的。把它放到 PATH 上，
命名为 `meme`（Windows 上是 `meme.exe`），例如：

```sh
mkdir -p ~/.local/bin && cp dist/meme-linux-x64 ~/.local/bin/meme
```

然后运行：

```sh
meme install     # 找到 Agent，把全部会话镜像一遍
```

`meme install` 不改 `~/.meme` 以外的任何东西：不装 skill，不改 `CLAUDE.md` 或
`AGENTS.md`，不改设置，不加 hook。`meme install --dry-run` 只显示它会做什么。

Linux x64 和 Windows x64 两个版本实测过；macOS 和 Linux arm64 的版本还没在真机上跑过。

## 接着做一个会话

**在终端里**

```sh
meme continue          # 先选会话，再选 Agent
meme continue 2        # 也可以直接指定：列表里的编号、id、last、codex、win、标题里的词
meme continue last --in codex
```

meme 在会话的项目目录里启动 Agent，第一条消息让它运行 `meme continue <id>`；
Agent 读完交接内容，总结进度，然后等你确认再动手。

**在 Agent 里**

```
! meme continue        看编号列表
! meme continue 2      交接第 2 个
```

- 在 **Claude Code** 里，你选好以后，Agent 会自己运行这条命令。
- 在 **Codex** 里，`!` 命令的输出只显示给你，不会交给模型，所以运行后要再说一句"继续"。

选项：`-a` 列出所有项目；`--fresh` 只交接你说过的话，从仓库现状重新开始，
不沿用上一个 Agent 的做法；`--plain` 只打印交接内容，不启动 Agent。

交接内容控制在 25,000 个字符（约 15,000 token）以内，在 Codex 里是 36,000 字节以内，
保证一次命令输出就能完整读到。会话太长时，依次删减：先删每句后面那一行（从最早的删起），
再删 Agent 的压缩摘要，再截短最后几轮里 AI 说的话，最后才省掉中间的消息。
交接内容会写明省掉了什么，用 `meme show` 或 `meme search --session` 能找回来。

## 命令

| 命令 | 作用 |
|---|---|
| `meme ls [-a]` | 列出会话：默认当前项目，`-a` 列出全部项目（当前项目没有会话时也会列出全部）。 |
| `meme show <id> [<轮次>]` | 查看会话，每轮一行；给出轮次时完整显示那一轮。 |
| `meme search <模式>` | 像 `rg` 一样搜说过的话（`-F`、`-i`、`-C`）；`--all` 连工具调用和输出里的匹配也列出。 |
| `meme continue [<目标>]` | 把会话交接给一个新的 Agent 会话。 |
| `meme forget [<id>...]` | 从 Agent 和 meme 里彻底删除会话。 |
| `meme status` | 版本、数据位置、会话来源，以及 Agent 升级后 meme 读不了的东西（读不了的会话、不认识的记录类型和 Agent 的版本）。报问题时请附上。 |
| `meme install` / `uninstall` | 把会话全部镜像一遍 / 删除 meme 的数据。 |

会话 id 可以只写开头几位，只要不重复，一般是 8 位；两个会话开头相同时，meme 会多显示几位。
`meme <命令> --help` 列出全部选项。

### 全屏列表

在终端里，`meme ls`、`meme continue`、`meme forget` 打开的是同一个列表：

- `↑` `↓` 选择，`Enter` 打开（或选中），`空格` 预览，`Esc` 退出
- 直接打字搜索标题、项目、分支和 id（搜说过的话用 `meme search`）
- `←` `→` 按平台（WSL、Win）或 Agent（Claude、Codex）筛选，`Tab` 在这两行之间切换；
  平台选全部时，会话按平台分组
- `Ctrl+A` 在当前项目和全部项目之间切换

不在终端里，或者在 Agent 里运行时，每条命令都改为输出纯文字。

### 搜索

`meme search` 默认只搜当前项目。当前项目没有会话时，自动搜全部项目并注明；
别的项目也有匹配时，会告诉你有多少（加 `-a` 列出来）。

### 删除

`meme forget` 列出要删的每一个文件，然后问 `[y/N]`，只按回车不会删除。
它不会删正在运行它的那个会话；最近几分钟还在写的会话会再确认一次。

- **Claude Code**：会话文件和它的几个文件夹（子代理和大段工具输出、`file-history`、`session-env`）。
- **Codex**：meme 用会话所在那一边的 codex 运行 `codex delete --force <id>`，
  自己从不改 Codex 的文件。会话还有分叉时 Codex 不让删；把分叉一起写上，meme 会先删分叉。
  Codex 自己的输入历史（`~/.codex/history.jsonl`）里还会留着你输入过的话。

在 Agent 里删除必须加 `--yes`，而且只能在你明确要求删除时加。

## WSL 和 Windows

- **WSL 里的 meme** 通过 `/mnt/c` 读 Windows 上的会话，标为 `Claude·Win` / `Codex·Win`。
  接着做这样的会话时，Agent 在 WSL 里、项目的 `/mnt/c/...` 路径下启动。
- **Windows 上的 meme** 通过 `\\wsl.localhost` 读正在运行的 WSL 发行版里的会话，
  标为 `Claude·WSL` / `Codex·WSL`。它不会去启动停着的发行版：那些会话显示上次同步时的样子，
  列表顶部会注明。接着做 WSL 的会话时，Agent 在 WSL 里启动，所以 WSL 里也要装 meme 和对应的 Agent。
- 两边各有各的镜像，互不相干。
- 在 Windows PowerShell 5.1 里，把输出接到管道上（`meme ls | ...`）时，PowerShell
  按控制台代码页解码，中文会乱码。先运行 `[Console]::OutputEncoding = [Text.Encoding]::UTF8` 即可。
  直接显示在窗口里没有问题。

## 你的数据

- 一切都留在你自己的电脑上，meme 不发任何网络请求。
- 镜像是 `~/.meme/meme.sqlite`（Windows 上在 `%USERPROFILE%\.meme`），日志在它旁边；
  设置 `MEME_HOME` 可以换位置。删除的记录会被覆盖（`secure_delete`）。
- meme 只读 Agent 的文件（`~/.claude` 或 `CLAUDE_CONFIG_DIR`；`~/.codex` 或 `CODEX_HOME`），
  唯一的例外是 `meme forget`。它从不写 Codex 的数据库。
- 存进镜像之前，格式明确的密钥会被替换成 `[REDACTED:类型]`：Anthropic 和 OpenAI 的 API key、
  GitHub token、AWS key id、私钥、Bearer token，以及 URL 里或 `password=` 后面的密码。
- 在 Agent 里删掉的会话，下次运行 meme 时会从镜像里消失。`meme uninstall` 删除 `~/.meme`，
  原来的会话不受影响。

## 开发

```sh
bun test                                   # 单元测试和端到端测试
bun run typecheck
bun scripts/build.ts                       # 5 个版本都打到 dist/
MEME_BIN=dist/meme-linux-x64 bun test test/e2e   # 用打包好的单文件跑端到端测试
```

测试数据都是编造的，从不提交真实的会话。测试用的环境变量：`MEME_HOME`（数据目录）、
`MEME_ENV`（强制为 `win`、`wsl`、`mac` 或 `linux`）、`MEME_WINDOWS_USERS_DIR`
（WSL 在哪里找 Windows 的用户目录）、`MEME_WSL_DIR`、`MEME_WSL_RUNNING` 和 `MEME_WSL_EXE`
（从 Windows 看到的 WSL）。
