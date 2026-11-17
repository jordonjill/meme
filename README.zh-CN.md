# meme

[English](README.md)

把编程 Agent 的会话放在一起，换哪个 Agent 都能接着做。

meme 读取 **Claude Code**、**Codex**、**OpenCode**（1.x）和 **Pi** 的会话，镜像到本地的一个 SQLite 文件里，
让你在一处列出、查看、搜索它们。想在另一个 Agent（或同一个 Agent 的新会话）里接着做时，
meme 负责交接：新 Agent 运行 `meme continue <id>`，拿到一份逐字取自原会话的交接内容。

它还有一份各家 Agent 共用的**记忆**：你告诉它的约定和事实，Agent 替你记下的内容，
以及你选的模型从会话里读出来的东西。每一条都指向它依据的原话。

它同时照顾 **WSL 和 Windows**：WSL 里的 meme 能看到 Windows 上的会话，
Windows 上的 meme 也能看到正在运行的 WSL 发行版里的会话；记忆两边共用一份。

> 现状：早期版本。记忆是新功能，还没怎么在真的 Agent 和模型上用过。

## 能做什么

- **一个列表。** `meme ls` 按时间倒序列出当前项目的会话，两种 Agent、两边的平台都在；
  在终端里是一个全屏的选择列表。
- **查看和搜索。** `meme show` 把每一轮折成一行，选中哪轮展开哪轮；
  `meme search` 像 `rg` 一样搜你和 AI 说过的话。
- **换个 Agent 接着做。** `meme continue` 在会话开始的目录里启动 Claude Code、Codex、OpenCode 或 Pi，
  让它自己拉取交接内容：你说过的话（每句后面一行写 AI 做了什么）、最后几轮的每一步、
  改过的文件、最近的命令、最后一次测试或构建。会话本身是从别的会话接过来的，
  会带上前面那些会话里你说过的话；Agent 压缩过上下文的，会带上它自己写的摘要。
  meme 不用大模型做摘要，也不往磁盘写任何文件。
- **彻底删除。** `meme forget` 先列出要删的全部内容，确认后从 Agent 和 meme 里一起删掉。
- **记住。** 一份各家 Agent 共用的记忆：`meme remember` 用你自己的话记下一条约定或事实，
  Agent 也可以替你记；配了模型以后，meme 会从你的会话里读出值得留下的内容。
  `meme context` 把对当前位置成立的内容和这里没做完的任务交给 Agent。见[记忆](#记忆)。

## 安装

Linux、WSL 或 macOS：

```sh
curl -fsSL https://github.com/jordonjill/meme/releases/latest/download/install.sh | sh
```

Windows，在 PowerShell 里：

```powershell
irm https://github.com/jordonjill/meme/releases/latest/download/install.ps1 | iex
```

（meme 第一次正式发布以后可用。）安装脚本按你的系统和 CPU 挑单文件，用 Release 里的
`SHA256SUMS` 核对，放进 `~/.local/bin`（Windows 是 `%USERPROFILE%\.local\bin`），
这个目录不在 PATH 上就加进去，最后运行 `meme install`：找到 Agent，把全部会话镜像一遍。
`MEME_VERSION=v0.1.0` 装指定的版本；`MEME_NO_MODIFY_PATH=1` 不改 PATH。WSL 和 Windows
两边的 Agent 里都要用 `! meme continue` 时，两边都要有 meme：`meme install` 发现另一边有 Agent 而没有 meme，
会问你要不要用那一边的安装脚本把同一个版本也装上。它只在终端里问，问了才装；别的情况下只显示在那边要运行的命令。

`meme install` 不改 `~/.meme` 以外的任何东西：不装 skill，不改 `CLAUDE.md` 或
`AGENTS.md`，不改设置，不加 hook。`meme install --dry-run` 只显示它会做什么。

### 从源码安装

需要 [Bun](https://bun.sh) 1.4.2 或更新的版本。

```sh
git clone https://github.com/jordonjill/meme && cd meme
bun install
bun scripts/build.ts linux-x64      # 或下面别的目标
```

目标有 `linux-x64`、`linux-arm64`、`darwin-x64`、`darwin-arm64`、`windows-x64`，以及给不支持
AVX2 的 x64 CPU 用的 `linux-x64-baseline`、`darwin-x64-baseline`、`windows-x64-baseline`。
不带参数时打出全部 8 个，并写出 `dist/SHA256SUMS`。每个都是一个 60–90 MB 左右的单文件，
不需要再装别的。`MEME_FROM=dist sh install.sh`（或先 `$env:MEME_FROM = 'dist'` 再运行
`install.ps1`）像从 Release 一样从 `dist` 安装。

每次发布前，每个单文件都在 GitHub Actions 上它自己那种机器里跑测试：Linux x64 和 arm64、
Intel 和 Apple 芯片的 macOS、Windows。

## 接着做一个会话

记住三件事：

1. **范围是一台机器。** Windows 和 WSL 算同一台，互相看得到会话。另一台电脑、SSH 服务器上的会话
   暂不支持，请在会话所在的机器上接。
2. **在哪用 Agent，就在哪装 meme。** Agent 里的 `! meme continue` 用的是 Agent 所在系统里的 meme。
   只用 Windows 就装 Windows；只用 WSL 就装 WSL（也看得到 Windows 的会话）；两边都用就两边都装，
   在一边删了会话，另一边下次运行时自动跟上。
3. **默认在会话的项目里接。** 在项目里打开新 Agent，运行 `! meme continue`；或者在终端里运行
   `meme continue` 选会话，meme 会在会话的目录里打开 Agent。在别的项目里接也行，交接内容开头会提醒，
   Agent 会先问你在哪做。

**在终端里**

```sh
meme continue          # 先选会话，再选 Agent
meme continue 2        # 也可以直接指定：列表里的编号、id、last、codex、win、标题里的词
meme continue last --in codex
```

meme 在会话原来的目录里打开 Agent，第一条消息让它运行 `meme continue <id>`；
Agent 读完交接内容，总结进度，然后等你确认再动手。

**在 Agent 里**

```
! meme continue        看编号列表
! meme continue 2      交接第 2 个
```

- 在 **Claude Code** 里，你选好以后，Agent 会自己运行这条命令。
- 在 **Codex** 里，`!` 命令的输出只显示给你，不会交给模型，所以运行后要再说一句"继续"。
- 在 **OpenCode** 和 **Pi** 里，和 Claude Code 一样。（OpenCode 里敲 `!` 会切到 shell 模式，这一行后面的就是命令。）

**我想……**

| 我想 | 怎么做 |
|---|---|
| 同一个项目换一家 Agent | 在项目里打开新 Agent，`! meme continue` |
| 找不到会话 | `meme ls -a`，或者在列表里按 Ctrl+A |
| 接另一个项目的会话 | 终端里 `meme continue -a` 选它，meme 在那个会话开始的目录里打开 Agent |
| Windows 上的项目到 WSL 里接 | WSL 终端里 `meme continue` 选它，Agent 在 `/mnt/c/…` 下打开 |
| WSL 里的项目在 Windows 上接 | 建议回 WSL；在 PowerShell 里 `meme continue` 选它，meme 会在 WSL 里打开 Agent（WSL 里要装 meme） |
| 另一台电脑、服务器上的会话 | 暂不支持，到那台机器上接 |

**看到这些提醒怎么办**

| 提醒 | 怎么办 |
|---|---|
| Agent 说"你不在这个会话的仓库里" | 告诉 Agent 在哪做；或者在终端里 `meme continue` 选它，meme 会在对的目录打开 Agent |
| "the repository is inside WSL…" | 回 WSL 接 |
| "meme is not installed in WSL…" | 在 WSL 里也装一份 |
| "WSL (Ubuntu) is not running…" | 列表里 WSL 的会话是上次看到的样子，启动 WSL 后会更新 |
| "run git with `-c core.autocrlf=true …`" | 照做 |

选项：`-a` 列出所有项目；`--fresh` 只交接你说过的话，从仓库现状重新开始，
不沿用上一个 Agent 的做法；`--plain` 只打印交接内容，不启动 Agent。

在 Pi 里用 `!!` 运行的命令，Pi 不给它的模型看，交接里也不给：只写那里运行过一条这样的命令。`meme show` 和 `meme search` 里照样有。

交接内容不超过 15,000 token，也不超过所在 Agent 对命令输出的上限，保证完整读到：
在 Claude Code 里是 27,000 字节（更长的输出会被它存成文件），在 Codex 里是 36,000 字节，在 OpenCode 和 Pi 里是 46,080 字节、1,800 行（这两家对更长的输出只留结尾），认不出是哪家（接到管道，或在 Agent 外用 `--plain`）时取最紧的；在 Agent 里用 `--plain`，守的是那家的上限。
会话太长时，依次删减：每句后面那一行（从最早的删起）、Agent 的压缩摘要（先截到 1,000 token，再去掉）、
最后几轮中间的步骤、最后几轮里 AI 说的话、最早改的文件、最后一次测试或构建的输出、最近的命令、
最后几轮里重复的用户原话（改成指向上面那一条）、最后几轮剩下的步骤，最后才省掉中间的消息。
还超的话，在整行处截断并写明。交接内容会写明省掉了什么，用 `meme show` 或 `meme search --session` 能找回来。

## 记忆

meme 有一份各家 Agent 共用的记忆：你对其中一个说过的话，在别的 Agent 里同样算数。里面有三种东西：

- **事实**：你对 Agent 的约定，关于你和你的电脑的事实，关于某个项目的事实。
- **经验**：从事情的结果里学到的做法，以及它什么时候适用。
- **没做完的任务**：一个项目里被你打断、或者停在一步中间的会话。这一种不存任何东西，每次从会话里现算。

记忆是新功能，还没怎么在真的 Agent 和模型上用过。

### 告诉它

```sh
meme remember "回复用中文；仓库里的东西全部用英文"
meme remember --project "跑测试前要先启动数据库"
meme remember --about-me "我在 WSL 和 Windows 上开发"
```

不加选项，记成你对所有 Agent 的约定；`--project` 记成当前目录所在项目的事实；`--about-me` 记成关于你的事实。
同一句话再说一遍，不会多出一条。配了模型（见下文）时，由模型来措辞、决定放在哪里（选项只算提示）、
判断是不是和已有的重复或取代了哪一条；你的原话留作证据。没配模型时，原话原样存下，什么都不发出去。

- `meme memory` 按文件列出记住的内容。
- `meme memory show <id>` 显示一条记忆依据的原话，以及是什么时候说的。
- `meme memory forget <id>` 确认后彻底删除一条：这一条本身、只属于它的证据、meme 自己备份里的文字，都删掉。
  留下的只有一个哈希值，这样同一句话不会从会话里被重新学回来；你自己再说一遍，它就回来了。

记忆是你能直接读的 Markdown 文件：条目在 `~/.meme/memory`（`RULES.md`、`USER.md`、`EXPERIENCE.md`，
每个项目各有一份 `MEMORY.md` 和 `EXPERIENCE.md`），证据在 `~/.meme/evidence`，每天一个文件。
和镜像一样，密钥在写进去之前就被遮掉了。

### 交给你的 Agent

`meme context` 输出记忆里对当前目录成立的内容：你的约定、关于你和这个项目的事实、这里没做完的任务；
用几个词说出这次要做的事（`meme context "给登录接口加限流"`），还会带上相关的条目。
输出的开头写明它是参考资料，不是指令。在 Agent 里输入 `! meme context`，就把它放进对话。
想让 Agent 自己拿到它，有两种办法：

- **MCP。** `meme mcp` 通过 Model Context Protocol 把记忆交给 Agent。
  用那家 Agent 自己的命令接一次就行（`meme mcp --help` 列出了各家的命令）：

  ```sh
  claude mcp add -s user meme -- meme mcp
  codex mcp add meme -- meme mcp
  ```

  接上以后，Agent 有四个工具：`context`、`recall`（查一件事）、`explain`（一条记忆是从哪来的）和 `remember`。
- **Claude Code 的插件。** `meme plugin` 把插件写进 `~/.meme/plugins/claude-code`，并显示安装它的两条命令。
  装上以后，Claude Code 每次开始会话都会拿到 `meme context` 的内容，同时有上面那四个工具。

meme 自己不改任何 Agent 的文件，这些命令都由你来运行。

Agent 用 `remember` 替你记东西时，只把你的原话交上来，记忆不由它来写。meme 到你的会话里找这句话，
找不到就拒绝。找到了，由 meme 自己来写：配了模型，就把你那条消息和前后几条交给模型，
按和下面同一套规则写出来；没配模型，就用你的原话。这一条指向你说这句话的那条消息。
Agent 改不了你亲口说过的内容，也带不回你已经忘掉的内容。

### 让模型读你的会话

先配一次模型。任何支持 OpenAI 对话格式的服务都可以；模型在你自己的电脑上，内容就不出本机：

```sh
meme model set          # 一步步问地址、模型名和 key，先试一次，通了才保存
meme model              # 现在用的是哪个模型（key 只显示后 4 位）
meme memory exclude .   # 这个项目的会话永远不发出去
```

key 在提示时输入，屏幕上不显示，也从不写在命令行上；也可以用 `meme model set --key-env <变量名>`，
让 meme 从环境变量里取。配好以后，meme 会去读已经静下来的会话，把值得留下的记下来：

```sh
meme memory update --dry-run    # 会读哪些、会发出去什么；什么都不发
meme memory update
```

- **这会把那些会话的文本发给这个模型**，发之前缩短过、遮掉了密钥，除此之外不发到任何地方。
  没配模型就什么都不发；模型在你自己的电脑上，内容就不出本机。
  被排除的项目，会话从不发送，在那里让 meme 记住的东西也只存你的原话。
- 记什么、怎么措辞，由模型判断。meme 只在一种情况下才留下一条：模型引的原话确实在这段会话里。
  你说的话、工具输出的内容，立即生效；只有 AI 自己说过的，先当候选。
- 会话静下来 2 小时以后才读；后来又接着聊的，只读新的部分。
  结束超过 14 天、又从没读过的会话不会去读，除非加 `--all`；`--session <id>` 只读指定的一个。
- 模型和排除的项目都存在 `~/.meme/config.json` 里。也可以用环境变量 `MEME_MODEL_URL`、
  `MEME_MODEL_NAME`、`MEME_MODEL_KEY` 来设置模型，环境变量优先。

## 命令

| 命令 | 作用 |
|---|---|
| `meme ls [-a]` | 列出会话：默认当前项目，`-a` 列出全部项目（当前项目没有会话时也会列出全部）。 |
| `meme show <id> [<轮次>]` | 查看会话，每轮一行；给出轮次时展开那一轮（加 `--full` 什么都不截）。`--hidden` 连注入的消息和推理一起显示。 |
| `meme search <模式>` | 像 `rg` 一样搜说过的话（`-F`、`-i`、`-C`；`-a` 搜全部项目）；`--tools` 连工具调用和输出里的匹配也列出。 |
| `meme continue [<目标>]` | 把会话交接给一个新的 Agent 会话。 |
| `meme forget [<id>...]` | 从 Agent 和 meme 里彻底删除会话（`-a`：从全部项目里选）。 |
| `meme remember "<话>"` | 用你自己的话记下一条约定或事实（`--project`、`--about-me`）。 |
| `meme memory` | 列出记住的内容。`show <id>` 追到一条记忆依据的原话，`forget <id>` 彻底删除，`update` 用模型读静下来的会话（`--dry-run` 什么都不发），`exclude` 列出或修改永远不发给模型的项目。 |
| `meme context [<要做的事>]` | 记忆里对当前目录成立的内容，给 Agent 在开始之前读。 |
| `meme recall <词>` | 在记忆里找一件事（`--all`：别的项目也找）。 |
| `meme mcp` | 通过 MCP 把记忆交给 Agent；`--help` 列出各家 Agent 怎么接。 |
| `meme plugin [<agent>]` | 生成 meme 给某家 Agent 的插件（现在有 Claude Code 的），并显示怎么安装。 |
| `meme model` | meme 用的模型：查看，`set` 设置（输入 key 时不显示），`test` 试一次，`remove` 删掉。 |
| `meme status` | 版本、数据位置、记忆在哪、会话来源，以及 Agent 升级后 meme 读不了的东西（读不了的会话、不认识的记录类型和 Agent 的版本）。 |
| `meme install` / `uninstall` | 把会话全部镜像一遍 / 删除 meme 的数据。 |
| `meme report` | 出了问题时贴进 issue 的报告：版本、`status`、最近的错误；不含对话内容，家目录、用户名、项目路径都遮掉了。`--session <id>` 再加上那个会话的结构。贴之前请看一遍。 |

会话 id 可以只写开头几位，只要不重复，一般是 8 位；两个会话开头相同时，meme 会多显示几位。
`meme <命令> --help` 列出全部选项。

### 全屏列表

在终端里，`meme ls`、`meme continue`、`meme forget` 打开的是同一个列表：

- `↑` `↓` 选择，`Enter` 打开（或选中），`空格` 预览，`Esc` 退出
- 直接打字搜索标题、项目、分支和 id（搜说过的话用 `meme search`）
- `←` `→` 按平台（WSL、Win）或 Agent（Claude、Codex、OpenCode、Pi）筛选，`Tab` 在这两行之间切换；
  平台选全部时，会话按平台分组
- `Ctrl+A` 在当前项目和全部项目之间切换

不在终端里，或者在 Agent 里运行时，每条命令都改为输出纯文字。

### 搜索

`meme search` 默认只搜当前项目。当前项目没有会话时，自动搜全部项目并注明；
别的项目也有匹配时，会告诉你有多少（加 `-a` 列出来）。

### 删除

`meme forget` 列出要删的每一个文件，然后问 `[y/N]`，只按回车不会删除。
它不会删正在运行它的那个会话，也不会删在 Claude Code 或 Codex 里开着的会话（meme 会查开着它的那个进程）。OpenCode 和 Pi 不说自己开着哪个会话：它们中哪个正在某个目录里运行，那个目录的会话 meme 都不删；那里没有它们的进程，就马上能删。判断不了的时候（老版本的 Agent、Windows 上 Codex 的锁、进程在 WSL 和 Windows 的另一边、OpenCode 或 Pi 在 meme 看不到的目录里运行），最近 5 分钟写过的会话不删；停在一条可能还在跑的命令上的，最近一小时写过就不删；并说明几点以后能删（"you can delete it after 17:21"）。

- **Claude Code**：会话文件和它的几个文件夹（子代理和大段工具输出、`file-history`、`session-env`，以及 `jobs/` 下这个会话的后台任务）。
  Claude Code 自己的输入历史（`~/.claude/history.jsonl`）里还会留着你输入过的话。
- **Codex**：meme 用会话所在那一边的 codex 运行 `codex delete --force <id>`，
  自己从不改 Codex 的文件。会话还有分叉时 Codex 不让删；把分叉一起写上，meme 会先删分叉。
  Codex 自己的输入历史（`~/.codex/history.jsonl`）里还会留着你输入过的话。
- **OpenCode**：meme 用会话所在那一边的 opencode 运行 `opencode session delete <id>`，并删掉 OpenCode 为这个会话存的长输出全文（`tool-output/`）。
  OpenCode 自己的输入历史（`~/.local/state/opencode/prompt-history.jsonl`）里还会留着你输入过的话。
- **Pi**：Pi 没有删除命令（它的 `/resume` 列表删的也是文件），所以由 meme 删掉会话文件，以及 Pi 为它存在临时目录里的长输出全文。

在 Agent 里删除必须加 `--yes`，而且只能在你明确要求删除时加。

## WSL 和 Windows

- **WSL 里的 meme** 看得到 Windows 上的会话，标为 `Claude·Win`、`Codex·Win` 等。接着做这样的会话时，
  Agent 在 WSL 里、会话目录对应的 `/mnt/c/…` 下打开（`/etc/wsl.conf` 改了挂载位置的，按它来）。
- **Windows 上的 meme** 看得到正在运行的 WSL 发行版里的会话，标为 `Claude·WSL`、`Codex·WSL` 等。
  列出、查看、搜索和拉取交接都不会启动停着的发行版：那些会话显示上次看到的样子，列表顶部会注明；
  在终端里接着做、或者删除它的会话，会启动它。接着做 WSL 的会话时，
  Agent 在 WSL 里打开，所以 WSL 里也要装 meme 和对应的 Agent。
- Claude 桌面版在 WSL 里运行 Claude Code，并在 Windows 的 `.claude\projects\ssh-<id>` 里给每个这样的会话留一份拷贝。
  meme 读 WSL 里的原件，跳过这些拷贝；`meme forget` 删会话时把这份拷贝一起删掉。其他在两处都有的会话（比如把家目录拷到了另一边）只列一次，
  用最后写过的那一份；`meme status` 会说有几个，`meme forget` 会把每一份都删掉。
- **记忆只有一份，放在 Windows 这一侧。** WSL 里的 meme 把记忆放在 Windows 的用户目录里（`C:\Users\<你>\.meme`），
  两边的 Agent 用的是同一份；WSL 的 `~/.meme/store` 是指向那个文件夹的链接，`meme status` 会显示记忆在哪。
  会话镜像仍然各在各的一边。设了 `MEME_HOME` 的话，记忆就放在那个文件夹里。
- 在 Windows PowerShell 5.1 里，把输出接到管道上（`meme ls | ...`）时，PowerShell
  按控制台代码页解码，中文会乱码。先运行 `[Console]::OutputEncoding = [Text.Encoding]::UTF8` 即可。
  直接显示在窗口里没有问题。

## 你的数据

- 一切都留在你自己的电脑上，meme 不发任何网络请求。只有两个例外，都是你自己发起的：
  `meme memory update` 把它读的会话文本发给你配置的模型，而且只发到那里（见[记忆](#记忆)）；
  `meme install` 问要不要在 WSL 和 Windows 的另一边也装上时，你回答了 y，它就运行那一边的安装脚本，脚本会下载 meme。
- 镜像是 `~/.meme/raw/sessions.sqlite`（Windows 上在 `%USERPROFILE%\.meme` 里），日志在 `~/.meme/logs`；
  设置 `MEME_HOME` 可以换这个文件夹的位置。删除的记录会被覆盖（`secure_delete`）。
- 记忆在 `~/.meme/memory` 和 `~/.meme/evidence`，维护它要用的东西在 `~/.meme/state`；在 WSL 里，这些都在 Windows 用户目录的 `.meme` 里（见上）。
  `~/.meme/config.json` 里模型的 key 是明文，只有你自己能读；用 `meme model set --key-env <变量名>` 设置的话，key 不写进文件。
  `meme uninstall` 不删记忆；要删的话，自己删掉这几个文件夹。
- meme 只读 Agent 的文件（`~/.claude` 或 `CLAUDE_CONFIG_DIR`；`~/.codex` 或 `CODEX_HOME`；
  `~/.local/share/opencode/opencode.db` 或 `OPENCODE_DB`；`~/.pi/agent/sessions` 或 `PI_CODING_AGENT_DIR`），
  唯一的例外是 `meme forget`。它从不写 Agent 的数据库（Codex 的、OpenCode 的）；OpenCode 的库以只读方式打开，跨 WSL 和 Windows 时读的是副本，放在 `~/.meme/cache` 里，`meme uninstall` 会删掉它，`meme forget` 删了会话也会一并删掉它。
- 还不支持 OpenCode 2.0（`@opencode/cli`）：它把会话用新格式存在同一个库里，`meme status` 会报这些会话没读出来。
- 存进镜像之前，格式明确的密钥会被替换成 `[REDACTED:类型]`：Anthropic 和 OpenAI 的 API key，
  GitHub、GitLab、Slack、npm、Stripe、Hugging Face 的 token，Google API key，AWS 的 key id 和 secret key，
  私钥、JWT、Bearer token 和 Basic 认证，以及 URL 里或 `password=` 后面的密码。看不出格式的值
  （`API_KEY=` 后面的一串十六进制）不遮：它们和哈希值长得一样。
- 在 Agent 里删掉的会话，下次运行 meme 时会从镜像里消失。`meme uninstall` 删除 `~/.meme` 里 meme 自己的文件，
  文件夹里没有别的东西就把文件夹也删掉；原来的会话不受影响。

## 开发

```sh
bun test                                   # 单元测试和端到端测试
bun run typecheck
bun scripts/build.ts                       # 5 个版本都打到 dist/
MEME_BIN=dist/meme-linux-x64 bun test test/e2e   # 用打包好的单文件跑端到端测试
```

测试数据都是编造的，从不提交真实的会话。测试用的环境变量：`MEME_HOME`（数据目录）、
`MEME_ENV`（强制为 `win`、`wsl`、`mac` 或 `linux`）、`MEME_WINDOWS_USERS_DIR`
（WSL 在哪里找 Windows 的用户目录）、`MEME_WSL_CONF`（换一份 `/etc/wsl.conf`）、`MEME_WSL_DIR`、
`MEME_WSL_RUNNING` 和 `MEME_WSL_EXE`（从 Windows 看到的 WSL）、`MEME_TERMINAL`（当作在终端里）、
`MEME_SLOW_MS`（慢于这个毫秒数的运行记进 log；0 就每次都记）、
`MEME_DELETE_TIMEOUT_MS`（Agent 自己的删除命令最多等多久）、
`MEME_WSL_TIMEOUT_MS`（Windows 上等 `wsl.exe` 最多等多久）、`MEME_STORE`（记忆放在哪）、
`MEME_MODEL_URL`、`MEME_MODEL_NAME` 和 `MEME_MODEL_KEY`（模型，代替 `config.json`）。

## 许可证

MIT，见 [LICENSE](LICENSE)。
