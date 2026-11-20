# meme 第一版开发计划（M1）

> 版本：v2.28；日期：2026-11-17；作者：jihd
> v2.28（2026-11-17）：作者已把仓库改成公开；两条一条命令安装在真机上从公开的 Release 装好（Linux/WSL、Windows PowerShell 5.1）。
> v2.27（2026-10-26）：meme 0.1.0 私有发布：删掉 22 个 `m1-*` 标签，`v0.1.0` 打在 `4478b4d`，第一份草稿多带了源码映射文件，修好重打；Release 已发布（私有）。
> v2.26（2026-10-26）：作者定：不做 npm；删掉全部 `m1-*` 标签（对照表见"发布 0.1.0"）；在当前 `main` 上打 `v0.1.0`，先发布成私有 Release；版权人写 Jordon。
> v2.25（2026-10-26）：第 ⑬ 步做完：作者同意后推送，GitHub 上跑了三轮 `release.yml`，在 Mac 上发现并修了两处（交接没受影响），第三轮 5 种机器全部通过；共 12 个提交，打 `m1-13`。
> v2.24（2026-10-22）：第 ⑬ 步本地部分做完（7 个提交，§6 ⑬ 做法和结果）；GitHub 上的验收等作者同意推送。
> v2.23（2026-10-22）：加第 ⑬ 步"发布准备（二）：安装脚本、GitHub Actions、baseline 版、CI 上真跑"的任务和验收；作者定正式发布时仓库公开，安装脚本从 GitHub Release 下载。
> v2.22（2026-10-22）：第 ⑫ 步做完（11 个提交，§6 ⑫ 做法和结果），打 `m1-12`，没 push；发布准备第 5、6、8、9、11、12 项和第 7 项的假 `wsl.exe` 部分做完，第 10 项改成在 Windows 上编译时设、验收挪到第二组。
> v2.21（2026-10-22）：加第 ⑫ 步"发布准备（一）：不用作者在场的代码部分"（发布准备第 5、6、7 的一部分、8、9、10、11、12 项）的任务和验收；发布准备加"正式发布前删掉所有 tag、版本定为 0.1.0"（作者定）。
> v2.20（2026-10-22）：第 ⑪ 步做完：作者按建议定了 F5、F7、F9、F11、F22（§6 ⑪），表结构版本 9（§4.4），§6 ⑩ 的 `!!` 改了；第 ⑪ 步共 33 个提交，打 `m1-11`，没 push。
> v2.19（2026-10-22）：作者定 `forget` 删桌面版的会话时顺带删 Windows 上的 `ssh-<id>` 拷贝目录，做完（§6 ⑪ F10 末尾）。
> v2.18（2026-10-22）：第 ⑪ 步 F10 按作者定的规则做完（跳过 `projects/ssh-*`；同一个 id 在两个来源时用最后一条记录最新的那份，`status` 报出来，`forget` 每份都删），表结构版本 8（§4.4）；还剩"待作者定"的 F5、F7、F9、F11、F22。
> v2.17（2026-10-22）：第 ⑪ 步第一批（除 F10）、第二批做完（§6 ⑪ 做法和结果：17 个提交、作者会话的交接对比）；表结构版本 7（§4.4）；脱敏规则（§4.6.7）。F10 和"待作者定"的几条等作者回复，还没打 `m1-11`。
> v2.16（2026-10-22）：加第 ⑪ 步"发布前审查的修复"：Fable 审查的 24 条（F1–F24）逐条复现的结果，加上核实时发现的 F25；第一批、第二批的任务和验收（§6 ⑪），要作者定的几条另外回复。
> v2.15（2026-10-13）：第 ⑩.1 步做完（6 个提交、验收结果、删掉 4 个测试会话），打 `m1-10.1`；Pi `/fork` 记为先不做。
> v2.14（2026-10-13）：加第 ⑩.1 步（排版宽度 119、OpenCode 副本挪进 ~/.meme、长标题、forget 的三种情况、删测试会话、Pi /fork 先不做）的任务和验收。
> v2.13（2026-10-13）：第 ⑩ 步真机测试代跑完（H1–H6、W1–W4 通过，H6 改在临时目录里删、W3 不真删）；修了 OpenCode prompt history 路径（`2496161`）；记下和 Claude Code、Codex 不一样的地方和两条待定；打 `m1-10`。
> v2.12（2026-10-13）：第 ⑩ 步第二阶段做完（§6 ⑩：8 个提交、两家的做法、验收结果、真机测试单 H1–H6、W1–W4）；真机测试通过后打 `m1-10`。
> v2.11（2026-10-13）：第一版支持 OpenCode 1.x，2.0 等稳定了再评估（作者定）；第一阶段的表加一行"OpenCode 2.0"，只做纸面检查；记下 1.19 的 `/update` 会换成 2.0、1.18.35 和 1.19.0 的库结构相同、各版本的下载量（§6 ⑩）。
> v2.10（2026-10-13）：第一版定为四家，第 ⑩ 步只做 OpenCode、Pi（作者定，prd.md 第 2 节、arch.md 6.1 节第 6 条）；第五家都不加，查 DeepSeek Harness、Qwen Code 时的发现留作记录；多装的 Gemini CLI、DeepSeek Harness、Qwen Code 已卸掉；试跑单只剩这两家，两家都能不要新 key。
> v2.9（2026-10-13）：第 ⑩ 步的第五家从 Gemini CLI 换成 DeepSeek Harness，查过以后按作者定的规则再换成 Qwen Code（§6 ⑩ 第一阶段进展：理由、装好的版本、登录和 key、源码里查到的输出上限、试跑单）。
> v2.8（2026-10-13）：加第 ⑩ 步"再加三家 Agent：OpenCode、Pi、Gemini CLI"的任务和验收（§6 ⑩），先本机试跑、填表，定了再写适配器。
> v2.7（2026-10-13）：第 ⑨ 步真机测试做完（F5 是 VS Code 重连）；第 ⑨.1 步"不碰停着的发行版"的测试，打 tag `m1-9.1`；测试单在关 WSL 前提醒关掉 VS Code 的 WSL 窗口（§6 ⑧.3 第 6 条）。
> v2.6（2026-10-13）：第 ⑨ 步做完（§6 ⑨ 的做法、结果、作者会话对比、和设计不一致的地方、真机测试单）；§3.2、§3.3、§3.5、§3.6、§4.4、§4.6.6、§4.6.8 加第 ⑨ 步的改动；打 tag `m1-9`。
> v2.5（2026-10-13）：加第 ⑨ 步"全面复查后的修复"的任务和验收（§6 ⑨）；§4.8 搜索目标改成指搜索本身；发布准备补第 11–14 项（`meme report`、LICENSE、CI 上跑 macOS 和 arm64、Windows 上真机测 Codex）；§7 加 Agent 升级检查单。
> v2.4（2026-10-13）：第三轮真机测试全部通过（§6 ⑧.4）；tag `m1-8.4` 挪到 `e70b5a4`；Windows 读 WSL 保留（发布准备第 5 项）；发布准备加第 10 项 meme.exe 的 Windows 版本信息；测试单在 PowerShell 接管道前先设 UTF-8（§6 ⑧.3 第 6 条）。
> v2.3（2026-10-12）：第 ⑧.4 步：作者同意接力链只在推送那一轮放宽；查不到开着没有、而最近 5 分钟写过的会话直接拒绝，去掉第二次确认；Codex 按 `thread-writer-locks` 的 `flock` 判断开着没有（实测）；第三轮真机测试单改成用一次性的会话（§6 ⑧.4）；打 tag `m1-8.4`。
> v2.2（2026-10-12）：第 ⑤ 步第二轮真机测试的结果和 B5 事故（§6 ⑤）；第 ⑧.3 步：`forget` 不删开着的会话、慢命令记进 log、Claude Code 上限改 2.7 万字节加第三行、推送的第一条消息写原样运行、接力链在推送那一轮放宽、没装的 Agent 写 `not installed`（§3.4、§3.5、§4.5、§4.6.6、§6 ⑧.3、§8）；第三轮真机测试单（§6 ⑧.3 末尾）；打 tag `m1-8.3`。开发窗口 `18e223e9` 在 B5 里被删，从这一版起是 `0cb2fa3e`。
> v2.1（2026-10-12）：第 ⑧.2 步，文档核对后作者定的四处修改：`status` 写 WSL 没在运行、`uninstall` 改 `[y/N]`、WSL 会话在 Windows 盘上时 Source 写 `C:\…`、适配器以外不认 Agent 的测试（§3.6、§4.6.6、§5、§6 ⑧.2）；打 tag `m1-8.2`。第 ⑤ 步的真机测试单写全（§6 ⑤ 末尾，加了 B2b 每条命令的耗时）。本文从这一版起放进 `~/work/private` 的本地 git 仓库（作者定，没有远程），谁改谁提交。
> v2.0（2026-10-12）：文档大扫除（作者列的 22 条）：正文改成现在的做法，纯历史的划掉或加日期注明。改了开头的依据、§0、§1、§2.1–2.4、§3.1–3.7、§4.2 目录（照实际的文件）、§4.4（换成表结构版本 5）、§4.5（档案和接口）、§4.6.6、§4.6.9、§4.7、§5（补第 ⑥–⑧ 步的测试、列出还没做的真机测试 A1–A4、B1–B6）、§6 ②③⑤ 里和 skill、标签、启动目录有关的几句、§8 风险表。代码里只改了一处：Codex 档案的删除说明（`51b1d8e`）。
> v1.9（2026-10-12）：第 ⑧.1 步，长度上限统一（每家按自己的单位，认不出时取最紧的）、"最后一次验证"只显示认出来的那一段（§4.6.6、§6 ⑧.1）；打 tag `m1-8.1`。
> v1.8（2026-10-12）：加第 ⑧ 步"在哪接着做"（arch.md 6.3、6.4 节和 D20，作者定）：任务和验收（§6 ⑧）。发布准备第 7 项的 "WSL did not respond" 作者同意。同一天做完（§6 ⑧ 进度、§3.4 推送的目录），打 tag `m1-8`。
> v1.7（2026-10-12）：第 ⑦.1 步，报警器第二层：例外和原因、结果（§6 ⑦.1），表结构版本 5；打 tag `m1-7.1`。"发布准备"加 WSL 和 Windows 的 5 项及验收（arch.md 6.2 节），只写进计划。
> v1.6（2026-10-12）：加第 ⑦ 步"Agent 升级的防护"（arch.md 6.1 节、D19，作者定）：任务和验收（§6 ⑦）。同一天做完：Agent 档案、读不了时降级、报警器（§6 ⑦ 进度）；表结构版本 4（§4.4）；§8 加"trajectory 不维护了"；打 tag `m1-7`。
> v1.5（2026-10-12）：加第 ⑥ 步"交接打磨"（handoff.md 7.3 节，作者定）：任务和验收（§6 ⑥）；补打 tag `m1-5`（§6 ⑤）。同一天做完：表结构版本 3（§4.4）、压缩（§4.6.3）、交接内容（§4.6.6 "第 ⑥ 步以后"）、进度和要改的设计文档（§6 ⑥）；打 tag `m1-6`。作者复查后再修 5 处、加 3 处（§4.6.6 末尾、§6 ⑥），打 tag `m1-6.1`。
> v1.4（2026-10-10）：加第 ⑤ 步，Windows 上也读 WSL 的会话（作者定，改"在哪装就在哪用"）。
> v1.3（2026-10-10）：`forget` 写完后按实测改两条：Codex 有分叉的上级会话删不掉（Codex 自己拒绝），改成拦下并说明；最近在写的会话在 Agent 里加 `--yes` 也不删（§3.5、§6 ④）。
> v1.2（2026-10-10）：第 ④ 步改为只做本地的部分（`forget`、`uninstall` 收尾、Windows 细节、收尾），打包发布、安装脚本、README 挪到 §6 新的一节"发布准备"；`forget` 的续接链和 Codex 分叉怎么处理（§3.5、§6）。
> v1.1（2026-10-10）：第 ③ 步验收通过；列表最后那句给 Agent 的话，在 Claude Code 里改成"用户选好后你自己运行 `meme continue <编号>`"（§3.4、§6 ③）。
> v1.0（2026-10-10）：第 ③ 步（Codex）写完后，按实测回写（[sessions.md](../research/tech/sessions.md) 7.1 节）：用 `CODEX_THREAD_ID` 排除当前 Codex 会话；在 Codex 里接力内容另加 3.6 万字节的上限；分叉、回退按 `history_base` 拼会话（不用原文比对）；只读模式改成在内存里的副本上导入；`forget` 对 Codex 会话调用 `codex delete --force`（§3.1、§3.4、§3.5、§4.4、§4.5、§4.6、§6 ③、§8）。
> v0.9（2026-10-10，同一天第二次调整，以此为准，arch D18）：**完全不生成接力文件**，接力内容每次现场算、直接输出；去掉 `~/.meme/handoffs/`、7 天清理、`@文件`、"太长时写文件"、记住列表 10 分钟、`--edit`；终端推送时新 Agent 自己运行 `meme continue <id>`，Claude Code 启动时加 `--allowedTools "Bash(meme:*)"`；接力内容不超过 2.5 万字符和 1.5 万 token；列表最后一句话给 Agent，让它只问用户、不要自己挑（§2.2、§2.3、§3.4、§3.5、§3.6、§4.3、§4.6.6、§6、§8）。
> v0.8（2026-10-10）：**第一版不装 skill**（作者选 A，见 arch D17）：接哪个会话完全由用户用命令选，不让模型自己判断。`meme continue` 在 Agent 模式下给编号列表、支持编号和模糊目标、太长时改成 `@文件`；终端推送给 Claude Code 时第一条消息是 `@接力文件`（§2.2、§2.3、§2.4、§3.4、§3.6、§3.7、§5、§6、§8）。
> v0.7（2026-10-10）：第 ② 步验收通过、提交并打标签 `m1-2`；第 ③ 步的计划和作者定下的几条：Codex 的数据库只读不写、`forget` 不改 Codex 的数据、没有"当前会话"环境变量时的退路、归档的会话照样列出、分叉用原文比对（§3.1、§3.5、§4.5、§6 ③）。
> v0.6（2026-10-09）：只列当前项目时，列表底部写其他项目还有多少会话；`meme continue` 加 `-a`；skill 写明什么时候用 `meme continue -a`（§3.1、§3.4、§3.7）。
> v0.5（2026-10-09）：和作者讨论后改第 ② 步：`meme continue` 分终端模式和 Agent 模式（§2.2、§2.3、§3.4）；列会话时去掉当前会话（§3.1）；接力文件只是临时文件，7 天后删（§3.4、§3.5、§4.3）；skill 的叫法（§3.7）。本文以后只由代码仓库那边的会话维护。
> v0.4（2026-10-08）：第 ② 小步写完后回写：§3.4 `continue`、§3.6 `install` / `uninstall`、§3.7 skill、§4.2 目录、§4.6.6 接力内容的细节、§6 ② 的进度。
> v0.3（2026-10-08）：作者在 Windows Terminal 试用后改两处：§3.1 当前项目没有会话时自动列出全部项目；§3.3 搜索默认只列出用户和 AI 说的话里的命中，工具调用和工具输出只给个数；§3.7 skill 要写明什么时候加 `--all`。
> v0.2（2026-10-08）：第 ① 小步写完后，按代码和实测回写：§4.2 目录、§4.4 哈希、§4.6.2 顺序、§4.6.3 注入（重写）、§4.6.4 怎么结束的、§4.6.5 搜索、§4.6.8 只读模式、§6 ① 的进度。以后本文由代码仓库那边的会话维护。
> 依据：[PRD v0.7](prd.md)、[arch.md](arch.md)（含 6.1–6.4 节：Agent 升级、WSL 和 Windows、在哪接着做、用户怎么用）、[format.md v0.4](format.md)、[handoff.md](../research/market/handoff.md) 7.3 节（交接内容），以及第 1–5 步的实测与决定：[sessions.md](../research/tech/sessions.md)、[storage.md](../research/tech/storage.md)、[list.md](../research/tech/list.md)、[relay.md](../research/tech/relay.md)、[release.md](../research/tech/release.md)
> 代码仓库：`~/work/meme`（以后对应 GitHub 上的 `jordonjill/meme`）。仓库里的 `CLAUDE.md` 指向本文。
> 语言：本文用中文。凡是用户看得到的产品内容（命令输出、接力内容、README、代码注释、提交信息）都用英文，所以本文里的这些示例也写成英文。

---

## 0. 这份文档怎么用

| 章节 | 内容 | 什么时候看 |
|---|---|---|
| 第 1 节 | 第一版做什么、不做什么 | 开工前 |
| 第 2 节 | 流程：每条命令、两种接力、安装、删除 | 理解整体 |
| 第 3 节 | 功能说明书：每条命令的用法、选项、输出、出错时怎么办 | 写某条命令时 |
| 第 4 节 | 技术架构：技术栈、目录、数据库表、适配层接口、关键算法、系统差异 | 写代码时 |
| 第 5 节 | 测试：单元、样例会话、端到端、Agent 实测 | 每一步都要 |
| 第 6 节 | 分小步做（① 到 ⑧，另有发布准备）：每步的任务和验收标准 | 排期、验收 |
| 第 7 节 | 开发约定 | 一直遵守 |
| 第 8 节 | 风险和要尽早验证的事 | 每步开工前 |

---

## 1. 范围

**第一版做的**（PRD 5.1）：
- 读 Claude Code、Codex 的会话，Windows 和 WSL 两边对称：WSL 里的 meme 经挂载路径读 Windows 那边的会话（挂载位置按 `/etc/wsl.conf`，默认 `/mnt/`）；Windows 上的 meme 经 `\\wsl.localhost` 读正在运行的 WSL 发行版里的会话（第 ⑤ 步）；
- 转成统一格式，存进一个 SQLite 文件，与原会话严格同步；
- 用 `meme ls`、`show`、`search` 列出、查看、搜索；
- 用 `meme continue` 接力：在 Agent 里用 `! meme continue` 拉取，或在终端推送（meme 在会话开始的目录启动 Agent）；
- `meme install` / `uninstall` / `forget` / `status`；
- Agent 升级的防护：每家一份档案、读不了时降级、两层报警（第 ⑦ 步）。

**第一版不做的**（PRD 5.3）：调用 LLM、hook、后台任务、常驻服务、图形界面或浏览器页面、记忆层、skill 和 Agent 插件（D17）、接力文件（D18）、写成目标 Agent 的原生会话格式、MCP 工具和额度提示（PRD v0.7 移出第一版）、跨设备接力（另一台电脑、SSH，arch.md 6.3、6.4 节）、对外公开的评测数字、兼容表。

---

## 2. 流程

### 2.1 每条命令的共同第一步

```
启动 meme
  │
  ├─ 判断环境：win / wsl / mac / linux                 (§4.7)
  ├─ 找数据目录 ~/.meme（Windows：%USERPROFILE%\.meme）
  ├─ Windows 上：先问 wsl.exe 哪些发行版正在运行（和下面的导入同时进行），停着的不碰   (§4.7)
  ├─ 以读写方式打开 meme.sqlite
  │     └─ 写不了（Codex 沙箱等）→ 把数据库读进内存、在内存里导入，磁盘上什么都不写     (§4.6.8)
  ├─ 增量导入（每个来源目录；Windows 上 Windows 自己的先导，WSL 的等 wsl.exe 回答后再导）：   (§4.6.1)
  │     ├─ 来源目录读不到 → 跳过这个来源，一条都不删
  │     ├─ 文件大小和修改时间都没变 → 跳过
  │     ├─ 变了 → 整个文件重新转换 → 只写有变化的记录
  │     ├─ 转换失败 → 记下来，照样列出会话（有旧镜像就用旧的）；文件和 meme 都没变就不再重试   (第 ⑦ 步)
  │     └─ 原会话不在了 → 删除镜像（secure_delete）
  └─ 执行命令本身
```

没有变化时，这一步约 40 毫秒（实测）。

### 2.2 在新会话里拉取（主要入口）

**2026-10-10 定（arch D17、D18）**：第一版不装 skill，接哪个会话由用户自己用命令选，模型不判断；不生成接力文件，接力内容每次现场从会话里算好，直接输出。下面是 Claude Code 里的用法。用户实测：用 `!` 跑的命令，结果会立刻发给 Agent，Agent 会马上回应。

```
用户在新的 Claude Code 会话里
  → 运行 `! meme continue`（Agent 模式）：打印带编号的会话列表（当前项目、最近的在前，不含这个会话），
    每行带会话 ID（§3.1 的短 ID，一般 8 位）；最后一句话是写给 Agent 的：
    "This list is for the user. Ask which one to continue and wait; do not pick one yourself.
     The user can also type: ! meme continue <number>"
  → Agent 只问用户接哪个
  → 用户运行 `! meme continue 2`（或者 last、codex、win、会话 ID 开头、标题里的词）：
    接力内容直接输出到对话里（Claude Code 里不超过 2.7 万字节，`!` 的输出不会被存成文件；§3.4，2026-10-12 第 ⑧.3 步改，原来 2.5 万字符）
  → Agent 照接力内容开头的说明：先核对仓库现状（git log / git status），
    用两三句话告诉用户之前在做什么、停在哪、下一步打算怎么做，等用户确认
  → 干活；缺细节时运行 `meme search` / `meme show`
```

Agent 自己运行 `meme continue <目标>` 时（比如终端推送的新会话，§2.3），输出同样进入它的会话。在 Claude Code 里两条命令就够了，`!` 的结果会直接交给模型，不用再说"接着做"；列表最后那句话也改成让 Agent 在用户选好后自己运行（§3.4）。

**Codex 里**（第 ③ 步实测，sessions.md 7.1 节）：界面也认 `!`，但结果只记进对话、不交给模型。所以是 `! meme continue` 看编号 → `! meme continue <编号>` → 再说一句"继续"，模型才去读接力内容。Codex 里交接内容另外不超过 3.6 万字节（§3.4）。

接手的 Agent 不在会话那套文件上时（比如在别的项目里拉取），交接内容照样给，开头提醒它先问用户在哪做（第 ⑧ 步，§4.6.6）。

（V6 验证的是用 skill 拉取，[relay.md](../research/tech/relay.md) 第 5 节；skill 第一版不做，见 §3.7。2026-10-09 定的"直接说'接着上次……做'、用 /meme 或 $meme 点名"随 skill 一起不再适用。）

### 2.3 在终端推送

（2026-10-09 改：不用记会话 ID，用方向键选。2026-10-10 改：不写接力文件，新 Agent 自己拿接力内容。2026-10-12 改：在会话开始的目录启动，第 ⑧ 步。）

```
用户在普通终端里运行 `meme continue`（终端模式）
  → 不写目标：弹出交互列表，用法和 `meme ls` 一样（方向键、打字搜索、空格预览、Ctrl+A、Tab），
    Enter 选中会话；当前项目没有会话时列出全部项目，正在调用 meme 的会话不列
    （写了目标、只有一个对得上就跳过这一步）
  → 选在哪个 Agent 里接：列出本机装了的（命令在 PATH 上），默认是会话自己那家（装了的话），
    否则是第一个装了的；Esc 回到会话列表（`--in` 可以提前指定，跳过这一步）
  → 在会话开始的目录里启动目标 Agent（按目标环境换算：WSL 里推 Windows 的会话用挂载路径；Windows 上推 WSL 的会话，经 wsl.exe 在 WSL 里启动），
    终端交给它；目录不在了就报错，并说明可以先在想要的目录里打开 Agent，再用 `! meme continue <id>` 拉取（第 ⑧ 步）。
    第一条消息让它自己拿接力内容（各家的写法在档案里，§4.5）：
     "Continue an earlier session: run `meme continue <短 ID>` and follow the instructions at the top of its output."
     （推到 Codex 时多半句 "(its output can be up to 10,000 tokens; allow that much)"，§3.4）
     Claude Code 启动时加 `--allowedTools "Bash(meme:*)"`，提前放行 meme 命令，免得新会话一打开就弹出权限确认
     （第一条消息放在 `--allowedTools` 前面，因为这个选项后面可以跟好几个工具名，放后面会被当成工具名吞掉）
  → 新 Agent 运行 `meme continue <id>`（Agent 模式），拿到接力内容，照开头的说明先总结、等用户确认
```

V7 已测通（当时用的是 "Read <文件> first" 的写法）。第一条消息约 130 个字符，碰不到 Windows 命令行的长度限制。推送到 Codex 不用提前放行：Codex 默认在沙箱里自己执行只读命令，`meme continue` 在沙箱里能用，作者第 ③ 步实测没有弹审批（§6 ③）。

### 2.4 安装

```
curl -fsSL <安装脚本> | bash            （Windows：irm <安装脚本> | iex）
  → 下载对应系统的单文件到 ~/.local/bin/meme（Windows：%USERPROFILE%\.local\bin\meme.exe）
  → 需要的话把这个目录加进 PATH
  → 运行 `meme install`：
       ├─ 找到本机的 Agent 和会话来源
       ├─ 导入全部会话
       └─ 打印结果和用法（2026-10-10；每家 Agent 的那几行在它的档案里）：
            在终端里：meme continue（用方向键选）
            在 Claude Code 里：! meme continue 看编号 → ! meme continue <编号>（结果直接交给模型，不用再说话）
            在 Codex 里：同样两条命令，然后说"继续"（`!` 的结果不交给模型）
```

2026-10-10 改：**不放 skill**（第一版不做，§3.7），`meme install` 不往 `~/.claude/skills`、`~/.agents/skills` 写任何东西，`~/.meme` 以外什么都不改。

### 2.5 删除

```
双向删除：
  在 Agent 里删了会话（比如 Codex 的 /delete）→ 下次运行 meme 时，镜像跟着删掉
  meme forget <会话>                         → 删原会话的全部文件和镜像
  meme forget（在终端里，不写 ID）           → 打开和 meme ls 一样的列表，选一个会话
      列出要删什么、讲清风险 → 用户回答 y（[y/N]，只按回车不删；2026-10-10 改，原来是输入 yes） → 删除（Windows 上文件被占用就重试）
      Agent 在后台运行时没法确认 → 必须加 --yes（只有用户明确要求才可以加）
```

---

## 3. 功能说明书

**共同规则**
- 输出到终端，并且没有加 `--plain` 时，用带颜色的交互界面；输出被管道接走或在 Agent 里运行时，自动改成普通文字、不带颜色。遵守 `NO_COLOR`。
- 会话 ID 可以只写前几位，只要不重复就行。
- 退出码：0 成功；1 出错；2 用法不对。出错时只输出一行简短的英文说明，详细信息写进 `~/.meme/logs/meme.log`。**meme 出错不能影响 Agent 干活。**

### 3.1 `meme ls`

```
meme ls [-a] [--agent claude|codex] [--env wsl|win|mac|linux] [--plain]
```

- 默认只列当前项目的会话；`-a` 列全部项目。
- **不列正在调用 meme 的那个会话**（2026-10-09）：在 Agent 里运行 `meme ls` / `meme continue` 时，它自己的会话不该出现在"接哪个"的候选里。Claude Code 在环境变量 `CLAUDE_CODE_SESSION_ID` 里给出当前会话的 ID（作者已核实），Codex 是 `CODEX_THREAD_ID`（第 ③ 步实测，见下面）；变量名在各家的档案里（§4.5）。
  - ~~**退路**（2026-10-10 作者定）：如果 Codex 没有这样的变量，在 Codex 里运行时，当前项目下最近几秒还在写的那个 Codex 会话，要么排除，要么在列表里标出"可能是当前会话"；**绝不能把它当成"上次那个"**。具体用哪种，第 ③ 步实测后定。~~
  - **实测结果（2026-10-10）：不需要退路。** Codex 给工具跑的命令和界面里 `!` 跑的命令都设了 `CODEX_THREAD_ID`（就是会话 ID），meme 按它排除当前 Codex 会话。一个 Agent 是从另一个里启动的时候（比如在 Claude Code 里开了 Codex），两个变量都会在，两个会话都在运行，所以都排除。
- **当前项目没有会话时，自动改成列出全部项目**，顶部写一行 "No sessions in <项目> — showing all projects"；交互界面和普通文字输出都这样（2026-10-08，作者在 Windows Terminal 里于 `C:\Users\<用户>` 运行时，交互界面一片空白）。交互界面里按 Ctrl+A 回到当前项目时，这一行消失，空列表下写 "No sessions in this project. Ctrl+A shows all projects."。
- **只列当前项目时，底部加一行其他项目还有多少会话**（2026-10-09）：交互界面写 "+12 sessions in other projects (Ctrl+A)"（在按键提示上面一行），普通文字写 "+12 sessions in other projects (use -a)"；其他项目没有会话时不写。数的时候和列表用同样的筛选（平台和 Agent 两行选的、打字搜索的词、去掉当前会话）。默认只看当前项目、Ctrl+A / `-a` 看全部、当前项目为空时自动列出全部，这几条不变。
- 续接链合成一个，显示链上最新的那个会话。没有任何 AI 回复的会话（比如只敲了 `/model`）不列出。
- **读不了的会话照样列出**（第 ⑦ 步）：标题后面标 "(can't read)"，有旧镜像时标 "(can't read after <时间>)"；底部（交互界面在顶部）写 "N sessions could not be read, see \`meme status\`"。
- **交互界面**照 Claude Code 的 `/resume`（[list.md](../research/tech/list.md) 第 4 节）：
  - 每个会话两行：标题和带颜色的来源标签；多久以前 · 分支 · 文件大小 · 会话 ID；
  - **会话 ID**（2026-10-10 加，作者要删会话时在列表里找不到 ID）：放在第二行最后，`meme show`、`continue`、`forget` 都要用它。窗口窄时截短前面的内容，ID 总是看得见。列表本来就能按 ID 搜索；
  - **ID 显示几位**（2026-10-10 作者定）：默认前 8 位；别的会话的 ID 开头相同时，多显示几位，直到能区分开（比如 `019dc1a2-5` 和 `019dc1a2-7`）。原因：Codex 的 ID 是 uuid v7，前 8 位是时间，一分钟内建的两个会话（比如分叉和它的上级）前 8 位相同，只显示 8 位时两行看起来一样，`meme continue` 交给 Agent 的命令也会匹配到两个。meme 所有显示 ID 的地方都用这个写法：两种列表、`show`、`search` 的提示、交接文字、`continue` 交给 Agent 的命令、`forget`。做法：每个 ID 只和排序后前后相邻的两个比，开头相同的部分再加一位；

  - 按键：↑↓ 选择、Enter 打开查看（进入 `meme show`）、空格预览、直接打字搜索、Ctrl+A 切换当前项目和全部、~~Tab 在 All / WSL / Win / Claude / Codex 之间切换~~、Esc 退出；
  - **筛选改成两行**（2026-10-10 作者定，原来一行 Tab 里平台和 Agent 混在一起，没法同时选"WSL 的 Codex"）：
    - 搜索框上面一行平台（Platform：All / WSL / Win …），一行 Agent（Agent：All / Claude / Codex）；只有一种平台（或一种 Agent）时，那一行不显示；
    - ←→ 改当前这一行的选项，Tab / Shift+Tab 在两行之间换；只有一行时，Tab 和 ←→ 都切换它；
    - 样子（2026-10-10 作者改，原来当前行前面一个小 `›`、选中的值用反色块）：单选圆点 `Platform   ● All    ○ WSL       ○ Win`，选中的 `●` 白色加粗，其他 `○` 灰色；当前行的行名青色加粗，另一行的行名灰色；两行的值按列对齐（每列按两行里最宽的名字补齐）；
  - **每个会话的第二行**（2026-10-10 作者改，原来太长）：时间用短写（`1h ago`）；看全部项目时路径最多 40 列，省略中间；id 移到右边，和上一行的标签右对齐，排成一列：左边读内容，右边一列是来源和 id；
    - 平台选 All（并且有不止一种平台）时，**按平台分组**：每组一个标题（`── WSL (7) ──`），组内 Claude 和 Codex 按时间混排，组按各组最新的会话排（最上面仍然是最近的会话）；选了具体平台时不分组；
    - 只改全屏列表；`--plain` 和给 Agent 的编号列表不变，编号保持稳定。`meme continue`、`meme forget` 的选择列表是同一个，一样改；
  - **样子**（2026-10-10 作者定）：来源标签靠右对齐，排成一列（原来紧跟标题，长短不一）；搜索行放在圆角框里（╭─╮ │ ⌕ … │ ╰─╯），打字时框变成青色；
  - **输入法**（2026-10-10，作者发现搜索时中文输入法不显示候选、打字发卡）：原来全屏界面一开始就隐藏终端的真光标，搜索框里的 `▏` 是画出来的，真光标停在上一次画完的地方，输入法的候选框跟着真光标走，所以位置不对或不显示。现在每次画完都把真光标放到搜索框里文字的后面并显示出来（查看界面里按 `/` 搜索时放在底部那一行），去掉画的 `▏`；其他时候仍然隐藏。程序本身不慢：每按一个键加重画一次约 0.08 毫秒。在伪终端里实测：输入"状态"后光标在第 5 行第 10 列，正好在文字后面；
  - **搜索的范围**：列表里的搜索只匹配标题、项目路径、分支、id（不分大小写的子串），搜对话内容用 `meme search`；搜索框里的提示写成 "Search titles, projects, branches, ids…"；
  - **放不下的文字换行，不截断**（2026-10-10，作者在 `meme continue -a` 选 Agent 那一屏发现灰色说明被窗口截掉）：全屏界面原来把每一行都截到窗口宽度；现在要整句读的文字（顶部的提示、选 Agent 那一屏的说明、预览和查看界面的页眉、最后的"上次怎么结束"、底部的按键说明）按单词换行，接着原来的颜色；按键说明在两项之间换行。列表里每个会话的两行仍然截短（标题从后面截，路径省略中间），不换行；
  - **长路径**（2026-10-10 作者定）：两种列表里放不下时省略中间，先尽量保留最后几层文件夹，剩下的空间再从开头往后补，比如 `~\AppData\…\bots\cindy\default-workspace`、`/mnt/c/…/bots/cindy-default/workspace`（原来从后面截，最能区分项目的最后几层反而看不到）；`--plain` 的项目列最多 40 列。`forget` 的删除清单、`show` 的页眉、选 Agent 那一屏始终是完整路径。标题仍从后面截；
  - **来源标签 `CC` 改成 `Claude`**（2026-10-10 作者定）：`Claude·WSL`、`Claude·Win`、`Codex·WSL`，和 `--in claude`、`--agent claude`、筛选里的名字一致；列表、`show`、`search`、交接内容都改了；
  - **WSL 停着时**（Windows 上，2026-10-10 作者定）：照样列出 WSL 的会话（镜像里有，看、搜、拉取都不用 WSL 在运行），列表顶部写一行 "WSL (Ubuntu) is not running; its sessions are as of 10-10 16:52"（时间是上次同步）；`--plain` 的第一行也写；推送或删除时才会启动 WSL，那是用户自己选的；
  - 预览里写一行这个会话怎么结束的，比如 "Last turn was interrupted"。
- **普通文字输出**（给 Agent）：

```
Sessions in ~/work/private (newest first):
  01a11a65  Codex·WSL   2h ago    main  1.0MB  分析当前项目内容
  eaf1fe0f  Claude·WSL  8d ago    HEAD  352KB  Statusline contents review
+12 sessions in other projects (use -a)
Run `meme continue <id>` to continue one.
```

（2026-10-09：末尾原来是 "…, or `meme ls -a` for all projects."，有了上面那行提示后去掉了后半句。）

当前项目没有会话时（多一列项目）：

```
No sessions in ~ — showing all projects
  7e629e49  Claude·WSL  3s ago  main  2.5MB  ~/work/meme     plan.md 第 ① 小步
  fb9393aa  Claude·WSL  3m ago  HEAD  4.9MB  ~/work/private  Meme 第一版统一存储
Run `meme continue <id>` to continue one.
```

### 3.2 `meme show`

```
meme show <会话> [<轮次>] [--full] [--hidden] [--plain]
```

- **2026-10-13 第 ⑨ 步改**：`--all`（也显示注入的消息和推理）改名 `--hidden`；`show --all` 报错并提示用 `--hidden`（以前的交接里写着 `--all --full`）。`<轮次>` 和 `--full` 可以一起用。

- **默认每一轮折成一行**（[list.md](../research/tech/list.md) 第 6 节）：

```
Statusline contents review  [Claude·WSL]
~/work/private · HEAD · 09-30 09:08 → 09:12 · 4 turns · 352KB
  1 ❯ /statusline
      ▸ 1 step
      ● Your status line is now set up to match your shell prompt…
  3 ❯ 不要显示这个，我要其他的，和我在win git bash下的那个一样……
      ▸ 9 steps · 6 commands · edited 3 files
      ● 另外我记下了你的 Windows 配置位置……
```

- **展开**：交互界面里按 Enter；普通文字时用 `meme show <会话> <轮次>`，`--full` 展开全部。展开后：
  - AI 的话显示全文；
  - 每一步一行，写工具和参数，结果显示前 3 行，失败的标 ✗；成功的前面是绿色的 `●`（2026-10-12 作者改：原来是 `⏺`，Windows Terminal 把它画成蓝底白点的 emoji，绿色不生效，还可能占两格）；
  - 系统注入的消息只留一行 "⚙ injected message (hidden)"；
  - 子代理只显示调用和它交回的结果；
  - 推理过程不显示；
  - 续接的地方加一条分隔线 "── continued from <会话ID> ──"（分叉写 "forked from"）；
  - 压缩过的地方显示一行 "── compacted here ──"，摘要只在 `--all` 时显示（第 ⑥ 步）。
- `--all`：系统注入的消息、推理也显示。~~子代理的过程从它自己的文件现读~~（没做，§6 ①）。
- **页眉下的说明**（第 ⑦ 步）：读不了、显示的是旧镜像时，写 "meme can't read this session's file any more (…): this is the session as of <时间>; what came after is missing. See \`meme status\`."；有不认识或读不出的记录时，写 "N records meme couldn't read (…)" 或 "N records of known types meme couldn't read (…)"。从来没读成过的会话，`show` 只说一句 "meme can't read session <id> (<错误>); see \`meme status\`"，退出码 1。

### 3.3 `meme search`

```
meme search <模式> [-F] [-i] [-C <行数>] [-a] [--session <会话>] [--tools] [--plain]
```

- **2026-10-13 第 ⑨ 步改**：`-a`、`--all` 都是"所有项目"（所有命令里一样）；原来的 `--all`（也列工具调用和输出里的匹配）改名 `--tools`。`^`、`$` 匹配每一行的开头和结尾。

- 用法照 rg（[list.md](../research/tech/list.md) 第 8 节）：
  - 默认按正则匹配，`-F` 按普通文字；
  - `-i` 忽略大小写，`-C` 多显示前后几行。
- 范围：
  - 默认只搜当前项目，`-a` 搜全部，`--session` 只在一个会话里搜；
  - **和 `meme ls` 一致**（2026-10-10 作者定，原来在没有会话的目录里只说 "No matches."，别的项目有也不提）：当前项目没有会话时，自动搜全部项目，第一行写 "No sessions in /tmp — searching all projects"；当前项目里没搜到、别的项目里有时，写 "No matches in ~/work/cindy; 187 matches in 5 sessions in other projects (use -a)"；当前项目里搜到了、别的项目也有时，最后加一行 "+208 matches in 8 sessions in other projects (use -a)"。别的项目按同样的规则数（默认只数说过的话，`--all` 时全数）；只在工具调用和输出里有时写 "N in tool calls and tool output in other projects (use -a --all)"。多搜一遍全部只要几毫秒；
  - "全部"是镜像里的全部会话：两种 Agent、两边的平台（WSL 里含 Windows 的会话，Windows 上含 WSL 的，WSL 停着时是上次同步的）；不按平台、Agent 筛选；
  - 系统注入的消息不搜，续接复制来的记录不搜（每条内容只算一次）。
- **默认只列出用户和 AI 说的话里的命中**；工具调用（`Call:`）和工具输出（`Tool:`）里的命中只在第一行给个数，加 `--all` 才逐条列出（2026-10-08，作者定：原来只把工具输出藏起来，工具调用照样列出，结果大多是写文件、跑命令的参数，淹没了真正说过的话）。要找命令、报错、代码时加 `--all`。
- 每个会话默认列 3 处；加 `--all` 或 `--session` 时全部列出。
- 输出：

```
178 matches in 2 sessions (+272 in tool calls, +170 in tool output; use --all)

Meme 第一版统一存储  [Claude·WSL]  10-08  115 matches
  turn   3  AI:   …搜内容（`meme search`）、接力（`meme continue`）都从镜像里取，不用每次去翻各家的原始文件。
  turn   3  AI:   …**为什么要遮**：数据都在你本机，但接力内容会发给另一家的模型。…
  … 112 more
  → meme show fb9393aa 3
```

- 只有工具调用、工具输出里有命中时，第一行写 "No matches in what was said (+5 in tool calls, +3 in tool output; use --all)"；哪里都没有命中时写 "No matches."。
- 加 `--all` 时第一行只写总数，每处前面标 `You:` / `AI:` / `Call:` / `Tool:`。

### 3.4 `meme continue`

```
meme continue [<目标>] [-a] [--in claude|codex] [--fresh] [--plain]
```

**现在的做法**（第 ⑧ 步以后）：在会话的项目里接。终端里运行时，meme 在会话开始的目录打开 Agent；在 Agent 里拉取时，Agent 不在会话那套文件上，交接内容开头提醒它先问用户（§4.6.6）。`continue --help` 开头写了这一句。下面按时间记下来的各条，以加了日期的改动为准。

**2026-10-10 定（第一版不装 skill、不生成接力文件，arch D17、D18；同一天第一次调整里的 `@文件`、临时接力文件、记住列表 10 分钟都已去掉）**：
- **完全不生成接力文件**：接力内容每次要用时现场从会话里算好，直接输出到 stdout。终端推送时由新 Agent 自己运行 `meme continue <id>` 拿到（§2.3）。`--edit`（先编辑接力文件再交出）随之去掉。
- **Agent 模式的列表带编号**：`  1  Codex·WSL  2h ago  <标题>  01a11a65`（列全部项目时在标题前多一列项目）；当前项目最近 5 个，`-a` 时全部项目最近 10 个；底部照 §3.1 写其他项目还有多少会话（"(meme continue -a)"）；**最后一句话写给 Agent**："This list is for the user. Ask which one to continue and wait; do not pick one yourself. The user can also type: ! meme continue <number>"（`-a` 时是 `! meme continue -a <number>`）。
- **列表最后那句给 Agent 的话分两种**（2026-10-10 作者定）：
  - **在 Claude Code 里**（有 `CLAUDECODE=1` 或 `CLAUDE_CODE_SESSION_ID`，并且没有 `CODEX_THREAD_ID`；第 ⑦ 步起由档案的 `inside` 和 `bangReachesModel` 决定）："This list is for the user. Ask which one to continue and wait; do not pick one yourself. When the user has chosen, run `meme continue <number>` yourself. The user can also type: ! meme continue <number>"。用户选好后由 Agent 自己运行，接力内容就折叠在工具输出里，界面更干净；用户也可以自己输入 `! meme continue <编号>`；
  - **在 Codex 里和其他情况**：保持原来的说法，不让 Agent 自己运行（Codex 的 `!` 结果不发给模型，用户输入命令后再说一句就行）；
  - 两个变量都在时（在 Claude Code 里开了 Codex），正在调用 meme 的是里面那个 Codex，按 Codex 的说法。
- **`meme continue <编号>`**：按同样的规则现场把列表再算一遍，取第 n 个，不另外存列表。两次之间又多出新会话，编号会错位，用户接受。编号写错时，提示一句并重新打印列表。
- **模糊目标**：`last`（当前项目里除当前会话外最近的一个）、`claude` / `codex`、`win` / `wsl`（还有 `mac`、`linux`）、会话 ID 开头几位（至少 4 位）、标题里的词（也认项目文件夹名）。可以写好几个词，每个都往下筛；`last` 取筛完后最新的一个。只有一个对得上就直接输出接力内容；好几个就列出这几个（标题写 'Sessions matching "…"'，最多 20 个），**这时不编号、只显示会话 ID**，最后一句话里写 `! meme continue <id>`，因为编号下次会按平常的列表来算；一个都没有就提示一句并输出平常的编号列表。当前项目里对不上时，再到全部项目里找。会话 ID 不分项目，续接过的老会话、当前会话本身也能用 ID 点名。
- **长度**（2026-10-12 第 ⑧.1 步改，第 ⑧.3 步再改）：公共上限只有 meme 自己的 1.5 万 token；各家的上限在档案里，按那家的单位：Claude Code 2.7 万字节（它的 `!` 和 Bash 工具把超过约 3 万字节的输出存成文件，模型只看到开头 2KB；原来写 2.5 万字符），Codex 3.6 万字节；认不出在哪家里运行时（`--plain`、管道），取所有档案里最紧的：2.7 万字节、1.5 万 token（§4.6.6）。交接第三行写 "If your tool saved this output to a file, read the whole file before you reply."，以防以后门槛再变。
- **推送的第一条消息**（2026-10-12 第 ⑧.3 步）：要 Agent 原样运行 `meme continue <id>`，不加管道或别的命令（"exactly as written, with no pipe or other command around it"）。
- **终端模式**写了目标时：一个对得上就跳过选会话；好几个就弹出只有这几个会话的交互列表；一个都没有就报错。
- **接力内容开头写明"先总结、等用户确认再动手"**（§4.6.6），因为没有 skill 告诉 Agent 拿到接力内容后怎么做。
- **Codex 里的用法**（2026-10-10 实测，sessions.md 7.1 节）：Codex 的界面也认 `!`，但 `!` 的结果只记进对话、**不发给模型**（和 Claude Code 不同）。所以在 Codex 里是：`! meme continue` 看编号 → `! meme continue <编号>` → 再说一句"继续"，模型才去看接力内容。`meme install` 和 `meme continue --help` 的用法说明里写了这一条。
- **在 Codex 里接力内容另有字节上限**（2026-10-10 作者定）：Codex 对命令输出只留 1 万个它的 token，按"字节数 ÷ 4"算，约 4 万字节（作者机器实测）。meme 在 Codex 里运行时（有 `CODEX_THREAD_ID`），接力内容不超过 3.6 万字节（留 10%）；第 ⑧.1 步起 Codex 里不再受 2.5 万字符限制（见上面"长度"）。
- **推送到 Codex**：在会话开始的目录里（第 ⑧ 步）启动 `codex "<第一条消息>"`，第一条消息是 "Continue an earlier session: run `meme continue <短 ID>` (its output can be up to 10,000 tokens; allow that much) and follow the instructions at the top of its output."（写在 Codex 的档案里）。多那半句，是因为 Codex 的模型跑命令时自己定留多少输出（见过 2000 token），要它留够。不需要像 Claude Code 那样提前放行：Codex 默认在沙箱里自己跑只读命令，`meme continue` 在沙箱里能用（§4.6.8），作者第 ③ 步推送时实测没有弹审批（§6 ③）。

**2026-10-09 改：分两种模式**（和作者讨论后定）。

| | 终端模式（给人用） | Agent 模式（给 Agent 用） |
|---|---|---|
| 什么时候 | 输出是终端，并且不在 Agent 里 | 输出不是终端（Agent 调用、管道），或者有 `CLAUDECODE` 这类 Agent 的环境变量，或者加了 `--plain` |
| 不写会话 | 弹出交互列表选会话（同 `meme ls`），再选在哪个 Agent 里接（§2.3） | 打印带编号的列表（2026-10-10 改，见上） |
| 写了会话 | 跳过选会话，直接选 Agent（`--in` 也写了就都不问） | 只把接力内容（§4.6.6）输出到 stdout，**不写文件** |
| 之后 | 在会话开始的目录里启动 Agent（2026-10-12 第 ⑧ 步改，原来是项目目录），第一条消息让它运行 `meme continue <短 ID>`（2026-10-10 改，原来是写接力文件、可选 `--edit`、让它去读文件） | —— |
| `--in` | 可用 | 用法错误（退出码 2）：启动 Agent 需要终端（`--edit` 已去掉） |

- **`--fresh`**（"重新做"模式）：两种模式都能用。只带用户说过的话和"以仓库为准"的提醒，不带上一个 Agent 的做法。
- **两种模式的列表都不含正在调用 meme 的会话**（§3.1）；只列当前项目时，底部同样写其他项目还有多少会话（§3.1）。
- **`-a` / `--all`**（2026-10-09 加）：列出全部项目的会话。Agent 模式打印全部项目的列表；终端模式的交互列表一开始就是"全部项目"。
- ~~接力文件不做存档：只有终端模式写……7 天以前的删掉~~（2026-10-10：完全不生成接力文件，这一条去掉）。
- **只读模式**（Codex 沙箱）：`meme continue` 什么都不写，只读模式下照样能用。数据库里没有这个会话，或者已经过时，就直接从原文件现读（第 ③ 步）。
- **2026-10-08 实现时定下的细节**：
  - 不写会话时的列表也照 §3.1：当前项目没有会话就列出全部项目；
  - 选中的会话后来被续接过（A → B），就自动交出链上最新的 B（它包含 A 的全部），并在 stderr 说一句 "a1b2c3d4 was continued in b2c3d4e5; handing over b2c3d4e5, which includes it"；
  - `--in` 第 ② 步只支持 `claude`，`codex` 在第 ③ 步加；
  - ~~`--in claude` 在会话的**项目目录**里启动~~（2026-10-12 第 ⑧ 步改：在会话**开始的目录**启动，按目标环境换算；worktree 的会话在 worktree 里启动；目录不在就报错并说明怎么在别处拉取。拉取时不在会话那套文件上，交接内容开头加一行提醒，见 §6 ⑧）`--in claude` 启动 `claude "<第一条消息>" --allowedTools "Bash(meme:*)"`，终端直接交给它，meme 等它退出并返回它的退出码（2026-10-10 改，第一条消息见 §2.3；`--fresh` 会带进第一条消息里的命令）；会话开始的目录不在了或找不到 `claude` 时报错；
  - ~~`--edit`~~（2026-10-10 去掉：没有接力文件可编辑）；
  - 终端模式启动 Agent 前，先在终端里打印一行："Continuing <id8> (<标题>) in Claude Code, in <目录>"；
  - 预期之内的失败（找不到 Agent、会话开始的目录不在了、会话从来没读成过）只打一行说明，退出码 1，不写日志。目录不在时写 "the session's directory <目录> is not there. To continue somewhere else, open the agent there and run \`! meme continue <id>\`."（第 ⑧ 步）。

### 3.5 `meme forget`

- **2026-10-13 第 ⑨ 步改**：加 `-a`（列表从所有项目里选）；`--yes` 在终端里也不再问；真正删除前再查一次开没开着；Agent 标着开着、这里又查不了进程的，不管多久都拒绝（§6 ⑨）；删 Claude Code 的会话时也删它在 `jobs/` 下的后台任务目录（`state.json` 写着是这个会话的才删），并提一句 `~/.claude/history.jsonl` 里还留着输入过的话。

```
meme forget [<会话>...] [-a] [--yes] [--chain]
```

**2026-10-10 定（作者，release.md §4 和第 ④ 步的计划）**：
- **怎么点名**：只认会话 ID（可以只写开头几位，要唯一）。不认编号、`last`、标题里的词：按模糊条件删东西风险太大。
- **要删的地方**：
  - Claude Code 共 4 处：`<家目录>/projects/<项目>/<id>.jsonl`、`<家目录>/projects/<项目>/<id>/`（子代理、太大的工具输出）、`<家目录>/file-history/<id>/`（改文件前的备份）、`<家目录>/session-env/<id>/`；家目录是 `~/.claude`（认 `CLAUDE_CONFIG_DIR`），WSL 里删 Windows 那边的会话时就是挂载路径下的 `C:\Users\<用户>\.claude`（挂载位置按 `/etc/wsl.conf`，默认 `/mnt/c`），可以直接删；Windows 上删 WSL 的 Claude Code 会话，经 `\\wsl.localhost\<发行版>\home\<用户>\.claude` 直接删（第 ⑤ 步）；
  - Codex：调用 `codex delete --force <UUID>`，由 Codex 自己清理；
  - meme 自己的数据库里这个会话的记录（secure_delete）。
- **安全规则**：
  - 正在运行 meme 的会话（`CLAUDE_CODE_SESSION_ID`、`CODEX_THREAD_ID`）直接拒绝；
  - **开着的会话直接拒绝**（2026-10-12 第 ⑧.3 步，B5 事故后）：Claude Code 登记的开着的会话（`~/.claude/sessions/<pid>.json`），进程还在、启动时间对得上，就拒绝，`--yes` 也不行："<id> is open in Claude Code (<环境>, process <pid>). Close it there first. Nothing deleted."；选会话的列表里那一行写 `open now`。Codex 看 `~/.codex/thread-writer-locks/<id>.lock` 被哪个进程 `flock` 着（第 ⑧.4 步）；
  - **查不到开着没有、而最近 5 分钟写过的也拒绝**（2026-10-12 第 ⑧.4 步，作者定，代替下一条）："<id> was active <多久> ago and may still be open in <Agent>. Close it there first, or delete it in a few minutes. Nothing deleted."，`--yes` 也一样；查得到是关着的，刚写过也照常删；
  - ~~最近几分钟还在写的会话，额外警告，并要求再确认一次；~~
  - 先删原会话，成功后再删镜像；原会话没删掉，镜像也不动；
  - ~~Codex 只删本环境的会话：WSL 里的 meme 不用 WSL 的 `codex` 去删 Windows 上的 Codex 会话，只提示用户去 Windows 那边删（WSL 里的镜像会跟着删）；~~
  - **两边互删**（2026-10-10 作者定，改上一条）：用会话所在那一边的 codex 删，meme 照样不碰 Codex 的文件和数据库。Windows 上删 WSL 的 Codex 会话：通过 `wsl.exe` 在 WSL 里、用户的登录 shell 运行 `codex delete --force <id>`（在 WSL 的家目录里运行）；WSL 里删 Windows 的 Codex 会话：运行 WSL 能看到的 Windows codex（PATH 上的 `codex.cmd` / `codex.exe`，或 `%APPDATA%\npm\codex.cmd`），`.cmd` 经过 `cmd.exe`，在 Windows 用户目录（挂载路径下的 `c/Users`）里运行。同样先查那一边的 `codex delete --help` 里有没有 `--force`；那一边没有 codex 或不能用时，提示到那一边用 `/delete`。列出要做的事时写 "runs: codex delete --force <id> in WSL (Ubuntu)" / "on the Windows side"；
  - 先检查 `codex delete` 能不能用；不能用或执行失败时，不碰 Codex 的任何文件，只提示用户在 Codex 里用 `/delete`；
  - 删除前列出要删的内容并讲清风险：写明会调用 `codex delete --force <id>`，以及 Codex 的输入历史（`history.jsonl`）里还会留着用户输入过的话；用户回答 `y` 才删（`[y/N]`，见下面"确认方式"）；在 Agent 里运行（不是终端）时必须加 `--yes`。
- **续接链**（作者定）：删 B 时默认只删 B。如果 B 是从 A 续接出来的，删除前提示"A 里还留着这段对话的前半部分，只删 B 的话 A 会重新出现在列表里"，问用户要不要连 A 一起删，默认不删。在 Agent 里用 `--yes` 时只删指定的会话，加 `--chain` 才连前面的一起删。`forget A` 只删 A，B 不受影响（Claude Code 续接时会把 A 整段复制进 B，B 是独立的）。
- **Codex 分叉**（作者定）：删上级会话时，列出它的分叉、给出警告、再确认一次，只删指定的那个。警告里写明：删掉上级后，分叉在 Codex 里和 meme 里都会丢掉前面那段历史。
  - **2026-10-10 实测后改**：Codex **不让删还有分叉的会话**——对实验会话 "meme lab A1" 运行 `codex delete --force`，只报 "Error: failed to delete session"，什么都没删（加 `RUST_LOG=debug` 也没有更多信息）；先删掉它的分叉，再删它就成功了。所以照原来的"警告、再确认、只删上级"做不到。现在：上级会话的分叉没有一起点名时，直接拦下，说明"Codex 在还有分叉读它的历史时不删它"，列出分叉，提示一起点名（`meme forget <上级> <分叉>`，分叉先删）或先删分叉；一起点名时 meme 自动先删分叉、再删上级。提示里的命令用 §3.1 的短 ID（开头相同时自动多显示几位，不会匹配到两个）。
- **在终端里不写 ID**（2026-10-10 作者定）：打开和 `meme ls` 一样的列表，标题是 "Delete which session?"，Enter 选中（按键提示写 "Enter choose"），然后照常列出要删的内容、回答 `[y/N]`；Esc 退出，什么都不删。和 `meme continue` 用同一个列表。一次选一个；要删几个就写几个 ID。在 Agent 里或输出不是终端时，还是只认 ID。`meme ls` 里**不加**删除键：打字就是搜索，删除只能放在 Delete、Ctrl+D 这类键上，挨着 Enter 和空格容易按错，而且要离开全屏列表去确认、删完再回来；用下来还想要再加。
- **确认方式**（2026-10-10 作者定，原来要完整输入 `yes`）：`Delete this session? [y/N]`，输入 `y`（或 `yes`）再回车才删，只按回车是不删；刚写过的会话再问一次 `There are warnings above. Delete anyway? [y/N]`。不让回车默认删除：用列表选会话时选中也是按 Enter，多按一下不能直接删掉。开头那句 "deletes these sessions for good" 改成 "will permanently delete these sessions"（"for good" 不好懂）。
- ~~**最近几分钟还在写的会话**（2026-10-10 补）~~（2026-10-12 第 ⑧.4 步起：查得到是关着的照常删，查不到的直接拒绝，不再有第二次确认）：在终端里要再确认一次（`There are warnings above. Delete anyway? [y/N]`）；在 Agent 里用 `--yes` 时没法再确认一次，**直接不删**，提示到终端里运行 `meme forget`。

原来的说明：

- 先列出要删的内容：每个会话的标题、来源、时间、全部文件路径，包括子代理和大输出的目录。
- 讲清风险：删了找不回来；Agent 的 `/resume` 里也会消失；最近几分钟还在写的会话，额外警告它可能正在运行。
- ~~用户输入 `yes` 才删~~（2026-10-10 改成 `[y/N]`，见上面"确认方式"）。不是终端（比如 Agent 在运行）时，必须加 `--yes`。
- 删除内容：
  - 原会话的主文件和附属目录；
  - Codex 的会话还要处理 `session_index.jsonl` 里对应的那条，具体照 Codex 自己的 `/delete` 来，要先实测（§8）；
  - **2026-10-10 实测（A5）**：`codex delete --force <会话 UUID>`（没有终端时必须加 `--force`）删掉会话文件、`state_5.sqlite` 里 `threads` 那一行、`thread_history_1.sqlite` 里这个会话的轮次和条目，日志库里也不留；和界面里的 `/delete` 效果一样（界面还会删掉 `session_index.jsonl` 里改名留下的那一行；两种都留下 `history.jsonl` 里用户输入过的话，这是 Codex 自己的输入历史）。所以第 ④ 步的 `forget` 对 Codex 会话：先照常列出、讲清风险、等用户确认（`[y/N]`），再调用 `codex delete --force <UUID>`。
  - **2026-10-10 作者定**：`forget` 不自己改 Codex 的数据库。第 ③ 步的 A5 查清 Codex 删除时动了哪些东西以后：Codex 0.161 有对外的删除命令 `codex delete <会话 ID 或名字>`（还有 `codex archive` / `unarchive`），实测它删得完整，`forget` 就调用它；如果不能用，第一版对 Codex 会话只提示用户在 Codex 里用 `/delete`，镜像在下次运行 meme 时会自动跟着删；
  - 镜像里的记录，打开 secure_delete。
  - ~~这个会话的接力文件~~（2026-10-09 加的这一条，2026-10-10 去掉：不再生成接力文件）。

### 3.6 `meme install` / `uninstall` / `status`

- **2026-10-13 第 ⑨ 步改**：来源读不到时分三种写：Agent 的家目录不在写 `not installed`，在但镜像里没有它的会话写 `no sessions yet`，镜像里有它的会话却读不到写 `NOT READABLE (nothing deleted)`；只有最后一种记 log。`status` 去掉 `--plain`。`uninstall` 没有终端时的提示照 `forget` 的写法；`~/.meme` 是软链接时只删它指向的地方里 meme 自己的文件，再删链接。

- `meme install [--dry-run]`：照 §2.4。可以重复运行。打印找到的 Agent、导入了多少会话，最后写清用法（终端里 `meme continue`；Claude Code 里 `! meme continue` → `! meme continue <编号>`；Codex 里同样两条命令，再说"继续"），和 `meme continue --help` 里的说明是同一段文字（每家的几行在它的档案里）。
  - 2026-10-10 改：**不放 skill**（§3.7），`~/.meme` 以外什么都不写。Agent 的命令在 PATH 上就写 "found: <路径>"；只找到它的家目录（`~/.claude`，认 `CLAUDE_CONFIG_DIR`）就写 "sessions found, but `claude` is not on PATH"；
  - `--dry-run` 什么都不建：不建 `~/.meme`，只数一下各来源有几个会话文件；
  - PATH 上找不到 `meme` 时提醒一句（在 Claude Code 里用 `! meme continue` 要靠它）。
- `meme uninstall [--yes]`：
  - ~~只删带 meme 标记的 skill~~（2026-10-10：第一版不放 skill，这一条去掉）；
  - 确认后删掉 `~/.meme`（镜像和日志；2026-10-10 起没有接力文件和记住的列表）；
  - 告诉用户怎么删掉程序本身；
  - **不动任何原会话**。
  - 先列出要删的东西（`~/.meme` 和它的大小），再问 `Remove them? [y/N]`，输入 `y` 或 `yes` 才删，只按回车不删（2026-10-12 第 ⑧.2 步改，和 `forget` 一样；~~让用户输入 `yes`~~ 是 10-08 的做法）；不是终端又没加 `--yes` 时什么都不删，退出码 1。
- `meme status`：版本、数据目录、是不是只读模式、各来源能不能读到、会话数和记录数、数据库大小、上次导入时间。另外（第 ⑦、⑦.1 步）：
  - **读不了的文件**："Can't read: N sessions; …"，每个文件一行：标签、会话、文件、错误类型和第一行（不带会话原文）、Agent 版本、"shown as of <时间>" 或 "never read"；没有时写 "Can't read: none"；
  - **两层报警**："Record types: all known and read"；有问题时逐行写 "<Agent> <版本> writes record types meme doesn't know: X (N sessions)" 和 "<Agent> <版本>: N records of known types meme couldn't read (类型; N sessions)"；
  - 报问题时请附上 `meme status`（README 写了）：里面有 Agent 的版本。
  - Windows 上 WSL 没在运行时：`ls` 和全屏列表顶部写 "WSL (Ubuntu) is not running; its sessions are as of <时间>"（§3.1）；`status` 在来源表下面写同一句，那个发行版的来源那一行写 `not running`，不写上次同步时的 `readable`（2026-10-12 第 ⑧.2 步补；~~`status` 不写这一句~~ 是之前的缺口）。发布准备第 7 项还要加：`wsl.exe` 到超时都没回应时写 "WSL did not respond"（没做）。

### 3.7 skill（`skills/meme/SKILL.md`，英文）——**第一版不做**（D17）

**2026-10-10 作者定（选 A，arch D17）：第一版不装 skill，也不做 Agent 插件；`meme install` 不往任何 Agent 的目录写东西。** 接力完全由用户通过命令选择（§2.2、§2.3、§3.4），不让模型自己判断接哪个。第 ② 步写过的 skill 和 `install` / `uninstall` 里放、删 skill 的代码都已去掉；作者机器上开发时装过的 `~/.claude/skills/meme` 已删除。下面是当时的设计，留作以后参考。

V6 测过的底稿翻成英文，要点：
- **描述**：用户说 "/meme"，或者要接着做另一个会话（可能来自另一个 Agent、另一个环境）时使用；需要查以前会话里的细节时也用它。写明是"另一个会话"，避免把普通的"继续"误当成要接力。
- **接力一节**：运行 `meme continue`，选会话（拿不准就问用户），再运行 `meme continue <id>`；照接力内容开头的说明，先核对仓库现状；先总结、等用户确认再动手。
- **查历史一节**：`meme search` / `meme show` 的用法。写明：`meme search` 默认只列出用户和 AI 说的话；**要找命令、报错、代码时加 `--all`**，才会列出工具调用和工具输出里的命中（§3.3）。
- **删除**：只有用户明确要求、并在对话里确认过，才可以运行 `meme forget --yes`。
- 开头带一行标记 `<!-- meme-skill v1 -->`，安装和卸载靠它认出这是 meme 放的 skill。
- **找不到会话时**（2026-10-09 加）：skill 里写明，用户提到别的项目或别的环境（比如 Windows 上的某个项目），或者列表里找不到用户说的那个会话时，用 `meme continue -a` 再查一次。`meme continue` 的列表底部也会写其他项目还有多少会话（§3.1）。
- **怎么调用**（2026-10-09 定，§2.2）：通用的用法是直接说"接着上次……做"，各家支持 skill 的 Agent 都能用，README 里把它作为主要用法来教；手动点名时，Claude Code 用 `/meme`，Codex 文档说是 `$meme`（`/meme` 在 Codex 里不起作用），第 ③ 步实测后补进 README。所以 skill 的描述要让 Agent 能从自然语言里认出来：写明"接着做另一个/之前的会话"，并带一句中文的例子。`meme install` 最后的提示也先教自然语言的叫法。
- 2026-10-08 实现：标记放在 frontmatter（`---` 那几行）**后面**的第一行，因为 Claude Code 要求 frontmatter 在文件最开头。skill 的全文打进单文件里（`bun build --compile` 按文本导入），`install` 不需要额外的文件。"删除"一节等第 ④ 步有了 `meme forget` 再加。

---

## 4. 技术架构

### 4.1 技术栈

| 方面 | 选择 | 说明 |
|---|---|---|
| 语言、运行时 | TypeScript + Bun 1.4.x | 用 `bun build --compile` 打成各系统的单文件，单个约 80 MB（[release.md](../research/tech/release.md)） |
| 读会话 | `@letta-ai/trajectory` 0.4.3（固定版本，Apache-2.0），**用 `normalizeToCanonical`** | 关掉截断：`bounds.toolArguments` 和 `bounds.toolResults` 都设成 null。每条记录带着原记录 ID、顺序号、内容哈希（§4.6.2） |
| 数据库 | `bun:sqlite` | 不能注册自定义函数，所以正则在程序里匹配（§4.6.5） |
| 解压 | `node:zlib` 的 zstd | 用来读 Codex 以后可能压缩成 `.zst` 的会话 |
| 命令行参数 | `node:util` 的 `parseArgs` | 不引入别的依赖 |
| 交互界面 | 自己写一个小的：标准输入的 raw 模式加 ANSI 控制码 | 只有列表、预览、搜索框，不需要 Ink 那样的大框架 |
| 测试 | `bun test` | —— |
| 外部依赖 | 尽量只有 trajectory 一个 | 依赖越少，打出来的单文件越干净 |

### 4.2 代码目录

```
meme/
├── src/
│   ├── cli/            入口和命令：main.ts、args.ts、context.ts（每条命令的共同第一步）、target.ts（continue 的目标：编号、last、codex…）、usage.ts（两种用法的说明）、commands/{ls,show,search,continue,forget,install,uninstall,status}.ts
│   ├── adapters/       各 Agent 的适配：types.ts（接口、档案的类型）、read.ts（读 JSONL、丢掉写到一半的行、数不认识的记录类型）、claude-code.ts、codex.ts（读文件、启动、删除）、claude-code.profile.ts、codex.profile.ts（档案，第 ⑦ 步）、profiles.ts（档案登记）、index.ts
│   ├── store/          数据库：db.ts（打开方式、表结构、版本号、只读模式）、import.ts（增量导入、读不了的文件）、sync.ts（同步删除、续接复制标记）、queries.ts、search.ts（搜索）
│   ├── model/          外层信息怎么算：record.ts（记录类型、搜索文字）、formats.ts（各家档案里的文字格式和工具含义，合在一起用）、injected.ts（注入原因）、compaction.ts（压缩摘要的正文）、turns.ts（轮次、每轮摘要、最终回复、怎么结束的）、title.ts、project.ts、tools.ts（工具调用的一行摘要、改过的文件）
│   ├── redact/         脱敏规则：rules.ts
│   ├── handoff/        接力内容：build.ts、budget.ts（公共的 1.5 万 token 上限 + 档案里各家的上限，认不出时取最紧的）、chain.ts（接力链）、commands.ts（最近的命令、认出测试和构建）、place.ts（在不在会话那套文件上，第 ⑧ 步）
│   ├── render/         普通文字输出：ls.ts、show.ts、search.ts、labels.ts（颜色标签，取自档案）、text.ts（宽字符、截断、时间）
│   ├── tui/            交互界面：screen.ts（备用屏幕、按键、视图栈）、keys.ts、picker.ts（会话列表和预览）、viewer.ts（看一个会话）、handover.ts（推送时选 Agent）、choose.ts（选择框）
│   └── platform/       系统差异：env.ts、paths.ts（路径换算，WSL 的挂载位置按 wsl.conf）、wsl.ts（Windows 读 WSL：运行中的发行版、\\wsl.localhost、在 WSL 里启动）、fs.ts（Windows 重试）、log.ts、spawn.ts（启动 Agent）
├── scripts/            build.ts（交叉编译 5 个单文件、写校验和）；install.sh、install.ps1 在发布准备里做
├── test/
│   ├── fixtures/       合成会话的生成器（gen-claude.ts、gen-codex.ts）
│   ├── unit/           *.test.ts；real-sessions.test.ts 只在设了 MEME_REAL_SESSIONS=1 时读本机真实会话，只输出计数
│   └── e2e/            临时 HOME 里跑命令；设 MEME_BIN 时跑打包好的单文件
├── eval/               接力内容的内部检查脚本（v5.ts，V5 的做法；sizes.ts，全部会话的交接大小，只记数字），不打进发布包；输出在 .cache/eval/
├── README.md、README.zh-CN.md、CLAUDE.md、package.json、tsconfig.json
```

### 4.3 数据目录

```
~/.meme/                       （Windows：%USERPROFILE%\.meme）
├── meme.sqlite                镜像、会话列表、原文件状态；坏了、删了都能从原会话重建
└── logs/meme.log              出错记录和导入统计，超过 1 MB 就轮换
```

（2026-10-10 去掉 `handoffs/`：不再生成接力文件，接力内容每次现场算，§3.4。）

在 Unix 上，目录和数据库的权限设为只有本人可读写（0700 / 0600）。

### 4.4 数据库表

- **2026-10-22 第 ⑪ 步改：表结构版本 9**。`records` 加一列 `command`：Agent 自己跑的本地命令（`/model`）记 1（§6 ⑪ F7）。在这之前同一天升过 7、8：脱敏规则变了（§4.6.7、§6 ⑪ F1）；`sessions` 加一列 `source`：会话在不止一个来源里时，镜像存的是哪一份（§6 ⑪ F10）。这一步先升到 7（F1），F10 又加列，升到 8，免得用过中间构建的库缺这一列。
- **2026-10-13 第 ⑨ 步改：表结构版本 6**。`sources` 加一列 `state`（适配器说的、影响这个来源所有会话的文件的样子，现在是 Codex 的 `session_index.jsonl`，变了就把这个来源的会话全部重新转换）；转换和脱敏规则也变了。查版本和建表在一个 `BEGIN IMMEDIATE` 事务里；库的版本旧就在原文件里删表重建（再 `VACUUM`），不再删文件；库的版本比 meme 新就不碰它，在内存里重建。没有变化的运行不写库（来源那一行只在可读性、`state` 变了时写；Windows 上看 WSL 的来源，`last_scan` 最多 10 分钟补写一次）。

表的内容对应 [format.md](format.md)：每个会话 8 项，每条记录 4 项，外加里层记录和搜索用的文字。

现在是**版本 5**（下面的 SQL 就是代码里的，注释是对照 format.md 的编号；每个版本改了什么见 SQL 后面）：

```sql
PRAGMA journal_mode = DELETE;    -- 不用 WAL：只读打开更简单（V8 实测可行）
PRAGMA secure_delete = ON;       -- 删掉的内容用 0 覆盖（storage.md 2.3）
PRAGMA busy_timeout = 10000;     -- 几个 meme 同时运行时排队
PRAGMA foreign_keys = ON;

CREATE TABLE meta    (key TEXT PRIMARY KEY, value TEXT);   -- schema_version、last_import
CREATE TABLE sources (id TEXT PRIMARY KEY, agent TEXT, env TEXT, root TEXT, reachable INTEGER, last_scan TEXT);

CREATE TABLE sessions (
  id           TEXT PRIMARY KEY,   -- 1 会话 ID
  agent        TEXT NOT NULL,      -- 2 来源：claude-code | codex
  env          TEXT NOT NULL,      --        wsl | win | mac | linux
  project      TEXT,               -- 3 项目（会话开始的目录在 records 的 meta 记录里，推送用它，§3.4）
  title        TEXT,               -- 4 标题
  branch       TEXT,               -- 5 分支
  started_at   TEXT,               -- 6 开始和最后时间
  ended_at     TEXT,
  continued_in TEXT,               -- 8 续接到哪个会话
  forked_from  TEXT,               --   从哪个会话分叉出来（Codex，版本 2）
  fork_point   INTEGER             --   第几条记录起是它自己的
);
CREATE TABLE files (               -- 7 原文件（一个会话可能有几个）
  path    TEXT PRIMARY KEY,
  session TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  source  TEXT NOT NULL,
  size    INTEGER, mtime REAL
);
CREATE TABLE records (
  session  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  seq      INTEGER NOT NULL,       -- 第几条
  uid      TEXT,                   -- 1 原记录 ID：stable_source_record_id
  part     INTEGER NOT NULL,       --   component_index：一条原记录拆出来的第几个
  turn     INTEGER,                -- 2 第几轮
  injected TEXT,                   -- 3 注入原因：NULL 不是注入；harness | compact_summary | compaction（版本 3）
  copied   INTEGER NOT NULL,       -- 4 是不是续接复制来的
  role     TEXT, ts TEXT,
  body     TEXT NOT NULL,          -- 里层：trajectory 的原样记录（JSON，已脱敏）
  text     TEXT,                   -- 搜索用的纯文字（已脱敏）
  hash     TEXT NOT NULL,          -- 用来判断这条记录有没有变（见下面的说明）
  PRIMARY KEY (session, seq)
);
-- 转换失败的文件（format.md 3.1，版本 4）；文件和 meme 都没变就不再重试
CREATE TABLE failures (
  path    TEXT PRIMARY KEY,
  session TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  size    INTEGER, mtime REAL,
  error   TEXT NOT NULL,           -- 错误类型和第一行，不带会话原文
  version TEXT,                    -- Agent 版本（读得到的话）
  as_of   TEXT,                    -- 有旧镜像时，它是哪个时间的内容
  meme    TEXT NOT NULL,           -- 哪个 meme 版本失败的
  at      TEXT NOT NULL
);
-- meme 读不了的行（format.md 3.1，版本 4、5）：kind 'unknown' 是档案没列的类型，'unread' 是列了、却没变成任何记录
CREATE TABLE unknown_types (
  session TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  kind    TEXT NOT NULL,
  type    TEXT NOT NULL,
  version TEXT NOT NULL,
  count   INTEGER NOT NULL,
  PRIMARY KEY (session, kind, type, version)
);
CREATE INDEX records_uid ON records(uid);
CREATE INDEX failures_session ON failures(session);
CREATE INDEX sessions_project ON sessions(project, ended_at);
CREATE INDEX files_session ON files(session);
CREATE INDEX sessions_continued ON sessions(continued_in);
CREATE INDEX sessions_forked ON sessions(forked_from);
```

- 表结构的版本号写在 `meta` 里。版本对不上时，**直接删库，从原会话重建**，不写迁移脚本。数据库文件坏了也一样重建。
- **2026-10-12（第 ⑦.1 步）版本 5**：`unknown_types` 加一列 `kind`：`unknown` 是档案没列的类型，`unread` 是档案列了、但那一行没变成任何记录（§6 ⑦.1）。
- **2026-10-12（第 ⑦ 步）版本 4**：加两张表（arch.md 6.1 节）。`failures`：转换失败的文件（路径、会话、大小和修改时间、错误类型和第一行、Agent 版本、旧镜像的时间 `as_of`、哪个 meme 版本失败的、什么时候）；文件和 meme 版本都没变就不再重试。`unknown_types`：每个会话里档案没列的记录类型（类型、Agent 版本、行数）。
- **2026-10-12（第 ⑥ 步）版本 3**：`records.injected` 从"是 / 否"改成注入原因（format.md 第 3 项）：`harness`（Agent 外壳写的：`isMeta`、提醒、展开的命令、指令）、`compact_summary`（压缩摘要，能读）、`compaction`（压缩过，摘要读不了，只是个标记）。
- **2026-10-10（第 ③ 步）版本 2**：`sessions` 加两列 `forked_from`（从哪个会话分叉出来）和 `fork_point`（分叉出来的会话里，第几条记录起是它自己的）；`files` 里一个会话可以有几行（Codex 回退后多一个文件）。
- **2026-10-08 实现时的调整**：
  - `hash` 不直接用 trajectory 的 `record_hash`，而是对"原记录 ID、`part`、轮次、是否注入、角色、时间、脱敏后的里层记录"一起算哈希（`Bun.hash`）。原因：`record_hash` 只管 trajectory 那条记录本身，前面的记录变了导致轮次变化、或者 `isMeta` 这类原文标记变化时，它不变，镜像就不会更新。
  - 另外加了两个索引：`files(session)`、`sessions(continued_in)`，给同步删除和续接复制标记用。
- 不建全文检索索引（D16）。

### 4.5 适配层接口

现在的接口（`src/adapters/types.ts`，第 ⑦ 步以后；每家两份文件：适配器读文件、启动、删除，档案写这家的其余知识）：

```ts
interface Adapter {                                    // claude-code.ts、codex.ts
  agent: Agent;
  roots(p: Platform): SourceRoot[];                    // 来源目录，两边对称：WSL 里还有挂载路径下 Windows 的，Windows 上还有运行中的 WSL 发行版的
  listFiles(root: SourceRoot): string[];               // 主会话文件；整个目录读不到时抛错（一条都不删）
  sessionId(path: string): string | null;
  readText(path: string): string;                      // 处理 .zst，丢掉写到一半的最后一行
  convert(files: string[], ctx): Converted;            // trajectory（关掉截断）+ meme 补的外层信息；另外数出不认识、读不出的行（两层报警）
  peek(files: string[], ctx): Peeked;                  // 读不了时不靠 trajectory 拿目录、时间、标题、版本；从不抛错（第 ⑦ 步）
  home(p: Platform): string;                           // Agent 的家目录，比如 ~/.claude；在就算装了
  forgetPlan(target, p: Platform): ForgetPlan;         // 怎么删：Claude Code 删 4 处文件，Codex 用那一边的 codex delete（§3.5）
  launch(firstMessage: string): { cmd: string; args: string[] };   // 启动目录由 continue 定：会话开始的目录（§3.4，第 ⑧ 步）
}

interface Profile {                                    // claude-code.profile.ts、codex.profile.ts，登记在 profiles.ts
  // 名字、简称（标签）、颜色、别名（--agent、--in、continue 的目标词）、启动命令、家目录和改它的变量、归档目录、项目说明文件名
  // inside(vars)、sessionVar、nesting：在不在这家里运行、当前会话 ID 的变量、嵌套时谁优先
  // outputLimit：这家对命令输出的上限和单位（Claude Code 2.7 万字节、Codex 3.6 万字节，§4.6.6；第 ⑧.3 步前 Claude Code 是 2.5 万字符）
  // homeOf(root)：这个来源所在的 Agent 家目录，不存在就是没装（第 ⑧.3 步）
  // openSessions(root)：这家登记的开着的会话（只有 Claude Code 有，第 ⑧.3 步）
  // bangReachesModel、firstMessage、howToContinue、forgetHelp、keepsForkParents
  // compaction：压缩行为（原记录在不在、摘要能不能读、怎么认）
  // formats：记录里的文字格式（注入、打断、命令输出、! 命令、太长输出的提示、工具结果的头几行、退出码、压缩摘要前后的话）
  // tools：工具调用的含义（哪个是 shell 命令、改了哪些文件、怎么显示）
  // recordTypes、conversation、expectedDrop：认识的记录类型清单，哪些每一行都该变成记录，哪些丢掉是正常的（两层报警）
}
```

其余代码只看统一格式和档案，不按 Agent 分支（第 ⑦ 步验收：适配器以外搜 "codex"、"claude-code"、`CODEX_`、`CLAUDE` 只剩档案登记和测试）。下面这张表是两家的具体情况，内容现在都在适配器和档案里。

| | Claude Code | Codex |
|---|---|---|
| 来源目录 | `~/.claude/projects`（支持 `CLAUDE_CONFIG_DIR`）；WSL 里还有挂载路径下的 `<挂载位置>c/Users/*/.claude/projects`（挂载位置按 `/etc/wsl.conf`，默认 `/mnt/`）；Windows 上还有运行中发行版的 `\\wsl.localhost\<发行版>\home\*\.claude\projects` | `~/.codex/sessions`、`~/.codex/archived_sessions`（支持 `CODEX_HOME`）；两边对称，同样找挂载路径下的和 WSL 里的 |
| 主会话文件 | `<项目>/<uuid>.jsonl`。只扫这一层，子代理和 `journal.jsonl` 在下一层，不会扫到 | `~/.codex`（认 `CODEX_HOME`；另一边的同上）下的 `sessions/年/月/日/` 和 `archived_sessions/`，算**一个**来源目录，所以归档只是挪文件、不算删除。文件名 `rollout-<时间>-<uuid>[_<uuid>].jsonl[.zst]`。会话 ID 取第一个 UUID；回退后同一个会话有几个文件（2026-10-10 实测）。同一个文件既有 `.jsonl` 又有 `.zst` 时读不压缩的那个 |
| 会话 ID | 文件名 | 文件名里的第一个 UUID，和 `session_meta.id` 对照 |
| 标题 | `custom-title` → `ai-title` → 第一条用户消息 | `session_index.jsonl` 的 `thread_name` → 第一条用户消息；改名后的标题如果只在数据库里，再只读地查 `state_5.sqlite` 的 `threads`（A1 实测后定） |
| 启动目录、分支 | 第一条记录的 `cwd`；最后一条记录的 `gitBranch` | `session_meta.cwd`；`turn_context` 或 `session_meta.git` |
| 续接 | `continued-in` 记录；复制来的历史靠 `uuid` 对上（§4.6.4） | **2026-10-10 实测后改**：分叉和回退都写在新文件的 `session_meta.history_base`（`thread_id`、`end_byte_offset`）里，新文件**不重放**历史。会话 = `history_base` 指向的那个文件截到 `end_byte_offset` 之前 + 新文件自己；回退指向本会话的前一个文件，分叉指向上级会话的文件（`forked_from_id`）。按同一个文件、同一个位置读出来的记录 ID 一样，所以分叉里来自上级的那段，照 §4.6.4 用 ID 就能标成"复制来的"，**不用原文比对**（原来的决定只留给旧格式里会重放历史的分叉，目前没见到）。`show` 在分叉处加 "── forked from <上级> ──"，位置按 `fork_point` 定。分叉出来的会话照常列出，不像续接那样藏在后一个会话后面；标题取它自己的第一句话 |
| 系统注入 | 要自己认（§4.6.3） | trajectory 已经去掉（`<environment_context>` 等几种开头、developer 角色）；`# AGENTS.md instructions` 由 meme 认成注入（写在 Codex 档案的 `formats.injected` 里） |
| 原记录 ID | `stable_source_record_id`，就是原记录的 `uuid`（native，§4.6.2） | `stable_source_record_id`，按会话 ID 和文件里的字节位置生成（location，一串哈希）。回退后的新文件，ID 前面加上文件名里的第二个 UUID，免得和前一个文件撞上 |
| 改过的文件 | Edit / Write / MultiEdit / NotebookEdit 的 `file_path` | 补丁里的 `*** Add/Update/Delete File:`。**2026-10-10 实测**：Codex 0.161 起模型只调用一个工具 `exec`，参数是一小段 JavaScript，跑命令是 `tools.exec_command({cmd: "…"})`，改文件是一段补丁字符串；meme 从这段代码里取出命令和补丁里的文件，显示成 `exec_command <命令>`、`apply_patch <文件>`。旧的 `shell`、`exec_command`、`apply_patch` 工具也认 |
| 工具是否失败 | `tool_result_ok`（实测约一半的工具结果带着这个标记），其余看原记录的 `is_error` | 没有（`tool_result_ok` 全是 null）；结果开头有 "Exit code N" / "Process exited with code N" 时按它判断，"Script failed" 也算失败，其余标成不知道（交接里"最近的命令"写 "(no exit code) <第一行>"，"最后一次验证"写 "finished (no exit code)"，§4.6.6）。显示时去掉结果开头的 "Script completed / Wall time / Output:" 这几行 |
| 启动 | `claude "<第一条消息>" --allowedTools "Bash(meme:*)"`，在会话开始的目录 | `codex "<第一条消息>"`，在会话开始的目录 |
| 归档 | —— | `archived_sessions/` 里的会话照样列出来，在 `ls` 和 `show` 里用暗色标 "archived"（2026-10-10 作者定，回答了 format.md 第 5 节的问题） |
| Agent 自己的数据库 | —— | Codex 0.161 另有 `state_5.sqlite`（`threads`、`thread_spawn_edges` 等表）和 `thread_history_1.sqlite`。**meme 只读、绝不写**（2026-10-10 作者定）：优先用会话文件和 `session_index.jsonl`；只有数据库里才有的信息（比如改名后的标题）才以只读方式去查；表结构或文件名变了，就安全地退回去只用文件 |
| ~~skill 目录~~ | —— | ——（2026-10-10：第一版不装 skill） |
| 当前会话 | 环境变量 `CLAUDE_CODE_SESSION_ID` | 环境变量 `CODEX_THREAD_ID`（2026-10-10 实测，工具跑的命令和界面里 `!` 跑的命令都有） |
| 标题、时间的细节 | —— | 只有改过名的会话在 `session_index.jsonl` 里有一行（追加写，最后一行为准），`codex exec` 跑的会话没有；所以不用读数据库。Codex 启动时会往旧会话文件末尾补一行 `thread_settings_applied`，文件修改时间和最后一行都不代表活动，"最后时间"只看对话和轮次的记录；"可能还在运行"也改成按这个时间判断（两家都是） |

### 4.6 关键算法

**4.6.1 增量导入**（[storage.md](../research/tech/storage.md) 2.4、2.5）
1. 对每个来源目录：读不到（目录不存在、没有权限、`/mnt/c` 没挂上），就把这个来源记成"读不到"，跳过它，**不删任何东西**。
2. 列出主会话文件，按会话 ID 归组。归档的和没归档的同时存在时，取没归档的那个。（2026-10-10 实现：一组里任何一个文件新出现、变了或不见了，就把这一组一起重新转换；Codex 的分叉还要读上级会话的文件，适配器拿得到同一个来源目录里别的会话的文件。）
3. 每个文件：大小和修改时间都和上次一样，就跳过。注意，在 Windows 上 Codex 写会话时修改时间不会变，所以两个都要比。
4. 有变化：读整个文件；去掉写到一半的最后一行；用 trajectory 转换；算外层信息；脱敏；每条记录算一个哈希。
5. 在一个事务里（`BEGIN IMMEDIATE`），按 `(session, seq)` 对比哈希：只写变了的，删掉多出来的。
6. 单个文件读失败，保留旧的镜像，记一条日志。
7. 全部做完后，重新算一遍"复制来的记录"（§4.6.4）。

**4.6.2 原记录 ID**
- **2026-10-08 更新**：改用 trajectory 的 `normalizeToCanonical`。它给每条记录一个 `stable_source_record_id`：Claude Code 的就是原记录的 `uuid`（`source_identity_kind = native`，在作者的会话上实测 4,297 条全部对上）；Codex 的记录本身没有 ID，按记录在文件里的位置生成（`location`）。一条原记录可能拆成几条，要用 `(stable_source_record_id, component_index)` 一起认。它还给出顺序号（`source_order_id`）、内容哈希（`record_hash`）和 `tool_result_ok`。
- 所以不用再按时间戳去猜（原来的办法实测 99.9% 能对上，见 [storage.md](../research/tech/storage.md) 2.2）。
- 判断记录有没有变：见 §4.4 的说明（2026-10-08 改成自己算）。记录的顺序（`seq`）就是 trajectory 输出的顺序，实测和文件里的顺序一致，和 `normalizeTranscript` 的输出逐条相同（作者全部 15 个会话，按键名排序后比较）。
- 用单元测试盯住"Claude Code 的 ID 全是 native、都能在原文件里找到"，trajectory 升级时才能及时发现问题。

**4.6.3 认出系统注入的消息**（Claude Code，[list.md](../research/tech/list.md) 第 5 节；2026-10-08 按 trajectory 0.4.3 的实测重写）

trajectory 读 Claude Code 时已经去掉了一部分，剩下的要 meme 自己认。在作者的会话上实测（canonical 输出里的用户记录）：

| 原文里的 | trajectory 0.4.3 | meme 怎么处理 |
|---|---|---|
| 带 `isMeta` 的消息（展开后的 skill、命令提示词等） | **留着**，71 条 | 用原记录 ID（`uuid`）回原文查 `isMeta`，标成注入 |
| 压缩摘要（`isCompactSummary`） | **留着**，1 条 | 同上，标成注入 |
| `[Request interrupted by user…]` | **留着**，15 条 | 不算注入，也不开新的一轮；标记这一轮"被打断" |
| 整条都是 `<system-reminder>`、以 `<task-notification>` 开头、`<local-command-caveat>` | 去掉了（实测 0 条；`<system-reminder>` 那几条本来就带 `isMeta`） | 仍按内容再认一遍，作为兜底 |
| 本地命令的输出 `<local-command-stdout>` / `<local-command-stderr>` | 去掉了（0 条） | —— |
| **本地命令本身** `<command-name>/model</command-name>` | **也去掉了**（当成噪音） | 命令是用户敲的，要算用户的一句话、开一轮（比如 `/statusline`、`/model`、`/exit`）。meme 从原文把它**补回来**：一条 `{"role":"user","content":"/名字 参数"}`，原记录 ID 用那一行的 `uuid`，按文件里的位置插回去。新版本 Claude Code 把本地命令写成 `type: system, subtype: local_command`，老版本写成 `type: user`，两种都认 |
| 用 `!` 敲的命令 `<bash-input>` / 输出 `<bash-stdout>` | 留着（各 1 条） | 输入算用户的一句话（显示成 `! 命令`）；输出不算注入，也不开新的一轮 |

- 注入的消息：`show` 默认只显示一行"⚙ injected message (hidden)"，`search` 不搜，算轮次时跳过。
- **压缩**（2026-10-12，第 ⑥ 步，handoff.md 7.8 节）：
  - Claude Code：带 `isCompactSummary` 的记成 `compact_summary`。`/compact` 写两遍（压缩前一条纯文本、压缩后一条 `<command-name>`），中间 AI 什么都没做，只算一轮：补回命令时，和前一条用户的话（不是补回来的）文字相同、中间没有 AI 的记录，就不再补。自动压缩没有 `/compact`，只有边界和摘要，不加轮次。
  - Codex：trajectory 不输出 `compacted` 项，meme 从原文读（Codex 的记录 ID 是"会话 ID + 字节位置"的哈希，照 trajectory 的算法对回原文的行）。`compacted.message` 去掉 "Another language model started…" 前缀就是摘要；它前面那条文字相同的 AI 消息记成 `compact_summary`，不算 AI 说的话；找不到这样的消息（比如摘要加密），就在 `compacted` 的位置补一条 `system` 记录：能读的放摘要（`compact_summary`），读不了的内容为空（`compaction`）。
  - 摘要的正文：去掉 Claude Code 开头的 "This session is being continued…Summary:" 和结尾给模型的话（完整记录在哪、"不要问用户直接接着做"、"后面是压缩前最近的几条原文"），去掉 Codex 的前缀。
  - `show`：折叠时在压缩的那一轮下面加一行 `── compacted here ──`；展开时在原位置显示这一行，`--all` 时下面显示摘要。
- 只有命令、没有对话的会话（比如只敲了 `/model`），trajectory 会报"没有用户消息"。meme 不当成出错：会话照样存，只有补回来的命令这一条记录；`ls` 不列出没有任何 AI 回复的会话。
- `isSidechain` 的行不读（子代理的过程在它自己的文件里）。

**4.6.4 轮次、续接复制、怎么结束的**
- **轮次**：遇到一条真正的用户消息就加一，注入的不算。
- **续接复制**：会话 A 有一条 `continued-in → B`，那么 B 里 `uid` 和 A 里某条相同的记录，就标成"复制来的"。A 被删掉后，B 的这个标记清掉。
- **怎么结束的**（只在预览和接力时现算）：
  - 最后一条是打断标记：被打断；
  - 最后一条是工具调用，或者是没有后续回复的工具结果：没回完；
  - 最后一条是用户的话、没有回复：没回完；但如果是 `/命令`（`/exit`、`/model` 这类本地命令），算正常结束；
  - 跳过末尾的注入消息、推理再看；
  - 原文件最近 5 分钟内还在写：可能还在运行。

**4.6.5 搜索**（[list.md](../research/tech/list.md) 第 8 节）
- 先按范围取候选记录：当前项目、`-a` 全部，或 `--session`；排除注入的和复制来的。
- `-F`：在 SQL 里用 `instr`；加 `-i` 时两边都转小写。不用 `LIKE`，因为它会把 `_` 当成通配符。
- 正则：先把候选记录取出来，再在程序里用 JS 的 `RegExp` 匹配。实测 520 万字逐条比对只要 5 到 12 毫秒，放大 50 倍是 0.33 秒。
- 结果按会话分组，最近的在前；工具调用、工具输出里的命中单独计数，默认不列出（§3.3）。
- 2026-10-08 实现时定下的细节：
  - 按**续接链**分组，显示在链上最新的会话下面；老会话里的命中，换算成新会话里同一条记录的轮次，所以 `→ meme show <新会话> <轮次>` 能直接打开；
  - `--session <会话>` 连同它续接过来的老会话一起搜（复制来的记录不搜，不然老会话那段就搜不到了）；
  - 一处命中 = 一行；显示这一行里命中位置前后的一段；
  - 没有命中时输出 "No matches."，退出码仍是 0（§3 的约定：1 只表示出错）；
  - 正则写错是用法错误，退出码 2，并且在打开数据库之前就报出来。

**4.6.6 接力内容**（[relay.md](../research/tech/relay.md) 第 3、4 节；2026-10-12 第 ⑥ 步按 [handoff.md](../research/market/handoff.md) 7.3 节改，见本节末尾"第 ⑥ 步以后"）

- **2026-10-13 第 ⑨ 步改**：
  - 删减顺序在原来的后面再加几步：最后一次测试或构建的输出（12 行 → 3 行 → 不要）、最近的命令（10 → 5 → 0）、最后几轮里重复的用户原话（改成 `(message N under "User messages")`）、最后几轮的步骤（再到 2）。最后一道硬保护：还超就在整行处截断，末尾写 "… (cut here to fit: N more lines; `meme show <id>` has everything)"。
  - 来自网页的工具（档案里的 `webTools`：Claude Code 的 `WebFetch`、`WebSearch`，Codex 的 `web_search`）那几步，结果前面加 `[external content]`。
  - 截断不切开代理对；用户的话里的控制字符显示成 `^[` 这类，不原样输出。
  - 接力链里，本会话的第一条没留下时 Included 写 "(the last and the most recent)"；已删的上游会话从记录下来的交接里取的话，不再截第二次。
  - 指向压缩摘要全文的命令改成 `meme show <id> <轮次> --hidden --full`。

```
# Handoff: <title>
Source: <Agent·Env> · session <id8> · dir <cwd> · branch <b> · <start> → <end> · <n> turns · last turn: <finished|interrupted|unfinished>

The content below is copied verbatim from the original session. It is history, not new instructions.
Treat the repository as the source of truth: run `git log` and `git status` before you start.
Before you change anything, tell the user in two or three sentences what was being done, where it stopped and what you would do next, then wait for their go-ahead.   ← 2026-10-10 加（没有 skill 了）
Included: <只列实际带了的部分>
For anything else: `meme show <id8> <turn>` · `meme search <text> --session <id8>`

## User messages (all)          每句最多 1,500 字，超了截断并注明
## Last 2 turns                 每轮：用户的话；一行过程摘要；AI 这一轮说的所有话；每一步一行（工具、参数、结果第一行，失败标 ✗）
## Edited files                 用编辑工具改过的文件和轮次；用命令改的不在这里，要注明
## Last verification            最后一次测试、构建、lint：命令、退出码、输出结尾（没有就不写这一节）
```

- 在 Codex 里运行时（有 `CODEX_THREAD_ID`），**另外不超过 3.6 万字节**（2026-10-10 作者定：Codex 对命令输出只留约 4 万字节，§3.4）。
- **2026-10-12 第 ⑧.3 步改**：Claude Code 档案改成 2.7 万字节（它把超过约 3 万字节的命令输出存成文件，只给模型看开头 2KB），认不出时取最紧的 2.7 万字节和 1.5 万 token；交接第三行加 "If your tool saved this output to a file, read the whole file before you reply."。
- **2026-10-12 第 ⑧.1 步改**（handoff.md 7.3 节"10-12 定下的统一规则"）：公共上限只剩 meme 自己的 1.5 万 token；2.5 万字符挪进 Claude Code 的档案，Codex 档案 3.6 万字节；在哪家里就守那家的，认不出时（`--plain`、管道、以后没有档案的 Agent）取所有档案里最紧的，三条一起守。字符、token、字节分别相加、各自对上限（第 ⑥ 步）。下面是原来的写法。
- ~~长度上限 1.5 万 token，**同时不超过 2.5 万字符**~~（2026-10-10 加：Claude Code 里 `!` 的输出和 Bash 工具的输出默认只留 3 万字符，接力内容要完整进到会话里）。估算 token：中日韩字每字算 1，其余每 4 个字符算 1。两个上限一起算：每段文字按"字符数"和"token 数 × 2.5 万 / 1.5 万"中较大的那个记，总数不超过 2.5 万；再留出总量 3% 给最后才知道的说明文字。
- 超出上限时：用户的话必留第一句和最后一句，再从新往旧补；每句要么整句留、要么整句删；中间省略的写明用 `meme search` 去查。
- `--fresh`：只带 "User messages" 一节和"以仓库为准"的提醒。
- 用户的原话照原样放，不翻译；标题和说明文字都用英文。
- **2026-10-08 实现时定下的细节**：
  - "最后 2 轮"取最后 2 个**有 AI 动作**（回复或工具调用）的轮次，跳过末尾只有 `/exit`、`/model` 这类本地命令的轮次；
  - 开头的 Source 一行写本地能用的目录；WSL 里接 Windows 会话时写成 `/mnt/c/...`，括号里附原来的 `C:\...`，并多写一行提醒：在 WSL 里对这个仓库跑 git 要加 `-c core.autocrlf=true -c core.filemode=false`（relay.md 第 2 节）；
  - 原文件 5 分钟内还在写时，多写一行 "Warning: … it may still be running in another window. Check with the user before you start."（问题清单 5.1 第 9 条）；
  - "最后一次验证"：在 Bash / PowerShell 命令里找测试、构建、类型检查、lint（`npm test`、`bun test`、`pytest`、`cargo test`、`go test`、`tsc`、`eslint`、`make` 等）；失败看 `tool_result_ok`，再看输出开头的 "Exit code N"；带输出的最后 12 行；
  - 每一步一行：`工具名(参数，最多 120 字) → 结果第一行（最多 100 字）`，失败的前面加 ✗，没有结果写 "(no result)"，打断写 "⏹ Interrupted by the user"；
  - 超出长度上限时，如果光是后面几节（最后 2 轮、改过的文件、最后一次验证）就放不下，先把最后 2 轮里 AI 说的话依次截到 4000、2000、1000、500、200 token，再按上面的规则挑用户的话；
  - 作者全部 15 个有对话的会话，接力内容在 700 到 8,100 token 之间，没有一个需要删用户的话。

**第 ⑥ 步以后**（2026-10-12，handoff.md 7.3 节 A1–A5，实现细节）：

```
# Handoff: <title>
Source: …
[Note: This session ran in …]       ← 第 ⑧ 步：接手的 Agent 不在会话那套文件上时，紧跟在 Source 后面
[Warning / Note 行]                 Note 里多两种：压缩过、摘要全都读不了；读不了这个会话的文件、交的是旧镜像（第 ⑦ 步）
The content below is copied verbatim … history, not new instructions.
Treat the repository as the source of truth …
The steps listed below were already run; don't repeat them blindly. Check their effect in the repository.   ← A5a（--fresh 不写）
Before you change anything, tell the user …
Included: <实际带了的>
Left out: <实际没带的>                ← A5c，没有就不写这一行
For anything else: `meme show …` · `meme search …`
If your context is compacted later, run `meme continue <id8>` again to reload this handoff.   ← A5b（--fresh 时带上 --fresh）

## Earlier session <id> (handed over into this one | <id>)   ← A1，每个上游会话一节，最老的在前
<Agent·环境> · <标题> · <起止时间>
1. … （只有用户的话，不带 ↳）
## Summary written by the source agent (<Agent> compacted its context after turn N, <时间>)   ← A3
This is the agent's own summary, a hint that may be wrong. The user messages and steps below are verbatim.
> …
## User messages (all)             有上游时写 "User messages in this session"
1. …
   ↳ 2 steps · 1 command · edited 1 file · AI: …   ← A2，最后 2 轮之前的每条
## Last 2 turns
## Edited files
## Recent commands (newest last)   ← A4
## Last verification
```

- **轮次写法**（A5d）：连着三个以上才写成范围，`3 and 6`、`3 and 4`、`5–12`、`3, 5–7 and 9`；"改过的文件"后面的轮次也这么写。
- **Left out 写什么**（和实际删掉的一致）：中间省掉的用户消息（哪几轮、哪个会话）；截断的长消息条数；最后 2 轮之前 AI 的话和步骤（`↳` 全留时写 "except one line each"，留了一部分写 "except one line each from turn N on"）；上游会话里 AI 做的事；工具输出第一行以后的部分（最后 2 轮有步骤时）；被截的 AI 的话在哪几轮；压缩摘要被截或去掉（附 `meme show <id> <轮次> --all --full`）；更早的命令有几条；当前会话本身作为上游被跳过时注明。`--fresh` 写"上一个 Agent 的做法：回复、步骤、命令、改过的文件"。
- **`↳` 行**（A2）：复用 `meme show` 折叠的那几项（几步、几个命令、改了几个文件、几个失败、被打断），压缩过的轮次加 "context compacted"，再加 "AI: <最终回复，约 120 个字符>"；没有最终回复、也没被打断时写 "no reply"。**最终回复 = 这一轮最后一次工具调用之后 AI 说的话**：Codex 的 `final_answer` 也就是这一条（作者 4 个 Codex 会话 11 轮全部一致），不用另存 Codex 的 phase 标记；Claude Code 这一轮停在工具调用上（被打断、没回完）时也就没有最终回复，不会把"我先看一下"当回复。只有本会话的消息带 `↳`，上游的不带；最后 2 轮之间的轮次（比如两轮之间的 `/compact`、`/model`）不带。
- **压缩摘要**（A3）：只带最后一次能读的；之后还有读不了的，加一句 "It compacted again after turn M, but that summary cannot be read; this one covers up to turn N."；一次能读的都没有，开头写 Note："… and its summary cannot be read (encrypted, or written in a way meme does not know); only the records below are included."（第 ⑧ 步改，原来写"加密"：现在也可能是格式变了）。"after turn N" 的 N 是压缩前 AI 最后动过的那一轮；压缩之后这一轮 AI 还在接着做（自动压缩在一轮中间）时写 "during turn N"。最多 3,000 token，按行截断，截了注明 `meme show <id> <轮次> --all --full`。AI 摘要模式以后再说。
- **最近的命令**（A4）：最后 2 轮以外、AI 用工具跑的 shell 命令（用户 `!` 敲的不算，它们已经在用户的话里），最近 10 条；纯读取的跳过：每一段（按不在引号里的 `&&`、`||`、`;`、`|`、换行分开）都是 `ls`、`cat`、`head`、`tail`、`pwd`、`echo`、`grep`、`rg`、`find`、`wc`、`cd`、`git status/log/diff/show`、PowerShell 的 `Get-Content`/`Get-ChildItem`/`Get-Location`/`Select-String`，或者 meme 自己；有 `>` 写文件的不算纯读取（`cat > f <<EOF`）。结果：失败 `✗ exit N`（没有退出码写 `✗ failed`），成功 `ok`，没有结果记录 `no result`；**有输出但判断不出成败时写 `(no exit code) <输出第一行>`**：Codex 的代码模式只报告脚本跑完（"Script completed"），里面的命令失败了也看不出来，10-12 测试会话里 `python hello.py` 实际是 "command not found"。比 10 条多时 Left out 写 "N older commands"。
- **接力链**（A1）：
  - **只认真的拉取**：交接头必须是一条单独的 `meme continue <参数>` 的输出（Agent 用工具跑的，或用户 `!` 敲的；Codex 的 `!` 命令和输出记在一起），输出开头就是交接头（前面可以有 meme 的 stderr 说明、Claude Code 输出太长时的 "Output too large … Preview" 那段）。管道、`| head`、读文件、测试里打印出来的都不算：开发 meme 的会话 `7e629e49` 里有 7 处这样的交接头，按"出现就算"会多出 10 个假的上游会话。
  - **例外：meme 推送开始的那一轮**（2026-10-12 第 ⑧.3 步）：这一轮的第一条消息是 meme 的推送消息（`Continue an earlier session: run \`meme continue <id>\` …`），Agent 跑的命令里有一段是 `meme continue <同一个会话>`（可以加了 `2>&1 | head`、前面有 `command -v meme;`），输出前 5 行内有交接头（输出被存成文件时看 2KB 预览），就算。`7373e17e`（B4）、`39390dea`（10-10 推进 muse）就是这样断的。别的轮次照旧只认单独的命令：作者给的"有一段 `meme continue`、输出开头几行有交接头就算"在作者会话里多认出 4 处（开发、设计窗口在看交接输出），见 §6 ⑧.3。
  - **2026-10-10 开发期间的 `@接力文件`**（v0.8，只存在了一天）：第一条消息 `@…/.meme/handoffs/<id8>-<日期>.md` 也认，只认得出 id（文件内容是附件，不在记录里）。`01a124ba` 的链要靠它才能找到真正的目标 `164801e9`。
  - 上游会话只取交接那一刻之前的记录（按交接头那条记录的时间截）。一直往上找（最多 8 层），每个会话只出现一次。顺序：先它的上游、再它自己（最老的在前）。
  - 上游会话不在镜像里：从记下的交接原文解析 "User messages" 一节（跳过 `↳` 行、"… left out" 行），原文里的 "Earlier session" 各节也解析；这些更早的会话还在镜像里时，优先从镜像取。
  - **不算用户说的话**：`! meme …`、`/meme`、终端推送的第一条消息（"Continue an earlier session: run `meme continue …`"）、`@…/.meme/handoffs/…`。本会话的这类消息也不列，编号照旧（会出现跳号）。
  - 正在调用 meme 的会话（`CLAUDE_CODE_SESSION_ID` / `CODEX_THREAD_ID`）是上游时跳过那一节，也不再往上找，Left out 里注明（S3）。
- **长度**：上限见本节开头（第 ⑧.1 步：公共 1.5 万 token，各家的在档案里，认不出时取最紧的）。删减顺序：`↳` 行（从最旧的删起）→ 压缩摘要（3,000 → 1,000 → 去掉）→ 最后 2 轮中间的步骤 → 最后 2 轮里 AI 的话 → 最早改的文件 → 中间的用户消息（上游和本会话的消息排成一列，首尾必留）；"最后 2 轮中间的步骤"和"最早改的文件"两步是 m1-6.1 加的，见本节末尾。**最后再把剩下的空间按从新到旧还给 `↳` 行**：后面几步删掉东西以后常有空余（`7e629e49` 的摘要 1,000 token 也放不下，去掉以后空出约 4,000 字符，补回了第 18 轮以后的 `↳`）。删减顺序不变，只是不浪费空间。
  - 计长度改成字符、token、字节三样分别相加、各自对上限（原来每段取"字符和按比例换算的 token 中较大的那个"再相加，中英混排时多算很多）；开头说明按最长的 Included / Left out 预留，另留 1% 和每节一行"… left out"的位置。

**2026-10-12 作者复查后的修改**（tag `m1-6.1`）：
- **最后一次验证**：只有记录里写明成功（成功标记，或退出码 0）才写 "passed"；有失败标记或非 0 退出码写 "failed"；两样都没有写 **"finished (no exit code)"**，下面照旧附输出结尾（Codex 代码模式只报告脚本跑完，失败的 `bun test` 原来会写成 passed）。输出每行最多 200 字符。
- **测试、构建只认命令开头**（作者没提，核对时发现，原来就有的问题）：原来在整条命令文字里找 `bun test`、`make`、`tsc` 这些词，heredoc 和脚本里写到的也算，作者的会话里多数"最后一次验证"其实是 `python3 - <<'EOF'` 改文件的脚本、`cat > … <<EOF` 写文件。现在先去掉 heredoc 的正文，按 `&&`、`;`、`|`、换行分段，去掉开头的 `VAR=x`、`sudo` 和命令的目录（`~/tools/bun/bin/bun` 当 `bun`），某一段**以**测试、构建开头才算。改后作者 29 个会话里只剩 3 个有"最后一次验证"，都是真的（`bun run typecheck`、`python3 -m unittest`、`pnpm typecheck`，前面是改文件的脚本）。
- **`↳` 行去掉 Markdown**：代码块的 ``` 行、标题的 `#`、粗体 `**`、表格的分隔行和水平线去掉，表格一行的各格用逗号连起来，链接只留文字；行内的反引号留着。之后再压成一行、截 120 个字符。例：`eaf1fe0f` 第 2 轮原来是 "| 内容 | 当前值 | 颜色 | |---|---|---|"，现在是 "内容, 当前值, 颜色 用户名, `jihd`, 粗体绿色 …"。
- **纯读取的命令**：`sed` 不带 `-i`（含 `-i.bak`、`-Ei`、`--in-place`）算纯读取；管道里只打印的过滤命令 `cut`、`sort`、`uniq`、`tr`、`nl`、`column`、`jq` 也算（`7e629e49` 的 `sed -n 10,30p … | cut -c1-120` 要靠它）。
- **最后 2 轮步骤很多时守住上限**（核对时发现，原来就有的问题）：步骤一行一个，原来不删，这个开发会话 `18e223e9` 第 2 轮几百步，单这一轮就 2.3 万字符，交接内容 3.3 万字符，超了上限。现在删减顺序在"压缩摘要"和"AI 的话"之间加一步：**每轮的步骤只留最前 2 个和最新的几个**（每轮依次 40、20、10、6 行），中间写 "… N steps left out; `meme show <id> <轮次>` has every step"，Left out 写 "N steps in the middle of turn N"。放在 AI 的话之前，因为 AI 最后的话说明做到了哪，中间的步骤 `meme show` 都查得到。AI 的话截完还超，再把"改过的文件"减到最后改的 30 个、10 个（"… N more files, edited earlier"，Left out 写 "N files edited earliest"）。最后 2 轮的 "Steps:" 一行超过 5 个文件时只写个数。改后作者全部会话都不超上限。
- **新的删减顺序**：`↳` 行（从最旧的删起）→ 压缩摘要（3,000 → 1,000 → 去掉）→ 最后 2 轮中间的步骤 → 最后 2 轮里 AI 的话 → 最早改的文件 → 中间的用户消息；最后把剩下的空间还给 `↳` 行。
- **`9580fc64` 的压缩写法**（自动压缩，在两轮之间）：边界带 `isMeta`，`compactMetadata.preservedSegment` 给 `headUuid`（上一轮最后的回复）/ `anchorUuid`（摘要）/ `tailUuid`（`away_summary` 那行），保留的那段只是引用，不复制；摘要后面跟一条 `system informational`。meme 不需要读这些字段：保留的记录本来就在原位，摘要按 `isCompactSummary` 认出来，"after turn N" 按位置算出来。合成样本照这种写法补了，确认摘要放在用户消息前、标题写 "after turn 6"，自动压缩在一轮中间时写 "during turn 1"。
- **在不在会话那套文件上**（第 ⑧ 步，arch.md 6.3 节）：根目录 = 往上第一个 `.git`（文件夹或 worktree 的文件），不把 worktree 归到主仓库；不在 git 仓库里就看会话开始的目录（当前目录是它或在它下面，并且不在那里面另一个仓库里）。比较前换算路径（Windows 和 WSL 之间，挂载位置按 wsl.conf）、解析符号链接。不在时，`Source:` 后面加一行 "Note: This session ran in <目录> (<环境>). You are in <当前目录>, which is not that repository. Ask the user where to work before changing anything. They can also run \`meme continue <id>\` in a terminal to open an agent in the right place."（不在 git 仓库里、或原目录已经不在时写 "not that directory"）。
- **Source 那一行的目录**（第 ⑧.2 步）：写成 meme 所在这一边的路径，和位置判断用同一个换算（`place.ts` 的 `localDir`）：WSL 里读 Windows 的会话写挂载路径，后面括号里是原路径；Windows 上读 WSL 的会话写 `\\wsl.localhost\<发行版>\…`，但会话在 Windows 盘上（`/mnt/c/…`，挂载位置按那个发行版自己的 wsl.conf）时写 `C:\…`，也不写"仓库在 WSL 里、从 Windows 跑 git 很慢"的提醒。
- **最后一次验证只显示认出来的那一段**（第 ⑧.1 步）：一条命令里认出好几段时取最后一段，前后还有别的命令时写 "…"，比如 `… bun test 2>&1 …`。

**4.6.7 脱敏**（[storage.md](../research/tech/storage.md) 2.6）
- 导入时，同时对里层记录和搜索用的文字脱敏，替换成 `[REDACTED:<类型>]`。
- 一开始的规则：OpenAI、Anthropic、GitHub、AWS 的密钥，私钥块，Bearer，URL 里的密码，`password=` / `passwd=`。**不包括 `pwd=`**，实测它在真实会话里会误伤。
- 以后逐步补上 gitleaks 的规则。只认格式明确的，不做熵检测。
- **2026-10-22 第 ⑪ 步补**（F1）：AWS secret key（前面要有 `aws…secret` 或 `secret_access_key` 这样的键名，40 位）、Slack `xox[baprs]-`、Google `AIza` + 35 位、GitLab `glpat-`、npm `npm_` + 36 位、Stripe `sk_/rk_` + `live_/test_`、Hugging Face `hf_` + 30 位以上、三段的 JWT（`eyJ….eyJ….…`，在 Bearer 规则之后）、`Authorization: Basic …`。`API_KEY=<32 位十六进制>` 不遮：不是格式明确的密钥，和哈希值分不开。预筛 `mayHoldSecret` 跟着加了这些前缀和 `secret`、`authorization`。
- 每次改规则都要升级表结构版本号，让数据库重建。这样旧的、没脱敏的内容才不会留在库里。

**4.6.8 只读模式**（Codex 沙箱，V8）
- **2026-10-13 第 ⑨ 步改**：开库以后、写的时候才发现写不了（Landlock 这类 `access()` 看不出来的沙箱），不再"用库里已有的内容"，而是把当前的库复制进内存、在副本上重新导入。读进内存时以只读方式打开库、在 SQLite 的锁下复制，不直接读文件字节（另一个 meme 可能正写到一半）；复制不了（崩溃留下的日志在只读目录里回滚不了）就在内存里新建、全量导入。
- 建 `~/.meme` 或以读写方式打开数据库时，遇到 EACCES、EROFS、EPERM、SQLITE_READONLY，就进入只读模式。
- 2026-10-08 实现时发现：SQLite 遇到写保护的文件，不会报错，而是悄悄以只读方式打开。所以打开前先检查目录和数据库文件能不能写（目录也要能写，因为回滚日志 `meme.sqlite-journal` 要建在旁边）。打开以后、导入写库时才发现写不了的（沙箱常见），也转成只读模式，用库里已有的内容。
- ~~数据库已经存在，就以只读方式打开（`?mode=ro`）；跳过增量导入和同步删除。~~ **2026-10-10 改**：数据库已经存在，就把它整个读进内存（`Database.deserialize`），在内存里的副本上照常增量导入，命令看到的就是最新的会话，磁盘上什么都不写（数据库文件的大小和修改时间都不变，有测试盯着）。这也就是 §3.4 说的"库里没有或已过时就从原文件现读"。在 Codex 沙箱里实测（只读和 workspace-write 两种模式）：`status`、`continue`、`continue last`、`search`、`show` 都正常，`meme continue` 约 0.25 秒。
- 数据库不存在、又建不了：在内存里建一个，现场全量导入（约 1 秒），命令照样能用。
- `continue`、`show` 要的会话不在库里或已经过时，就直接从原文件现读、现转换，不写库。
- `status` 里写明"read-only mode"。

**4.6.9 项目怎么认**（D12）
- 从启动目录往上找 `.git`：
  - 是个目录，所在的那一层就是项目；
  - 是个文件（worktree），按里面的 `gitdir:` 找到主仓库，项目算主仓库。这和 Claude Code 的做法一致。
- 找不到 `.git`，项目就是启动目录。
- WSL 里读到的 Windows 会话：先把 `C:\x\y` 换成挂载路径（挂载位置按 `/etc/wsl.conf` 的 `[automount] root`，默认 `/mnt/`，所以通常是 `/mnt/c/x/y`；第 ⑧ 步起不再写死），再找 `.git`。
- Windows 上读到的 WSL 会话：经 `\\wsl.localhost\<发行版>` 找 `.git`，不越过发行版的根目录；项目仍写成 WSL 里的路径（第 ⑤ 步）。
- **这是列表分组用的项目**（worktree 归到主仓库）。判断接手的 Agent 在不在会话那套文件上（第 ⑧ 步）另有规则：按那套文件**自己**的根目录比，worktree 不归到主仓库，见 §4.6.6。

### 4.7 系统差异

| 事项 | 做法 |
|---|---|
| 判断环境 | `process.platform` 是 win32 就是 win；是 linux，并且 `/proc/sys/kernel/osrelease` 里有 microsoft 或有 `WSL_DISTRO_NAME`，就是 wsl；darwin 是 mac；其余是 linux |
| WSL 读 Windows 的会话 | 扫挂载路径下 `c/Users/*/` 里的 `.claude/projects`、`.codex/sessions`（挂载位置按 `/etc/wsl.conf` 的 `[automount] root`，默认 `/mnt/`）；读不到就当来源读不到，什么都不删 |
| Windows 读 WSL 的会话（第 ⑤ 步） | 每条命令开头问 `wsl.exe --list --running --quiet`，只读正在运行的发行版，停着的不碰（一碰就会被启动），列表里显示上次同步的结果；经 `\\wsl.localhost\<发行版>`（没有时用 `\\wsl$`）读 `home/*` 和 `root` 下两家的目录；跳过 `docker-desktop`；优先用 `%ProgramFiles%\WSL\wsl.exe`（`System32` 里那个只是转发，作为第一个子进程要 0.7 秒，这个约 0.1 秒）；输出是 UTF-16 |
| 数据库放哪 | 一定放在本系统本地：WSL 的放在 Linux 文件系统里，不放在 `/mnt/c`；Windows 的不放在 `\\wsl$` 上（会锁不住） |
| Windows 删文件 | 遇到 EBUSY、EPERM 时重试 5 次，间隔从 100 毫秒逐步加到 800 毫秒（release.md 第 2 节） |
| 启动 Agent | 用 `Bun.which` 找到 `claude.exe` / `codex.exe` / `codex.cmd`。`.cmd` 要经过 `cmd /c`，引号照 cross-spawn 的做法处理，路径里的空格要加引号。第 ④ 步作者在 Windows 上实测了 `claude.exe`；`codex.cmd` 只用假的测过（§8）。推 WSL 的会话时经 `wsl.exe -d <发行版> --cd <目录>`、用户的登录 shell 启动（第 ⑤ 步） |
| WSL 里对 Windows 仓库跑 git | 加 `-c core.autocrlf=true -c core.filemode=false`（relay.md 第 2 节）。第一版 meme 自己不跑 `git status`，这条留给以后 |
| 终端 | Windows 上输出用 UTF-8；只在终端里用 ANSI 颜色；宽字符按两格算对齐 |

### 4.8 性能目标

| 场景 | 目标 | 实测基线 |
|---|---|---|
| 没有变化时的导入 | < 100 毫秒 | 40 毫秒 |
| 首次全量导入（约 34 MB） | < 5 秒 | 约 2 秒 |
| `meme ls` | < 1 秒 | —— |
| 一次搜索（搜索本身，不算启动和导入） | < 300 毫秒 | 5–12 毫秒；Windows 上带着 WSL 整条命令约 0.5 秒，是正常的（2026-10-13 作者定） |
| 单文件只启动一下 | < 50 毫秒（WSL） | 不到 10 毫秒 |

---

## 5. 测试

| 层次 | 测什么 | 怎么做 |
|---|---|---|
| **单元测试** | 每个关键算法：原记录 ID（Claude Code 全是 native 且能在原文件里找到）、认注入、轮次、续接复制、标题、项目、怎么结束的、脱敏（也测不误伤）、增量导入（追加、写到一半、改写）、同步删除（读不到、单个文件读不了、归档、`.zst`、两个 UUID 的文件）、删除后数据库文件里搜不到原文、接力内容（各节、长度上限、必留的句子）、搜索（`-F`、正则、`-i`、去重）、`show` 和 `ls` 的输出（快照对比）。第 ⑥ 步起：接力链、压缩摘要、`↳` 行、最近的命令（纯读取的认法）、删减顺序。第 ⑦、⑧ 步起：档案（各家的长度上限、认不出时取最紧的）、适配器以外不认 Agent（`test/unit/agent-knowledge.test.ts`，第 ⑧.2 步把第 ⑦ 步的搜索验收变成测试：词取自所有档案，注释也算）、两层报警（`test/unit/upgrades.test.ts`、`test/e2e/upgrades.test.ts`）、读不了时降级显示（转换失败的文件照样列出，`status`、`show`、`continue` 说明原因；之前读过的用旧副本）、在不在原来的位置（arch.md 6.3 节的 7 个例子，`test/e2e/place.test.ts`）、wsl.conf 的挂载位置（`test/unit/place.test.ts`） | `bun test`，用合成的会话 |
| **样例会话** | —— | **不提交任何真实会话**。只用两种：① 合成的，由 `test/fixtures/gen-*.ts` 按 Claude Code、Codex 的真实格式生成，把上面各种情况都覆盖到；② 公开数据，比如 SWE-chat（ODC-BY，要登录 Hugging Face），只在测试时下载到不进仓库的缓存目录里，用来跑集成测试 |
| **端到端** | 打包好的单文件 | 把 HOME（Windows 上是 USERPROFILE）指向放了样例的临时目录，依次跑 `install --dry-run`、`ls --plain`、`show`、`search`、`continue`（编号列表、编号、模糊目标、长度保护、`--in` 用假的 Agent）、`forget --yes`、`uninstall --yes`；交互的确认（`[y/N]`）在 Linux 上用 util-linux 的 `script` 开伪终端跑（第 ⑧.2 步起，`test/e2e/world.ts` 的 `runInTerminal`） |
| **Agent 实测** | 在 Agent 里用 `! meme continue` 拉取、终端推送（新 Agent 自己运行 `meme continue <id>`，不弹权限确认）、Codex 沙箱 | 照 V7、V8 的做法手动跑，不进 CI。每一步做完、首发前各跑一次（2026-10-10：第一版没有 skill，不再测 V6 那种由模型自己调用的拉取） |
| **真机测试（第 ⑤ 步，还没做）** | 作者在 WSL 终端和经典 PowerShell 里手动跑，WSL 先测、Windows 后测，B6 放最后（会把 WSL 关掉）。清单 2026-10-10 给过作者，这里记下：**WSL**：A1 `meme ls -a`（两行筛选、按平台分组、标签靠右、搜索框、窗口拉窄时按键说明换两行）；A2 `meme continue -a` 选 Agent 那一屏，窗口拉窄时说明完整换行；A3 `meme forget` 到 `[y/N]` 直接回车，显示 `Nothing deleted.`；A4 `meme ls -a --plain` 长路径省略中间。**Windows**：B1 `meme ls -a`（WSL 会话的项目是 `/home/...`）；B2 速度，每次 0.3–0.4 秒；B3 在 `\\wsl.localhost\Ubuntu\home\...\meme` 里 `meme ls` 只列这个项目；B4 推送一个 WSL 会话，WSL 里的 claude 在会话开始的目录启动、自己运行 `meme continue`；B5（可选）从 Windows 删掉 B4 留下的会话；B6 `wsl --shutdown` 以后 `meme ls -a` 不启动 WSL，顶部有一行 "WSL (Ubuntu) is not running…" | 结果决定发布准备第 5 项要不要关掉 Windows 读 WSL（arch.md 6.2 节）。2026-10-12 按 `m1-8.2` 重新打包，放回 `%TEMP%\meme-w5\meme.exe`；完整的测试单（在哪个窗口、敲什么、怎么算通过，加了 B2b 每条命令的耗时）在 §6 ⑤ 末尾 |
| **接力内容检查** | 接手的 Agent 能不能说清目标、改过的文件、下一步 | 照 V5 的做法，放在 `eval/` 里，只做内部检查，不对外公布 |
| **CI** | —— | GitHub Actions 在 Linux、Windows、macOS 上跑 `bun test` 和打包 |

---

## 6. 分小步做（① 到 ⑧，另有发布准备）

每一小步做完，作者自己都能用起来。M1 一共预计约 3 周（PRD 第 10 节），下面的天数只是粗估。

### ① 读取、存储、列出、查看、搜索（Claude Code，WSL + Windows）　约 1 周

**任务**
1. 仓库骨架：Bun、TypeScript、`bun test`、打包脚本（先打 Linux 和 Windows 两个）。
2. `platform/`：判断环境、路径、在 Windows 上重试的文件操作。
3. `adapters/claude-code.ts` 和 `model/`：原记录 ID（用 `normalizeToCanonical`）、认注入、轮次、续接复制、标题、项目、怎么结束的。
4. `store/`：表结构、增量导入、同步删除、只读模式。
5. `redact/`：第一批规则。
6. `ls`（普通文字 + 交互界面）、`show`（折叠 + 展开）、`search`、`status`。
7. 合成样例和单元测试。

**验收**
- 在作者机器上：`meme ls -a` 列出 WSL 和 Windows 两边的 Claude Code 会话，标签是 `CC·WSL` / `CC·Win`（2026-10-10 第 ⑤ 步改成 `Claude·WSL` / `Claude·Win`）；续接链合成一个（381dfa7f 不单独显示）。
- `meme show fd738f5b` 折成一行一轮；`meme show fd738f5b 27` 展开第 27 轮。
- `meme search 接力` 的结果按会话分组；搜两个字的中文词能搜到。
- 没有变化时导入不到 100 毫秒。
- 删掉一个样例会话后，镜像跟着删掉，数据库文件里搜不到它的原文。
- Windows 版的 `meme.exe ls` 能列出 Windows 上的会话；交互界面在 Windows Terminal 里能用方向键。

**进度（2026-10-08）**：**已验收**，本地提交 8 个、标签 `m1-1`（还没 push）。任务 1–7 都已完成，72 个测试（单元 + 端到端；其中 1 个只在设了 MEME_REAL_SESSIONS=1 时读本机真实会话）通过，打包出 Linux（77.6 MB）和 Windows（82.2 MB）两个单文件。验收：

| 验收项 | 结果 |
|---|---|
| `meme ls -a` 两边都列出、标签对、续接链合成一个 | ✅ 17 个会话；381dfa7f、6fa401c0、fd738f5b 都不单独显示 |
| `meme show fd738f5b` / `meme show fd738f5b 27` | ✅ 28 轮；第 2、3 轮之间有 "continued from 6fa401c0" 分隔线 |
| `meme search 接力` | ✅ 按会话（续接链）分组；两个字的中文能搜到；含启动和导入共 0.12 秒 |
| 没有变化时导入 | ✅ 约 34 毫秒（整条 `meme ls` 命令 0.05 秒）；首次全量导入 17 个会话 0.7 秒 |
| 删掉会话后数据库文件里搜不到原文 | ✅ 单元测试 |
| `meme.exe ls` 列出 Windows 上的会话 | ✅ 从 WSL 调用 `.exe` 测过：7 个会话，`show`、`search`（中文参数）都对 |
| 交互界面在 Windows Terminal 里能用方向键 | ✅ 作者在 Windows Terminal 和 WSL 里实测通过（2026-10-08） |

还没做、放到后面的：`show --all` 里"子代理的过程从它自己的文件现读"（现在 `--all` 只多显示注入的消息和推理）；`ls` 的纯文字输出末尾提示的是 `meme show`，第 ② 步有了 `continue` 再改回 §3.1 的样子。

### ② 接力（Claude Code）　约 4 天

**任务**
1. `handoff/`：接力内容的四节、长度上限、`--fresh`。
2. `continue`：列出、输出、存文件、`--in claude`、`--edit`。
3. ~~skill 模板（英文）~~（2026-10-12 注：第一版不装 skill，D17）。
4. `install`、`uninstall`（先只管 Claude Code）。

**验收**（2026-10-10 第二次调整后定成下面两项，连同下面两项一起；原来的"在交互式 Claude Code 里说 /meme 或'接着上次那个会话做'"随 skill 一起去掉）
- (c) 在普通终端里运行 `cd ~/work/private && meme continue`：用方向键选会话 → 选 Claude Code → 打开后它直接运行 `meme continue <id>`（不弹权限确认），然后总结、等作者确认。
- (d) 在 Claude Code 里：`! meme continue` → Agent 只问作者接哪个 → 作者输入 `! meme continue 2` → Agent 总结、等作者确认。
- 两项都通过后，按模块提交，在 `m1-2` 之后打一个新标签 `m1-2.1`（不移动 `m1-2`），不 push。

**已验收（2026-10-10）**：作者实测 (c)(d) 都通过。在 `m1-2` 之后本地提交 5 个（`refactor(install)`、`feat(adapters)`、`feat(cli)`、`feat(handoff)`、`test`），打标签 `m1-2.1`，还没 push。
- V5 那 4 个案例重新生成的接力内容符合 §4.6.6 的格式，小试的结论不变。
- `install` 重复运行结果不变；~~`uninstall` 只删 meme 放的 skill~~（2026-10-12 注：第一版不装 skill，D17；`install`、`uninstall` 现在不写 Agent 的任何文件，`uninstall` 只删 meme 自己的数据目录）。

**2026-10-10 第一次验收**：作者实测 (a) 在交互式 Claude Code 里敲 `/meme`、(b) 直接说"接着上次那个会话做"、(c) 终端里 `meme continue` 选会话、选 Claude Code 后打开并先读接力文件，三项都通过；本地提交 7 个、标签 `m1-2`。**同一天作者决定第一版不装 skill、不生成接力文件**（两次调整），改成上面的 (c)(d) 两项验收；通过后按模块提交在 `m1-2` 后面，打新标签 `m1-2.1`。

**2026-10-10 的改动（以第二次调整为准）**：`install` / `uninstall` 不再碰 skill；不生成接力文件（去掉 `handoffs/`、7 天清理、`@文件`、记住列表、`--edit`）；`meme continue` 在 Agent 模式下给编号列表（每次现场算），最后一句话让 Agent 只问用户；支持编号和模糊目标（`last`、`claude`/`codex`、`win`/`wsl`、ID 开头、标题里的词），好几个对得上时按 ID 列出；接力内容开头加"先总结、等确认"，长度不超过 2.5 万字符和 1.5 万 token；终端推送时新 Claude Code 带着 `--allowedTools "Bash(meme:*)"` 启动，第一条消息让它自己运行 `meme continue <id>`。102 个测试通过（另有 1 个只在本机读真实会话时跑）；终端流程在伪终端里用假的 `claude` 走通（收到的参数依次是第一条消息、`--allowedTools`、`Bash(meme:*)`，启动目录是会话的项目）。作者全部会话的接力内容都在 2.5 万字符以内，只有最长的一个（47 轮）删了中间的部分用户的话。

**2026-10-09 按讨论改**：`continue` 分终端模式和 Agent 模式、列会话时去掉当前会话、接力文件 7 天后删、skill 的叫法（见 §2.2、§2.3、§3.1、§3.4、§3.5、§3.7）。改完 100 个测试（1 个只在本机读真实会话时跑）通过；终端模式的完整流程（列表 → 选 Agent → 启动）在伪终端里用一个假的 `claude` 走通过，键盘输入能交到启动的 Agent 手里。

**进度（2026-10-08）**：任务 1–4 都已完成，95 个测试通过（新增接力内容的单元测试，以及 `continue`、`--in claude`、`--edit`、`install`、`uninstall` 的端到端测试，都在临时 HOME 里跑；`--in claude` 用一个假的 `claude` 记下启动目录和第一条消息）。V5 的复查脚本在 `eval/v5.ts`，输出放在不进仓库的 `.cache/eval/v5/`。

| 验收项 | 结果 |
|---|---|
| 交互式 Claude Code 里 "/meme" 和"接着上次那个会话做" | ⏳ 已经装好（作者同意）：`~/.local/bin/meme` 是指向 `~/work/meme/dist/meme-linux-x64` 的软链接，`meme install` 放了 `~/.claude/skills/meme/SKILL.md`；待作者在交互式 Claude Code 里实测 |
| `meme continue` 在终端里选会话、选 Claude Code，打开并先读接力文件（2026-10-09 改成这样验收） | ✅ 端到端测试和伪终端（假的 `claude`）；⏳ 真实的 Claude Code 待作者实测 |
| V5 案例重新生成，格式符合 §4.6.6，结论不变 | ✅ 3 个 Claude Code 案例重新生成（1,106 / 4,769 / 8,373 token），`claude -p` 复查三个问题都答对，和小试一样，合计 $0.26（[relay.md](../research/tech/relay.md) 4.1 节）；Codex 那个案例等第 ③ 步 |
| `install` 重复运行不变、~~`uninstall` 只删 meme 的 skill~~（D17，后来去掉） | ✅ 端到端测试 |

### ③ 加上 Codex，两家互相接力　约 3 天

**任务**
1. `adapters/codex.ts`：路径、标题、几个文件归成一个会话、归档、`.zst`、`apply_patch` 改过的文件。分叉的上级要先实测。
2. `--in codex`；~~skill 放进 `~/.agents/skills/meme/`~~（2026-10-12 注：第一版不装 skill，D17）。
3. 在 Codex 沙箱里的只读模式。

**验收**
- `meme ls` 里出现 `Codex·WSL` 的会话。
- ~~在交互式的 Codex 里说 "/meme" 能接上~~（2026-10-10：第一版不装 skill，这一项改成）：在交互式 Codex 里，用 Codex 自己直接跑命令的写法（如果有，类似 Claude Code 的 `!`）运行 `meme continue` 看编号、再运行 `meme continue <编号>`，然后说"接着做"，能接上。
- 两个方向都能推送：Claude Code → Codex、Codex → Claude Code。
- 在 Codex 沙箱里，`meme continue` 和 `meme search` 能用。

**计划（2026-10-10，作者确认）**
1. 先实测、只记数字和文件结构（不把会话内容抄进测试样例），在作者的 Codex 里依次做：A1 普通会话（改文件、跑测试、改名，看标题存在哪）、A2 回退（编辑前面的消息）、A3 分叉（`codex fork`）、A4 归档（`codex archive`）、A5 删除（TUI 里的 `/delete` 和命令行的 `codex delete` 各一次）。每步前后对 `~/.codex` 拍快照（文件、`session_index.jsonl`、数据库各表的行数），比出差别。测试用的项目放在 `~/tmp/meme-codex-lab`。顺便在 A1 里让 Codex 打印环境变量，看有没有"当前会话 ID"。
2. 写 `adapters/codex.ts` 和合成样例 `test/fixtures/gen-codex.ts`，照实测到的结构覆盖：几个文件归成一个会话、归档、`.zst`、分叉的复制部分、`apply_patch` 改过的文件、`exec_command` 跑的测试。
3. `continue --in codex`、选 Agent 时出现 Codex。~~`install` / `uninstall` 管 `~/.agents/skills/meme/`~~（2026-10-10：第一版不装 skill，去掉）。
4. 用 `codex sandbox` 在只读和 workspace-write 两种模式下跑 `meme continue`、`meme search`、`meme show`（不调用模型）；补上 §3.4 的"库里没有或已过时就从原文件现读"。
5. 作者实测（2026-10-10 改，去掉 skill 和 `$meme`，换成两件事）：① Codex 的界面里有没有类似 `!` 直接跑命令的写法，能不能用它跑 `meme continue` 和 `meme continue <编号>`；② 终端推送到 Codex 时，第一条消息让它运行 `meme continue <id>`，怎么提前放行这条命令、不弹审批（Codex 的审批设置）。再加两个方向的推送。结果写进本文，README 第 ④ 步再写。
6. 写回文档，按模块提交，打标签 `m1-3`，不 push。

**进度（2026-10-10）**：
- 实测：A1–A6 做完，结果在 [sessions.md](../research/tech/sessions.md) 7.1 节（能在后台做的用 `codex exec` / `exec resume` / `exec fork` / `codex archive` / `codex delete` 跑；改名、回退、界面里的 `/delete`、`!` 命令由作者按键；又补测了一次 Codex 的输出上限）。
- 代码：`adapters/codex.ts`（来源目录、几个文件拼成一个会话、分叉、归档、`.zst`、`session_index.jsonl` 的名字、从 `exec` 代码里取命令和改过的文件）、`continue --in codex`、选 Agent 时出现 Codex、按 `CODEX_THREAD_ID` 排除当前会话、Codex 里的字节上限、只读模式在内存副本上导入、合成样例 `test/fixtures/gen-codex.ts`。120 个测试通过（另有 1 个只在本机读真实会话时跑）。
- 作者机器上：`meme ls -a` 里有 3 个 `Codex·WSL` 会话（另外 3 个只有 `!` 命令、没有 AI 回复，照 §3.1 不列）。

| 验收项 | 结果 |
|---|---|
| `meme ls` 里出现 `Codex·WSL` 的会话 | ✅ |
| 在 Codex 沙箱里，`meme continue` 和 `meme search` 能用 | ✅ 只读和 workspace-write 两种模式都试过，还有 `status`、`show`、`continue last` |
| 交互式 Codex 里：`! meme continue` → `! meme continue <编号>` → 说"接着做"，能接上 | ✅ 作者实测；会话记录里两次 `!` 的输出都完整，作者说"接着做"后模型才回应，先跑 `git status` / `git log` 再总结 |
| 推送：Claude Code → Codex（新 Codex 自己跑 `meme continue <id>`，看它会不会弹审批、输出有没有被截断） | ✅ 作者实测：没有弹审批；会话记录里模型跑 `meme continue` 时给了 `max_output_tokens=10000`（第一条消息里的提醒起了作用），接力内容完整，接着跑 git 再总结 |
| 推送：Codex → Claude Code | ✅ 作者实测 |

**已验收（2026-10-10）**：在 `m1-2.1` 之后本地提交 5 个（`feat(store)`、`feat(model)`、`feat(adapters)`、`feat(cli)`、`test`），打标签 `m1-3`，还没 push。另外从一个旧会话看到：即使模型给了 `max_output_tokens=40000`，Codex 也在约 4 万字节处截断，说明上限在模型的设置上，3.6 万字节的上限是对的。

### ④ 删除和 Windows 细节　约 2 天

（2026-10-10 作者改：第 ④ 步只做本地的部分；打包发布、安装脚本、README 挪到下面的"发布准备"，等功能完整以后再做。）

**任务**
1. `forget`（§3.5）：Claude Code 的 4 处、Codex 调用 `codex delete --force`、镜像；当前会话拒绝、最近在写的再确认、先删原会话再删镜像、续接链和分叉的提示；`yes` / `--yes` / `--chain`。
2. `uninstall` 收尾：Windows 上删除时的重试；告诉用户怎么删掉程序本身时，写 PATH 上找到的那个 `meme`。
3. Windows 细节：文件被占用时重试；启动 `.exe` / `.cmd` 的引号（第一条消息里有反引号、括号、分号）；中文显示（Windows Terminal、经典 PowerShell 窗口、管道）。
4. 收尾：写回文档，按模块提交，打标签 `m1-4`（不 push）；问作者要不要清理 `~/tmp/meme-codex-lab`、`~/tmp/meme-codex-snap`，以及 `~/.codex/config.toml` 里信任实验目录的那段设置。

**测试对象**
- Codex：第 ③ 步的实验会话（"meme lab A1"、它的分叉、归档的那个、只有 `!` 的几个）。
- Claude Code：用 `claude -p` 在实验目录里跑一次性会话，让它新建一个 `note.txt`，这样 `file-history/` 里有备份，4 处都能测到（作者同意，一次调用）。
- 合成样例：端到端测试在临时 HOME 里跑。

**进度（2026-10-10）**：
- `forget` 写完：适配器各自给出删除步骤（Claude Code 先删 3 个文件夹、最后删主文件；Codex 先查 `codex delete --help` 里有没有 `--force`，再调用它），删完核对原文件确实没了，才删镜像；当前会话拒绝；续接链按 §3.5 问；Codex 分叉照上面的实测改成拦下 / 分叉先删；最近在写的要再确认，`--yes` 时不删。端到端测试 12 个（假的 `codex`），全部测试 133 个通过。
- **真实删除**：Codex 的实验会话（"meme lab A1" 和它的两个文件、它的分叉、归档的那个、两个只有 `!` 的）都用 `meme forget` 删掉了，每次前后拍快照：文件、`session_index.jsonl` 里改名的那行、`threads` 行、历史库里的行都没了。Claude Code：用 `claude -p` 跑了两个一次性会话（一个新建 `note.txt`，一个改它，共约 $0.17），**`-p` 模式不会生成 `file-history/` 和 `session-env/`**，只有会话文件；在伪终端里用 `meme forget` 交互删掉（两次 `yes`，因为刚写过），会话文件和镜像都没了。4 处齐全的真实测试，要作者开一个交互式的一次性会话（见下面的作者实测）。
- ID 显示几位改成"8 位，和别的会话撞了就多显示几位"（2026-10-10，§3.1）。本机真实数据现在没有撞的，23 个会话都是 8 位；测试里用了一对一分钟内建的 uuid v7（`019dc1a2-5…`、`019dc1a2-7…`），列表、`show` 的分叉分隔线、`forget` 的提示和按短 ID 删除都对。
- 作者要删会话时在 `meme ls` 的列表里找不到 ID（2026-10-10）：列表第二行最后加上 ID；终端里不写 ID 运行 `meme forget` 时打开同一个列表来选（§3.1、§3.5）。在伪终端里实测：↓ 选第二个、Enter、输入 yes，删掉的是选中的那个；Esc 什么都不删。
- `uninstall`：告诉用户删程序本身时，写 PATH 上找到的 `meme`（作者机器上是 `~/.local/bin/meme`，它是指向打包结果的软链接）；Windows 上删除照常重试。
- Windows：`.cmd` 走 `cmd.exe /d /s /c`，引号照 cross-spawn 的规则；从 WSL 调用本地打包的 `meme.exe` 实测：推送给一个假的 `codex.cmd`（像 npm 的 shim 一样把 `%*` 转给一个打印参数的程序），第一条消息里的反引号、括号、逗号、分号原样到达，启动目录对；推送给假的 `claude.exe`，参数依次是第一条消息、`--allowedTools`、`Bash(meme:*)`。**发现**：在 Windows PowerShell 5.1 里把 `meme.exe` 的输出接到管道上，PowerShell 按 GB2312 解码，中文和 "→" 会乱码（这是 PowerShell 5.1 的行为；Claude Code 在 Windows 上按 UTF-8 读命令输出，不受影响）；不经过管道、直接在窗口里显示是否正常，待作者在经典 PowerShell 窗口里实测，不正常再让 meme 启动时把控制台设成 UTF-8。
- **作者实测（2026-10-10，都通过）**：
  - L1（WSL 交互式一次性会话，改 `note.txt`）：`meme forget` 从列表里选中删除，会话文件、`file-history/<id>/`、`session-env/<id>/` 都没了，镜像里也没了；
  - W1：经典 PowerShell 里 `meme.exe continue -a` 选会话、选 Claude Code，`claude.exe` 在会话的项目目录 `C:\Users\<用户>\work\muse` 里启动，自己运行 `meme continue a62bd8b9`（Git Bash 里中文正常），总结完停下来问方向；
  - W2：Windows 交互式一次性会话（新建再改 `note.txt`），`meme.exe forget` 删掉了会话文件和 `session-env\<id>\`。**更正**：Windows 上交互式会话也会建 `session-env\<id>\`（之前看到 Windows 上没有这个文件夹，是因为还没跑过交互式会话）；这次没有 `file-history\<id>\`，可能是因为 `note.txt` 是这个会话里新建的，没核实；
  - W3：经典 PowerShell 窗口里直接显示（`meme ls -a --plain`）和全屏列表，中文和 `·` 都正常；接到管道上（`| Select-Object -First 5`）乱码。**作者定**：meme 不改（改成输出 GBK 会弄坏 Agent 读到的 UTF-8；启动时改控制台代码页会影响这个窗口后面的程序，而且 PowerShell 在启动 meme 前就定好了解码方式），在说明里写：先运行 `[Console]::OutputEncoding = [Text.Encoding]::UTF8`，作者实测这样管道里的中文就正常了（§8）。
- **2026-10-10 完成**：按模块提交 6 个（platform、adapters、短 ID、tui、cli、test），打 tag `m1-4`，没有 push。

**验收**
- `forget` 讲清风险、输入 yes 以后，原会话和镜像都删干净了（Claude Code 4 处都没了；Codex 由 `codex delete` 删掉；数据库文件里搜不到原文）。
- 当前会话拒绝删除；续接链、分叉的提示和再确认照 §3.5。
- Windows（本地打包的 `meme.exe`，作者实测）：`meme.exe continue` 能启动 `claude.exe`；`meme.exe forget` 能删掉一个 Windows 上的一次性会话；经典 PowerShell 窗口里中文正常。

### ⑤ Windows 上也看 WSL 的会话　约 2 天

**2026-10-10 作者定**：原来是"在哪装就在哪用"，Windows 上的 meme 只读 Windows 的会话，WSL 上的读两边；两边不对称，在 PowerShell 里只能看到一半。改成 Windows 上也读 WSL 的会话。两边仍然各有各的数据库，互不相干。

**实测（2026-10-10，本机）**：
- 从 Windows 列 `\\wsl.localhost\Ubuntu\home`、两家的会话文件：十几毫秒。
- `wsl.exe --list --running --quiet`：热的 0.17–0.23 秒，第一次 1.1 秒；输出是 UTF-16。
- **访问停着的发行版会把它启动**：对停着的 `docker-desktop` 运行 `Test-Path`，用了 0.5 秒，之后它就在运行了（测完已停回去）。
- `meme.exe ls -a` 现在热的 0.12–0.18 秒。
- 从 Windows 用 `wsl.exe -e` 启动的程序里有 `$SHELL`（`/bin/bash`）；用登录 shell 交互方式（`bash -lic`）能找到 `~/.local/bin` 里的 `meme`、`claude`、`codex`，不用登录 shell 时 PATH 里没有它们。

**怎么做**：
- **只读正在运行的发行版**：每条命令开头用 `wsl.exe --list --running --quiet` 查，和 Windows 自己的同步同时进行，查完再同步 WSL 的。停着的不碰，列表里显示上次同步的结果（不删镜像，和"来源读不到时一条都不删"一样）。跳过 `docker-desktop`。
- **读哪里**：`\\wsl.localhost\<发行版>\home\<用户>` 和 `\root` 下的 `.claude/projects`、`.codex`；没有 `\\wsl.localhost` 时用 `\\wsl$`。
- **怎么显示**：标签 `Claude·WSL`、`Codex·WSL`（原来写 `CC·WSL`，同一天作者改名，见下面"作者追加"）。项目写成 WSL 里的路径（`/home/jihd/work/meme`）；找 git 根目录时通过 `\\wsl.localhost` 去查，不超出发行版的根目录。在 PowerShell 里进入 `\\wsl.localhost\Ubuntu\home\...` 运行 meme 时，当前项目按 WSL 里的路径认。
- **拉取**（Windows 上的 Agent 里 `meme continue <WSL 会话>`）：照常输出交接内容，开头加一行（会话在 `/mnt/c/…` 这类 Windows 盘上时不加，第 ⑧.2 步）：项目在 WSL（发行版名）里，Windows 上的路径是 `\\wsl.localhost\...`，在 Windows 上对它跑 git 和构建又慢又容易出错，建议到 WSL 里接着做。
- **推送**（终端里 `meme continue` 选中 WSL 会话）：先问 WSL 里有没有 `meme`、`claude`、`codex`（`wsl.exe -d <发行版> --cd <项目> -e sh -c …`，用用户的登录 shell 以交互方式加载 PATH；shell 不是 bash 或 zsh 时用 bash）；选 Agent 时只列 WSL 里有的；用同样的方式在 WSL 里启动它，第一条消息照旧，WSL 里的 Agent 用 WSL 里的 meme 拉取。WSL 里没装 meme 或没有 Agent 时不启动，打印到 WSL 里接着做的两条命令。推送用的短 ID 在 WSL 的 meme 里也唯一：那边看到的会话（WSL 自己的加 Windows 的）都在 Windows 这份里。
- **删除**：WSL 的 Claude Code 会话可以从 Windows 删（通过 `\\wsl.localhost`，和 WSL 删 Windows 的会话对称）；~~WSL 的 Codex 会话提示到 WSL 里删~~。2026-10-10 作者定：两边互删，Codex 会话用那一边的 codex 删（§3.5）。
- **作者追加（2026-10-10）**：列表改成平台、Agent 两行筛选，平台选 All 时按平台分组；标签 `CC` 改 `Claude`；WSL 停着时照样列出并说明（§3.1）。
- **测试钩子**：`MEME_WSL_DIR`（代替 `\\wsl.localhost`：下面每个子目录是一个发行版的根目录）、`MEME_WSL_RUNNING`（在运行的发行版，逗号分隔；不设就是 `MEME_WSL_DIR` 下的全部）、`MEME_WSL_EXE`（代替 `wsl.exe`）。

**任务**：
1. 平台层 `platform/wsl.ts`：查运行中的发行版、找家目录、WSL 路径和 Windows 路径互换。
2. 适配器：Windows 上的来源加上 WSL 的。
3. 同步：先同步 Windows 本地的，再同步 WSL 的；找项目按来源换路径。
4. 当前项目：在 `\\wsl.localhost` 里运行时按 WSL 路径认。
5. `continue`：拉取的说明行；推送时问 WSL、在 WSL 里启动。
6. `forget`：WSL 的 Codex 会话的提示。
7. 测试：在 Linux 上用 `MEME_ENV=win` 加上面的钩子跑端到端测试。
8. 我从 WSL 调用打包好的 `meme.exe` 先测一遍（用临时数据目录），再请作者在 PowerShell 里测。

**进度（2026-10-10）**：
- 1–7 做完。端到端测试 7 个（`MEME_ENV=win` 加假的 WSL 根目录和假的 `wsl.exe`；假的 `wsl.exe` 真的把 meme 给的登录 shell 脚本交给 sh 和 bash 去跑），全部测试 142 个通过。
- 从 WSL 调用打包好的 Windows 程序实测：
  - **引号**：用和 meme 一样的写法经过真的 `wsl.exe` 启动 WSL 里一个打印参数的脚本，第一条消息里的反引号、双引号、`%PATH%`、`^`、`&`、`|`、中文、空参数都原样到达；启动目录是项目；登录 shell 把 `~/.local/bin` 放进了 PATH。
  - `meme.exe ls -a`（临时数据目录）：列出了 WSL 的 16 个 Claude Code 会话和 3 个 Codex 会话，项目是 `/home/jihd/...`；`meme.exe status` 显示 `CC·WSL \\wsl.localhost\Ubuntu\home\jihd\.claude\projects`。
  - **速度**：一开始每条命令 0.85–0.94 秒（原来 0.12–0.18 秒）。拆开量：扫描 WSL 的会话文件约 50 毫秒，慢在 `wsl.exe`：`System32\wsl.exe` 只是转发给 WSL 自己的 `C:\Program Files\WSL\wsl.exe`，作为进程的第一个子进程要 0.65–0.72 秒；直接调用 Program Files 里的只要 0.1 秒左右（先启动别的程序、或通过 `cmd.exe` 调用也能变快，原因没查清，没用）。改成优先用 Program Files 里的以后，每条命令 0.32–0.37 秒。
- 作者追加的几项（列表两行筛选和分组、标签改名、WSL 停着时的说明、两边互删 Codex 会话）做完；全部测试 146 个通过。真机检查：Windows 版 meme 对一个真的 WSL Codex 会话运行 `forget`（不加 `--yes`），经过真的 `wsl.exe` 查到 WSL 里的 `codex delete` 能用，列出 "runs: codex delete --force … in WSL (Ubuntu)"，没确认所以没删。WSL 里删 Windows 的 Codex 会话：本机 Windows 上没装 Codex，只用假的 codex 测过。
- 还没测、要作者测的：真的 PowerShell 窗口里的速度、新的列表、推送、`wsl --shutdown` 以后不启动 WSL（我在 WSL 里运行，没法自己关掉 WSL）。
- **2026-10-10 先提交（作者要求，测试之后再做）**：按模块提交 7 个（platform、adapters、store、render、handoff、cli、test）；每个提交的 `src` 单独都能通过类型检查，`feat(cli)` 那一个连测试一起检查时不通过（旧测试跟不上新接口，下一个 `test` 提交就好了）。~~还没打 tag `m1-5`~~；没有 push。
- **2026-10-12**：开始第 ⑥ 步前，按作者要求在 `20e2604`（README 那个提交，第 ⑤ 步和打包都在它之前）补打了 tag `m1-5`，没有 push。WSL 的 A1–A4 和 Windows 的 B1–B6 仍待作者测。

**验收**（作者在经典 PowerShell 里；还没做，清单见 §5 的真机测试 B1–B6）：
- `meme ls -a` 里有 `Claude·WSL` 的会话，标题、项目、时间对；
- 推送一个 WSL 会话：WSL 里的 claude 在会话开始的目录启动（第 ⑧ 步；原来是"项目目录"），自己运行了 `meme continue`；
- `wsl --shutdown` 以后运行 `meme ls -a`：WSL 没有被启动，WSL 的会话还在列表里；
- 有 WSL 时每条命令多花的时间在 0.3 秒以内。

**真机测试单（2026-10-12，按 `m1-8.2` 打包）**

先测 WSL（A0–A4），再测 Windows（B0–B6）。B6 放最后：它会把 WSL 关掉，连同正在写代码的这个会话。哪项不对就截图，记下是哪一项。

- **WSL**：`~/.local/bin/meme` 指向 `~/work/meme/dist/meme-linux-x64`，已经是新版。
- **Windows**：`%TEMP%\meme-w5\meme.exe`，也就是 `C:\Users\<用户>\AppData\Local\Temp\meme-w5\meme.exe`。10-12 换成了新版，和 `dist/meme-windows-x64.exe` 的校验和相同。

**一、WSL**

另开一个 WSL 终端窗口来测。在 Claude Code 里用 `!` 运行不行：meme 会认为是在 Agent 里，不打开全屏界面。

**A0 版本**
- 敲：`readlink -f "$(which meme)"`，再敲 `meme uninstall --help`
- 通过：
  - 第一条输出 `/home/jihd/work/meme/dist/meme-linux-x64`；
  - 第二条里写着 `Asks first ([y/N])`。

**A1 列表**
- 敲：`meme ls -a`
- 通过：
  - 顶部是 `Sessions · all projects  N shown`。
  - 下面两行筛选：`Platform ● All ○ WSL ○ Win` 和 `Agent ● All ○ Claude ○ Codex`，选中的是 `●`。
  - ←→ 改当前这一行，Tab 在两行之间换，当前行的行名是青色。
  - Platform 选 All 时分成 `── WSL (n) ──`、`── Win (n) ──` 两组；选 WSL 或 Win 时不分组。
  - 每个会话两行：标签（如 `Claude·WSL`）在第一行最右边，id 在第二行最右边，上下对成一列。
  - 搜索框是圆角框；打几个字，边框变青，列表跟着过滤。
  - 把窗口拉窄，最下面的按键说明换成两行，不被截掉。
  - Esc 退出。

**A2 选 Agent 那一屏**
- 敲：`meme continue -a`，选一个会话按 Enter
- 通过：
  - 出现 "Continue in which agent?"；
  - 灰色说明写的是 "meme starts the agent in the directory the session started in; …"（m1-8.2 改的，原来写 "in the session's project"）；
  - 把窗口拉窄，这句完整换行。
- 看完按 Esc 一路退出，不要真的启动。

**A3 删除确认（什么都不删）**
- 敲：`meme forget`，选一个旧会话按 Enter；再运行 `meme uninstall`
- 通过：
  - 到 `Delete this session? [y/N]` 时只按回车，显示 `Nothing deleted.`；
  - 到 `Remove them? [y/N]` 时只按回车，显示 `Nothing removed.`。
- **两处都不要输入 y。**

**A4 长路径**
- 敲：`meme ls -a --plain`
- 通过：项目那一列，长路径省略中间，比如 `/mnt/c/…/bots/cindy-default/workspace`。

**二、Windows**

经典 PowerShell 窗口：按 Win+R，输入 `powershell`。

**B0 准备**
- 敲：
  ```
  $env:Path = "$env:TEMP\meme-w5;$env:USERPROFILE\.local\bin;$env:Path"
  Get-Command meme
  meme status
  ```
- 通过：
  - `Get-Command` 的 Source 是 `...\Temp\meme-w5\meme.exe`。
  - Windows 上的镜像还是 10-10 的旧表结构，第一次 `meme status` 会删掉重建，要几秒。
  - 之后能看到 `Environment:  win`，来源里有 `Claude·WSL  \\wsl.localhost\Ubuntu\home\jihd\.claude\projects  readable` 和 `Codex·WSL … readable`。
  - `Codex·Win  ~\.codex  NOT READABLE (nothing deleted)` 这一行是因为这台 Windows 没装 Codex。已知，不算失败。

**B1 列表**
- 敲：`meme ls -a`
- 通过：和 A1 看的一样；WSL 会话的项目写成 `/home/jihd/...`。

**B2 速度**
- 敲：
  ```
  1..5 | % { [int](Measure-Command { meme ls -a --plain }).TotalMilliseconds }
  ```
- 通过：打出 5 个毫秒数。第 ⑤ 步的验收是"有 WSL 时每条命令多花的时间在 0.3 秒以内"；10-10 实测每次 320–370 毫秒。

**B2b 每条命令的耗时（新加）**
- 敲：把下面整段贴进 PowerShell。它先照常测一遍，再只读 Windows 测一遍：
  ```powershell
  function Time-Meme {
    foreach ($c in @('ls -a --plain', 'status', 'search meme', 'show a62bd8b9 --plain', 'continue a62bd8b9 --plain')) {
      $t = 1..5 | % { [int](Measure-Command { meme $c.Split(' ') }).TotalMilliseconds }
      '{0,-28} {1}' -f $c, ($t -join ' ')
    }
  }
  "--- with WSL"; Time-Meme
  # Windows only: a data folder of its own, and an empty stand-in for WSL (a test hook), so WSL is not read.
  $env:MEME_HOME = "$env:TEMP\meme-w5\home-no-wsl"; $env:MEME_WSL_DIR = "$env:TEMP\meme-w5\no-wsl"
  New-Item -ItemType Directory -Force $env:MEME_WSL_DIR | Out-Null
  meme status | Out-Null
  "--- Windows only"; Time-Meme
  Remove-Item Env:MEME_HOME, Env:MEME_WSL_DIR
  Remove-Item -Recurse -Force "$env:TEMP\meme-w5\home-no-wsl", "$env:TEMP\meme-w5\no-wsl"
  ```
- 要贴回来的：两张表原样贴回来，也留意有没有偶尔特别慢的一次（几秒以上）。
  - 两张表的差就是读 WSL 的代价，发布准备第 5 项（要不要关掉 Windows 读 WSL）看这个。
  - `a62bd8b9` 是 Windows 上的 Claude Code 会话（muse，"项目主要内容 (2)"），两遍都有它，所以 `show`、`continue` 两遍可以直接比。
  - `search` 在第一遍里多搜了 WSL 的会话，慢一些不全是读 WSL 的开销。
- 参考数字：我从 WSL 里调用 Windows 版粗测过（比在 PowerShell 里多一层转换，只作参考）。
  - 只读 Windows：约 0.22–0.28 秒；
  - 加上 WSL：约 0.45–0.50 秒，`search` 约 0.76 秒；
  - 30 多次里有一次 `continue` 用了 10.5 秒，之后连测 12 次都在 0.47–0.71 秒，没再出现。

**B3 在 PowerShell 里进入 WSL 的目录运行**（不要先敲 `wsl`：那样运行的是 WSL 里的 meme）
- 敲：
  ```
  cd \\wsl.localhost\Ubuntu\home\jihd\work\meme
  meme ls --plain
  cd ~
  ```
- 通过：第一行是 `Sessions in /home/jihd/work/meme (newest first):`，下面只有这个项目的会话（没有 muse、cindy 的）。

**B4 推送一个 WSL 会话**
- 敲：`meme continue -a`，选 "plan.md 第 ① 小步"（`7e629e49`；只读它，不会改它）按 Enter，再选 Claude Code。
- 通过：
  - 选完会话会停顿一下，那是 meme 在问 WSL；
  - 选 Agent 那一屏写着 "in WSL (Ubuntu), in the directory the session started in"；
  - WSL 里的 claude 在 `/home/jihd/work/meme` 启动，自己运行 `meme continue 7e629e49`，总结完等你。
- 看完退出 claude。

**B5（可选）从 Windows 删掉 B4 留下的会话**
- 敲：`meme forget`，选 B4 新建的那个 WSL 会话（列表里最新的那个）。
- 通过：
  - 列出的文件在 `\\wsl.localhost\Ubuntu\...` 下；
  - 到 `Delete this session? [y/N]` 输入 `y`；
  - 它刚写过，所以还会问 `There are warnings above. Delete anyway? [y/N]`，再输入 `y`；
  - 最后显示 `✓ … deleted`。

**B6 WSL 停着时不会被启动（最后做）**
- 敲（依次）：
  ```
  wsl --shutdown
  meme ls -a
  meme status
  1..5 | % { [int](Measure-Command { meme ls -a --plain }).TotalMilliseconds }
  wsl --list --running
  ```
  `meme ls -a` 看完按 Esc。
- 通过：
  - `meme ls -a` 顶部有一行黄色的 `WSL (Ubuntu) is not running; its sessions are as of …`，WSL 的会话还在列表里；
  - `meme status` 的来源下面也有这一句，WSL 的两行写 `not running`（m1-8.2 新加）；
  - 5 个毫秒数贴回来；
  - 最后一条显示没有正在运行的发行版。

~~测完重新打开 WSL，进入 `~/work/meme`，运行 `claude --resume 18e223e9-38ee-4d08-905d-7306806849f8` 回到这个会话，把结果告诉我。这里不用 `--continue`：B4 新建的会话可能比这个新，`--continue` 会打开它。~~（作废：`18e223e9` 在 B5 里被删了，见下面第二轮；开发窗口现在是 `0cb2fa3e`）

**真机测试进度（2026-10-12，第一轮）**：
- **B2**：812、323、363、354、319 毫秒。第一次慢，是冷启动；其余和 10-10 的 320–370 毫秒一样。
- **B2b 有 WSL**：
  - `ls -a --plain` 308–382 毫秒；
  - `status` 314–342；
  - `search meme` 472–510；
  - `show` 337–342；
  - `continue` 338–364。
- **B2b 只读 Windows：无效，要重测**。设环境变量那几行没运行：最后 `Remove-Item Env:MEME_HOME` 报"找不到路径"，而且 Windows 镜像里 WSL 来源的扫描时间正好是第二遍的时间。所以第二张表其实又测了一遍有 WSL 的情况，两张表差不多。
- **B3：无效，要重测**。这几条是在 PowerShell 里先敲 `wsl` 以后、在 WSL 的 bash 里运行的：`cd \\wsl.localhost\...` 失败，`meme ls --plain` 跑的是 WSL 里的 meme。测试单的标题"在 WSL 的目录里运行"写得不清楚，应该写明在 PowerShell 里运行。
- **B4：要重测**。上一步留在了 WSL 的 bash 里，所以 `meme continue -a` 测成了在 WSL 里推送：
  - Claude Code 在 `~/work/meme` 启动，自己运行了 `meme continue 7e629e49`，新会话是 `ec8e585d`；
  - 但没测到"从 Windows 经 `wsl.exe` 推送"。
- **发现：Claude Code 把超过约 3 万字节的命令输出存成文件**，只给模型看开头 2KB（"Output too large (37.6KB). Full output saved to: …"）。
  - `ec8e585d` 里的交接是 23,872 字符、38,518 字节，在 2.5 万字符的上限内，仍被存成了文件，模型又用 Read 读了一遍。
  - 本会话开头作者用 `!` 拉的交接（19,184 字符、31,186 字节）也一样。
  - 作者本机 2.1.280–2.1.296 的会话里：存成文件的最小是 29.8KB；没存的最大是 28,197 字节；15,433 个字符、30,649 字节的输出也被存了。所以按字节算，不是按字符。
  - 2.1.296 的代码里，这一步按"`bashOutputMaxChars`（默认 30,000）和 128,000 取小"判断，可以被远程配置按工具改写，实际按什么量没能从代码看死。
  - 现在的上限下，作者 29 个会话里有 11 个在 Claude Code 里的交接超过 3 万字节。
  - sessions.md 7.1 节说的"Claude Code 留 3 万字符"不够准：3 万字符是截断，存成文件在它之前，按字节。
  - 待作者定：Claude Code 档案改成按字节（比如 2.7 万字节，和 Codex 一样留 10%），还是保留现在的、靠模型去读文件。
- 还没报：A0–A4、B0、B1 的结果；B5、B6 还没做。

**真机测试进度（2026-10-12，第二轮，作者在经典 PowerShell 里）**：
- **B2b 只读 Windows**（这次有效，只读到 9 个 Windows 会话）：`ls -a --plain` 10715、163、148、194、158；`status` 149–164；`search meme` 161–185；`show` 176–191；`continue` 185–218 毫秒。和第一轮"有 WSL"比，每条命令多花约 150–170 毫秒（`search` 约 310，其中一部分是多搜了 23 个会话）；验收"多花 0.3 秒以内"通过。
- **偶尔 10 秒**：上面第一个 10.7 秒，加上第 ⑧.2 步粗测时一次 10.5 秒的 `continue`，都是"10 秒 + 正常耗时"。嫌疑：SQLite 等锁的 `busy_timeout` 正好 10 秒；或者 Defender 扣住文件做云端检查（默认也是 10 秒）。那次的 log 跟着 `home-no-wsl` 一起删了，`~\.meme` 的 log 里没有等锁的报错，看代码定不了。第 ⑧.3 步加了"慢的命令记各段耗时"，下一轮看 log。
- **B0、`status`**：`Environment: win`，四个来源，WSL 两行 readable；`Get-Command` 那行没贴。
- **B3 通过**：在 PowerShell 里进 `\\wsl.localhost\Ubuntu\home\jihd\work\meme`，`meme ls --plain` 第一行是 `Sessions in /home/jihd/work/meme`，只有这个项目的 3 个会话。
- **B4 通过**：从 PowerShell 推送 `7e629e49`，WSL 里的 Claude Code 在 `/home/jihd/work/meme` 启动，新会话 `7373e17e` 第一个命令是 `(command -v meme || ls ~/.local/bin/meme dist/ 2>/dev/null); meme continue 7e629e49 2>&1 | head -c 200000`。两个问题：交接 37.6KB，又被 Claude Code 存成文件（第三次，模型都读全了）；命令被包了一层，按"加管道不算"的规则，`7373e17e` 以后再交接时认不出上游。都在第 ⑧.3 步改。Agent 退出时打的 `Resume this session with: claude --resume 7373e17e…` 是 Claude Code 自己的话，在 PowerShell 里照敲找不到这个 WSL 会话（没改）。
- **B5 事故**：作者按测试单"选列表里最新的那个 WSL 会话"，列表最上面是**正在运行的开发窗口 `18e223e9`**（42 秒前刚写过）；测试单又让作者对 "may still be running" 的警告输入 `y`，于是它被删了。开发窗口随后在 B6 的 `wsl --shutdown` 里也被关掉；它的文件现在只剩 6KB 退出时写的状态行，WSL 和 Windows 的镜像都已同步成 0 条记录，对话没有副本。代码和文档都在。另外 `meme forget ec8e585d`（第一轮 B4 留下的）正常删除。
  - 原因两层：测试单写"最新的那个"、预先让作者越过警告；meme 从 PowerShell 只能按"最近几分钟写过"猜，分不出哪个窗口开着。第 ⑧.3 步改成读 Claude Code 登记的开着的会话，测试单以后一律写 id（§6 ⑧.3 第 6 条）。
- **B6 通过**：`wsl --shutdown` 后 `status` 里 WSL 两行写 `not running`，下面有 "WSL (Ubuntu) is not running; its sessions are as of 10-12 17:00"；`ls -a --plain` 237–243 毫秒（停着时只问 `wsl.exe`，比只读 Windows 多约 85 毫秒）；`wsl --list --running` 显示没有正在运行的分发，meme 没有启动 WSL。`meme ls -a` 是全屏界面，退出后画面清掉了，黄色那行还要作者确认。
- 还没报：A0–A4、B1；B0 的 `Get-Command`。

### ⑥ 交接打磨　约 3 天

**依据**（2026-10-12 作者定）：[handoff.md](../research/market/handoff.md) 7.3 节（不用 AI 的交接打磨，A1–A5 逐条定下，主要依据）、7.8 节第 6 点（10-12 压缩实测：要修的三处和测试的局限）、3.6 节末尾（Codex 的分页历史：rollout 里 meme 要的记录都在，读取器暂时不用读 `thread_history_1.sqlite`）。AI 摘要模式放到后面做。

**定下的**：
- **交接内容从上到下**：开头说明 → 上游会话的用户消息（A1）→ 压缩摘要（A3）→ 本会话的用户消息，最后 2 轮之前的每条附一行 `↳`（A2）→ 最后 2 轮 → 改过的文件 → 最近的命令（A4）→ 最后一次验证。
- **超长时的删减顺序**：
  1. `↳` 行，从最旧的删起；
  2. 压缩摘要：先截到约 1,000 token，还不够就整段去掉；
  3. 最后 2 轮里 AI 的话（现有规则：依次截到 4000、2000、1000、500、200 token）；
  4. 中间的用户消息（现有规则：首尾必留，其余从新往旧补，整条留或删；"首"指最上游会话的第一条）。
  "最近的命令"最多 10 行，不参与删减。
- **约束不变**：纯代码，不调用模型；交接内容仍走命令输出，长度守住现有上限（Claude Code 1.5 万 token 且 2.5 万字符，Codex 里另加 3.6 万字节，§4.6.6）。
- **真会话不进 git**：照下面测试会话的格式写合成样本。
- format.md 第 3 项"是不是系统注入的"可能要从"是 / 否"扩成"注入原因"（比如 `compact_summary`），实现时定，定了告诉作者更新 format.md。

**测试用的真会话**（只在本机读，不进 git）：
- 手动压缩：`~/tmp/meme-compact-lab` 里的 Claude Code `2e91a687`（压缩一次）、Codex `01a12e2b`（压缩两次，API key 登录）；第 7 项做完前不删。
- 自动压缩：`7e629e49`（以前的开发窗口，10-10 自动压缩过一次，保留的 5 条原文按 uuid 引用、没有复制），只读对照，不删。
- 接力链：`01a124ba`（上游 `dc977411`）。

**任务**（按依赖排）
1. **认出压缩**（适配器）：
   - Claude Code：带 `isCompactSummary` 的是摘要；压缩前后两条 `/compact`（压缩前一条纯文本、压缩后一条 `<command-name>`）只算一轮；
   - Codex：`compacted` 项里的文字是摘要（去掉 "Another language model started…" 那段前缀）；它前面那条文字相同的 AI 消息也标成摘要，不算 AI 说的话；加密的摘要只记"这里压缩过"；
   - `meme show` 在压缩的位置显示一行 `── compacted here ──`。
2. **开头说明**（A5）：
   - a. "The steps listed below were already run; don't repeat them blindly. Check their effect in the repository."
   - b. "If your context is compacted later, run `meme continue <id8>` again to reload this handoff."
   - c. "Included:" 后面加一行 "Left out:"，写明没带的部分；
   - d. 不连续的轮次写成 "turns 3 and 6"，不写成 "(3–6)"。
3. **更早的轮次附一行 `↳`**（A2）：最后 2 轮之前的每条用户消息下面一行，复用 `meme show` 的折叠（几步、几个命令、改了几个文件，只写个数），加上 AI 最终回复的开头，约 120 字；不取中间"我先看一下……"这类说明（Codex 的记录标了 `final_answer`）；没有回复时只写步骤，再标 "interrupted" 或 "no reply"。只改交接内容，`meme show` 不变。
4. **最近的命令**（A4）：在"最后一次验证"前加一节 "Recent commands (newest last)"，全程最近 10 条 shell 命令，跳过 meme 自己的、最后 2 轮里已经列过的、纯读取的（`ls`、`cat`、`head`、`tail`、`pwd`、`echo`、`grep`/`rg`、`find`、`wc`，`git status` / `log` / `diff` / `show`）；一行一条 `- turn 15: \`bun test\` → ✗ exit 1`，命令最多 120 字，失败标 ✗，判断不出写 "no result"。
5. **压缩摘要**（A3）：只带最后一次能读的（最后一次是加密的，退一步带前一次能读的，并写明它覆盖到第几轮）；标题 "Summary written by the source agent (<Agent> compacted its context after turn N, <时间>)"，下面一句 "This is the agent's own summary, a hint that may be wrong. The user messages and steps below are verbatim."；最多约 3,000 token，超了按行截断并注明怎么看全文。
6. **接力链**（A1）：在会话记录里找 meme 输出的交接头（`# Handoff:` + `Source: … session <id8> …`，在工具结果或 `!` 的输出里）→ 按 id 从镜像里取上游会话的用户消息，单独一节 "Earlier session <id8> (handed over into this one)" → 一直往上找（A → B → C → D），每层按时间顺序排，整体受总长上限约束 → 上游被 `forget` 删掉、镜像里没有时，从记下的交接原文里解析 "User messages" 一节。`meme continue` 这类命令不再算作用户说的话；正在调用 meme 的会话就是上游会话本身时跳过那一节（S3 切回）；不记录任何关系，交接时现场推出来。
7. **复查**：重跑 V5 小试的 3 个案例（relay.md 4.1 节：`eaf1fe0f` 第 3 轮、`737b3a50` 第 13 轮、`fd738f5b` 第 19 轮后截断），加上接力链和压缩的样本；统计作者全部会话改前改后的交接大小。
8. **清理**：用 `meme forget` 删掉 `~/tmp/meme-compact-lab` 的两个测试会话，以及以前实验留下的（如果还在）。

**验收**
| # | 验收 |
|---|---|
| 1 | 照 10-12 两个测试会话的格式写合成样本（Claude Code 压缩一次、Codex 压缩两次）：`/compact` 只算一轮；Codex 第 3 轮的 "AI said" 里没有摘要；`meme show` 第 4 轮显示 AI 真正的回复 |
| 2 | "Left out" 和实际删掉的内容一致；轮次写法对 |
| 3 | 不带最后 2 轮；取最终回复 |
| 4 | 跳过三类命令；失败标 ✗ |
| 5 | 两个合成样本里位置、标注、截断都对 |
| 6 | 用 `01a124ba` 能找回上游会话的目标；合成样本：A→B→C 三层、上游被删 |
| 7 | 三个问题照样答对；作者全部会话的交接都不超过各家的输出上限 |
| 8 | 两个测试会话删掉，`meme ls -a` 里没有了 |

做完打 tag `m1-6`，不 push。

**进度（2026-10-12）**：8 项都做完，测试 175 个（174 通过、1 个跳过），用打包好的 Linux 版跑端到端测试 50 个通过；按模块提交 8 个，打了 tag `m1-6`，没有 push。实现细节见 §4.4（表结构版本 3）、§4.6.3（压缩）、§4.6.6（"第 ⑥ 步以后"）。
- **1 认出压缩**：两个测试会话的真实记录上核对过：Claude Code `2e91a687` 是 5 轮（原来 6 轮），第 4 轮 `/compact` 下面一行 `── compacted here ──`；Codex `01a12e2b` 第 3、4 轮显示 AI 真正的回复，两处压缩都有标记。自动压缩的 `7e629e49` 认出第 16 轮中间压缩过，仍是 39 轮。另外发现作者还有两个会话自动压缩过（`46083e3d`、`a08bde23`），原来以为一次都没有。
- **6 接力链**：`01a124ba` 往上找到 4 个会话：`dc977411` ← `f8be70b6`、`6344629b` ← `164801e9`；目标在 `164801e9`（"帮我调查一下不同的Harness和Model组合……""那你给我写一个简单的报告吧，写一个MD文档"），前三个只有 meme 命令。`6344629b` 是用开发期间的 `@接力文件` 接过来的，要靠文件名里的 id 才找得到（§4.6.6）。
- **7 复查：交接大小**（`eval/sizes.ts`，作者全部 31 个有对话的会话，只记数字）：

  | | 改前 | 改后 |
  |---|---|---|
  | token（中位数 / P90 / 最大） | 2,612 / 8,122 / 10,088 | 4,067 / 9,593 / 11,361 |
  | 字符（中位数 / 最大） | 5,952 / 23,360 | 9,243 / 24,165 |
  | 在 Codex 里的字节（最大） | 34,120 | 34,777 |
  | 超过上限的 | 0 | 0 |

  每个会话中位数多 480 token，最多多 4,261（`f72c5eec`，46 轮的 `↳` 行）。为了放下而删减的有 6 个：`fb9393aa` 省掉 58 条中间的消息（改前就省掉 60 条），其余是 `↳` 行只留了后面一部分、压缩摘要去掉或截短（`7e629e49`、`46083e3d`、`a08bde23` 三个自动压缩过的会话）、AI 的话被截。没有哪个会话比改前少带用户的话。
- **7 复查：V5 小试**（`claude -p`，不带工具、不存会话；7 次共 $0.61）：

  | 案例 | 交接内容（token，改前 → 改后） | 结果 | 花费 |
  |---|---|---|---|
  | statusline（`eaf1fe0f`，第 3 轮后截断） | 1,106 → 1,272 | ✓ ✓ ✓：说出了复制的脚本和测试输出；下一步"等用户确认"（用户实际接着问能不能改颜色） | $0.048 |
  | sports（`737b3a50`，第 13 轮） | 4,769 → 6,214 | ✓ ✓ ✓：两个待定的问题（先提交基线、从哪份开始核对），用户实际回"好的，先提交"；还从"最近的命令"里看出第 8 轮用 `rm` 删了两个记忆文件 | $0.113 |
  | muse（`fd738f5b`，第 19 轮） | 8,373 → 9,821 | ✓ ✓ ✓：说到第 18 轮提出、没被接受的"讲一遍数据流"，用户实际接着问的正是数据流 | $0.145 |
  | 接力链（`01a124ba`，整段） | 445 → 796 | ✓ ✓ ✓：说出链上真正的工作是 `164801e9` 的榜单调研、最后要写 MD 报告，并说明这个会话本身没写目标、报告写没写不知道；改前它只看得到三条 meme 命令 | $0.042 |
  | 自动压缩（`7e629e49`，第 20 轮，压缩在第 16 轮） | —— → 10,561 | ✓ ✓ ✓：第 ④ 步代码写完未提交，最后给了 L1、W1–W3 的测试，等结果；用户实际接着报 W2 乱码 | $0.170 |
  | 手动压缩 Claude Code（`2e91a687`，第 4 轮） | —— → 1,110 | ✓ ✓ ✓：还指出摘要说"还没把结果告诉用户"和原文对不上，以原文为准 | $0.048 |
  | 手动压缩 Codex（`01a12e2b`，第 3 轮） | —— → 810 | ✓ ✓ ✓ | $0.039 |

  三个老案例照样全对；花费比改前（$0.047、$0.087、$0.126）多一点。
- **8 清理**：用 `meme forget --yes` 删掉了 `2e91a687`、`01a12e2b`（Codex 的那个经 `codex delete --force`），`meme ls -a` 里没有了；V5 缓存里这两个案例的副本也删了。第 ③、④ 步的 Codex 实验会话、`~/tmp/meme-codex-lab`、`~/tmp/meme-codex-snap` 早已不在。还剩：`~/tmp/meme-compact-lab`（只有 `hello.py`），`~/.claude/projects/` 下几个没有会话、只有空 `memory/` 的目录（`-home-jihd-tmp-meme-compact-lab`、`-tmp-meme-v5-*`、`…-scratchpad-inject-test`），待作者决定删不删。
- **提交**：`feat(adapters)`、`feat(store)`、`feat(render)`、`feat(handoff)`、`feat(cli)`、`test`、`chore(eval)`、`docs`。`feat(adapters)` 那一个单独不能通过类型检查（`store` 还按旧的 0/1 读，下一个提交就好了）；从 `feat(store)` 起 `src` 都能通过，测试到 `test` 那个提交跟上。

**和设计不一致、要改文档的地方**（作者改 handoff.md、format.md）：
1. format.md 第 3 项改成"注入原因"：`harness` / `compact_summary` / `compaction`（压缩过、摘要读不了）。压缩的"写的 Agent 和模型、覆盖到哪一条"没有存：Agent 就是会话的 Agent；模型两家都不在摘要记录里；覆盖到哪一轮交接时现算（"能现算的不存"）。
2. A2 的"最终回复"没有读 Codex 的 `final_answer`，改用通用规则"这一轮最后一次工具调用之后 AI 说的话"：trajectory 不保留 phase，要用就得在库里多存一项；这条规则在作者的 Codex 会话上和 `final_answer` 全部一致，对以后别的 Agent 也适用。
3. A4 判断不出成败时，设计写 "no result"；实现里没有结果记录才写 "no result"，有输出时写 `(no exit code) <第一行>`（Codex 代码模式的原因见 §4.6.6）。纯读取的命令多认了 `cd` 和 PowerShell 的 4 个读取命令；有 `>` 写文件的不算纯读取。
4. A1 只认"一条单独的 `meme continue` 的输出"，不是"出现交接头就算"；另外认开发期间的 `@接力文件`；上游会话只取交接那一刻以前的记录。
5. A3 的标题在自动压缩发生在一轮中间时写 "during turn N"。
6. 删减顺序之后多一步：把剩下的空间按从新到旧还给 `↳` 行。
7. 上游会话一节的标题下多一行"<Agent·环境> · <标题> · <起止时间>"；只有 meme 命令的上游会话也列一节，写 "(no messages of its own besides meme commands)"，让链看得出来。

（2026-10-12 作者回复：7 处都同意；format.md 升到 v0.3，handoff.md 7.3 节末尾加了"实现结果"；`~/tmp/meme-compact-lab` 和 `~/.claude/projects` 下 12 个空目录作者已删。）

**复查后的修改（2026-10-12，tag `m1-6.1`）**：作者核对时提了 5 处，我核对真实会话时又发现 3 处原来就有的问题，一起改了，细节见 §4.6.6 末尾。
1. 最后一次验证判断不出成败时写 "finished (no exit code)"，不写 "passed"（合成样本：Codex 代码模式里失败的 `bun test`）。
2. `↳` 行先去掉 Markdown 再截 120 字。
3. 不带 `-i` 的 `sed` 算纯读取；另加 `cut`、`sort`、`uniq` 等只打印的过滤命令。
4. V5 评测每跑完一个案例，删掉 Claude Code 为临时目录建的项目文件夹（只删空的，用 `rmdir`）；实测跑一次后 `~/.claude/projects` 下没有新增目录。上午那次留下的 7 个空的 `/tmp/meme-v5-*` 也删了。
5. `9580fc64` 写法的合成样本（自动压缩在两轮之间、保留段按 uuid 引用）：压缩算在第 6 轮后面，不多出一轮，记录没有重复；交接里摘要在用户消息前，标题 "after turn 6"。真实的 `9580fc64`：压缩在第 30 轮后（10-12 12:47），标题会是 "Claude Code compacted its context after turn 30, 10-12 12:47"；但它 32 条用户消息里有几大段粘贴，按上限摘要放不下（1,000 token 也放不下），被整段去掉，Left out 写明并给出 `meme show 9580fc64 30 --all --full`；不限长度时摘要截到 3,000 token，放在用户消息前。
6. （新发现）"最后一次验证"原来在整条命令里找测试、构建的词，heredoc、脚本里的也算；改成只认命令开头。
7. （新发现）最后 2 轮的步骤原来不删，这个开发会话的交接到了 3.3 万字符，超上限；删减顺序里加"中间的步骤"（在 AI 的话之前）和"最早改的文件"（在 AI 的话之后），"Steps:" 一行最多点名 5 个文件。
8. （新发现）"Steps:" 一行原来列出这一轮改过的全部文件，300 个文件就是一行 3 万多字符。

测试 181 个（180 通过、1 个跳过），用打包好的 Linux 版跑端到端测试 50 个通过。作者全部 29 个会话的交接：token 中位数 4,478、最大 11,696，字符最大 24,152，在 Codex 里字节最大 34,696，都不超上限。提交 3 个：`fix(handoff)`、`test`、`chore(eval)`，打了 tag `m1-6.1`，没有 push。

**要作者改设计文档的**：第 6、7、8 条是新的。尤其第 7 条在作者定的删减顺序里加了两步（"最后 2 轮中间的步骤"放在"AI 的话"之前，"最早改的文件"放在它之后）。如果觉得应该放在别的位置，告诉我再调。

### ⑦ Agent 升级的防护　约 2 天

**依据**（2026-10-12 作者定）：[arch.md](arch.md) 6.1 节和 D19。思路：Agent 升级以后 meme 只会变差一点，不会坏；维护只在那一家的适配器里做；格式变了由 meme 自己报出来。在发布准备之前做。

**约束**：纯代码，不调用模型，不联网；产品文字用英文；真会话不进 git，用合成样本；第 1 项是纯重构，行为不变。

**任务**
0. **顺手修一处**：`sort -o <文件>`（和 `--output`）会写文件，不算纯读取。
1. **Agent 档案**：把散在适配器外面的 Agent 知识收进各家适配器的一份声明（档案），其余代码只看统一格式和档案，不再按 Agent 分支。要收的：
   - 判断在哪家 Agent 里运行、当前会话 ID 的环境变量（`src/cli/context.ts`、`src/cli/commands/continue.ts`）；
   - 命令输出的上限（Codex 的 3.6 万字节在 `continue.ts`、`handoff/budget.ts`）；
   - 工具结果的固定格式（Codex 输出前面那几行头，`src/model/tools.ts`）；
   - 名字、标签、颜色、`--agent` 的别名（`src/render/labels.ts`、`src/tui/picker.ts`、`src/cli/target.ts`、`src/cli/commands/ls.ts`）；
   - 核对怎么启动、怎么删除、压缩行为是不是都在适配器里；
   - 动手前再搜一遍，别处还有的（会话记录里的文字格式、帮助文字等）一起收。
2. **读不了时降级**：
   - 整个文件转换失败时，`ls` 里照样列出这个会话（会话 ID、时间、目录不靠 trajectory 拿），标 "can't read"；`show`、`continue` 给一句说明，提示去看 `meme status`；
   - 有旧镜像时仍用旧镜像，但标明"这是 <时间> 的内容，之后的读不了"；
   - `ls` 底部加一行 "N sessions could not be read, see `meme status`"；`status` 列出文件和原因（只写错误类型和第一行，不写会话内容）。
3. **报警器**：
   - 每家适配器列一张"认识的记录类型"清单（Claude Code 的 `type` / `subtype`，Codex 的 `type` / `payload.type`），故意不读的也列上；
   - 导入时数出清单外的类型，连同 Agent 版本（Claude Code 每行的 `version`、Codex `session_meta` 的 `cli_version`）记下来；
   - `status` 写 "Codex 0.170 writes record types meme doesn't know: X (N sessions)"；`show` 在对应会话开头提示 "N records meme couldn't read"；
   - 用作者全部会话核对清单：正常情况下报警应该是 0。报出来的，要么加进清单，要么说明它确实是新类型。
4. **§8 风险表加一行"trajectory 不维护了"**：退路是把 meme 用到的部分（Claude Code、Codex 适配器和统一格式那层，约 1,000 行，Apache-2.0）复制进 `src/vendor/trajectory/` 自己维护；Claude Code 或 Codex 改了格式、meme 读不对了而 trajectory 两周内没修，或者它三个月没有任何提交，才复制。现在不复制。

**要定的**：format.md 第 4 节写着"不需要 Agent 版本"；报警器要用版本，可能还要存"读不了的记录类型和数量"。存不存、存在哪，实现时定，定了告诉作者改 format.md。

**验收**
| # | 验收 |
|---|---|
| 0 | `sort -o f` 不算纯读取，`sort f` 算 |
| 1 | 在适配器以外搜 "codex"、"claude-code"、`CODEX_`、`CLAUDE`，只剩档案登记和测试；全部测试和端到端测试通过 |
| 2 | 用合成样本（一个必然转换失败的文件、一个带未知记录类型的文件）检查：`ls` 列得出来、标注对，`status` 写对，`show` 有提示；有旧镜像时，标出的时间对 |
| 3 | 作者全部会话报警为 0；在合成样本里加一种没见过的类型，`status` 和 `show` 都报得出来，版本号对 |
| 4 | §8 有这一行 |

做完打 tag `m1-7`，不 push。

**进度（2026-10-12）**：5 项都做完。测试 186 个（184 通过，2 个是只在本机读真会话时才跑的），用打包好的 Linux 版跑端到端测试 53 个通过；提交 13 个，打了 tag `m1-7`，没有 push。
- **0**：`sort -o`、`-uo`、`--output` 算写文件。
- **1 档案**（`src/adapters/*.profile.ts`，登记在 `profiles.ts`）：档案是数据和小的纯函数，不引用 `model/`，所以哪一层都能读，不会循环引用；适配器的代码（读文件、启动、删除）还在 `claude-code.ts`、`codex.ts`。每家档案写了：
  - 名字、简称（标签和筛选用）、颜色、别名（`--agent`、`--in`、`continue` 的目标词）、启动命令、家目录和改它的变量、归档目录（Codex）、项目说明文件名（`install --help` 用）；
  - 怎么认出"在这家里运行"（`inside`）、当前会话 ID 的变量、嵌套时谁优先（`nesting`：在 Claude Code 里开的 Codex 算 Codex）；
  - 命令输出上限（Claude Code 不另加，Codex 3.6 万字节）、`!` 的输出会不会自己发给模型、终端推送的第一条消息、`continue --help` 里那几行用法、`forget --help` 里删什么、删上级会话时分叉会不会拦住（Codex）；
  - 压缩行为（原记录在不在、摘要能不能读、怎么认）；
  - 记录里的文字格式：注入的内容、打断、命令输出、`!` 命令和它的输出、输出太长时的提示、工具结果的头几行、退出码、"失败"的写法、压缩摘要前后包的话；
  - 工具调用的含义：哪个工具是 shell 命令、改了哪些文件、在列表里怎么显示（Codex 代码模式的脚本、apply_patch 的解析也挪进了 Codex 档案）；
  - 认识的记录类型清单，每种写明读还是故意不读（Claude Code 25 种，Codex 23 种）。

  适配器以外搜 "codex"、"claude-code"、`CODEX_`、`CLAUDE`：`src/` 里一处都没有了（注释也改成了不提具体某家），只剩档案、档案登记和测试。用改前打包的 m1-6.1 和改后的代码对作者全部会话跑 `continue`、`show`、`ls`、`search` 和各命令的 `--help`，输出逐字相同，只有 `forget --help` 里两家各占一行。
  - 记录不带"是哪家写的"，所以模型层把所有档案的格式一起用（和原来一样）；前提是各家格式不重叠，以后真重叠了，再把会话的 Agent 传进去。
  - 交接里认"meme 启动 Agent 的第一条消息"，也改成从档案的 `firstMessage` 推出来，两边不会走样。
- **2 降级**：转换失败时记进 `failures`，把会话照样列出来：没有旧镜像的，从 `peek` 拿目录、时间、标题、版本（不靠 trajectory：Claude Code 每行都有，Codex 看第一行 `session_meta`，再不行看文件名里的时间和文件的修改时间）；有旧镜像的，旧镜像照用，时间就是旧镜像里最后一条的时间。
  - `ls`：标题后面写 "(can't read)" 或 "(can't read after 10-10 08:00)"；底部 "N sessions could not be read, see `meme status`"；交互界面里在顶部用黄字提示。
  - `show`、`continue`：从没读成过的，一句 "meme can't read session <id> (<错误>); see `meme status`"，退出码 1；有旧镜像的，`show` 在标题下写 "this is the session as of <时间>; what came after is missing"，交接内容开头加一条 Note。
  - `status`：每个文件一行：标签、会话、文件、错误类型和第一行（引号里的内容去掉，不带会话原文）、Agent 版本、"shown as of <时间>" 或 "never read"。
  - 同一个文件没变、meme 版本也没变，就不再重试，免得每条命令都去读一个坏文件；文件改了、修好了，下次导入时自动恢复。
  - 实测发现 trajectory 很宽容：格式不对的记录只是丢掉，几乎不报错；真会转换失败的是文件层面的问题（压缩文件坏了、没有读权限）。这种情况连版本也读不到，`status` 里就不写版本。合成样本用的是一个坏掉的 `.jsonl.zst`。
- **3 报警器**：导入时按档案的清单数每行的类型（Claude Code 是 `type` 或 `type/subtype`，Codex 是 `type` 或 `type/payload.type`；清单里只写上层类型的，下面的子类型都算认识；不是 JSON 的行算 "(not JSON)"），连同写这一行的 Agent 版本记进 `unknown_types`。`status` 写 "Codex 0.170.0 writes record types meme doesn't know: event_msg/brand_new_event (1 session)"；`show` 在标题下写 "2 records meme couldn't read (event_msg/brand_new_event); see `meme status`."。
  - **作者全部会话报警为 0**：Claude Code 28 个会话（2.1.274–2.1.296），出现过 24 种类型；Codex 3 个会话（0.161.0、0.162.1），13 种，加上 10-12 测试会话里的 `compacted`。都列进了清单。另外按代码和 trajectory 已经读的，Claude Code 多列了老版本的 `summary`，Codex 多列了 `function_call`、`function_call_output`、`web_search_call`、`tool_search_call`、`tool_search_output`、`agent_reasoning`、`user_message`、`agent_message`、`turn_aborted`。trajectory 不读的 `local_shell_call` 故意没列：真出现了应该报警。
  - 读真会话的那组测试（`MEME_REAL_SESSIONS=1`）加了一条"没有不认识的类型"，Agent 升级以后跑一下就知道。
- **4**：§8 加了"trajectory 不维护了"一行。

**和设计不一致、要作者改文档的地方**：
1. **format.md**：第 4 节"不需要 Agent 版本"要改。现在存了两样新东西：`failures`（读不了的文件和原因）和 `unknown_types`（不认识的记录类型、行数、Agent 版本）。Agent 版本只存在这两张表里，会话本身不记版本。
2. **arch.md 6.1 节第 2 条**的例子是在 `show` 里不认识的记录原位显示一行 "⚙ unrecognized record (type X)"；实现按这次的任务只在开头提示条数和类型。原因：不认识的行 trajectory 不输出，meme 也就不存它们，没有原位可显示；要原位显示得把这些行也存进镜像。
3. **arch.md 6.1 节第 3 条**的档案项比列的多：别名、家目录、归档目录、`!` 输出会不会发给模型、第一条消息、用法说明、删除说明、分叉会不会拦住删除、记录里的文字格式、工具调用的含义。另外档案放在适配器旁边单独一个文件（`*.profile.ts`），不在适配器同一个文件里：适配器要引用模型层，模型层又要读档案，放在一起会循环引用。所以"维护一家改一个文件"实际是改那一家的两个文件（档案和适配器）。
4. **arch.md 6.1 节第 2 条**说读不了时"列出会话 ID、时间、目录"：目录拿不到的情况（压缩文件坏了）只有 ID 和时间；时间用文件名里的开始时间和文件的修改时间。

（2026-10-12 作者回复：4 处已改，format.md v0.4 第 3.1 节、arch.md 6.1 节。）

### ⑦.1 报警器第二层（2026-10-12 作者定，tag `m1-7.1`）

**为什么**：第 ⑦ 步实测 trajectory 很宽容，格式不对的记录只是丢掉、不报错。Agent 只要改了"认识的类型"里的字段，那一行就悄悄丢了，第一层（不认识的类型）看不到。

**任务和验收**
1. 对档案里"读"的类型，数出原文里有、却一条记录都没读出来的行（Claude Code 按 uuid 对，Codex 按位置对，和回查 `isMeta`、`compacted` 的办法一样），扣掉本来就该丢的，剩下的按"读了但读不出"计数。存法和不认识的类型一样，加一列区分。
2. `status`、`show` 的写法和不认识的类型一样："Claude Code 2.1.300: 12 records of known types meme couldn't read (assistant; 2 sessions)"。
3. 用作者全部会话校准到 0：报出来的逐条看，本来就该丢的加进例外，原因写在下面。
4. 合成样本：一条 assistant 记录的 content 换成没见过的结构，`status` 和 `show` 都报出来。

**怎么做的**
- 每家档案多两项：`conversation`（每一行都应该变成至少一条记录的类型）和 `expectedDrop`（某一行没变成记录、但本来就该这样的原因）。
  - Claude Code：`user`、`assistant`、`system/local_command`。
  - Codex：`response_item/` 下的 `message`、`function_call`、`function_call_output`、`custom_tool_call`、`custom_tool_call_output`、`web_search_call`、`tool_search_call`、`tool_search_output`，加上 `event_msg/agent_reasoning`。
  - "读"的类型里没放进来的：读成会话字段的（标题、`continued-in`、`session_meta`、`turn_context`），以及 meme 自己处理的 `compacted`（它要么把前面那条 AI 消息标成摘要，要么自己补一条记录）。
- 转换时逐行对：Claude Code 看这一行的 `uuid` 有没有出现在记录里（包括 meme 自己补回的本地命令）；Codex 按 trajectory 的算法（会话 ID + 字节位置的哈希）算出这一行的记录 ID 再查。版本照第一层：Claude Code 用这一行的 `version`，Codex 用文件的 `cli_version`。
- 存在 `unknown_types` 表，加一列 `kind`：`unknown` 是不认识的类型，`unread` 是认识但读不出（表结构版本 5）。
- 只扣 trajectory 说"故意丢"的三种诊断：`sidechain_record_dropped`、`noise_record_dropped`、`injected_context_dropped`。时间补齐（`timestamps_interpolated`、`timestamps_synthesized`）、工具调用 ID 补齐这些诊断不会让记录消失，本来就不影响计数。

**例外和原因**（作者全部 31 个会话、10-12 实测；每一种都逐条看过）

| Agent · 类型 | 行数 | 为什么本来就不该有记录 | 怎么认 |
|---|---|---|---|
| Claude Code · `assistant` | 2,511 | 只有一个 `thinking` 块、里面没有文字：Claude Code 不把思考写下来，只留签名。块全是空的思考或空文字时都算这种 | 档案 `expectedDrop` |
| Claude Code · `user` | 72 | 外壳写的杂音（`<local-command-caveat>`、`<local-command-stdout>`、`<task-notification>` 等），trajectory 故意丢 | trajectory 的 `noise_record_dropped` |
| Claude Code · `user`、`system/local_command` | 15 + 14 | 本地命令那一行（`<command-name>`），trajectory 当杂音丢，meme 自己补回成用户的话；`/compact` 压缩后又写的那一遍 meme 故意不补（第 ⑥ 步） | 补回的记录用的就是这一行的 `uuid`；故意不补的记下来 |
| Claude Code · `system/local_command` | 15 | 本地命令的输出（没有 `<command-name>`），meme 不读 | 档案 `expectedDrop` |
| Claude Code · `user` | 2 | 只敲过 `/exit`、`/model` 的会话：trajectory 找不到对话直接报错，没有诊断可看；这两行是命令说明和输出 | 档案 `expectedDrop` 按档案里"注入""命令输出"的格式认，不靠诊断 |
| Codex · `response_item/message` | 9 | `developer` 角色的消息：外壳给模型的指令，不是对话 | 档案 `expectedDrop` |
| Codex · `response_item/message` | 3 | 注入的环境说明（`<environment_context>` 等），trajectory 故意丢 | trajectory 的 `injected_context_dropped` |
| 两家 · 内容为空 | 0 | 内容在、但里面没有文字（空字符串、空的文字块）。实测没有，按道理也该丢 | 档案 `expectedDrop`。**内容不在原来的位置不算空**：Codex 的消息没有 `content` 这一项，就要报 |
| Claude Code · `isSidechain` 的行 | 0 | 子代理的行，meme 本来就跳过。主会话文件里实测没有 | 代码里直接跳过 |

**结果**：作者全部会话两层报警都是 0（`MEME_REAL_SESSIONS=1` 那组测试也加了第二层）。合成样本：Claude Code 一条 assistant 的 content 换成 `[{type: "rich_text", …}]`，Codex 一条消息的内容挪到 `parts` 里，`status` 写 "Claude Code 2.1.300: 1 record of known types meme couldn't read (assistant; 1 session)"、"Codex 0.180.0: 1 record of known types meme couldn't read (response_item/message; 1 session)"，`show` 开头写 "1 record of known types meme couldn't read (assistant); see `meme status`."。`status` 没有问题时写 "Record types: all known and read"。

测试 189 个（187 通过，2 个只在本机读真会话时跑），打包后的端到端测试 54 个通过；提交 4 个，打了 tag `m1-7.1`，没有 push。

**和设计不一致、要作者改文档的地方**：
1. format.md 第 3.1 节：`unknown_types` 多了一列 `kind`（`unknown` / `unread`）。
2. 第二层只查"每一行都该变成记录"的那些类型（上面列的），不是档案里所有标"读"的类型：读成会话字段的、`compacted` 不查。`compacted` 的字段要是变了，现在会被当成"摘要读不了"（显示成加密），不会报警。
3. `status` 的写法比例子多带了类型："…couldn't read (assistant; 2 sessions)"。
4. Codex 按位置对，用的是 trajectory 生成记录 ID 的算法；trajectory 哪天改了这个算法，Codex 的每一行都会被报成读不出，会很显眼，不会悄悄漏掉。

### ⑧ 在哪接着做　约 2 天

**依据**（2026-10-12 作者定）：[arch.md](arch.md) 6.3 节和 D20（规则 1、2、4、5；第 3 条 SSH 不做）、6.4 节（用户怎么用）。范围是一台机器，Windows 和 WSL 算一台；跨设备暂不支持。

**约束**：纯代码，不调用模型；产品文字用英文；真会话不进 git；作者全部会话从各自的目录交接，输出和改前逐字相同。

**任务**
0. **报警器补两个盲区**：
   - Codex 的 `compacted`：有加密字段才算"摘要读不了（加密）"；既没有能读的摘要、也没有加密字段，算 unread；
   - 会话信息：读不到启动目录时算 unread（不然项目会悄悄认错）。
1. **判断"在不在原来的位置"**（规则 1）：
   - 比较 Agent 当前所在那套文件的根目录，和会话那套文件的根目录。根目录 = 往上找到的第一个 `.git` 所在的目录，文件夹和 worktree 的那个文件都算。列表分组照旧把 worktree 归到主仓库，这里不归；
   - 不在 git 仓库里，就比会话开始的目录；
   - Windows 和 WSL 之间先换算路径，比较前解析符号链接；在同一个仓库的子目录里，算在原来的位置。
2. **不在原来的位置时**（规则 2）：交接内容照样输出，开头加一行："Note: This session ran in <目录> (<环境>). You are in <当前目录>, which is not that repository. Ask the user where to work before changing anything. They can also run \`meme continue <id>\` in a terminal to open an agent in the right place."
3. **推送**（规则 4）：
   - 在会话实际开始的目录启动（按目标环境换算），不再用项目根目录，修掉 worktree 会话被启动到主仓库的问题；
   - 目录不在就报错："the session's directory <目录> is not there. To continue somewhere else, open the agent there and run \`! meme continue <id>\`."；不加 `--cd`。
4. **路径要准**（规则 5）：WSL 挂载 Windows 盘的位置从 `/etc/wsl.conf` 的 `[automount] root` 读，没有就用 `/mnt/`，不再写死（找 Windows 会话的目录也要跟着改）。
5. **用法说明**（6.4 节）：
   - `continue --help` 开头写一句：在会话的项目里接；在终端里运行时，meme 会在会话的目录里打开 Agent；
   - README（中英两份）的"接着做一个会话"和"WSL 和 Windows"两节按 6.4 节重写：三件事 → "我想……"表 → 提醒对照表；去掉"两边各有各的镜像"这类内部说法；跨设备只写一句"暂不支持，请在会话所在的机器上接"。

**验收**
| # | 验收 |
|---|---|
| 0 | `compacted` 字段变了、读不到启动目录，`status` 都报得出来；作者全部会话仍为 0 |
| 1–3 | 6.3 节例子 1–7 各做一个合成样本，结果和表里一致；worktree：推送在 worktree 里启动，从主仓库拉取有提醒 |
| 4 | `wsl.conf` 改了 root 的合成样本：`/c/...` 能和 `C:\...` 对上，Windows 的会话照样找得到 |
| 5 | `continue --help` 开头有这一句；README 两节按 6.4 节重写 |
| 全部 | 作者全部会话从各自的目录交接，输出和改前逐字相同 |

做完打 tag `m1-8`，不 push。

**进度（2026-10-12）**：6 项都做完。测试 200 个（198 通过，2 个只在本机读真会话时跑），打包后的端到端测试 61 个通过；提交 8 个，打了 tag `m1-8`，没有 push。
- **0 两个盲区**：Codex 的 `compacted` 里有 `encrypted_content` 才算加密；既没有能读的摘要、也没有加密字段，按 `compacted` 记一条"读了但读不出"（照样在原位置留压缩标记）。读不到启动目录（Claude Code 没有一行带 `cwd`、但有对话；Codex 的 `session_meta` 没有 `cwd`）按 "start directory" 记一条。作者全部会话两层仍是 0。交接里压缩摘要读不了时，说法从"加密了"改成 "cannot be read (encrypted, or written in a way meme does not know)"，因为现在两种都可能。
- **1、2 在不在原来的位置**（`src/handoff/place.ts`）：根目录 = 往上第一个 `.git`（文件夹或 worktree 的文件），不把 worktree 归到主仓库；比较前把会话的目录换算到当前环境（WSL 里 Windows 路径按挂载位置换；Windows 上 WSL 路径走 `\\wsl.localhost`，在发行版挂载位置下的换成 Windows 盘符），两边都解析符号链接。会话在 git 仓库里：当前目录的根目录要和它相同（所以子目录算，另一份克隆、worktree、嵌套的仓库不算）。不在 git 仓库里：当前目录是会话开始的目录或它下面，而且不在那里面另一个仓库里。不在原来的位置时，提醒放在 `Source:` 下面第一行。比较的是 meme 运行时的当前目录：`!` 和 Agent 的工具都在 Agent 所在的目录运行。
- **3 推送**：从镜像里取会话开始的目录（`meta` 记录的 `cwd`，没有就用项目），换算到 Agent 所在的环境再启动；推到 WSL 时，先从 Windows 经 `\\wsl.localhost` 看目录在不在，再去问 WSL。
- **4 挂载位置**：从 `/etc/wsl.conf` 的 `[automount] root` 读（测试用 `MEME_WSL_CONF` 指向别的文件），没有就是 `/mnt/`；Windows 盘的路径换算、大小写不敏感的比较、找 Windows 用户目录（默认 `<root>c/Users`）都跟着它。
- **5**：`continue --help` 开头加了一句；README 两节按 6.4 节重写（三件事、"我想……"表、提醒对照表），去掉了"两边各有各的镜像"。
- **6.3 节例子 1–7**（`test/e2e/place.test.ts`，用测试自己的 `wsl.conf` 把"Windows 盘"挂在测试目录里，`C:\code\shop` 就成了真目录）：

  | # | 结果 |
  |---|---|
  | 1 | 在 `meme` 里接：没有提醒；从指向 `meme` 的符号链接里接也没有 |
  | 2 | 在 `meme/src` 里接：没有提醒 |
  | 3 | 在 `<root>c/code/shop` 里接 S1：没有提醒，有原来的 git 参数提醒；`Source:` 写 `<root>c/code/shop/web (C:\code\shop\web)`；在 WSL 终端推送 S1，Agent 在 `<root>c/code/shop/web` 启动 |
  | 4 | 在 `notes` 里接 meme 的会话：有提醒（"…which is not that repository"） |
  | 5 | 在 WSL 另外克隆的 `shop` 里接 S1：有提醒，写 "ran in C:\code\shop\web (Windows)" |
  | 6 | `meme` 改名 `meme2`：拉取有提醒（原目录不在了，认不出是仓库，写 "which is not that directory"）；推送报错 "the session's directory … is not there. To continue somewhere else, open the agent there and run \`! meme continue <id>\`." |
  | 7 | worktree 的会话：推送在 `meme-fix` 启动；在主仓库 `meme` 里拉取有提醒；在 `meme-fix` 里拉取没有；列表照旧把它归在 `meme` 下 |

- **作者会话上的对比**：作者 31 个会话里 29 个有启动目录（另外 2 个只敲过本地命令，没有对话），目录都还在。从各自的目录用改前打包的 m1-7.1 和改后的代码各跑一遍 `meme continue <id>`：27 个逐字相同；另外 2 个是正在写的会话（作者的设计窗口 `9580fc64` 和这个开发窗口），两次之间多了几轮，只差在轮数和时间上。没有一个出现新提醒。
- **顺手修的**：测试的临时目录一直没删干净（清理的钩子只对第一个测试文件生效），`/tmp` 里攒了 8,429 个、1.9 GB，把 `/tmp` 占满了。删掉了，钩子挪到测试的 preload 里，每个测试文件都清。

**和设计不一致、要作者改文档的地方**：
1. 提醒的说法：会话不在 git 仓库里（或者原目录已经不在、认不出是仓库，比如例子 6）时写 "which is not that directory"，不写 "repository"。
2. "不在 git 仓库里就比会话开始的目录"，实现成：当前目录是那个目录或它下面，并且不在那里面另一个仓库里。
3. 环境的写法：`Windows`、`WSL`、`macOS`、`Linux`；Windows 上读的 WSL 会话写 `WSL: Ubuntu`。
4. 会话从 WSL 的 `/mnt/c/…` 开始、在 Windows 的 `C:\…` 里接时，按发行版自己的 `wsl.conf` 换成盘符再比，算同一个位置（6.3 节没写这个方向）。
5. 两个盲区记在第二层里，类型名用 `compacted` 和 `start directory`；后者不是记录类型，是会话信息，`status` 里写成 "(start directory; 1 session)"。
6. 压缩摘要读不了时，交接的说法改成 "cannot be read (encrypted, or written in a way meme does not know)"（原来写"加密"）。

### ⑧.1 交接的两处小改动（2026-10-12 作者定，tag `m1-8.1`）

**依据**：[handoff.md](../research/market/handoff.md) 7.3 节"为什么分三样算长度"末尾的"10-12 定下的统一规则"和末尾的"10-12 讲解时发现、待改"；arch.md 6.1 节第 3 条。

**任务和验收**
1. **长度上限统一**：公共上限只留 meme 自己的 1.5 万 token；2.5 万字符挪进 Claude Code 档案的 `outputLimit`，Codex 档案照旧 3.6 万字节；认不出在哪家 Agent 里运行时，取所有档案里最紧的：2.5 万字符、3.6 万字节、1.5 万 token 三条一起守。删减顺序和交接的结构都不变。
   - 验收：在 Claude Code 里，作者全部会话的交接除了"最后一次验证"那一行和改前逐字相同；在 Codex 里，英文为主的会话可以超过 2.5 万字符、但不超过 3.6 万字节；认不出 Agent 时，作者全部会话都不超过 3.6 万字节。
2. **"最后一次验证"只显示认出来的那一段命令**，前面还有别的命令时开头写 "…"。
   - 验收：`7e629e49` 第 37 轮显示的是 `bun test` 那一段，不是 Python 脚本的开头；其他有这一节的会话也都显示认出来的那一段。

**怎么做的**
- `limitsIn(profile)` = 1.5 万 token 加上那家档案的上限；`limitsIn(null)` = 1.5 万 token 加上所有档案里每种单位最紧的那个。`buildHandoff` 不传上限时（评测脚本）也用最紧的。原来的 `weight()`（三样折成一个数）没人用了，删掉。
- 命令拆成几段（和第 ⑥ 步"只认命令开头"同一套：去掉 heredoc 正文，按 `&&`、`;`、`|`、换行分），显示**最后一段**认出来的测试或构建，原样照写；前面还有命令时开头加 "… "，后面还有时结尾加 " …"。

**结果**（作者全部 29 个有启动目录的会话，各自从自己的目录，用改前打包的 m1-8 和改后的代码对比；`9580fc64`、`18e223e9` 两个是正在写的会话，两次之间变了，单列）
- **在 Claude Code 里**：不算正在写的两个，27 个里 22 个逐字相同，另外 5 个是有"最后一次验证"的（加上正在写的 `18e223e9` 共 6 个），这一行变了：
  - `7e629e49` 第 37 轮：`… ~/tools/bun/bin/bun test 2>&1 …`；
  - `199ec839` 第 14 轮：`… python3 -m unittest discover -s tests 2>&1 …`；
  - `a62bd8b9`、`fd738f5b`、`6fa401c0` 第 37 轮：`… pnpm lint …`（同一个续接链，命令里先 `pnpm typecheck` 后 `pnpm lint`，显示最后一段）；
  - `18e223e9`：`… ~/tools/bun/bin/bun test 2>&1 …`。

  这一行从 200 字缩到三四十字，空出来的地方按规则还给最新的 `↳` 行：`7e629e49` 多 1 行，`a62bd8b9`、`fd738f5b`、`6fa401c0` 各多 2 行，"Included" 和 "Left out" 里"从第几轮起"跟着变。除此以外逐字相同。
- **在 Codex 里**（只守 3.6 万字节和 1.5 万 token）：最多 28,458 字符、34,983 字节，都在上限内。因为不再受 2.5 万字符限制而多装了内容的有 5 个：
  - `fb9393aa`（英文多）：中间省掉的用户消息从 58 条减到 48 条，多带了 10 条，共 28,458 字符；
  - `a62bd8b9`、`fd738f5b`、`6fa401c0`：`↳` 行从第 73 轮起变成从第 62 轮起，各多 11 行；
  - `a08bde23`：`↳` 行从第 104 轮起变成从第 99 轮起，多 5 行。

  `7e629e49` 多 1 行 `↳`，是因为验证那一行变短了。
- **认不出 Agent 时**（三条一起守）：最多 24,152 字符、34,966 字节，都不超过 3.6 万字节。因为加了字节上限而多删了东西的有 2 个：
  - `7e629e49`（原来 38,333 字节）：`↳` 行从第 20 轮起变成从第 32 轮起，少了 12 行；
  - `46083e3d`（原来 36,570 字节）：最后 2 轮中间的步骤省掉 13 个（第 74、75 轮）。

  正在写的两个也一样多删了：`9580fc64` 原来 45,861 字节，`18e223e9` 原来 38,750 字节。其他会话没受影响：本来就不到 3.6 万字节，有的还因为验证那一行变短多了 `↳` 行。

测试 201 个（199 通过，2 个只在本机读真会话时跑），打包后的端到端测试 61 个通过；提交 4 个，打了 tag `m1-8.1`，没有 push。

**和设计不一致、要作者改文档的地方**：
1. 一条命令里认出好几段（先 typecheck 后 lint、先 typecheck 后 test）时，只显示**最后一段**。
2. 后面还有命令时，结尾也加 " …"（设计只说了开头）。
3. 省略号不带连接符：写成 `… bun test`，不是 `… && bun test`（拆段时连接符已经去掉了）。
4. 验证那一行变短以后，空出来的地方按"剩下的空间还给 `↳` 行"的规则用掉，所以 4 个会话在 Claude Code 里多了 1–2 行 `↳`，"Included" 和 "Left out" 里"从第几轮起"也跟着变。验收"除了那一行逐字相同"严格说只对其余 22 个会话和 `199ec839` 成立。

### ⑧.2 文档核对后的四处修改（2026-10-12 作者定，tag `m1-8.2`）

**依据**：v2.0 文档大扫除回报里提的几件事，作者 2026-10-12 定（第 1 条是另建文档仓库，见开头版本记录）。

**任务和验收**
1. **`meme status` 写 WSL 没在运行**，和列表里的提示一致。
   - 验收：Ubuntu 停着时，`ls --plain` 的第一行和 `status` 来源下面是同一句。
2. **`uninstall` 的确认改成和 `forget` 一样的 `[y/N]`**：`forget` 10-10 已定 `[y/N]`；`uninstall` 只删 meme 自己能重建的数据，没必要比它更严。
3. **Windows 上接一个从 WSL `/mnt/c/...` 开始的会话**：Source 那一行也写 `C:\...`，和位置判断一致。
4. **加一个测试**：扫描 `src/` 里适配器以外的文件，出现 Agent 的名字或环境变量就失败（档案登记处除外），把第 ⑦ 步的搜索验收变成测试。
5. `show --all` 读子代理的过程：先不做，保持 §3.2 标的"没做"。

**怎么做的**
- **1**：`status` 在来源表下面写和列表同一句 "WSL (Ubuntu) is not running; its sessions are as of <时间>"；停着的发行版的来源那一行写 `not running`。原来那一行显示上次同步时的 `readable`，和下面那句矛盾。
- **2**：`[y/N]` 的问法挪到 `cli/context.ts`，`forget` 和 `uninstall` 共用：
  - 输入 `y` 或 `yes` 才删，只按回车或别的都不删；
  - `--yes` 和"不是终端时必须加 `--yes`"不变；
  - 顺手去掉了问题后面多出来的一个空格：Bun 的 `prompt()` 自己会加空格，`forget` 原来也是两个空格。
  - 端到端测试第一次在伪终端里跑交互确认（util-linux 的 `script`，只在 Linux 上跑）：回车和 `n` 不删，`y` 和 `yes` 删。
- **3**：`continue` 用 `place.ts` 的 `localDir`（读那个发行版自己的 wsl.conf）算好目录，传给 `buildHandoff`。
  - `build.ts` 自己仍然不读文件系统；不传时（评测脚本、单元测试）照旧自己算。
  - 目录在 Windows 盘上时，不写"仓库在 WSL 里、从 Windows 跑 git 很慢"那条提醒：`C:\...` 在 Windows 上不慢。
  - **推送不变**：从 Windows 推送 WSL 的会话，照旧在 WSL 里、在 `/mnt/c/...` 启动 Agent。v2.0 回报里说"推送用 `C:\...`"不对，用 `C:\...` 的只有位置判断。
- **4**：`test/unit/agent-knowledge.test.ts`：
  - **扫描范围**：`src/` 下除了 `src/adapters/` 的所有 `.ts`，注释也算。
  - **词从所有档案取**：标识、名字、短名、命令、别名、家目录、家目录的环境变量、会话 ID 的环境变量、说明文件、归档目录。以后加一家 Agent 也自动查。
  - **怎么匹配**：4 个字符以上的词不分大小写、出现在哪都算，所以 `CLAUDECODE`、`CODEX_SANDBOX`、`claudeCode` 都能查到；更短的（`cc`）只认单独的词，`access` 不算。
  - 跑出来 2 处：`handoff/budget.ts` 的两行注释（第 ⑧.1 步加的）写了 Agent 的名字，已改。
- **另外一处**（准备测试单时发现）：选 Agent 那一屏的说明还写 "meme starts the agent … in the session's project"。第 ⑧ 步以后启动在会话开始的目录，改成 "in the directory the session started in"，真机测试 A2、B4 会看到这句。tag 先打在前一个提交上，改完挪到这个提交（只在本地，没有 push）。

**结果**
- 测试 206 个（204 通过，2 个只在本机读真会话时跑），打包后的端到端测试 64 个通过；每个提交单独都能通过类型检查。
- 作者的 29 个会话，在 WSL 里用改前的 `m1-8.1` 打包和改后的代码各拉一次交接，逐字相同：这次的改动只影响 Windows 读 WSL。
- 提交 6 个（`fd4ffab` … `348f15d`），打 tag `m1-8.2`，没有 push。
- 重新打包 5 个平台，校验和核对通过。
  - WSL 的 `~/.local/bin/meme` 是指向 `dist/meme-linux-x64` 的软链接，已经是新版；
  - Windows 版复制到 `%TEMP%\meme-w5\meme.exe`；
  - 从 WSL 调用 Windows 版粗测的数字写在 §6 ⑤ 的测试单 B2b 里。

**和设计不一致、要作者看的地方**
1. `status` 里停着的发行版的来源行改写成 `not running`，作者只要求加那一句。
2. 推送没改（见上面第 3 条）。
3. **发现，没改**：Windows 上没装 Codex 时，`status` 的来源表有一行 `Codex·Win ~\.codex NOT READABLE (nothing deleted)`。本地的家目录总会列成来源，不存在也算"读不到"；第 ③ 步起就这样，WSL 里没装某家 Agent 时也一样。可以改成不列，或写 `not installed`，待作者定。（10-12 作者定写 `not installed`，第 ⑧.3 步）

### ⑧.3 第二轮真机测试以后的修改（2026-10-12 作者定，tag `m1-8.3`）

**依据**：§6 ⑤ 第二轮真机测试（B5 删掉了正在运行的开发窗口、B2b 偶尔 10 秒、B4 的交接又被存成文件、B4 的新会话认不出上游、Windows 上没装 Codex），作者 10-12 选定。

**任务和验收**
1. **`forget` 不删开着的会话**。只看"最近 5 分钟写过"，认不出开着、但闲了很久的窗口；B5 里的警告又被测试单要求输入 `y` 越过了。
   - **信号**：Claude Code 把开着的会话登记在 `~/.claude/sessions/<pid>.json`（2.1.296 实测：`sessionId`、`pid`、`procStart`，`procStart` 就是 `/proc/<pid>/stat` 的第 22 项，正常退出时删掉这个文件）。进程还在、能比启动时间的地方也对得上，才算开着。
   - **进程在不在**：WSL、Linux 本机读 `/proc/<pid>/stat`；Windows 上看 WSL 的，读 `\\wsl.localhost\<发行版>\proc\<pid>\stat`（实测 32 毫秒；只看正在运行的发行版，停着的里面没有开着的会话）；WSL 里看 Windows 的、Windows 本机的，用 `tasklist.exe` 查 pid；macOS 看 pid 在不在。
   - **开着的会话**：选会话的列表里那一行写 `open now`；选它、或者用 id 指定它，都拒绝，什么都不删，`--yes` 也一样："<id> is open in Claude Code (<环境>, process <pid>). Close it there first. Nothing deleted."
   - **查不到时**（没有登记、登记认不出、进程查不了、Codex 的会话）：照旧按"最近 5 分钟写过"警告，再问一次 `[y/N]`。
   - Codex：0.162.1 的程序里有"thread writer lock"（`~/.codex/thread-writer-locks`，"already has an active writer"），现在目录是空的，看不到格式，先不用。
   - 登记的位置和格式只写在 Claude Code 的适配器里。
   - **验收**：端到端测试：假登记指向一个活着、启动时间对得上的进程，列表有 `open now`，选它、用 id、加 `--yes` 都拒绝；进程退出了、启动时间对不上、登记是坏的 JSON，照旧可以删（有时间警告）；`MEME_ENV=win` 加假 WSL 根目录里的 `proc/<pid>/stat` 一样拦得住；假 `tasklist.exe` 列出 pid 时拦得住。真机：作者从 PowerShell 对开发窗口运行 `meme forget <id>`，被拒绝。
2. **慢的命令记进 log**：一条命令超过 2 秒，往 `meme.log` 写一行各段的耗时：进程启动到 meme 开始、打开数据库、导入本机的会话、等 `wsl.exe`、导入 WSL 的会话、命令本身。
   - **验收**：测试钩子 `MEME_SLOW_MS` 把门槛调成 0，log 里有这一行、各段都在；真机：作者跑 50 次，看 log 定 10 秒的原因。
3. **Claude Code 的上限改成 2.7 万字节**（原来 2.5 万字符）：Claude Code 把超过约 3 万字节的命令输出存成文件（§8），留 10%。认不出在哪家 Agent 里时取最紧的：2.7 万字节、1.5 万 token。交接第三行（`Source:` 下面，一定在 2KB 预览里）加一句 "If your tool saved this output to a file, read the whole file before you reply."，防止 Claude Code 以后调低存文件的门槛。
   - **验收**：作者全部会话在 Claude Code 里的交接都不超过 2.7 万字节；列出因此少了内容的会话；在 Codex 里只多了第三行。
4. **接力链在推送时会断**：B4 里新的 Claude Code 把第一条消息里的命令改成了 `(command -v meme || …); meme continue 7e629e49 2>&1 | head -c 200000`，按"加管道不算"的规则，认不出上游。
   - 推送的第一条消息写明原样运行，不要加管道或别的命令；
   - 识别放宽：命令拆成几段（§4.6.6 的拆法）以后，有一段以 `meme continue` 开头；而且输出开头几行里有交接头。输出被存成文件时，看 2KB 的预览。
   - **验收**：`7373e17e` 认出上游 `7e629e49`（`ec8e585d` 在 B5 里删了，镜像里也同步删了，没法验证）；作者其余会话的交接和改前逐字相同（除了第 3 条带来的变化）。
5. **没装的 Agent 写 `not installed`**：来源读不到、而且那个来源所在的 Agent 家目录（`~/.claude`、`~/.codex`）不存在时，`status`、`install` 写 `not installed`，log 也不再每条命令记一行；家目录在、读不了，才写 `NOT READABLE`。两种都一条不删。
   - **验收**：端到端测试：没有 `~/.codex` 时写 `not installed`、log 里没有那一行；有 `~/.codex` 但读不了时照旧。
6. **测试单的规矩**：要删、要改的会话一律写 id，不写"最新的那个"；不预先让作者对 "may still be running" 的警告输入 `y`。（10-12、10-13 作者补：要删、要试删除保护的，另开一个用完就扔的会话，不拿正在用的开发窗口测；在 PowerShell 里接管道的那一步前面先写 `[Console]::OutputEncoding = [Text.Encoding]::UTF8`；关 WSL（`wsl --shutdown`）的那一步前面提醒"先关掉 VS Code 的 WSL 窗口"，它断线后会自动重连、把 WSL 拉起来。）

**怎么做的**
- **1 开着的会话**：
  - `platform/process.ts` 判断进程在不在；Claude Code 适配器读登记（`openSessions`）；`cli/open.ts` 把两者合起来，只看 meme 现在读的来源，Windows 上只看正在运行的发行版。
  - `forget` 在列出要删的内容之前拒绝，`--yes` 也一样；`--chain` 带上的更早的会话如果开着，跳过不删。
  - 选会话的列表里，开着的那一行在时间的位置写 `open now`；选它以后退出列表、报上面那句。
  - Claude Code 被杀掉（比如 `wsl --shutdown`）时登记文件会留下来，所以以进程为准，不以文件为准。
- **2 慢的命令**：一行的样子：`slow: meme forget 0cb2fa3e took 2265ms (start 127, open 36, import 346, wsl.exe 6, import WSL 1649, command 25)`（这次是新数据目录第一次导入）。在终端里（全屏列表、`[y/N]`）只算到命令开始之前，用户想多久都不算慢。`start` 是进程启动到 meme 的代码开始跑；如果 `Measure-Command` 量到 10 秒、log 里却没有这一行，时间就花在 meme 启动之前（比如杀毒软件扫描程序）。
- **3 上限和第三行**：Claude Code 档案 `outputLimit: { bytes: 27_000 }`；第三行放在 `Source:` 下面、所有 `Note:`/`Warning:` 之前，每份交接都有（Codex、`--plain` 也有）。
- **4 推送和接力链**：两家档案的第一条消息加了 "exactly as written, with no pipe or other command around it"，开头那半句不变，所以旧会话的推送消息照样认得出。接力链的放宽只在推送开始的那一轮（见下面"和作者给的规则不一样"）。
- **5 not installed**：适配器给每个来源一个家目录（`homeOf`：Claude Code 是 `projects` 的上一级，Codex 就是 `~/.codex`）；家目录不在就是没装。
- **README**（中英两份）：长度上限、`forget` 拒绝开着的会话；`forget --help` 末尾也加了一句。

**结果**
- 测试 219 个（217 通过，2 个只在本机读真会话时跑），打包后的端到端测试 73 个通过；提交 11 个（`6c02571` … `24f2483`），每个单独都能通过类型检查；打 tag `m1-8.3`，没有 push。重新打包 5 个平台，校验和核对通过；WSL 的 `meme` 已是新版，Windows 测试用的 `%TEMP%\meme-w5\meme.exe` 换成了新版。
- **真机（我在 WSL 里做的，临时数据目录，都不加 `--yes`）**：
  - WSL 里 `meme forget 0cb2fa3e`（这个开发窗口）、`9580fc64`（设计窗口）：都报 "is open in Claude Code (WSL, process 5088/2034)"；`7373e17e`（已退出）照常要确认。
  - 从 WSL 调用打包好的 Windows 版：同样两个都拒绝，写 "(WSL: Ubuntu, process …)"，经 `\\wsl.localhost\Ubuntu\proc` 读进程；`status` 里 `Codex·Win ~\.codex not installed`。
  - Windows 本机：临时的 `CLAUDE_CONFIG_DIR` 里放一份 `a62bd8b9` 的副本和一份指向 explorer.exe 的登记，Windows 版拒绝并写 "(Windows, process 31312)"；改成不存在的 pid 就照常要确认。临时目录已删。
  - 顺带发现：数据目录放在 `\\wsl.localhost` 上时 SQLite 加不了锁（"database is locked"）。用户的数据目录在 `~\.meme`，不受影响。
- **作者的会话**（33 个，32 个有启动目录；改前的 `m1-8.2` 源码和改后的各跑一遍，各自从自己的目录，各用一份临时镜像）：
  - **在 Codex 里**（3.6 万字节，没变）：25 个除了第三行逐字相同；`6fa401c0`、`fd738f5b`、`a62bd8b9` 因为第三行占了地方，`↳` 行从第 62 轮起变成从第 63 轮起；`7373e17e`、`39390dea` 认出了上游（下面）；`0cb2fa3e` 是这个正在写的会话，两次之间变了。
  - **在 Claude Code 里**：19 个除了第三行逐字相同；改前超过 2.7 万字节的 11 个现在都在 26,225 字节以内，因此少带了内容：

    | 会话 | 改前字节 | 改后 | 多省掉的 |
    |---|---|---|---|
    | `9580fc64`（设计窗口，中文多） | 44,533 | 26,175 | 中间 41 条用户消息、3 段长消息的后半；`↳` 行只剩第 69 轮起 |
    | `7e629e49` | 38,491 | 26,063 | 中间 5 条用户消息、最早改的 28 个文件、最后 2 轮 AI 的部分话；`↳` 行从第 19 轮起变成第 30 轮起 |
    | `46083e3d` | 36,570 | 25,776 | 最后 2 轮中间 13 步、AI 的部分话（`↳` 行反而多了：英文多，2.7 万字节比 2.5 万字符宽） |
    | `a08bde23` | 33,407 | 25,979 | 同上，`↳` 行从第 104 轮起变成第 102 轮起 |
    | `381dfa7f`、`f72c5eec`（同一个续接链） | 33,181 / 33,098 | 25,863 / 25,780 | `↳` 行原来每轮都有，现在从第 27 轮起 |
    | `6fa401c0`、`fd738f5b`、`a62bd8b9`（同一个续接链） | 约 32,850 | 约 25,800 | `↳` 行从第 71 轮起变成第 73 轮起，最后 2 轮 AI 的部分话 |
    | `fb9393aa` | 31,116 | 26,023 | 中间省掉的用户消息从 58 条变成 66 条 |

  - **接力链**：`7373e17e`（B4）认出上游 `7e629e49`（再往上 `eaf1fe0f`），交接从 4,174 字节变成 25,651 字节；`39390dea`（10-10 推进 muse 的会话，命令是 `meme continue a62bd8b9 2>&1 | head -200`）认出上游 `a62bd8b9`。`ec8e585d` 在 B5 里删了，镜像也同步删了，没法验证。

**和作者给的规则不一样、要作者看的地方**
1. **接力链的放宽只在推送开始的那一轮**。按作者给的"命令里有单独一段 `meme continue`、输出开头几行有交接头"，作者会话里多认出 4 处，都是开发、设计窗口在**看**交接输出：
   - `7e629e49` 第 4 轮：`… meme continue | head -4; meme continue eaf1fe0f | head -2; …`；
   - `9580fc64` 第 3 轮：`cd /home/jihd/work/private; meme continue 01a124ba 2>&1 | head -60`（和 `39390dea` 的命令几乎一样，区别只在那一轮是用户自己开的头）；
   - `9580fc64` 第 29、57 轮：一条命令里跑好几次 `meme show`、`meme continue`，或重定向进文件再读。

   这样 `9580fc64` 的交接会多出 7 个假的上游，它自己的 71 条消息只剩 17 条。所以只在第一条消息是 meme 推送消息的那一轮放宽，而且 `meme continue` 后面的会话要和推送的是同一个；别的轮次照旧只认单独的命令。handoff.md 7.3 节原来"管道不算"的理由（`7e629e49` 里 7 处）也是这个。（10-12 作者同意。）
2. **查不到开着没有时**（Codex 的会话、没有登记），照旧是"最近 5 分钟写过"警告、再问一次 `[y/N]`，没有改成直接拦。作者 10-12 第二条消息里写"查不到再按最近写过拦"，如果是要直接拦，再改。（10-12 作者定：直接拒绝，第 ⑧.4 步。）
3. 选会话的列表里选中开着的会话，是退出列表以后才报拒绝，不是在列表里拦住。
4. Codex 的 `thread-writer-locks` 没用上；以后作者开着 Codex 时可以看一下那个目录里有什么，再决定。

**第三轮真机测试单（2026-10-12，按 `m1-8.3` 打包）**（作废，作者没测；改过的在 §6 ⑧.4 末尾）

这一轮不做 `wsl --shutdown`，开发窗口 `0cb2fa3e` 一直开着，测完直接回到它。会话一律按 id，没有"最新的那个"。

- 上一轮没报的：A0–A4（WSL 终端）、B1（PowerShell 里 `meme ls -a`）、B0 的 `Get-Command meme`，照 §6 ⑤ 的测试单做，结果一起贴回来。
- 先在 PowerShell 里：`$env:Path = "$env:TEMP\meme-w5;$env:USERPROFILE\.local\bin;$env:Path"`

**C1 不删开着的会话**
- PowerShell 里敲：`meme forget 0cb2fa3e`
  - 通过：显示 `meme: 0cb2fa3e is open in Claude Code (WSL: Ubuntu, process <数字>). Close it there first. Nothing deleted.`，什么都没问。
- PowerShell 里敲：`meme forget`（不写 id），在列表里找到 `0cb2fa3e` 那一行
  - 通过：第二行在时间的位置写 `open now`。看完按 **Esc** 退出，不要按 Enter。
- WSL 终端里敲：`meme forget 0cb2fa3e`
  - 通过：同一句，括号里是 `(WSL, process <数字>)`。

**C2 没装的 Agent**
- PowerShell 里敲：`meme status`
  - 通过：`Codex·Win  ~\.codex  not installed  0 sessions`。

**C3 慢的命令记进 log**
- PowerShell 里敲：
  ```
  1..50 | % { [int](Measure-Command { meme ls -a --plain }).TotalMilliseconds } | Sort-Object -Descending | Select-Object -First 5
  Select-String 'slow:' "$env:USERPROFILE\.meme\logs\meme.log" | Select-Object -Last 5
  ```
  - 要贴回来的：两条的输出原样贴回来。有超过 2 秒的，log 里会有一行各段耗时；如果最慢的一次是 10 秒、log 里却没有对应的一行，时间就花在 meme 启动之前。

**C4 再推送一次（B4 重做）**
- PowerShell 里敲：`meme continue 7e629e49`，选 Claude Code。
  - 通过：WSL 里的 claude 在 `/home/jihd/work/meme` 启动；它跑的第一条命令就是 `meme continue 7e629e49`，没有管道；输出没有被存成文件（没有 "Output too large"）；总结完等你。
- 看完退出 claude，在 PowerShell 里敲：`meme ls -a --plain | Select-Object -First 6`，记下刚才新建的那个会话的 id（时间是刚才、标题和 `7e629e49` 有关；不一定在最上面，开发窗口可能更新）。
- 再敲：`meme continue <新 id> --plain | Select-String '^## Earlier session'`
  - 通过：有一行 `## Earlier session 7e629e49 (handed over into this one)`。
- 这个新会话留着，不用删。

测完回到开发窗口：WSL 里进 `~/work/meme`，运行 `claude --resume 0cb2fa3e-30bf-4467-8322-edbaed96975b`（它一直开着的话，直接切回那个窗口就行），把结果贴给我。

### ⑧.4 查不到时直接拒绝、Codex 的开着（2026-10-12 作者定，tag `m1-8.4`）

**依据**：作者看了第 ⑧.3 步的回报，10-12 定：
- 接力链只在推送开始的那一轮放宽、而且要是被推送的那个会话：**同意**（§6 ⑧.3"和作者给的规则不一样"第 1 条）。
- 查不到开着没有、而最近 5 分钟写过的：**直接拒绝**，不再"警告后再问一次"，`--yes` 也一样；提示写清"可能还开着，先关掉它，或者过几分钟再删"。
- 查一下 Codex 运行时会不会一直开着会话文件；会的话在 Linux 上按"哪个进程打开着它"判断；查不到就只按最近写过。
- 测试单 C1 不拿正在用的开发窗口测，另开一个用完就扔的会话。

**实测 Codex（2026-10-12，作者机器，0.162.1）**：在临时目录里开 Codex 界面，发一句 "Reply with the single word OK."（调用了一次模型）。
- 只打开界面、不发消息时，不建会话文件，也不建锁。
- 回复以后闲着 20 秒，Codex 进程一直开着两个文件：会话文件 `rollout-….jsonl`，和 `~/.codex/thread-writer-locks/<会话 id>.lock`；锁文件上有它的 `flock`（`/proc/locks` 里写着它的 pid 和锁文件的 inode）。
- `/quit` 正常退出后，锁文件删掉了。被杀掉时 `flock` 跟着进程一起消失，文件可能留下（Codex 下次启动会清理）。
- 从 Windows：经 `\\wsl.localhost` 读不了 `/proc/<pid>/fd` 的链接（readlink 报 EISDIR），但 `\\wsl.localhost\Ubuntu\proc\locks` 读得到，经 `\\wsl.localhost` 读到的 inode 和 Linux 里的一样。
- 收尾：测试会话用 `codex delete --force` 删了；Codex 往 `~/.codex/config.toml` 写了信任临时目录等两处，已恢复成原样。

**任务和验收**
1. **三种结果**：每个要删的会话，meme 判断成"开着"、"关着"或"查不到"。
   - 开着：照第 ⑧.3 步拒绝。
   - 关着（这家 Agent 的登记读得到，里面没有它，或者登记它的进程已经不在）：照常 `[y/N]`，刚写过也不再多问。
   - 查不到（没有登记：Claude Code 和 Codex 的老版本、Windows 上的 Codex；进程查不了）：最近 5 分钟写过就拒绝，`--yes` 也一样："<id> was active <多久> ago and may still be open in <Agent>. Close it there first, or delete it in a few minutes. Nothing deleted."；更早的照常。
   - 去掉"There are warnings above. Delete anyway?"那一问。
2. **Codex 的登记**：`<家目录>/thread-writer-locks/<会话 id>.lock`。有这个目录、没有这个会话的锁文件：关着。锁文件在：到 `/proc/locks` 里按锁文件的 inode 找 `FLOCK`，找到就是开着（写那个 pid），找不到就是关着（被杀掉留下的）。WSL、Linux 本机读 `/proc/locks`，Windows 上看 WSL 的读 `\\wsl.localhost\<发行版>\proc\locks`；Windows 本机的 Codex、WSL 里看 Windows 的 Codex 查不到。
   - 只比 inode，不比设备号（经 `\\wsl.localhost` 拿不到 Linux 的设备号）；不同文件系统上 inode 撞上的话会误判成开着，那是往安全的方向错。
3. **Claude Code**：`~/.claude/sessions` 目录在就算"登记读得到"；没有这个目录是查不到。
   - **验收**（端到端）：Claude Code——没有登记目录时，1 分钟前写过的被拒绝（`--yes` 也是），一天前的照常；有登记目录、里面没有它时，1 分钟前写过的照常删。Codex——锁文件被一个活着的进程 `flock` 着：拒绝，写 pid；锁文件在、没人锁：照常删；没有 `thread-writer-locks` 目录：按最近写过；`MEME_ENV=win` 加假 WSL 里的 `proc/locks`：拦得住。真机：作者按新的 C1 测。
4. **测试单**：C1 改成另开一个用完就扔的 Claude Code 会话；C1–C4、A0–A4、B1 重写在本节末尾，第 ⑧.3 步末尾那份作废。

**怎么做的**
- **登记的三种情况**：适配器的 `openSessions` 返回 `null` 表示"这里没有登记"（老版本），返回空表表示"有登记，什么都没开着"。`cli/open.ts` 给每个会话算出开着、关着、查不到；一个会话的文件分属几个来源时，每个来源都得查得到才算关着。
- **Codex**：适配器列出 `thread-writer-locks/*.lock`；平台层 `lockHolder` 按锁文件的 inode 在 `/proc/locks` 里找 `FLOCK`，排队等锁的（`->`）不算。
- **forget**：开着的、查不到而最近 5 分钟写过的，都在列出要删的内容之前拒绝，几条原因写在一起，最后是 "Nothing deleted."；`--chain` 带上的更早的会话照同样的规则跳过。"There are warnings above. Delete anyway?" 和 Agent 里"需要再确认一次"那条都去掉了。
- **帮助和 README**：`forget --help` 末尾、README 两份的"删除"一节改成新规则。

**结果**
- 测试 224 个（222 通过，2 个只在本机读真会话时跑），打包后的端到端测试 78 个通过。提交 4 个（`56e3515`、`524033c`、`c2fdd19`、`3075e07`），每个单独都能通过类型检查。adapters 和 cli 两处合成了一个不带 scope 的提交：适配器接口一改，旧的 `cli/open.ts` 就过不了类型检查。打 tag `m1-8.4`，没有 push。5 个平台重新打包、校验和核对通过；WSL 的 `meme`、Windows 的 `%TEMP%\meme-w5\meme.exe` 都是新版。
- **真机（Codex，我在 WSL 里做的）**：再开一个用完就扔的 Codex 会话（又调用了一次模型），开着的时候：
  - WSL 里的 meme：`01a12f92 is open in Codex (WSL, process 130202)`；
  - 从 WSL 调用 Windows 版：`… (WSL: Ubuntu, process 130202)`，经 `\\wsl.localhost\Ubuntu\proc\locks` 查到。
  - `/quit` 以后锁文件没了；Windows 版不再拒绝，照常要确认。然后用 `meme forget 01a12f92 --yes` 删掉了它（meme 运行的是 `codex delete --force`）。`~/.codex/config.toml` 又恢复成原样。
- Claude Code：这个开发窗口照旧被拒绝。

**和作者的话不完全一样、要作者看的地方**
1. 查得到"关着"的会话（登记读得到、里面没有它），刚写过也照常删，不再多问一句。新的 C1 最后一步测的就是这个。
2. 查不到的几种情况：Claude Code 没有 `~/.claude/sessions` 目录（老版本）、Codex 没有 `thread-writer-locks` 目录（老版本）、Windows 本机的 Codex 和 WSL 里看 Windows 的 Codex（锁在 Windows 上，meme 查不了谁锁着它）、进程查不了（比如 `tasklist.exe` 不能运行）。
3. 风险：如果以后某个 Claude Code 版本不再登记、但 `~/.claude/sessions` 目录还在，meme 会把开着的会话当成关着的。写进了 §8 那一行：升级 Claude Code 以后，对一个开着的会话跑一次 `meme forget <id>`，看是否还拒绝。

**第三轮真机测试单（2026-10-12，按 `m1-8.4` 打包；代替 §6 ⑧.3 末尾那份）**

会话一律按 id。这一轮不做 `wsl --shutdown`，开发窗口 `0cb2fa3e` 一直开着，不拿它测，也不删它。

- **准备**：WSL 的 `meme` 指向 `~/work/meme/dist/meme-linux-x64`；Windows 用 `%TEMP%\meme-w5\meme.exe`。两个都已是 `m1-8.4`。
- PowerShell 用经典的（Win+R，输入 `powershell`），每开一个先敲：`$env:Path = "$env:TEMP\meme-w5;$env:USERPROFILE\.local\bin;$env:Path"`

**一、WSL 终端**（另开一个 WSL 终端窗口；在 Claude Code 里用 `!` 不行）

**A0 版本**
- 敲：`readlink -f "$(which meme)"`，再敲 `meme uninstall --help`
- 通过：第一条是 `/home/jihd/work/meme/dist/meme-linux-x64`；第二条里有 `Asks first ([y/N])`。

**A1 列表**
- 敲：`meme ls -a`
- 通过：
  - 顶部 `Sessions · all projects  N shown`；下面两行筛选 `Platform ● All ○ WSL ○ Win`、`Agent ● All ○ Claude ○ Codex`；
  - ←→ 改当前行，Tab 换行，当前行的行名是青色；Platform 选 All 时分 `── WSL (n) ──`、`── Win (n) ──` 两组，选 WSL 或 Win 时不分组；
  - 每个会话两行：标签在第一行最右，id 在第二行最右，上下对齐；
  - 搜索框是圆角框，打字后边框变青、列表跟着过滤；窗口拉窄时最下面的按键说明换成两行；Esc 退出。

**A2 选 Agent 那一屏**
- 敲：`meme continue -a`，选任意一个会话按 Enter
- 通过：出现 "Continue in which agent?"，灰色说明是 "meme starts the agent in the directory the session started in; …"，窗口拉窄时完整换行。按 Esc 一路退出，不要真的启动。

**A4 长路径**
- 敲：`meme ls -a --plain`
- 通过：项目那一列的长路径省略中间，比如 `/mnt/c/…/bots/cindy-default/workspace`。

**二、C1 一个用完就扔的会话**（顺带做 A3）

1. WSL 终端里敲：`mkdir -p /tmp/meme-c1 && cd /tmp/meme-c1 && claude`。问是否信任这个文件夹时选信任，然后说一句 `hello`，等它回答，**保持开着**。
2. 另开一个 WSL 终端，敲：`cd /tmp/meme-c1 && meme ls --plain`，记下这个会话的 id（下面写作 `<c1>`，只有这一个）。
3. 同一个终端敲：`meme forget <c1>`
   - 通过：`meme: <c1> is open in Claude Code (WSL, process <数字>). Close it there first. Nothing deleted.`，什么都没问。
4. PowerShell 里敲：`meme forget <c1>`
   - 通过：同一句，括号里是 `(WSL: Ubuntu, process <数字>)`。
5. PowerShell 里敲：`meme forget`（不写 id），找到 `<c1>` 那一行
   - 通过：第二行在时间的位置写 `open now`。按 **Esc** 退出，不要按 Enter。
6. 回到第 1 步的 claude，敲 `/exit` 正常退出。
7. **A3**：WSL 终端里敲 `meme forget <c1>`，到 `Delete this session? [y/N]` 时**只按回车**
   - 通过：列出 `<c1>` 的文件，没有 "may still be open"；只按回车后显示 `Nothing deleted.`。
8. 还是 **A3**：WSL 终端里敲 `meme uninstall`，到 `Remove them? [y/N]` 时**只按回车**
   - 通过：显示 `Nothing removed.`。
9. 关掉以后能删：PowerShell 里敲 `meme forget <c1>`，确认显示的 id 是 `<c1>`、标题是刚才那句，再输入 `y`
   - 通过：只问一次，最后显示 `✓ <c1> deleted`。

**三、PowerShell**

**B0 的 Get-Command**
- 敲：`Get-Command meme`
- 通过：Source 是 `...\Temp\meme-w5\meme.exe`。

**B1 列表**
- 敲：`meme ls -a`
- 通过：和 A1 一样；WSL 会话的项目写成 `/home/jihd/...`。

**C2 没装的 Agent**
- 敲：`meme status`
- 通过：`Codex·Win  ~\.codex  not installed  0 sessions`。

**C3 慢的命令记进 log**
- 敲：
  ```
  1..50 | % { [int](Measure-Command { meme ls -a --plain }).TotalMilliseconds } | Sort-Object -Descending | Select-Object -First 5
  Select-String 'slow:' "$env:USERPROFILE\.meme\logs\meme.log" | Select-Object -Last 5
  ```
- 要贴回来的：两条的输出原样贴回来。有超过 2 秒的，log 里会有一行各段的耗时；如果最慢的一次是 10 秒、log 里却没有对应的一行，说明时间花在 meme 启动之前。

**C4 再推送一次（B4 重做）**
- 敲：`meme continue 7e629e49`，选 Claude Code。
- 通过：WSL 里的 claude 在 `/home/jihd/work/meme` 启动；它跑的第一条命令就是 `meme continue 7e629e49`，没有管道；输出没有被存成文件（没有 "Output too large"）；总结完等你。
- 看完退出 claude。敲 `meme ls -a --plain | Select-Object -First 6`，记下刚才新建的那个会话的 id（时间是刚才、标题和 `7e629e49` 有关；不一定在最上面）。
- 再敲：`meme continue <新 id> --plain | Select-String '^## Earlier session'`
  - 通过：有一行 `## Earlier session 7e629e49 (handed over into this one)`。
- 这个会话留着，不用删。

测完回到开发窗口 `0cb2fa3e`（它一直开着，切回去就行），把结果贴回来。

**第三轮结果（2026-10-13，作者测；程序是 `m1-8.4` 加上 `●` 那处改动，`e70b5a4`）**
- **A0 通过**：`meme` 指向 `dist/meme-linux-x64`；`uninstall --help` 里有 `Asks first ([y/N])`。
- **A4 通过**：`/mnt/c/…/bots/cindy-default/workspace`。
- **C1 通过**：一次性会话 `aa9b0b91`（`/tmp/meme-c1`，说了一句 hello）。
  - 开着时：WSL 里拒绝，写 "(WSL, process 168661)"；PowerShell 里拒绝，写 "(WSL: Ubuntu, process 168661)"；
  - `/exit` 以后：WSL 里 `meme forget aa9b0b91` 列出文件（"last active 2 minutes ago"，没有警告），输入 `y` 后删除。作者把第 7、9 步合成了这一次，所以"只按回车不删"这次没测（端到端测试在伪终端里测着）。
  - `meme uninstall` 只按回车：`Nothing removed.`
- **B0 通过**：`Get-Command meme` 的 Source 是 `%TEMP%\meme-w5\meme.exe`。版本那一列写 `1.4.2.0`，是 Bun 的版本号（打包时没设 meme 自己的 Windows 版本信息，发布准备时再看）。
- **C2 通过**：`Codex·Win ~\.codex not installed 0 sessions`。
- **C3**：50 次里最慢的 5 次是 857、436、403、393、392 毫秒，没有超过 2 秒的，log 里也就没有 `slow:` 行。10 秒那种这次没出现。
- **C4 通过**：从 PowerShell 推送 `7e629e49`，新会话 `04d35701` 第一条命令就是 `meme continue 7e629e49`，没有管道；输出 26,062 字节，没有被存成文件；`meme continue 04d35701 --plain` 里有 `## Earlier session 7e629e49 (handed over into this one)`。
- **管道乱码**（§8 已知的那条）：`meme ls -a --plain | Select-Object -First 6` 里中文和 `·` 乱码，而且行尾的 `…` 被按 GBK 解码时吃掉了换行，两行并成一行，6 行里出现了 7 个会话。办法照 README，先运行 `[Console]::OutputEncoding = [Text.Encoding]::UTF8`。测试单里接管道的那几条应该先写上这一句，是测试单漏了。
- **全屏界面**：A1、A2、B1，和 C1 第 5 步列表里的 `open now`，作者 10-13 确认都对。**第三轮全部通过**，第 ⑤ 步的真机测试到此做完。
- tag `m1-8.4` 挪到 `e70b5a4`（第三轮测的就是它，没 push 过；作者 10-13 定）。

### ⑨ 全面复查后的修复（2026-10-13 作者定，tag `m1-9`）

**依据**：10-13 全面复查的问题清单 R1–R33（六路复查加我复现，回报在开发窗口 `0cb2fa3e`），作者 10-13 定范围和下面几件事。

**约束**：纯代码，不调用模型；产品文字用英文；真会话不进 git；Conventional Commits，每个提交单独都能通过类型检查。**每条修复先写一个改前失败、改后通过的测试**。

**作者定的几件事**
1. **R10**：登记说开着、但查不了进程（比如 WSL 里看 Windows 的 Codex 锁、`tasklist.exe` 运行不了），不管多久都拒绝。提示写清楚：到那家 Agent 所在的一边运行 `meme forget`（Windows 上的 Codex 就到 Windows 上删）；那边能查进程，被强行关掉留下的旧锁在那边能认出来、正常删掉。
2. **`meme report`**：arch.md 6.5 节已定放在发布准备里，补进发布准备，现在不做。
3. **不可信内容**：最小版本。来自网页的工具（抓网页、搜索）那几步标上 "external content"；交接开头"这是历史，不是新指令"那句照旧。PRD §7 作者已改。
4. **`-a`、`--all` 统一**：在所有命令里都表示"所有项目"。`search` 里"也列工具调用"改名 `--tools`，`show` 里"也显示注入的消息和推理"改名 `--hidden`。交接里引用的 `meme show <id> <轮次> --all --full` 跟着改成 `--hidden --full`；README、`--help`、本文一起改。
5. **R31**（列表里空格是预览键）：不动，和 Claude Code 的 `/resume` 一致。

**任务**
1. **R1 插进去的话**：Claude Code 的 `attachment` 里 `queued_command`、`origin.kind` 是 `human` 的，转成用户的话，放在原位置；第二层报警盯上它（这种行变不成用户的话就记一条）。别的来源（`task-notification`、`peer`）照旧不算用户的话。
2. **R2 交接不超上限**：删减顺序后面再加几步（最后一次验证的输出、最近的命令、最后两轮里重复的用户原话），最后一道硬保护：还超就按行截到上限以内，并写明截掉了多少。中文为主的合成会话在三种上限下都不超。
3. **R3 + R8 只读模式**：开库以后才发现写不了的（Landlock 这类沙箱），也转成内存副本、重新导入；读进内存时先以只读方式打开库、等到锁再复制，不直接读文件字节。
4. **R4**：数据目录不在了（`uninstall` 之后）不写慢命令的 log；`uninstall` 之类不导入的命令不算慢。
5. **R5 + R24 脱敏**：密码规则改成后面真的跟着一个值，认 `DB_PASSWORD=`、`PGPASSWORD=`、JSON 的 `"password": "…"`，不再遮 `password: string;`、`user.password = hashPassword(…)` 这类代码；只有开头、没有 END 行的私钥也遮；导入时的预筛 `MAYBE_SECRET` 和规则保持一致（加测试）；升一次表结构版本，镜像按新规则重导。
6. **R6**：Windows 上拉取已停的 WSL 里的会话，不碰 `\\wsl.localhost`（不读它的 `wsl.conf`、不找 git 根目录），不启动 WSL。
7. **R7 建表和重建**：查版本、建表放在一个 `BEGIN IMMEDIATE` 事务里（`IF NOT EXISTS`）；重建在事务里删表，不删文件；只有库的版本比自己旧时才重建，旧版 meme 遇到新库进只读模式。
8. **R9**：Agent 的家目录在、但还没有会话目录：`status`、`install` 写 `no sessions yet`，log 不记。
9. **R10**：见上面第 1 条。
10. **R12 回退留下的旧分支**：Claude Code 里两条用户提问的上级（`parentUuid`）相同时，前一条那一支是废弃的，不算轮次，也不进交接（包括 "Edited files"）。
11. **R13**：trajectory 报"缺用户或 AI 记录"时，用 `partial: true` 再转一次，不丢记录、不出假报警。
12. **R14**：全屏界面绘制出错时先恢复终端再报错；行数不会算成负数。
13. **R19**：真正删除前再查一次开没开着。
14. **R20**：`forget --yes` 在终端里也不再问（和 `uninstall --yes` 一样）。
15. **R23**：截断不切开代理对；用户消息里的控制字符（ESC、BEL 等）不原样进交接。
16. **external content**：交接的步骤行里，来自网页的工具（Claude Code 的 `WebFetch`、`WebSearch`，Codex 的网页搜索）标上 "external content"；工具名单写在各家档案里。
17. **参数改名**：见上面第 4 条。
18. **文字**（复查第二部分全部）：`uninstall` 没终端时的提示照 `forget` 的写法；README 里"从不启动停着的发行版"改成只对 `ls`、`show`、`search` 和拉取成立；"会话开始的目录"；删减顺序补全；"几分钟"写明 5 分钟；`--plain` 在 Agent 里守那家的上限；`continue --help` 的目标列表补全；`ls --env` 认 `windows`、`macos`；Codex 不在 PATH 上时的删除提示；`status --plain`（去掉）；`show` 的 help 写明 `<轮次>` 和 `--full` 可以一起用；`forget` 在 Agent 里提到更早的会话时提 `--chain`；`continue` 在终端里不打印"别替用户挑"那句；未知选项的报错；`meme help <不存在的命令>` 退出码；真正的 bug 进 log（不把所有 RangeError 当成用户错误）；README 的测试钩子列表补全。
19. **补的测试**：整个 HOME 前后比对（`~/.meme` 以外什么都没改）；秘密进不了数据库文件，也进不了 `show`、`search`、`continue` 的输出；存进去的文字和原文一致；全屏查看界面（`viewer.ts`）；列表里 Space 预览、Enter 打开、查看界面里 `/` 搜索；`search -C`、`ls --env`；`forget` 只按回车不删。
20. **顺手一起做**：R11（Codex 的 `<turn_aborted>` 当中断，按 Codex 源码里的格式做合成样本）、R15（按字素簇算宽度）、R16（来源按真实路径去重）、R17（搜索的 `^`、`$` 认行首行尾）、R18（Codex 改名不用等下一条消息）、R22（`~/.meme` 是软链接时）、R25（接力链 "the first" 的说法、已删上游的消息不二次截断）、R26（Codex 以 `!` 命令结尾算 finished）、R28（非绝对路径的 cwd）、R29（`forget` 提 Claude Code 的 `history.jsonl` 和 `jobs/`）、R32（不知道会话目录时的提示）、R33（简化）、R30 里"没有变化也写一次库"。

**以后再说**（不做）：R21（和发布准备第 8 项一起做）、R27（提问里引用 `<command-name>`）、R30 的其余部分（跳过检查的平方复杂度、列文件和读库之间的竞态、中断后的 `copied` 标记）、R31。

**验收**
- 每条修复都有一个改前失败、改后通过的测试（改前失败的输出留在开发记录里）。
- 作者全部会话从各自的目录交接，除了这次有意改动的地方（插进去的话、回退的旧分支、脱敏规则、external content 标注、参数改名），输出和改前（`m1-8.4`）逐字相同；有差别的逐个列出。
- 做完打 tag `m1-9`，不 push。

**怎么做的**（按模块；每条修复都先写测试、在改前的代码上确认失败）
- **脱敏（R5、R24）**：密码规则拆成三条，都要求后面真的跟着一个值：引号里不含空格的值（`password = "…"`、`{"password": "…"}`，键可以带前缀、可以带引号）；`=` 后面紧跟、没有空格的值（`PGPASSWORD=…`、`--password=…`，不算 `password=password`）；YAML 行尾的值（不算 `password: string`）。JSON 里键像密码的值整个遮掉；工具参数的 JSON 先解析再逐个值脱敏（文件内容里的 `\"password\": \"…\"` 原来认不出）。私钥没有 END 行时，遮 BEGIN 行和后面的 base64、头部行。预筛 `mayHoldSecret` 挪到规则文件里，测试保证每种秘密都过得了预筛。
- **适配器**：
  - R1 插进去的话：`queued_command` 的 `origin` 是 `human` 的算用户的话；2.1.278–2.1.284 没有 `origin`，按内容分（作者机器上没有 `origin` 的全是 `<task-notification>`）；认不出的 `origin` 报警。
  - R12 回退：共用上级的用户提问，前面那些连同下面整支不算；第二层报警也跳过这些行。
  - R13：trajectory 报缺记录时用 `partial` 重读（两家共用一个 `canonical`）；只敲过 `/model` 的会话因此多一条 meta 记录（有了启动目录）。
  - R11：Codex 档案的中断格式 `<turn_aborted>`；R18：Codex 的 `rootState` 是 `session_index.jsonl` 的大小和修改时间。
  - R29：`jobs/<短 id>/` 的 `state.json` 里 `sessionId` 是这个会话才删；两家的 forget 说明里都提输入历史。
- **存储**：R3、R7、R8、R9、R16、R30 见 §4.4、§4.6.8；R17 预筛用带 `m` 的正则，先把 `\r\n` 换成 `\n`。
- **交接**：R2、R23、R25、external content、`--hidden` 见 §4.6.6。
- **命令**：R6 停着的发行版不读它的 `wsl.conf`、不做位置判断（挂载位置按 `/mnt/` 算）；R10、R19、R20 见 §3.5；R4 没有导入环节的命令不记慢命令，数据目录不在了也不记；R22 见 §3.6；R32 "meme does not know which directory <id> started in…"；文字（复查第二部分）全部按作者列的改了；`continue` 在 Agent 外打印列表时，最后一句是给人看的 "Run \`meme continue <number>\` to continue one."。
- **全屏界面**：R14 绘制、按键、改窗口大小出错时先恢复终端再把错误交给调用方，列表的高度不会算成负数；R15 按字素簇算宽度。
- **简化（R33）**：两家共用 `canonical`、`clip`、`resultOf`；`localDir` 去掉没用的参数；去掉没人用的 `predecessors`；`pathKey` 的正则按挂载位置缓存；放错位置的注释挪回去。复查说"没人用"的 `Handoff.trimmed`、`tokens` 其实 `eval/sizes.ts` 在用，保留。

**结果**
- 测试 274 个（272 通过，2 个只在本机读真会话时跑；读真会话那 2 个也跑了：34 个会话、两层报警 0），打包后的端到端测试 96 个通过。
- **改前失败**：把新的全部测试放到 `m1-8.4` 的代码上跑，49 个失败，另有 2 个测试文件因为缺少新的导出整份加载不了（脱敏、读真会话）；脱敏的 5 个测试另外在旧规则上单独跑过，都失败。每条修复（R1–R20、R22–R26、R28–R30、R32、external content、参数改名、文字）都至少有一个这样的测试。只在新旧两边都通过的是补覆盖的测试：`search -C`、`forget` 只按回车、查看界面、列表的 Space 和 Enter、整个 HOME 前后比对、存进去的文字和原文一致。
- 提交 13 个（`d69b7f3` … `7f294db`），每个单独都能通过类型检查；打 tag `m1-9`，没有 push。5 个平台重新打包、校验和核对通过；WSL 的 `meme` 已是新版，Windows 测试用的 `%TEMP%\meme-w5\meme.exe` 换成了新版。表结构升到 6，两边第一次运行会重建镜像（几秒）。
- **作者会话上的对比**（33 个有启动目录的会话，各自从自己的目录，`m1-8.4` 和改后的代码各一份临时镜像）：在 Claude Code 里、在 Codex 里，都是 15 个逐字相同、18 个有差别，差别全部归到有意改动的几类和它们挤占篇幅带来的连带变化：

  | 会话 | 差在哪 |
  |---|---|
  | `a62bd8b9`、`fd738f5b`、`6fa401c0`（同一条链）、`89373612`、`f72c5eec`、`381dfa7f`、`fb9393aa`、`7e629e49` | 插进去的话（R1）认出来了，各多 1 条用户消息、多 1 轮；后面的编号、`↳` 行和 Included / Left out 跟着变 |
  | `46083e3d` | 回退的草稿"好了，现在是第二点：…"不算了（R12），同时插进去的一句话加上（R1），轮数一减一加不变；`--hidden` |
  | `199ec839`（14 步）、`ffd06216`（2 步）、`30fc86d3`（1 步） | 网页搜索的步骤加了 `[external content]`；`199ec839` 因此少了第 1 轮的 `↳` 行 |
  | `a08bde23` | 压缩摘要的命令改成 `--hidden --full`；`↳` 行跟着少 1 行 |
  | `9580fc64`（设计窗口，正在写） | R1、`--hidden`；脱敏少了 1 处：作者引用复查报告的那段话里，旧规则把 `password: string;` 这类代码遮了，新规则不遮；新规则反过来把说明文字 `DB_PASSWORD=…、PGPASSWORD=…` 当成值遮了（见下面第 6 条） |
  | `39390dea`、`7373e17e`、`04d35701` | 接力链的下游：上游 `a62bd8b9` / `7e629e49` 多了插进去的那句话 |
  | `0cb2fa3e`（这个开发窗口，正在写） | R1：作者第二条消息"另外两件：…"是在开发窗口干活时插进去的，现在在交接里了 |

**和设计不一致、要作者看的地方**
1. **R10 的提示分两种**：Claude Code 的登记（记的是进程号）在它那一边能查（Windows 用 `tasklist`，WSL 用 `/proc`），提示"到那一边运行 `meme forget <id>`"；**Codex 的锁在 Windows 上谁都查不了**（Windows 没有 `/proc/locks`，meme 也认不出 Windows 的文件锁），所以 Windows 上的 Codex 会话只能写"先在那边关掉它；如果是被强行关掉的，重新打开再正常退出一次，然后再删"。作者定的"Windows 上的 Codex 就到 Windows 上删、那边能认出旧锁"在 Windows 本机上做不到。
2. **R1 的旧版本**：2.1.296 之前的 `queued_command` 没有 `origin`，按内容分：像通知（注入的格式）就不是用户的话、不报警，否则算用户的话。
3. **`show --all`** 不是悄悄失效，而是报错并提示 `--hidden`；**`forget` 也加了 `-a`**（列表从所有项目里选），作者说"所有命令"，`forget` 原来没有这个选项。
4. **`continue` 在 Agent 外打印列表**（`--plain`、接到管道），最后一句改成给人看的；在 Agent 里照旧。
5. **R30**：Windows 上看 WSL 的来源，"its sessions are as of …" 的时间最多晚 10 分钟（为了不在每次运行时写库）。
6. **脱敏的边界**：引号里的值要 6 个字符以上、不含空格（带空格的密码不遮）；说明文字里 `PASSWORD=…、PGPASSWORD=…` 这类会被当成值遮掉（作者会话里出现过 1 处）。
7. **R16 去重**：同一个目录从两条路径读到时，保留第一个（本机的），会话的环境标签跟着它。
8. **R7**：旧版本的库在原文件里删表重建，新版本的库不碰、在内存里重建（只读模式）。
9. **external content**：标在步骤行的结果前面（`→ [external content] …`）；Codex 的工具名 `web_search` 是从程序里看到的，作者的 Codex 会话里没有网页搜索，没在真会话上见过。

**要作者改的设计文档**（我只改了本文）
- prd.md：§5.1 的 forget 规则（开着的、查不了的、最近写过的）；`-a`/`--all`、`search --tools`、`show --hidden`；§7 的不可信内容作者已改，格式见上面第 9 条。
- arch.md 6.1：Claude Code 档案里 `attachment` 改成"读：用户干活时插进去的话"，第二层报警盯 `attachment`；Codex 档案加中断格式 `<turn_aborted>`、`webTools`、`rootState`。
- handoff.md 7.3：删减顺序加的几步和硬保护；external content；A1 的 Included 说法。
- format.md（如果它列了用户消息的来源）：Claude Code 的用户消息也可能来自 `attachment`。

**真机测试单（2026-10-13，按 `m1-9` 打包）**

会话一律写 id。表结构升到了 6：两边第一次运行会重建镜像，要几秒，属正常。

- **准备**：WSL 的 `meme` 指向 `~/work/meme/dist/meme-linux-x64`；Windows 用 `%TEMP%\meme-w5\meme.exe`。两个都已是 `m1-9`。
- PowerShell 用经典的（Win+R，输入 `powershell`），每开一个先敲：`$env:Path = "$env:TEMP\meme-w5;$env:USERPROFILE\.local\bin;$env:Path"`

**F1 插进去的话进了交接（WSL 终端）**
- 敲：`meme continue 0cb2fa3e --plain | grep -n '另外两件'`
- 通过：有一行，在 "User messages" 那一节里（开发窗口里你第二条消息是在它干活时发的，原来交接里没有）。

**F2 参数（WSL 终端）**
- 敲：`meme show 7e629e49 --all`
  - 通过：`meme show: --all is now --hidden: also injected messages and reasoning`。
- 敲：`meme search 'meme continue' --all --tools --plain | head -3`
  - 通过：第一行是 "… matches in … sessions"（搜了所有项目，也列工具调用里的匹配）。

**F3 Windows 上的列表和状态（PowerShell）**
- 敲：`meme status`
  - 通过：第一次会重建，几秒；来源里 `Codex·Win ~\.codex not installed`。
- 敲：`meme ls -a`，看一眼就按 Esc。
  - 通过：和上一轮一样；标题里有 emoji 的会话（如果有）不串行。

**F4 uninstall 以后不留东西（PowerShell，用临时的数据目录，不碰真的 `~\.meme`）**
- 敲：
  ```
  $env:MEME_HOME = "$env:TEMP\meme-w5\home-9"
  meme ls -a --plain > $null
  meme uninstall
  ```
  到 `Remove them? [y/N]` 时**先等 3 秒以上**，再输入 `y`。然后敲：
  ```
  Test-Path $env:MEME_HOME
  Remove-Item Env:MEME_HOME
  ```
- 通过：显示 `Removed.`；`Test-Path` 是 `False`（原来等得久会把 `logs` 又建出来）。

**F5（可选，最后做）停着的 WSL 不会被拉取启动**
- 这一步会关掉 WSL，连同开发窗口；做完重新打开 WSL，`cd ~/work/meme && claude --resume 0cb2fa3e-30bf-4467-8322-edbaed96975b` 回来。
- PowerShell 里敲：
  ```
  wsl --shutdown
  [Console]::OutputEncoding = [Text.Encoding]::UTF8
  meme continue 7e629e49 --plain | Select-Object -First 3
  wsl --list --running
  ```
- 通过：前三行是交接的开头（`# Handoff: plan.md 第 ① 小步` 等）；最后一条显示没有正在运行的分发（拉取没有把 WSL 启动）。

**第 ⑨ 步真机测试结果（2026-10-13，作者测）**
- **F1 通过**：`meme continue 0cb2fa3e --plain | grep -n '另外两件'` 输出 `60:   另外两件：`，在 "User messages" 那一节里。
- **F2 通过**：`show --all` 报 "--all is now --hidden…"；`search 'meme continue' --all --tools` 第一行 "1,559 matches in 15 sessions"。
- **F3 通过**：Windows 上第一次 `meme status` 重建镜像，"checked 34 files in 1924 ms"；`Codex·Win ~\.codex not installed`。`ls -a` 作者没提问题。
- **F4 通过**：临时数据目录 `uninstall` 输入 `y` 以后，`Test-Path` 是 `False`。
- **F5 没通过**：`wsl --shutdown` 以后 `meme continue 7e629e49 --plain | Select-Object -First 3` 正常输出交接开头，但随后 `wsl --list --running` 显示 Ubuntu 在运行。
  - 查的结果：用 Bun 的预加载脚本把 `node:fs` 的函数都包一层、记下碰到的路径，在 `MEME_ENV=win` 加假 WSL 里复现：Ubuntu 停着时，`m1-9` 的 `continue --plain`、`ls -a`、`status`、`show`、`search` 都没有碰它的目录；`m1-8.4` 的 `continue --plain` 碰了三处（`etc/wsl.conf`、项目目录的 `realpath`、`.git`），正是 R6 修掉的。Ubuntu 在运行时同一条命令碰了它的目录，说明这个追踪抓得到。
  - 推断：这一次 Ubuntu 很可能是别的程序拉起来的（比如连着 WSL 的 VS Code 断线后自动重连），不是 meme；第二轮 B6 只跑了 `ls`、`status`，那次没被拉起来。要作者再测一次，测之前先确认关掉以后没有别的程序把它拉起来（见下面 F5'）。
  - 真的 `\\wsl.localhost` 和假 WSL 的区别只在 `distroRoot`（它会 `existsSync(\\wsl.localhost\<发行版>)`），而它只给正在运行的发行版用。

- **2026-10-13 作者确认**：F5 里 Ubuntu 是连着 WSL 的 VS Code 断线重连拉起来的，不是 meme。和上面的追踪结果一致，F5 按通过记；第 ⑨ 步的真机测试到此做完。下面的 F5' 留作以后要复核时用（先关掉 VS Code 的 WSL 窗口）。

**F5' 重测（2026-10-13）**
```
wsl --shutdown
Start-Sleep 10
wsl --list --running
[Console]::OutputEncoding = [Text.Encoding]::UTF8
meme continue 7e629e49 --plain | Select-Object -First 3
Start-Sleep 3
wsl --list --running
```
- 通过：两次 `wsl --list --running` 都显示没有正在运行的分发。
- 如果第一次就已经有 Ubuntu 在运行，是别的程序拉起来的，和 meme 无关；关掉那个程序（VS Code 的 WSL 窗口、Docker Desktop 的 WSL 集成等）再测。
- 做完重新打开 WSL，`cd ~/work/meme && claude --resume 0cb2fa3e-30bf-4467-8322-edbaed96975b` 回来。

### ⑨.1 "不碰停着的发行版"写成测试（2026-10-13 作者定，tag `m1-9.1`）

- **做法**：`test/e2e/fs-trace.ts` 是一个预加载脚本，把 `node:fs` 的读类函数（`existsSync`、`statSync`、`lstatSync`、`readFileSync`、`readdirSync`、`accessSync`、`openSync`、`opendirSync`、`realpathSync`）包一层，路径里有停着的发行版目录的就记下来。测试让假 WSL 里的 Debian 先运行一次、会话进镜像，再只让 Ubuntu 运行，依次跑 `ls -a`、`status`、`show`、`search -a`、`continue --plain`：一处都不能记到；Debian 运行时同一条 `continue --plain` 必须记到（证明追踪本身有效）。推送和 `forget` 本来就会启动它，不在这条测试里。
- **结果**：在 `m1-9` 上通过；放到 `m1-8.4` 上失败，记到的正是 R6 修掉的 `etc/wsl.conf`、启动目录的 `realpath`、往上每一级的 `.git`。预加载只能用在从源码跑的时候，用打包后的程序跑（`MEME_BIN`）时这条跳过。测试 275 个（273 通过，2 个只在本机读真会话时跑），打包后的端到端测试 96 个通过、1 个跳过。提交 1 个（`a499848`），打 tag `m1-9.1`，没有 push。

### ⑩ 再加两家 Agent：OpenCode、Pi（2026-10-13 作者定，tag `m1-10`）

（10-13 当天几次改动：第五家先定 Gemini CLI，又换成 DeepSeek Harness（备选 Qwen Code），最后定为第一版只做四家：Claude Code、Codex、OpenCode、Pi。第五家都不加：DeepSeek Harness 更新太快、格式老变；Qwen Code 用的人太少；Gemini CLI 个人用户已经用不了。GitHub Copilot CLI 放到第一版发布以后。见 [prd.md](prd.md) 第 2 节、[arch.md](arch.md) 6.1 节第 6 条。）

**依据**：[prd.md](prd.md) 第 2 节（除 Claude Code、Codex 外用的人最多）、[arch.md](arch.md) 6.1 节第 6 条（第二级里这两家提前到第一版，只做核心功能）。

**范围（核心功能）**：列出、查看、搜索它的会话；从它交接出去、推送进它里面；在它里面用 `!` 拉取（它支持的话）；`forget` 只在它自己有删除命令时支持，否则提示到 Agent 里删。**不做**外围功能（压缩摘要之外的特殊记录等）。

**OpenCode 只支持 1.x**（2026-10-13 作者定）：第一版支持 OpenCode 1.x（npm 包 `opencode-ai`），2.0（npm 包 `@opencode/cli`）等稳定了再评估。理由：上周 npm 下载 `opencode-ai` 约 299 万、`@opencode/cli` 约 20 万，绝大多数用户还在 1.x；2.0 是大重写（后台服务 + 终端、桌面、网页三种界面，服务端接口全换了），trajectory 的 opencode 适配器照 1.x 的导出格式写，很可能读不了 2.0。

**约束**：纯代码，不调用模型；产品文字用英文；真会话不进 git，合成样本照真会话的格式写；Conventional Commits，每个提交单独都能通过类型检查；改动写回本文。第一阶段不打标签；第二阶段做完打 `m1-10`，不 push。

**第一阶段：本机试跑，先不写适配器**
1. 在 WSL 里装好两家（npm 包 `opencode-ai`、`@earendil-works/pi-coding-agent`（原 `@mariozechner/pi-coding-agent`，已改名），以官方文档为准），说清哪些要作者登录或填 key。
2. 给作者一份试跑单：在一个空目录里，每家做几轮（建文件、跑命令、改文件、一次压缩、一次打断、一次 `!` 命令），会话一律记 id。
3. 用作者造的会话，按档案的项每家填一张表：
   - 会话存在哪；trajectory 0.4.3 能不能读当前版本（OpenCode 新版存进 SQLite，trajectory 读的是它的导出格式）；
   - 有没有类似 `!` 的直接运行命令，输出会不会交给模型；
   - 命令输出的上限和单位，按"实测上限 × 90%"定交接长度（handoff.md 7.3 节）；
   - 怎么带着第一条消息启动它；
   - 怎么删会话、怎么判断会话开着；
   - 压缩以后原文还在不在；
   - Windows 上装没装得上、会话存在哪。
   - 另加一行 **OpenCode 2.0**：只做纸面检查（文档、源码），不安装；写清它的会话存在哪、和 1.x 的格式差多少、trajectory 能不能读，作为以后的参考。
4. 表交给作者，定了再写适配器。

**第一阶段进展（2026-10-13）**

- **OpenCode 1.x 和 2.0**（10-13 下午）：14:01–14:14 之间 `opencode-ai` 被换成了 `@opencode/cli` 2.0.27。1.19 界面上有一条 "/update to upgrade to OpenCode 2.0"，`/update`（或 `opencode upgrade`）就是先 `npm uninstall -g opencode-ai` 再 `npm install -g @opencode/cli`（1.19.0 二进制里的 `Installation` 服务）；1.19 自己从不自动安装（`autoupdate` 的说明），设 `OPENCODE_DISABLE_AUTOUPDATE=1` 不再提示。日志里 2.0 只跑过两次 `--version`，没动 `~/.local/share/opencode/opencode.db`（这个库是 12:08 由 1.19 建的，会话表 0 行）。已 `npm uninstall -g @opencode/cli`，重装 `opencode-ai` 1.19.0；`opencode --version` 是 1.19.0，终端界面能打开（在伪终端里、数据目录指到临时目录试的，显示 "Ask anything"、免费模型 Big Pickle）。试跑单加了一句：不要按 `/update`，先 `export OPENCODE_DISABLE_AUTOUPDATE=1`。
  - **哪一版稳定**（npm 上周各版本下载量，`api.npmjs.org/versions/<包>/last-week`）：`opencode-ai` 共约 299 万，1.18.35 占 24.8%、1.18.30 占 20.2%、1.18.34 占 12.3%，1.19.0（10-11 发布）只占 4.3%；`@opencode/cli` 共约 20 万，2.0.26 占 32.4%。1.18 从 8 月到 10-06 出了 35 个补丁版；2.0.0 是 09-11，一个月出了 27 个补丁版（差不多一天一个）。1.18.35 和 1.19.0 的数据库迁移完全相同（都是 38 条，字符串比对，没运行 1.18.35），存会话的格式一样；1.19.0 多出的是升级到 2.0 的入口，1.18.35 里没有。
  - **试跑用 1.19.0**（作者定）：和 1.18.35 的库结构相同，结论两版都适用。
- **装好的版本**（WSL，npm 全局，装在 `~/tools/node`）：opencode-ai 1.19.0、@earendil-works/pi-coding-agent 1.2.0。npm 11 默认不跑安装脚本，跳过了 opencode-ai 的 postinstall，命令照样能运行。查资料时装的 @google/gemini-cli 0.63.0、@deepseek-ai/dsh 0.2.0-rc.2、@qwen-code/qwen-code 0.25.1 已卸掉，`~/.gemini`（只有一个空的 `projects.json` 临时文件）已删；`~/.dsh`、`~/.qwen` 没有生成过。
- **登录和 key**：两家都能不要新 key。
  - OpenCode：不登录就能用 OpenCode Zen 的免费模型（`opencode models` 列出 `opencode/big-pickle` 等）；也能 `opencode auth login` 选 ChatGPT Pro/Plus，或用 `DEEPSEEK_API_KEY`。
  - Pi：没有免费模型。`/login` 里有 "OpenAI (ChatGPT Plus/Pro)"（provider `openai-codex`，作者 Codex 用的账号），另有 Claude Pro/Max、GitHub Copilot 等；或者环境变量里的 API key，认 `DEEPSEEK_API_KEY`（Pi 的 docs/providers.md）。
  - 试跑单给两种办法：OpenCode 免费模型 + Pi 用 ChatGPT 登录；或一个 DeepSeek API key 两家都用。
  - **实际用的**（10-13 作者定）：作者没有 ChatGPT 订阅，Codex 走中转（`https://www.packyapi.ai/v1`，`wire_api = "responses"`，key 在 `~/.codex/config.toml` 的 `experimental_bearer_token`）。作者同意后，把同一个 key 写进 OpenCode（`~/.local/share/opencode/auth.json` 的 `{"openai": {"type": "api"}}`，地址写在 `~/.config/opencode/opencode.jsonc` 的 `provider.openai.options.baseURL`）和 Pi（`~/.pi/agent/auth.json` 的 `{"openai": {"type": "api_key"}}`，地址写在 `~/.pi/agent/models.json` 的 `providers.openai.baseUrl`），key 文件权限 600。中转有 5 个模型，试跑两家都用 `openai/gpt-5.6-sol`（两家自带的清单里都有）；各发一条 "Reply with exactly: OK" 试过（Pi `--no-session`，OpenCode 数据目录指到临时目录），都通。
  - 顺带看到：14:09 有人在 `~/meme-try/pi` 启动过 Pi，没发消息；Pi 启动时就建了 `~/.pi/agent/sessions/--home-jihd-meme-try-pi--/`（空的），还下载了 `fd`、`rg` 到 `~/.pi/agent/bin/`。会话文件要发了消息才有（填表时核对）。
- **试跑做完**（10-13 15:56–16:16，作者让我代跑）：用 tmux 开一个后台终端，按试跑单敲键、读屏幕，和手动操作是同样的会话。
  - **会话 id**：OpenCode 主会话 `ses_ecbbcc1dcffebkUsnLUmJtikJV`（在 `~/.local/share/opencode/opencode.db`），删除用的 `ses_ecbaf4697ffeZpypkWJpAl7rdU`（已用 `opencode session delete` 删）；Pi 主会话 `447d4e32-e2b2-415b-8188-efdfff34c606`（`~/.pi/agent/sessions/--home-jihd-meme-try-pi--/2026-10-13T08-03-09-735Z_447d4e32-….jsonl`），删除用的 `d5c7a92a-eee4-4e89-9f06-a910d42ddfd9`（已在 `pi -r` 里 Ctrl+D 删）。快照在 `~/meme-try/snaps/`。
  - **中转拒绝 Codex 以外的客户端**：Pi 主会话第一次 `/compact` 时，中转返回 403："请使用标准 Codex 客户端请求，请避免任何基于我方 API 二次分发的 API 转接接入"。此前 OpenCode 主会话 R1–R9、Pi 主会话 R1–R8 都已用 Codex 的 key 跑完。之后不再用这个 key，并从两家的配置里删掉了。作者另给了一个同一中转站"百炼"渠道的 key（16 个模型，直连百炼 401；额度 10 元），两家改用自定义提供方 `bailian`（OpenAI 兼容的 chat completions，`https://www.packyapi.ai/v1`，模型 `qwen3.8-flash`）：OpenCode 在 `opencode.jsonc` 里用 `@ai-sdk/openai-compatible`，Pi 在 `models.json` 里用 `api: "openai-completions"`，key 都在各自的 `auth.json`（600）。Pi 主会话的压缩和 Pi 的删除测试用的是这个；OpenCode 删除测试用的是免费模型 `opencode/big-pickle`。
  - **和试跑单不一样的地方**：① OpenCode 里问话带 `!`（"上面那条 ! 命令"），逐字输入时句中的 `!` 也切进了 shell 模式，整句被当命令跑了（"command not found"），会话里多一条 shell 记录；改成不带 `!` 的问法重问，试跑单已改。② Pi 第一次 `/compact` 报 "Nothing to compact (session too small)"：Pi 要保留最近 `keepRecentTokens`（默认 2 万，按字符数 ÷ 4 估）的内容，整个会话估不到 2 万（中文按字数算，估得低）。临时把 `~/.pi/agent/settings.json` 的 `compaction.keepRecentTokens` 改成 4000、用同一 `--session-id` 重开（设置不热加载），先撞上 403，换成 `bailian/qwen3.8-flash` 后压缩成功（"Compacted from 42,422 tokens"），设置已改回原样。③ `snap.sh` 起初按 `bin/pi` 找进程，漏了 Pi（Pi 把进程名改成 `pi`，命令行里没有参数）；已修，用 `--offline` 重开主会话补拍了开着的快照（原来那张改名为 `pi-open-missed-process.txt`）。④ Pi 删除用的会话第一次用 `--offline` 只跑 `!echo OK`，Pi 没写文件（只有用户或 AI 的消息才写会话文件），之后用百炼的 key 发 "只回复 OK" 生成。
  - **屏幕上看到的**（填表时用会话数据核实）：OpenCode 的 shell 工具留**尾部**（Z0275–Z0600、L1002–L3000，51,200 字节或 2000 行），和我从源码推断的"留开头"相反；OpenCode 的 `!` 输出模型说从第一行看到最后一行（94 KB、3000 行都没截）。敲 `!` 进 shell 模式，跑完自动回到普通模式；打断要按两次 Esc。Pi 的工具和 `!` 都留尾部（50 KB / 2000 行），`!!` 模型没看到，打断按一次 Esc。Pi 开着时不占任何文件、没有锁；OpenCode 开着时只有一个进程，打开 `opencode.db`（WAL）和日志。OpenCode 的 `session list` 列出两个目录的会话：非 git 目录都归在 "global" 项目下。
- **源码里查到的命令输出上限**（试跑时实测核对）：

  | | 用户的 `!` | 模型的 shell 工具 |
  |---|---|---|
  | OpenCode 1.19.0 | 输出作为工具结果加进对话（文档）；上限待实测 | 2000 行或 51,200 字节，留开头，全文存 `~/.local/share/opencode/tool-output/`（二进制里的 `Truncate`） |
  | Pi 1.2.0 | `!` 给模型，`!!` 不给；只留最后 2000 行或 50 KB（UTF-8 字节），全文存临时文件 | 同左（`truncateTail`） |

  Pi 留的是尾部：交接太长时先丢的是开头（标题和前三行提示），第二阶段定 Pi 的上限要按这个来。
- **试跑单**：`~/meme-try/README.md`。每家一个空目录做主会话（`opencode`、`pi`），另一个空目录做删除用的会话（`opencode-del`、`pi-del`）；`gen.sh` 出定长的输出（`lines`：3000 行、18,000 字节；`zh`：600 行、94,200 字节、34,200 字符，用来分辨按行、按字节还是按字符截）；`snap.sh` 只列文件名、大小、inode、时间、进程和 `/proc/locks`，不读内容。
  - 主会话 R1–R9：带第一条消息启动并建文件（引号、反引号、`$HOME`、`%`、中文原样到没到）→ 跑命令 → 两次工具输出上限 → 改文件 → 两次 `!` 和上限（Pi 加一次 `!!`）→ 打断 → `/compact` → 开着、关掉各 snap 一次。
  - 删除用的会话：开着 snap → `kill -9` 后 snap → 用这家自己的办法删（OpenCode `opencode session delete`，Pi 会话列表里 Ctrl+D）→ snap。
  - 会话 id：Pi 主会话 `447d4e32-e2b2-415b-8188-efdfff34c606`、删除用 `d5c7a92a-eee4-4e89-9f06-a910d42ddfd9`（`--session-id` 事先定好）；OpenCode 的由作者从 `opencode session list` 抄。Windows（可选）：Pi `80c30dd1-fad8-4114-a0db-b6b44d75f146`。
- **没加的第五家，查到的情况留作记录**（10-13，以后再考虑时从这里看）：
  - DeepSeek Harness 0.2.0-rc.2：trajectory PR #41（head `92e715a`，按 dsh `v0.1.0-rc.8` 写）只认会话格式 v0，dsh 现在写 v4（`session.v4.jsonl.zstd`，`@deepseek-ai/dsh-session` 里 `SESSION_FORMAT_VERSION = 4`），去掉版本检查也读不对（v4 把工具结果改成 tool 角色的消息、改了消息来源的 kind）；v0 用到 09-03，09-24 已到 v4，三周四代，旧代文件不删；自带的只有 Web、headless、SDK、ACP，没有终端界面；用官方 DeepSeek API 时默认把会话日志（消息、工具参数和结果、工作区路径）上传给 DeepSeek（插件 `dsh-session-log-deepseek`，`enabled` 默认 `true`，09-14 起；在 Web 设置 → General 或 patch 里关）。会话在 `$DSH_HOME/sessions`（默认 `~/.dsh/sessions`）。没在 PR #41 下留言。
  - Qwen Code 0.25.1：trajectory 不支持；Qwen OAuth 的免费额度 2026-04-15 停了；用户的 `!` 只给模型前 10,000 个字符，工具输出 25,000 字符或 1000 行；有 `/delete`、`qwen sessions ps`（登记开着的会话）。

**第一阶段的表（2026-10-13，交给作者）**

来源写法：〔实测 ses_ecbb…〕= OpenCode 主会话 `ses_ecbbcc1dcffebkUsnLUmJtikJV`；〔实测 447d…〕= Pi 主会话 `447d4e32-e2b2-415b-8188-efdfff34c606`；〔快照 x〕= `~/meme-try/snaps/x.txt`；〔源码〕= 本机装的包或 GitHub 上对应标签的源码；〔文档〕= 官方文档。

*OpenCode 1.19.0*（npm `opencode-ai`）

| 项 | 结果 | 来源 |
|---|---|---|
| 会话存在哪 | 一个 SQLite 库 `~/.local/share/opencode/opencode.db`（WAL），所有会话都在里面：`session` 一行一个会话（`directory` 是启动目录），`message`、`part` 的内容是 `data` 列里的 JSON；另有事件表 `event`（`message.part.updated` 等，内容有副本）。`XDG_DATA_HOME` 改根目录。非 git 目录的会话都归在 `global` 项目下。另外：`~/.local/state/opencode/prompt-history.jsonl`（敲过的话）、`model.json`；`~/.local/share/opencode/tool-output/tool_*`（被截断的命令全文，7 天后自己清） | 〔实测 ses_ecbb…〕〔快照 baseline→oc-closed〕〔源码 二进制字符串〕 |
| trajectory 0.4.3 能不能读 | 能，但要先拼成 `opencode export` 的格式 `{info, messages[{info, parts}]}`（trajectory 不列 OpenCode 会话，也不读 SQLite）。读出 70 条，只报 1 条诊断（`compaction` 这种 part 不认）。要 meme 自己补：`!` 前面那条系统生成的用户消息 "The following tool was executed by the user"（`synthetic: true`）被当成用户的话；压缩摘要（`summary: true`、`mode: "compaction"` 的 AI 消息）被当成普通回复；`!` 的 `bash` 调用挂在 AI 消息下，要认成"用户自己跑的命令" | 〔实测 ses_ecbb… 的导出〕 |
| 有没有 `!`，输出给不给模型 | 有。输入框里敲 `!` 进 shell 模式（底部写 "Shell"），跑完自动回到普通模式。存成一条 synthetic 用户消息 + 一条 AI 消息里的 `bash` 工具调用，输出给模型（问它，首尾编号都对；下一轮输入多了约 3.6 万 token）。注意：逐字输入时，句中的 `!` 也会切进 shell 模式 | 〔实测 ses_ecbb…〕 |
| 命令输出上限和单位 | 模型自己跑：**留尾部**，51,200 字节或 2000 行，先到为准；前面加 "...output truncated...  Full output saved to: <路径>"。× 90% = **46,080 字节、1,800 行**。超了的话交接的开头（标题、前三行提示）先丢，所以不能超。用户的 `!`：94,200 字节、3000 行都原样存下、原样给模型，没找到上限数字（只有一个"内存安全上限"）；按公共上限 1.5 万 token 就行 | 〔实测 ses_ecbb… R3/R4/R6〕〔源码 `Truncate` 2000 行、51200〕 |
| 怎么带第一条消息启动 | `opencode [目录] --prompt "<消息>"`：打开终端界面并发出这条，引号、反引号、`$HOME`、`%`、中文原样到达。1.19 的 build 模式跑命令、改文件都没弹授权 | 〔实测 ses_ecbb… R1〕 |
| 怎么删会话 | `opencode session delete <id>`：库里这个会话的 `session`、`message`、`part`、`event`、`event_sequence` 都删了。`prompt-history.jsonl` 里敲过的话还在（和 Claude Code 的 `history.jsonl` 一样，`forget` 提示里要说） | 〔实测 ses_ecba…（已删）〕〔快照 oc-del-killed→oc-del-after〕 |
| 怎么判断会话开着 | 只能判断"有 OpenCode 开着"：进程名 `opencode`（命令行里有启动参数），开着时在 `opencode.db` 和 `-shm` 上持有 POSIX 读锁（`/proc/locks`），关掉就没了；`kill -9` 后也没有残留。但库是所有会话共用的，**分不出是哪一个会话**。能用的线索：进程的工作目录 = 会话的 `directory` | 〔快照 oc-open / oc-closed / oc-del-open / oc-del-killed〕 |
| 压缩后原文还在不在 | 在。`/compact` 追加一条用户消息（part 类型 `compaction`，`tail_start_id` 指向保留的起点）和一条摘要 AI 消息（`summary: true`），之前的消息一条不少 | 〔实测 ses_ecbb… R8〕 |
| 打断 | 按两次 Esc（第一次提示 "esc again to interrupt"）。那条 AI 消息带 `error: MessageAbortedError`，正在跑的命令输出里写 `User aborted the command` | 〔实测 ses_ecbb… R7〕 |
| Windows | npm 包带 `opencode-windows-x64`（和 baseline）的二进制；数据目录同样是 `%USERPROFILE%\.local\share\opencode`（`XDG_DATA_HOME` 或 home 下的 `.local/share`）。**没实测**。另：Windows 上的 meme 读 WSL 里的 `opencode.db`，SQLite 的 WAL 走 `\\wsl.localhost` 不可靠，要先复制到临时目录再读 | 〔源码 二进制字符串〕〔npm 包清单〕 |

*Pi 1.2.0*（npm `@earendil-works/pi-coding-agent`）

| 项 | 结果 | 来源 |
|---|---|---|
| 会话存在哪 | 一个会话一个 JSONL：`~/.pi/agent/sessions/--<目录，/ 换成 ->--/<时间>_<会话 id>.jsonl`，格式版本 3（首行 `{"type":"session","version":3,"id","cwd"}`）。根目录可由 `PI_CODING_AGENT_DIR`、`PI_CODING_AGENT_SESSION_DIR`、`--session-dir`、设置里的 `sessionDir` 改。启动时就建按目录分的文件夹，有了第一条用户或 AI 消息才写文件。被截断的命令全文在 `/tmp/pi-bash-*.log` | 〔实测 447d…〕〔源码 `session-manager.js`〕〔文档 sessions.md、session-format.md〕 |
| trajectory 0.4.3 能不能读 | 能直接读文件：61 条，没有诊断。但**悄悄丢掉**（不报诊断）：`!`/`!!` 的 `bashExecution`、`compaction`、系统提示。trajectory 逐行读，不管 Pi 的会话树（`/tree` 在同一文件里分叉），meme 要沿 `parentId` 从最后一条往回取当前那一支。trajectory 列会话只认 `PI_CODING_AGENT_DIR`，不认另外三种改目录的办法 | 〔实测 447d…〕〔源码 trajectory `pi/list.js`、`pi-session-shared.js`〕 |
| 有没有 `!`，输出给不给模型 | 有。`!命令` 给模型，`!!命令` 不给（`excludeFromContext: true`，问模型确实没看到）。都存成 `bashExecution`，存进去的输出已经截过 | 〔实测 447d… R6〕〔文档 usage.md〕 |
| 命令输出上限和单位 | `!` 和模型自己跑都一样：**留尾部**，51,200 字节（50 KB，UTF-8）或 2000 行，后面加 "[Showing lines … Full output: /tmp/pi-bash-….log]"。× 90% = **46,080 字节、1,800 行**；和 OpenCode 一样，超了先丢开头 | 〔实测 447d… R3/R4/R6〕〔源码 `truncate.js`〕 |
| 怎么带第一条消息启动 | `pi "<消息>"`（在会话目录里启动），原样到达；Pi 没有授权弹窗。以 `-` 开头的消息要放在 `--` 后面，以 `@` 开头的参数会被当成文件 | 〔实测 447d… R1〕〔`pi --help`〕 |
| 怎么删会话 | **没有删除命令**。只能在 `pi -r` 的会话列表里按 Ctrl+D 再回车：装了 `trash` 就丢进回收站，否则直接删掉那个 `.jsonl`（本机没有 `trash`，文件直接没了）。`/tmp/pi-bash-*.log` 不动 | 〔实测 d5c7…（已删）〕〔源码 `session-selector.js`〕 |
| 怎么判断会话开着 | **没有标志**：开着时不占用会话文件（每次追加完就关），没有锁；进程把自己改名成 `pi`，命令行里看不到会话 id。只能看"有 `pi` 进程、工作目录 = 会话的 `cwd`" | 〔快照 pi-open / pi-del-open / pi-del-killed〕 |
| 压缩后原文还在不在 | 在。追加一条 `compaction`（摘要 + `firstKeptEntryId`），之前的记录都在。会话太小时 `/compact` 会拒绝（要留最近 `keepRecentTokens` = 2 万，按字符数 ÷ 4 估，中文估得低） | 〔实测 447d… R8〕〔源码 `compaction.js`〕 |
| 打断 | 按一次 Esc。工具结果记 "Command aborted"（`isError`），那条 AI 消息 `stopReason: "error"`、"This operation was aborted" | 〔实测 447d… R7〕 |
| Windows | npm 装（纯 JS）；数据在 `%USERPROFILE%\.pi\agent`；它的 bash 工具和 `!` 都要 Git Bash（也可以让模型改用 PowerShell，`!` 仍用 bash）。**没实测** | 〔文档 windows.md、configuration.md〕 |

*OpenCode 2.0*（npm `@opencode/cli`，只做纸面检查，没装）

| 项 | 结果 | 来源 |
|---|---|---|
| 会话存在哪 | 默认**还是** `~/.local/share/opencode/opencode.db`（和 1.x 同一个文件；`OPENCODE_DB` 可改；next 渠道用 `opencode-next.db`）。会话消息改存在 `session_message` 表（`type`、`seq`、`data`）；第一次启动把 1.x 的 `message`/`part` 迁移过去（`V1Migration`）。1.x 的表迁移后留不留，没核实。默认起一个每个用户共用的后台服务 | 〔文档 troubleshooting.mdx、cli/index.mdx〕〔源码 v2.0.27 `packages/cli/src/database-path.ts`、`packages/core/src/database/v1-migration.bun.ts`〕 |
| 和 1.x 的格式差多少 | 整个换了：不再是"消息 + parts"，而是按 `type` 分的扁平消息：`user`、`synthetic`、`system`、`skill`、`shell`（用户的 `!`，带 `command`、`output`、`exit`）、`assistant`（`content` 里放 text、reasoning、tool）、`compaction`、`agent-switched`、`model-switched`、`location-switched`、`idle` | 〔源码 v2.0.27 `packages/schema/src/session-message.ts`〕 |
| trajectory 能不能读 | 不能（推断）：2.0 的 `opencode session export` 输出 `{info, messages}`，但每条消息没有 `info` 和 `parts`，trajectory 的 opencode 适配器读不出任何事件。要支持就得 meme 自己写 2.0 的读取 | 〔源码 v2.0.27 `session/export.ts`、`app/src/session/commands/export.ts`〕〔trajectory 0.4.3 `adapters/opencode`〕 |
| 对第一版的影响 | 用户升到 2.0 以后，同一个 `opencode.db` 里会出现 `session_message` 的数据。meme 要认出来，报 "OpenCode 2.0 is not supported yet"（报警器那一层），不能读成空的或读错 | 推断 |

**要作者定的**（表定了以后写进第二阶段）
1. Pi 没有删除命令：按范围的规则，`forget` 提示到 Pi 里删（`pi -r`、Ctrl+D）；或者 meme 自己删那个文件（Pi 自己删也只是删文件）。
2. "开着没有"两家都分不出具体会话：建议有这家的进程、工作目录 = 会话目录时按"可能开着"拒绝（像现在的 unsure），其余照"最近 5 分钟写过就拒绝"。
3. 交接长度：两家都定 46,080 字节、1,800 行（档案要加"行数"这一项）。两家都留尾部，超了先丢开头。
4. OpenCode 2.0 的数据：报警器认出来并报"不支持"。
5. Windows 上读 WSL 的 `opencode.db`：先复制到临时目录再读。

**作者对表的答复**（2026-10-13）
1. **Pi 的 `forget` 由 meme 删**：和 Claude Code 一样（它也没有删除命令），先提示、确认，再由 meme 删掉那个会话文件。OpenCode 有自己的命令，照 Codex 的做法用 `opencode session delete <id>`；提示里说明 `prompt-history.jsonl` 里敲过的话还在。范围里"`forget` 只在它自己有删除命令时支持"这句对 Pi 不再适用。
2. **"开着没有"同意**：这家有进程在跑、工作目录 = 会话目录时按"可能开着"拒绝；其余照"最近 5 分钟写过就拒绝"。
3. **交接长度**：按 2026-10-12 的统一定法（arch.md 6.1 节第 3 条、handoff.md 7.3 节），每家的上限 = 实测的命令输出上限 × 90%，用那家自己的单位，`!` 和工具不一样时取小的；Claude Code 是 3 万字符 → 2.7 万字节，Codex 约 4 万字节 → 3.6 万字节。OpenCode、Pi 实测都是 51,200 字节或 2000 行（留尾部），所以是 46,080 字节、1,800 行（OpenCode 的 `!` 不截，但取小的）。公共上限 1.5 万 token 照旧当天花板。行数是第一次出现的单位，档案要加这一项。作者问了来由，没有提出改。
4. **第一版只支持 OpenCode 1.x**，2.0 以后再做；读到 2.0 的数据时报 "not supported yet"。
5. **Windows**：作者问要不要在 Windows 上装两家，答复见对话（不需要；第 5 条指的是 Windows 上的 meme 读 WSL 里的 `opencode.db`）。

**第二阶段（表定了以后）**
5. 每家一个适配器和档案；合成样本照真会话的格式写；报警器的记录类型清单照第 ⑦ 步做（读的、故意不读的都列）。
6. 列表、查看、搜索、交接、推送、`!` 拉取、`forget`（或"到 Agent 里删"的提示）都接上；"开着没有"能判断的就判断，不能的退回"最近 5 分钟写过就拒绝"。
7. 真机测试单：会话写 id；PowerShell 接管道前加 `[Console]::OutputEncoding = [Text.Encoding]::UTF8`；关 WSL 前提醒关掉 VS Code 的 WSL 窗口。

**第二阶段做法和结果（2026-10-13）**

提交（代码库 `~/work/meme`，8 个，`306d176`…`339b710`，没打标签、没 push）：
1. `refactor(adapters)`：适配器可以列"不是单独文件"的会话（`<库>#<id>`），用 `stat` 给大小和时间，导入层用它代替文件系统；`openByFolder`（认自己的进程、列某个目录的会话）；档案的 `sessionVar` 可选。
2. `feat(platform)`：按 Agent 进程的工作目录猜"可能开着"（作者答复第 2 条）。经 /proc 列进程（本机，或 Windows 读 WSL 时经 `\\wsl.localhost`；读不到 cwd 链接时用进程环境里的 `PWD`）；`forget` 拒绝时说 "X may be open: Pi is running in its folder (WSL: Ubuntu, process N). Close Pi there first."，列表里标 "may be open"；不在这些目录里的照"最近 5 分钟"。
3. `feat(handoff)`：交接长度加"行数"这个单位（作者答复第 3 条）；认不出在哪家时也取最紧的行数（1,800）。
4. `feat(adapters): Pi`：见下。
5. `feat(adapters): OpenCode 1.x`：见下。
6. `test`：两家的合成样本生成器（`test/fixtures/gen-pi.ts`、`gen-opencode.ts`，照试跑会话的格式和行的 JSON 写）、单元测试 17 个、端到端测试 7 个；原有测试跟着改了三处（Agent 列表变长、`status` 对齐变宽、"认不出时"的上限多了 1,800 行）。
7. `docs`：README 两份。
8. `perf(adapters)`：跨 WSL 和 Windows 读 OpenCode 的库用副本，副本留到下次、库变了才重做（原来每条命令都复制约 12 MB，Windows 上 500–700 毫秒；改后约 200 毫秒）。

**Pi**（`src/adapters/pi.ts`、`pi.profile.ts`）：
- 读 `~/.pi/agent/sessions/--<目录>--/<时间>_<id>.jsonl`（或 `PI_CODING_AGENT_DIR`、`PI_CODING_AGENT_SESSION_DIR`）；WSL 里也读 Windows 的，Windows 上也读运行中的 WSL 的。
- 当前那一支：从最后一条沿 `parentId` 往回（`/tree` 留下的另一支不算会话的一部分，分支摘要记成 harness 的）。
- trajectory 丢掉的补回来：`!`/`!!` 改成用户消息，内容用 Pi 给模型的原文 "Ran \`命令\`" + 代码块（**2026-10-22 第 ⑪ 步改**，F9：`!!` 的写成 "Ran \`命令\` (kept from the model)"，显示成 `!! 命令`，交接里换成 "(a command the user ran and kept from the model)"，`show`、`search` 照旧）；压缩摘要（标 `compact_summary`）；分支摘要；被打断的回复后面加 "[Pi: the user stopped this turn]"。标题取 `session_info` 的名字。
- 档案：`PI_CODING_AGENT`/`PI_SESSION_ID` 认在 Pi 里，会话 id 取 `PI_SESSION_ID`；上限 46,080 字节、1,800 行；记录类型清单列全格式 3 的 12 种记录和 8 种消息角色；`forget` 由 meme 删会话文件和它记下的 `/tmp/pi-bash-*.log`（作者答复第 1 条）；启动 `pi -- <消息>`。

**OpenCode**（`src/adapters/opencode.ts`、`opencode.profile.ts`）：
- 读 `~/.local/share/opencode/opencode.db`（或 `OPENCODE_DB`）；只列顶层会话（子 Agent 的会话不算）；会话 id 去掉 `ses_`、转小写（前 12 位是时间的十六进制，短 id 像别家一样能敲）。大小用 `octet_length` 求和（只读长度，不读内容）。
- 读库：同一侧只读打开；旁边没有 WAL 时用 `immutable=1`（实测：只读打开没有 WAL 的库，SQLite 会在旁边新建 `-wal`、`-shm`），所以 meme 不在 OpenCode 的目录里留任何文件；另一侧读副本。
- 交给 trajectory 之前：去掉 `/undo` 撤掉的消息；`!` 的那一对（标记消息 + 替用户跑的 bash）合成一条用户消息 `<opencode_shell_command>`；被打断的消息后面加 "[OpenCode: the user stopped this turn]"。读完后：压缩摘要（`summary: true` 的 AI 消息）标 `compact_summary`，`synthetic` 文字标 harness。2.0 写进同一个库的会话报 "session_message (OpenCode 2.0)"（作者答复第 4 条）。
- 档案：`OPENCODE=1` 认在 OpenCode 里（它不给会话 id）；上限 46,080 字节、1,800 行；`forget` 用会话所在那一边的 opencode 跑 `opencode session delete <ses_…>`，先删它记下的 `tool-output/tool_*`，提示 `prompt-history.jsonl` 里还留着敲过的话；启动 `opencode --prompt <消息>`。

**验收结果**
- 测试：源码 297 个通过、2 个跳过；构建出的 Linux 单文件上端到端 103 个通过、1 个跳过（文件访问追踪那条只在源码跑）。
- 作者的真会话：`MEME_REAL_SESSIONS=1` 读 38 个会话（含 OpenCode 2 个、Pi 2 个），两层报警都是 0；Windows 上的 meme.exe 经 `\\wsl.localhost` 读同样的 38 个会话，报警 0，OpenCode 库所在目录没有多出文件。
- 原有两家的交接和 `m1-9.1` 比：34 个会话 × 3 种情形（`--plain`、在 Claude Code 里、在 Codex 里）共 102 份，101 份逐字相同；1 份不同的是正在写的开发窗口 0cb2fa3e，差别只有 "active 8 seconds ago" 和 "9 seconds ago"。
- 为了推送能用，把两家的默认模型设成了 `bailian/qwen3.8-flash`（OpenCode 配置的 `model`，Pi 设置的 `defaultProvider`/`defaultModel`）。

**真机测试单（第 ⑩ 步，H、W 两组）**

准备：WSL 的 `meme` 已是新构建（`~/.local/bin/meme` → `dist/meme-linux-x64`）；Windows 测试版已换成新构建：`%TEMP%\meme-w5\meme.exe`。两家用百炼的 key，默认模型 `bailian/qwen3.8-flash`。会话一律写 id。

*H：WSL*
- H1：`meme status`：Sources 里 `OpenCode·WSL`、`Pi·WSL` 都是 readable，最后一行 `Record types: all known and read`。
- H2：`meme ls -a --agent opencode`、`meme ls -a --agent pi` 列出 `ecbbcc1d`、`447d4e32`（还有你自己开的）。`meme show ecbbcc1d` 和 `meme show 447d4e32`：有 `! sh gen.sh zh`，打断那一轮写 `interrupted`，有一行 `── compacted here ──`。`meme search 打断后继续` 两家都搜到。
- H3（`!` 拉取）：`cd ~/meme-try/opencode && opencode`，输入 `! meme continue 447d4e32`；输出开头是 `# Handoff:`，没有 `...output truncated...`；再发"用两三句话说说这个会话在做什么"，它答得出 notes.md 和 gen.sh。`/exit`。Pi 同样：`cd ~/meme-try/pi && pi`，`! meme continue ecbbcc1d`，再问一句，`/quit`。
- H4（让模型自己跑）：在 OpenCode 里发 "运行 meme continue 447d4e32，告诉我输出的第一行和最后一行"：第一行是 `# Handoff: …`（没被截掉开头）。Pi 里同样问 `ecbbcc1d`。
- H5（推送）：在 `~` 里 `meme continue 447d4e32`，列表里选 OpenCode：OpenCode 在 `~/meme-try/pi` 打开，第一条消息是 "Continue an earlier session: run \`meme continue 447d4e32\` …"，它自己运行并总结，`/exit`。再 `meme continue ecbbcc1d --in pi`：Pi 在 `~/meme-try/opencode` 打开，同样，`/quit`。
- H6（删除，用一次性会话）：
  - Pi：终端 A `cd ~/meme-try/pi-del && pi '只回复 OK'`，回复后**不退出**；终端 B `meme ls -a --agent pi` 记下新 id（P3）；B `meme forget P3`：拒绝，"P3 may be open: Pi is running in its folder (Linux 或 WSL, process N)… Nothing deleted."；A `/quit`；B 马上 `meme forget P3`：拒绝，"was active … may still be open"；5 分钟后再 `meme forget P3`：列出会话文件，`[y/N]` 回 y，`✓ P3 deleted`，`~/.pi/agent/sessions/--home-jihd-meme-try-pi-del--/` 里没有它了。
  - OpenCode：A `cd ~/meme-try/opencode-del && opencode --prompt '只回复 OK'`，回复后不退出；B 记下新 id（O3），`meme forget O3`：拒绝（may be open）；A `/exit`；5 分钟后 `meme forget O3`：显示 `runs: opencode session delete ses_…` 和 prompt history 那句，回 y，`✓`；`opencode session list` 里没有它了。

*W：Windows（PowerShell）*

每开一个 PowerShell 窗口先运行（只对这个窗口有效；Windows 上的 meme 还没装进 PATH，测试版在 `%TEMP%\meme-w5`）：`$env:Path = "$env:TEMP\meme-w5;$env:USERPROFILE\.local\bin;$env:Path"`

- W1：`meme status`：`OpenCode·WSL`、`Pi·WSL` readable，`Record types: all known and read`。
- W2：`[Console]::OutputEncoding = [Text.Encoding]::UTF8`，再 `meme ls -a | Select-String OpenCode`：中文标题不乱码。`meme show ecbbcc1d`。
- W3（从 Windows 删 WSL 里的一次性会话）：在 WSL 里照 H6 各造一个（P4、O4），Pi 那个开着时 `meme forget P4`：拒绝，"(WSL: Ubuntu, process N)"；在 WSL 里退出，5 分钟后再删：删掉 `\\wsl.localhost\Ubuntu\…` 下的文件。O4 退出 5 分钟后删：显示 `runs: opencode session delete ses_… in WSL (Ubuntu)`，`✓`。
- W4：`meme status` 连跑三次，记下 "this run checked N files in X ms"（第一次之后约 200 毫秒）。

这张单子没有关 WSL 的步骤；要关的话，先关掉 VS Code 的 WSL 窗口。

**真机测试结果（2026-10-13 17:09–17:24，作者让我代跑）**

用 tmux 开干净环境的后台终端（不带 Claude Code 的环境变量）敲键、读屏幕；Windows 那几项从 WSL 调 `meme.exe`（PowerShell 那项用 `powershell.exe`）。meme 的镜像一律用临时目录。

| 项 | 结果 |
|---|---|
| H1 | 通过：`OpenCode·WSL`、`Pi·WSL` readable，`Record types: all known and read` |
| H2 | 通过：`ls`、`show`（`! sh gen.sh zh`、interrupted、`── compacted here ──`）；`search 打断后继续 -a` 两家都搜到（在 `~` 里不加 `-a` 时提示别的项目有 4 处） |
| H3 | 通过：OpenCode 里 `!meme continue 447d4e32`、Pi 里 `!meme continue ecbbcc1d`，模型都答得出那个会话做了什么；存下的输出 8,636 / 6,390 字节，开头 `# Handoff:`，没截断 |
| H4 | 通过：OpenCode 的模型自己跑，输出完整（8,636 字节，第一行 `# Handoff:`）；Pi 的模型自己加了 `head`/`tail` 只取首尾，交接远小于上限，不影响结论 |
| H5 | 通过：`meme continue 447d4e32` 选 OpenCode → 在 `~/meme-try/pi` 打开、自己拉取、看 `git log`、总结后等指示；`meme continue ecbbcc1d --in pi` → 在 `~/meme-try/opencode` 打开，同样 |
| H6 | 通过，**做法改了**：作者定过"真数据上不跑 forget"，所以两家的数据都指到临时目录（Pi 用 `PI_CODING_AGENT_DIR`，OpenCode 用 `XDG_DATA_HOME`、`XDG_CONFIG_HOME`、`XDG_STATE_HOME`），真的 `pi`、`opencode` 在那里造一次性会话。Pi `01a1348c`、OpenCode `ecb72801`：开着时拒绝（"may be open: … is running in its folder (WSL, process N)"）；刚退出时拒绝（"was active … may still be open"）；5 分钟后删掉，Pi 的文件没了，`opencode session list` 空了 |
| W1 | 通过 |
| W2 | 通过：UTF-8 后接管道中文不乱码。另见下面"发现"第 2 条 |
| W3 | 通过，**只到不真删为止**：WSL 真目录里开着 Pi / OpenCode（Pi 没发消息，不新建会话），从 Windows 删 `447d4e32`、`ecbbcc1d` 都拒绝（"(WSL: Ubuntu, process N)"，经 `\\wsl.localhost` 读 /proc）；关掉后不确认、不在终端里跑，列出计划：两个 `tool-output` 文件、`runs: opencode session delete ses_ecbbcc1dcffebkUsnLUmJtikJV in WSL (Ubuntu)`、prompt history 那句，"nothing deleted"。经 wsl.exe 真跑 `opencode session delete` 这一步没做（和 Codex 用同一套办法，第 ⑤、⑨ 步测过） |
| W4 | 通过：177、172、209 毫秒 |

发现：
1. **已修**（`2496161`）：`forget` 提示的 OpenCode prompt history 路径是从数据库路径往上推的，设了 `XDG_DATA_HOME`/`XDG_STATE_HOME` 时推错；改成同一侧按 `XDG_STATE_HOME`（没设就是 `~/.local/state`），加了测试。
2. **以前就有，没改**：meme 不在终端里时按 120 列排版，正好 120 列的行接到 PowerShell 的管道里，最后一个字符（`…`）会折到下一行。可以把 Windows 上不在终端时的宽度改成 119；作者定。
3. **待定**：Windows 读 WSL 的 OpenCode 库时，副本留在 `%TEMP%\meme-opencode\<hash>\`（为了下次不用再复制）。它是对话内容的一份拷贝，在 `~/.meme` 外面，`meme uninstall` 不会删；可以改放到 `~/.meme` 里。作者定。

测试时在真目录里新建了 4 个会话（试跑目录里，内容是测试）：OpenCode `ecb79844`（H3/H4，`~/meme-try/opencode`）、`ecb76de1`（推送，`~/meme-try/pi`）；Pi `01a13487`（H3/H4，`~/meme-try/pi`）、`01a1348a`（推送，`~/meme-try/opencode`）。

**和 Claude Code、Codex 不一样的地方**（第一版的核心功能都有：列出、查看、搜索、交接、推送、`!` 拉取、删除、WSL/Windows 两边、两层报警）：
1. "开着没有"是按目录猜的：同一个目录里有这家在运行，那个目录的会话都挡；Windows 上直接运行的、macOS 上的猜不了，只按"最近 5 分钟"。Claude Code、Codex 能准到具体会话。
2. 在 OpenCode 里 meme 不知道自己在哪个会话里（OpenCode 不给会话 id）；Pi 只有模型跑命令时给，用户的 `!` 不给。所以这时"不能删正在运行 meme 的会话"、列表里去掉当前会话这两条不起作用（同目录的"可能开着"还会挡住删除）。
3. Windows 上直接装的 OpenCode、Pi 没实测（按文档和源码写的）。
4. Pi 的 `/fork` 分出来的会话当成独立会话，历史会在两个会话里各出现一次；不像 Codex 那样标出从哪里分叉。**先不做**（2026-10-13 作者定，第 ⑩.1 步第 6 条）。
5. OpenCode 2.0 不支持（报"not read"）；Pi 设置文件里的 `sessionDir` 不认（只认环境变量）。
6. 子 Agent 的会话不单独列（和 Claude Code 的子代理一样）。



**验收**
- 第一阶段：两张表交给作者，每一项写清来源（文档、源码、实测），实测的写明用的哪个会话 id。
- 第二阶段：每家的合成样本覆盖试跑单里的几种情况（建文件、命令、改文件、压缩、打断、`!`），列表、查看、搜索、交接、推送的端到端测试通过；在作者的真会话上两层报警为 0；原有两家的交接和改前（`m1-9.1`）逐字相同；真机测试通过后打 `m1-10`。

### ⑩.1 第 ⑩ 步之后的六处修改（2026-10-13 作者定，tag `m1-10.1`）

**任务**
1. 不在终端里时的排版宽度从 120 改成 119（正好 120 列的行接到 PowerShell 的管道里，最后一个字符会折到下一行）。
2. Windows 读 WSL（WSL 读 Windows 同理）的 OpenCode 库时，副本从 `%TEMP%\meme-opencode` 挪进 `~/.meme` 里，`meme uninstall` 能删干净；`forget` 删了 OpenCode 会话以后，副本跟着删掉（下次读时重做），不能还留着被删的会话。
3. 标题太长时（比如 OpenCode 自动起的 100 字标题）：`show` 顶部和其他界面一样只占一行，按显示宽度截断加 "…"；`show --full` 显示完整标题；交接开头的 `# Handoff: <标题>` 保留完整标题，最多约 200 个字符，超了截断加 "…"。
4. `forget` 不必要的 5 分钟等待，按三种情况分：
   - 能确认开着（登记对得上；或者有这家的进程、工作目录就是会话目录）→ 拒绝；
   - 能确认关了（登记说已关；或者那一边根本没有这家 Agent 的进程在跑；有进程、目录都看得清、但都不是会话目录）→ 马上能删，照常问一次 `[y/N]`；
   - 判断不了（有这家的进程但看不出在哪个目录；Windows 上的 Codex 查不了锁；会话在另一边、看不到那边的进程）→ 最近 5 分钟写过就拒绝，提示写清什么时候能删（"it was written 2 minutes ago and may still be open; you can delete it after 17:21"）。原来"登记着开着但查不了"一律拒绝（第 ⑨ 步 R10），改成也按这条。
5. 试跑目录里第 ⑩ 步测试新建的 4 个会话都删掉：OpenCode `ecb79844`、`ecb76de1`，Pi `01a13487`、`01a1348a`。其中 Pi 的一个从 Windows（PowerShell 里的 meme.exe）真删，删完确认 WSL 那边的文件没了、Pi 的会话列表里也没了；OpenCode 的一个也从 Windows 删，补上 W3 没做的"经 wsl.exe 跑 `opencode session delete`"。
6. Pi 用 `/fork` 分出来的会话重复显示前面的历史：先不做，记进第 ⑩ 步的"和 Claude Code、Codex 不一样的地方"。

**约束**：纯代码，不调用模型；产品文字用英文；Conventional Commits；改动写回本文。

**验收**
- 每条修改都有测试（改前失败、改后通过）。
- 作者全部会话的交接，除了标题截断这一处，和 `m1-10` 逐字相同；有差别的逐个列出来。
- 第 5 条的 4 个会话都删掉，Windows 删的那两个在 WSL 那边确认没了。
- 打 `m1-10.1`，不 push。

**第 ⑩.1 步做法和结果（2026-10-13）**

提交（代码库，6 个，`1f8f737`…`625fdb9`，打 `m1-10.1`，没 push）：
1. `fix(cli)`：不在终端里时按 119 列排版（`PIPE_WIDTH`）。
2. `fix(render)`：`show` 顶部的标题按显示宽度截成一行加 "…"（交互式查看器也是），`--full` 显示完整标题。标题本身改成"第一行，最多 200 个字（按字形簇，不切开一个字），截了加 …"（原来截前 200 个 UTF-16 码元、不加 …，可能把一个字切成两半）；交接开头的 `# Handoff:` 用的就是它。`show` 里每轮那一行仍用原来的 `firstLine`，不会出现两个 "…"。
3. `fix(adapters)`：OpenCode 库的副本放在 `~/.meme/cache/opencode/<路径的哈希>/`（来源上记着 `copy`）；`meme uninstall` 删 `cache`（`~/.meme` 是链接时也删）；`forget` 从另一边删 OpenCode 会话时，跑完 `opencode session delete` 再删掉副本（下次读时重做）。Windows 删不掉打开着的文件，所以适配器可以 `closeFiles()`，`forget` 动手前先关。从 WSL 那边删的会话，Windows 上的副本在 Windows 下次运行 meme 时按库的大小和时间重做。
4. `feat(cli)`：`forget` 的三种情况。按目录判断的两家：那一边没有它们的进程，或者进程的目录都看得清、都不是会话目录，算关了；有一个进程看不出目录，算判断不了。判断不了（包括原来"登记着开着、这里查不了"，第 ⑨ 步 R10）的，最近 5 分钟写过才拒绝："<id> was written 2 minutes ago and may still be open in Pi; you can delete it after 17:21."（时间是最后写入 + 5 分钟，进到整分钟）；能在另一边查的，后面加 "(or run \`meme forget <id>\` on Windows, where meme can check)"。
5. `test`：宽度、长标题、副本（位置、复用、uninstall、从 Windows 删后副本没了）、`forget` 的三种情况；新加和改的测试都先在 `m1-10` 的构建上跑过，都失败。原有测试改了 5 处（"一分钟前写过"的提示、R10 两条改成按时间、uninstall 的说明文字、Windows 副本的位置）。
6. `docs`：README 两份。

验收结果：
- 测试：源码 301 个通过、2 个跳过；构建出的 Linux 单文件上端到端 107 个通过、1 个跳过。
- 交接和 `m1-10` 比：作者全部 42 个会话（四家）× 5 种情形（不在 Agent 里、在 Claude Code / Codex / OpenCode / Pi 里）共 210 份，208 份逐字相同；2 份不同的是正在写的开发窗口 0cb2fa3e，差别只有 "active 15 seconds ago" 和 "16 seconds ago"。作者的会话里没有标题接近 200 字的，所以标题截断这一处在这些会话上没有带来差别。
- 第 5 条：4 个测试会话都删了。从 Windows（PowerShell 里的 meme.exe，新构建）删了 Pi `01a13487`（经 `\\wsl.localhost` 删文件；WSL 那边 `~/.pi/agent/sessions/--home-jihd-meme-try-pi--/` 里只剩 `447d4e32`，Pi 的列表也就没了它）和 OpenCode `ecb79844`（显示并执行 `opencode session delete ses_ecb798447ffepl3ZUDBZMkeSlS in WSL (Ubuntu)`，补上 W3 没做的那一步；`opencode session list` 里没了；meme 在 Windows 上的副本也删了）；在 WSL 里删了 Pi `01a1348a`、OpenCode `ecb76de1`。都用临时的 meme 镜像。
- 顺带删掉了 `m1-10` 留在 `%TEMP%\meme-opencode\` 的旧副本（作者 OpenCode 库的拷贝）。

### ⑪ 发布前审查的修复（2026-10-22 作者定，tag `m1-11`）

**依据**：作者 10-13 用 Fable 做的发布前全面审查（Claude Code 会话 `fc3f1f18`，只找问题、不改代码），24 条问题，下面记作 F1–F24。10-22 在开发窗口 `26cc51f5` 逐条复现：分四路并行，只用合成会话、临时的 HOME 和 `MEME_HOME`。24 条都复现了，没有一条不成立；核实时另外发现 F25。作者 10-22 定：第一批、第二批都修；"待作者定"的几条作者另外回复，定了再补进任务。

顺带修了一个到期失败的测试：`test/unit/tui.test.ts` 用 `Date.now()` 去算一个 09-30 的样例会话，却期望 "1w ago"，10-15 前后开始失败。改成和 `text.test.ts` 一样的固定时间（`199c1ae`）。

**核实结果**（程度写成"审查 → 核实"）

| # | 问题 | 核实 | 程度 | 批次 |
|---|---|---|---|---|
| F1 | 脱敏漏掉常见密钥 | 审查列的 12 种全漏：AWS secret、Slack `xoxb-`、Google `AIza`、GitLab `glpat-`、npm `npm_`、Stripe `sk_live_`/`sk_test_`、Hugging Face `hf_`、裸 JWT、`Basic …`、`API_KEY=<32 位 hex>`；原样进了镜像，交接里有 `Bash(cat .env) → AWS_SECRET_ACCESS_KEY=…`。README 写的范围没有夸大，§4.6.7 本来就写着以后补 gitleaks 的规则 | 高 → 高 | 一 |
| F2 | `uninstall` 删掉整个 `MEME_HOME` | 普通目录（不是链接）时整个删掉：`MEME_HOME` 指到放着别的文件的目录，文件一起没了；`MEME_HOME=~` 加 `--yes` 删掉整个家目录；默认 `~/.meme` 里用户自己放的文件也删。链接那一支只删 meme 的文件，没问题。提示只写 "the mirror, the logs and copies"，大小却是整个目录的 | 中 → 中偏高 | 一 |
| F3 | `forget` 判不出 OpenCode 会话已关 | OpenCode 会话的文件是 `<库>#<id>`，`under()` 只认 `/`、`\`，所以总按"判断不了"走 5 分钟。Pi 同样条件马上删 | 中 → 低（方向安全） | 二 |
| F4 | OpenCode 的短 id 超过 12 位认不出 | 13 位短 id（如 `ecbbcc1dcffez`）`show`、`forget`、`continue`、交接链都认不出。OpenCode id 的前 12 位是毫秒时间的低 36 位加进程内计数，要两个进程同一毫秒建会话才会撞 | 中 → 低 | 二 |
| F5 | `forget` 删 OpenCode 时先删 tool-output | 删除命令失败时全文已经没了。但这个顺序是有意的（Claude Code、Pi 也是附属文件先删、主体最后；§6 ④、⑩ 写明 OpenCode 先删 tool-output）：反过来删除成功、删文件失败时文件成孤儿 | 中 → 低 | 待定 |
| F6 | `install --dry-run` 写东西 | 另一边有 OpenCode 库时建出 `~/.meme/cache/opencode/…` 并整库复制（`~/.meme` 也不是 0700），违反 §3.6"`--dry-run` 什么都不建"；Windows 上 dry-run 不问 `wsl.exe`，漏掉 WSL 的来源 | 中 → 中 | 一 |
| F7 | 最后一条用户消息以 `/` 开头算"结束了" | `/etc/hosts is broken…` 没有回复，`show` 写 "Last turn finished."，交接写 `last turn: finished`。消息本身还在 "User messages" 里 | 中 → 低 | 待定 |
| F8 | cwd 是 `\\wsl.localhost\…` 的 Windows 侧会话 | 在 WSL 里接手：每次都出 autocrlf 提醒（仓库其实在 WSL）；在另一个不相干的仓库里接手**没有**"不在原来位置"的提醒（`place.ts` 的 `real()` 把 UNC 当相对路径接到当前目录后面）；在 `~/proj` 里 `ls` 显示没有会话。arch 6.3 的例子没考虑这种路径，R28 只改了项目列 | 低 → 中 | 一 |
| F9 | Pi 的 `!!` 命令进交接和搜索 | `excludeFromContext: true` 的命令和输出进搜索、`show`，命令进交接。§6 ⑩ 定的是 `!`、`!!` 都算用户消息，有测试锁着 | 低 → 低（设计如此） | 待定 |
| F10 | 同一个 id 来自两个来源 | **作者机器上已经出现**：Claude Desktop 在 WSL 里开的会话写在 WSL 的 `~/.claude/projects/`，每轮结束再拷一份到 Windows 的 `%USERPROFILE%\.claude\projects\ssh-<id>\`（拷贝落后、目录名不含项目）。meme 两份都转换、每次运行都改写镜像，最后 Windows 那份赢：标成 `Claude·Win`、少最新的轮次；`forget` 只删拷贝，下次又回来。两个一样的 `opencode.db` 也一样 | 低 → 中 | 一（做法待定） |
| F11 | 判断不了开没开时只看最后一条记录的时间 | 跑着一条超过 5 分钟的命令的会话能删。这是 ⑩.1 第 4 条接受的取舍；审查建议的 mtime 没用（Pi 跑命令时不写文件，Desktop 续期会改 mtime） | 低 → 低（设计如此） | 待定 |
| F12 | 真正删除时没有超时 | 假的 `session delete` 卡住时 meme 一直等。`--help` 探测有 30 秒超时，Codex、OpenCode 的删除那一行没有 | 低 | 二 |
| F13 | 不在终端时超过 119 列 | `ls -a` 125、`continue -a` 129、`continue <匹配>` 125、`search` 142–144；`search` 的标题行完全不截（最长约 230 列） | 低 | 二 |
| F14 | 窄窗口里筛选行看不到 Pi | Agent 那一行固定 62 列，比 62 列窄就被裁掉 | 低 | 二 |
| F15 | `install --help` 的重复 | "no CLAUDE.md or AGENTS.md or AGENTS.md or AGENTS.md"；同一个文件另有 "Claude Code and Codex and OpenCode and Pi" | 低 | 二 |
| F16 | Codex 交接里同一文件算两个 | 相对路径和绝对路径混用时 "Edited files" 里一个文件出现两次 | 低 | 二 |
| F17 | 打断的命令写成 "failed" | Esc 打断的命令在 "Last verification" 写 `failed`，"Recent commands" 打 ✗ | 低 | 二 |
| F18 | 时间在未来的会话 | 列表 "0s ago" 并排在最前。**另外**：比本机快 5 分钟以上的，交接没有 "may still be running"，判断不了开没开的会话 `forget` 直接删（`mayBeRunning` 把远在未来的当成"不在运行"）。WSL2 睡眠后时钟落后 Windows 是常见的事 | 低 → 中（删除这一块） | 一 |
| F19 | dry-run 的来源顺序和 `install` 不同 | dry-run 按适配器，`install`、`status` 按 (agent, env, root) | 低 | 二 |
| F20 | ANSI 转义序列两处显示不同 | 折叠行、标题里是 `[31mred[0m`，展开和交接正文里是 `^[[31mred^[[0m` | 低 | 二 |
| F21 | 死代码 | `editorCommand` 没人用；`Adapter.readText` 在 src 里没人用，`real-sessions.test.ts` 还用着 | 低 | 二 |
| F22 | 文件里有坏行时 `status` 写 "(a new agent version?)" | 非 JSON 行按 §6 ⑦ 记成 "(not JSON)" 类型；"(version unknown)" 只在文件里完全没有版本时才出现 | 低 → 很低 | 待定 |
| F23 | 经 `wsl.exe` 跑 `opencode` 时没带 `OPENCODE_DISABLE_AUTOUPDATE` | Windows 的环境变量进不了 WSL（实测）；1.19 不开 TUI 时不自动更新，所以看不出实际影响 | 低 → 可忽略 | 二 |
| F24 | 交接里 "Steps: 0 steps · 0 commands" | 没有工具的轮次都有这一行 | 低 | 二 |
| F25 | Claude Code 2.1.304 的新记录类型（核实时发现） | Desktop 自带的 2.1.304 写 `api-request`、`api-request-blob`、`api-request-shape`（API 请求的日志，内容和对话重复），报警器报 "writes record types meme doesn't know"，`show` 写 "74 records meme couldn't read" | 低 | 二 |

**约束**：纯代码，不调用模型；产品文字用英文；真会话不进 git；Conventional Commits，按模块提交，每个提交单独通过类型检查。每条修复先写测试，在 `m1-10.1` 上确认失败。表结构版本这一步只升一次（6 → 7），F1 要升，待定里要升的（F7、F9 看作者定的做法）一起。

**任务（第一批）**
1. **F1 脱敏**：补前缀明确的几条：AWS secret（前面要有 `aws…secret…` 的键名，40 位）、`xox[baprs]-…`、`AIza` + 35 位、`glpat-…`、`npm_` + 36 位、`sk_live_`/`sk_test_`/`rk_live_`、`hf_…`、三段的 JWT（`eyJ….eyJ….…`）、`Authorization: Basic …`；预筛 `mayHoldSecret` 跟着改；升表结构版本，镜像按新规则重导。`API_KEY=<32 位 hex>` 不加（不是格式明确的密钥，会误伤 commit hash，和"不做熵检测"冲突），作者没意见就照这样。
2. **F2 `uninstall`**：链接和普通目录一个做法，只删 meme 自己的文件（`OWN`），目录空了再删目录；确认提示里的大小只算这些文件。
3. **F6 `install --dry-run`**：另一边的 OpenCode 库只看在不在（大小、时间），不复制、不建 `~/.meme`；Windows 上 dry-run 也问 WSL 有哪些在运行的发行版（只问、不启动），列出 WSL 的来源。
4. **F8 UNC 路径**：`\\wsl.localhost\<发行版>\…`、`\\wsl$\<发行版>\…` 发行版对得上 `WSL_DISTRO_NAME` 时换成 `/…`，在"在哪接着做"、项目列、autocrlf 提醒里都按换过的路径判断；对不上的照原样写，按"不在原处"处理；`place.ts` 的 `real()` 遇到非绝对路径不再接到当前目录后面。
5. **F10 同一个 id 两个来源**（作者 10-22 定）：Claude Code 的列表跳过 `projects/ssh-*`（桌面版的拷贝）；其他同一个 id 出现在两个来源的，以最后一条记录最新的那份为准，`status` 报出来；`forget` 每一份都删。
6. **F18 时间在未来**：判断开没开时，远在未来的时间也算"可能还开着"（`forget` 照 5 分钟规则拒绝，交接写 Warning）；列表的时间不写 "0s ago"。

**任务（第二批）**
7. **F3**：`under()` 把 `#` 也当分隔符，OpenCode 会话能判断"已关"。
8. **F4**：短 id 的字符集放宽到 `[0-9a-z]`（`show`、`forget`、`continue`、交接链的头）。
9. **F12**：真正删除的命令加超时（120 秒），超时按失败处理，meme 的副本留着。
10. **F13**：不在终端时 `ls -a`、`continue`、`search` 的行按宽度收：先缩标题，再缩项目列；`search` 的标题行截断加 "…"。
11. **F14**：筛选行放不下时间隔缩成 2 格，还放不下就不对齐。
12. **F15**：`install --help` 的文件名去重；"Claude Code, Codex, OpenCode and Pi"。
13. **F16**：编辑过的文件按会话目录换成绝对路径再归并，显示第一次出现的写法；Windows 会话按 Windows 的路径规则。
14. **F17**：这一轮被打断、打断的是最后一个调用时，写 "interrupted"，不打 ✗。
15. **F19**：dry-run 的来源按 (agent, env, root) 排。
16. **F20**：标题和折叠行先去掉整段 ANSI 序列（CSI、OSC），再删控制字符。
17. **F21**：删 `editorCommand`；`readText` 删掉，`real-sessions.test.ts` 改用读 JSONL 的函数。
18. **F23**：经 `wsl.exe` 跑 `opencode` 时前面加 `env OPENCODE_DISABLE_AUTOUPDATE=1`；本机删除那条也带上。
19. **F24**：一轮里没有步骤、没有命令时不写 "Steps:" 那一行。
20. **F25**：三种 `api-request*` 记录在 Claude Code 档案里记为"已知、不用读"，报警器不报。

**待作者定**（**2026-10-22 作者定：五条都照建议**，F5 A、F7 B、F9 A、F11 B、F22 A；做法见本节末尾）
- **F9**：Pi 的 `!!` 改成注入内容（`show --hidden` 才看得到，不进交接、搜索），还是只在 README 写明。
- **F7**：最后一条以 `/` 开头的消息。(a) 一行改法：第一个词里不带 `/` 才算本地命令，`/usr …` 还会误判；(b) meme 补回的本地命令带标记，只认带标记的，要升表结构版本。建议 (b)，和 F1 一起升。
- **F5**：建议不改顺序，只改失败提示（加一句"its saved full outputs were already deleted"）。
- **F11**：要不要在最后一条是还没有结果的工具调用时把窗口放宽到 30–60 分钟。
- **F22**：只有 "(not JSON)" 时单写一行 "N lines that are not JSON (a damaged file?)"，还是不动。

**验收**
- 每条修复都有改前失败、改后通过的测试（复现脚本在开发窗口 `26cc51f5` 的临时目录 `verify-A`…`verify-D`，改写成测试）。
- 源码测试全部通过；构建出的 Linux 单文件上端到端测试全部通过。
- `MEME_REAL_SESSIONS=1` 读作者会话的测试两层报警都是 0（F25）。
- 作者全部会话 × 5 种情形的交接和 `m1-10.1` 比，除了有意改动的地方（F1、F8、F10、F16、F17、F18、F20、F24，以及待定里改了的），输出逐字相同；有差别的逐个列出，F24 改动面大，列个数和一两个样子。
- 打 `m1-11`，不 push。

**第 ⑪ 步做法和结果（2026-10-22）**

提交（代码库，17 个，`199c1ae`…`eb60384`，还没打 tag，没 push；F10 的 5 个见后面）：
1. `test`：选择列表那条测试的时间写死（`199c1ae`，作者要求顺手修的）。
2. `fix(redact)`（F1）：见 §4.6.7；表结构版本 7。
3. `fix(cli)`（F2）：`uninstall` 不管是不是链接，都只删 meme 自己的东西：`meme.sqlite`（和 `-journal`、`-wal`、`-shm`）、`logs/meme.log`、`logs/meme.log.1`、`cache/<各家适配器的目录>`，然后 `logs`、`cache`、数据目录空了才删；有别的文件时写 "Other files in <目录> are kept."。确认提示里的大小只算 meme 的文件。原来删整个 `logs`、`cache`，`MEME_HOME=~` 时会连用户自己的 `~/cache` 一起删。
4. `fix(cli)`（F6、F15、F19）：`install --dry-run` 遇到另一边的 OpenCode 库只写 "database found (<大小>)"，不复制、不建 `~/.meme`；Windows 上也问一次 WSL 有哪些发行版在运行（只问，不启动），列出 WSL 的来源；来源按 (agent, env, root) 排，和 `install`、`status` 一样；`--help` 里每个说明文件只写一次，"Claude Code, Codex, OpenCode and Pi"。
5. `fix(handoff)`（F8）：平台层加 `uncToWsl`：`\\wsl.localhost\<发行版>\…`、`\\wsl$\<发行版>\…` 的发行版等于 `WSL_DISTRO_NAME` 时换成 `/…`。"在哪接着做"（`localDir`、`awayFrom`）、项目列、推送的启动目录都用换过的；换不了的（别的发行版）不再接到当前目录后面，按"不在原处"提醒；这种路径不加 autocrlf 提醒。没有 `WSL_DISTRO_NAME` 时不换，也就是一律提醒。
6. `fix(model)`（F18）：`mayBeRunning` 把在未来的时间一律算"可能还开着"（原来超前 5 分钟以上算不在运行），`forget` 照 5 分钟规则拒绝，交接写 Warning；`ago()` 超前 1 分钟以上写 "2h ahead"（长格式 "2 hours ahead of this clock"），1 分钟以内照旧 "0s ago"；排序不动。
7. `refactor(adapters)`：适配器自己声明在 `cache` 下的目录（`cacheDir`），`uninstall` 从适配器取，不在命令里写 Agent 的名字（"适配器以外不认 Agent"的测试）；OpenCode 的删除命令带上 `OPENCODE_DISABLE_AUTOUPDATE=1`：经 `wsl.exe` 时写在命令行上（`env OPENCODE_DISABLE_AUTOUPDATE=1 opencode …`），从 WSL 跑 Windows 的 opencode 时加 `WSLENV`（F23）。删除步骤可以带环境变量（`ForgetStep.env`）。
8. `fix`（F3、F4、F12）：`under()` 把 `#` 也当分隔符，OpenCode 会话能判"已关"；会话 id 的前缀统一用 `idPrefix`：前 12 位是十六进制（或 UUID 的 `-`），后面可以有小写字母和数字，`show`、`continue`、`forget`、交接链的头都认 13 位以上的 OpenCode 短 id；Agent 自己的删除命令 120 秒没结束就停掉，写 "did not finish within 120 seconds"，meme 的副本留着（测试用 `MEME_DELETE_TIMEOUT_MS`）。
9. `fix(adapters)`（F25）：Claude Code 档案加 `api-request`、`api-request-blob`、`api-request-shape`，记为跳过。作者机器上 2.1.304、2.1.305、2.1.308 都写这三种，不只桌面版自带的那个版本。
10. `refactor`（F21）：删 `editorCommand` 和 `Adapter.readText`（四家的实现），读真会话的测试改用 `readJsonl`。
11. `fix(model)`（F20）：标题和折叠行先去掉整段转义序列（CSI、OSC、两个字符的），再删控制字符。
12. `fix(handoff)`（F16、F17、F24）："Edited files" 按会话目录把相对路径换成完整路径再归并，显示第一次出现的写法（Windows 会话按 Windows 的规则、不分大小写）；被打断那一轮的最后一个调用失败时写 "interrupted"、不打 ✗（每一步、"Recent commands"、"Last verification" 三处）；一轮里没有步骤、没有命令时不写 "Steps:" 行，有别的事（打断、压缩）时写 "Steps: none · interrupted"。
13. `fix(render)`（F13）：`ls -a` 和 `continue` 的列表、`search` 的标题行按宽度收：先缩标题，最少 12 列，再缩项目列，最少 20 列；放得下的行不变。
14. `fix(tui)`（F14）：筛选行放不下时间隔缩成 2 格，还放不下就不对齐；两行用同一种排法。
15. `fix(adapters)`：F25 的注释改成"从 2.1.304 起"。
16. `test`、`docs`：每条修复的测试（都先在改前的代码上跑过、失败）；两份 README（脱敏的范围、`uninstall`、测试钩子 `MEME_DELETE_TIMEOUT_MS`）。

原有测试改了 2 处：`handoff.test.ts` 第 4 轮没有步骤，不再有 "Steps: 0 steps · 0 commands"；`handoff-polish.test.ts` 3000 token 的交接因为少了这些行，中间只删 2 条消息（"turns 2 and 3"），正则改成也认这种写法。

验收结果：
- 测试：源码 326 个通过、2 个跳过；构建出的 Linux 单文件上端到端 122 个通过、1 个跳过；类型检查通过。
- 读作者真会话的测试（`MEME_REAL_SESSIONS=1`）：36 个文件、16,046 条记录的 id 都是原生的；44 个会话里认不出或读不出的类型是 0（F25 以前 `status` 报 2.1.304、2.1.305、2.1.308 三个版本的这三种类型）。
- 交接和 `m1-10.1` 比：作者全部 43 个会话 × 5 种情形共 215 份，每种情形 18 份逐字相同、25 份不同，五种情形的差别一样：
  - 19 份只少了空的 "Steps: 0 steps · 0 commands" 行（F24）；其中 `fb9393aa`（92 轮）因此省出位置，不在 Agent 里和在 Claude Code 里时多留了一条用户消息（35 of 92，原来 34）。
  - 3 份是被打断的命令从 "✗ failed" 改成 "interrupted"（F17），如 `447d4e32` 的 `sleep 60 && echo 完成`、`89373612` 的 PowerShell 循环；1 份多了 "Steps: none · interrupted"（F24）。
  - 2 份是 OpenCode 会话 `ecbbcc1d`、`ecb9c41a`：用完整 id `meme continue` 原来报 "no session matches"（id 里有字母，被当成标题里的词），现在能交接（F4 的规则顺带修好）。`m1-10` 和 ⑩.1 的对比两边都报这个错，所以没发现。
  - 1 份是正在写的开发窗口 `26cc51f5`。
  - 脱敏（F1）、UNC 路径（F8）、未来时间（F18）、编辑文件归并（F16）、转义序列（F20）在作者的会话上没有带来差别。
- `status`：认不出的类型那几行没了（"Record types: all known and read"）。

**F10（2026-10-22，作者定规则以后）**

提交（代码库，5 个，`b792efb`…`725fe1d`）：
1. `fix(adapters)`：Claude Code 的列表跳过 `projects/ssh-*`。桌面版在 WSL 里跑 Claude Code，每轮结束把会话拷一份到 Windows 的 `%USERPROFILE%\.claude\projects\ssh-<id>\`，比原件落后一轮，目录名里没有项目。正常的项目目录是 cwd 换掉符号得来的，开头是 `-` 或盘符，不会是 `ssh-`。
2. `fix(store)`：同一个 id 的每一份拷贝都记在 `files` 里（带来源）；`sessions.source` 记镜像存的是哪一份。导入一份时，如果镜像存的是另一个来源的、那份还在、最后一条记录更新，这一份只记下文件，不覆盖；它没变就不再转换（不会每次运行都来回翻转、改写库）。存的那份被删了（文件没了），`source` 清空、另一份的文件标成要重读，下次运行转换它。列表的大小、时间、归档标记和 `continue` 找 WSL 发行版用的文件，都只看存的那一份。表结构版本 8。
3. `fix(cli)`：`forget` 对每一份拷贝按它所在的那一边建删除计划（Codex、OpenCode 在各自那一边跑命令），合在一起；确认清单里每条命令下面列它那一份的文件；开没开的检查看所有拷贝。`status` 在来源表格下面写 "N sessions are in more than one source: meme shows the copy written last, and `meme forget` deletes every copy."（没有就不写）。
4. `test`：跳过 `ssh-*`；两份时显示新的那份、之后不再转换；另一份领先了就换过去；显示的那份删了就用剩下的；WSL 和 Windows 各一份时 `status` 那一行、`forget` 两份都删。都先在改前的代码上失败。
5. `docs`：两份 README 的"WSL 和 Windows"一节。

验收结果：
- 测试：源码 329 个通过、2 个跳过；构建出的 Linux 单文件上端到端 123 个通过、1 个跳过；读真会话的测试 35 个文件（少的一个是开发窗口在 Windows 上的 `ssh-` 拷贝）、认不出的类型 0。
- 交接：和第一次 m1-11 构建比，作者 43 个会话 × 5 种情形里只有开发窗口 `26cc51f5` 变了：原来读的是 Windows 上落后一轮的拷贝（`Claude·Win`、3 轮），现在读 WSL 的原件（`Claude·WSL`、4 轮）。`status`：`Claude·Win` 10 → 9 个会话，`Claude·WSL` 26 → 27 个。作者机器上现在只有这一个 `ssh-` 拷贝。
- 审查复现脚本（verify-B f10）：桌面版的情形只剩一行、来源只有 WSL；两份一样的 `opencode.db` 两份都记下、镜像只存一份。

两点留给作者：
- `forget` 删桌面版的会话时，只删 WSL 的原件；Windows 上的 `ssh-<id>` 拷贝（里面还有子 Agent 的记录）按规则 meme 不读，所以也不删，删完以后它还留在 Windows 上。要不要顺带删掉？**2026-10-22 作者定：顺带删。** 提交 4 个（`1cb3d7d`…`d400bb8`）：Claude Code 的删除计划查本机看得到的每个 Claude Code 来源（WSL 里是 `/mnt/c/Users/<用户>/.claude/projects`，Windows 上是本机的），有 `ssh-<id>` 目录就删，排在会话主文件之前，确认清单写 "Claude Desktop's copy of the session on Windows"；会话有几份拷贝时，几份计划里相同的删除只做一次；测试（先失败）；两份 README。测试：源码 330 个通过、2 个跳过，构建出的单文件上端到端 124 个通过、1 个跳过。
- 桌面版连真正的远程 SSH 主机时，大概也用 `ssh-<id>` 存本地拷贝（没实测）；跳过以后，这类会话 meme 完全看不到。第一版只管本机和 WSL，可以接受。

**F5、F7、F9、F11、F22（2026-10-22，作者照建议定）**

作者定的：F5 不改顺序、只改提示；F7 给补回的本地命令加标记；F9 `!!` 不进交接，`show`、`search` 照旧；F11 停在没有结果的工具调用上时放宽到 60 分钟；F22 坏行单写一行。

提交（代码库，7 个，`4c4eb18`…`a706bcd`）：
1. `fix(adapters)`：Claude Code 还原的 `<command-name>` 记录带 `command: true`（排队插进来的话不带）；Pi 的 `!!`（`excludeFromContext: true`）文字写成 "Ran \`命令\` (kept from the model)"，档案的 `shellInput`、`shellOutput` 认这个写法，新加 `hidden` 规则；"(not JSON)" 提成常量 `NOT_JSON`。
2. `fix(model)`：`endingOf` 只认带标记的本地命令为"已结束"（原来以 `/` 开头的都算）；`promptText` 把 `!!` 的显示成 `!! 命令`；标题不用 `!!` 的命令；`awaitsResult`：去掉注入、推理、meta 以后最后一条是没有结果的工具调用；`mayBeRunning`、`quietAfter` 加 `busy`，窗口 60 分钟。
3. `fix(store)`：`records` 加 `command` 列，读回记录；表结构版本 9。
4. `fix(handoff)`：`!!` 的命令在交接里换成 "(a command the user ran and kept from the model)"，留在原来的序号上。
5. `fix(cli)`：`forget` 失败时写出前面已经删掉的东西（"Already deleted: the full output of a long command."）；判断不了开没开、会话停在没有结果的工具调用上时，最近一小时写过就拒绝，提示 "was written 19 minutes ago, while a command was running, and may still be open in …; you can delete it after 10:20"；`status` 的 "(not JSON)" 不再算进"认不出的类型"，单写 "Not JSON:     1 line in 1 session, skipped (a damaged file?)"，`show` 写 "1 line that is not JSON was skipped (a damaged file?); see `meme status`."。
6. `test`：每条一个或几个，都先在改前的代码上失败；原有的两处改了：普通的 "/exit" 文本不再算结束（带标记的才算），Pi 的 `!!` 显示成 `!!`。
7. `docs`：两份 README（`forget` 的一小时、Pi 的 `!!` 不交接）。

验收结果：
- 测试：源码 335 个通过、2 个跳过；构建出的 Linux 单文件上端到端 127 个通过、1 个跳过；读真会话的测试 0 个认不出的类型。第 ⑪ 步的 32 个代码和测试提交，在一个临时 worktree 里逐个检查，单独都能通过类型检查。
- 交接：和 F10 以后的构建比，作者 43 个会话 × 5 种情形里只有 2 份变了：第 ⑩ 步试跑的 Pi 会话 `447d4e32` 第 10 条从 "! echo 不给模型-123" 变成 "(a command the user ran and kept from the model)"（F9）；正在写的开发窗口。F7 在作者的会话上没有带来差别（没有以非命令的 `/` 开头结尾的会话）；F5、F11、F22 不影响交接。`status` 没变（作者的会话里没有坏行）。

第 ⑪ 步共 33 个提交（`199c1ae`…`a706bcd`），打 `m1-11`，没 push。要告诉作者、不由我改的设计文档：arch.md 6.3（`\\wsl.localhost` 路径的例子，F8）、storage.md 2.6（脱敏规则，F1）；作者说过 prd、arch、handoff、format 由作者改。要告诉作者、不由我改的设计文档：arch.md 6.3（`\\wsl.localhost` 路径的例子，F8）、storage.md 2.6（脱敏规则，F1）。

### ⑫ 发布准备（一）：不用作者在场的代码部分（2026-10-22 作者定，tag `m1-12`）

**依据**：下面"发布准备"一节的第 5–12 项和 [arch.md](arch.md) 6.2、6.5 节。作者 10-22 定发布准备分三组做，先做这一组：本机写测试就能验收的代码。第二组是安装脚本、GitHub Actions、baseline 版、CI 上真跑（第 1、2、13 项，以及第 7、10 项在 Actions 上的部分）；第三组要人和外部条件（第 3、4、14 项，第 7 项请人试用）。

**约束**：同第 ⑪ 步。纯代码，不调用模型；产品文字用英文；Conventional Commits，按模块提交，每个提交单独通过类型检查；每条先写测试，在 `m1-11` 上确认失败。

**任务**
1. **第 12 项 LICENSE**：MIT，版权人写 git 的用户名 "Jordon"（作者要改就改）；`package.json` 加 `"license": "MIT"`。
2. **第 10 项 meme.exe 的版本信息**：实测 Bun 1.4.2 只有在 Windows 上编译时才能设（交叉编译报 "Using --windows-title is only available when compiling on Windows"）。`scripts/build.ts` 在 Windows 上编译 Windows 版时带上 `--windows-title meme`、`--windows-publisher`、`--windows-version <package.json 的版本>.0`、`--windows-description`、`--windows-copyright`；在别的系统上交叉编译时照旧，并提示"版本信息要在 Windows 上编译才有"。验收挪到第二组（在 Actions 的 Windows 机器上编译、看属性）。
   - 顺带（arch.md 6.5 第 4 条）：编译加 `--sourcemap`，单文件里出错时调用栈对得回源代码的文件和行（10-22 实测：不加时是 `plain:2:33`，加了是 `t.ts:2:24`）；日志里每条错误记下 meme 的版本。
3. **第 5 项 Windows 读 WSL 的总开关**：平台层一个函数 `readsWsl(platform)`，Windows 上看它决定要不要问 `wsl.exe`、加 WSL 的来源；`createContext`、`install --dry-run`、停着的发行版的提示都看它。关掉用环境变量 `MEME_NO_WSL=1`，不进 `--help`、README（只给自己留后路）。关掉时镜像里原来的 WSL 来源和会话删掉（回到"Windows 只读自己"）。
4. **第 6 项 没装 WSL 时零代价**：有 `%ProgramFiles%\WSL\wsl.exe` 照旧每次问 `--list --running --quiet`。没有它、只有 `System32` 里的 `wsl.exe` 时：先问 `--running`；没有在运行的，再问一次 `--list --quiet` 分清"装了没运行"和"没装或一个发行版都没有"；后者记进 `meta`（`wsl_absent` = 时间），一天内不再调用 `wsl.exe`。只缓存"没有"，不缓存"没在运行"。（原来写的是先问 `--list --quiet`，改成先问 `--running`：`System32` 的 `wsl.exe` 第一次要 0.7 秒，有发行版在运行时只问一次。）
5. **第 7 项里用假 `wsl.exe` 的部分**：三种情况写成测试：找不到 `wsl.exe`；很慢（到超时，现在 5 秒，测试用新钩子 `MEME_WSL_TIMEOUT_MS` 缩短）；报"没装"（第 6 项）。超时时 `status` 和列表顶上写 "WSL did not respond within 5 seconds; its sessions are as of <时间>"，不再说成 "is not running"。
6. **第 9 项 只有一种平台时标签不写平台**：镜像里的会话和读得到的来源只有一种平台时，列表、`show`、`search`、`status`、`install`、`forget`、全屏列表的标签只写 `Claude`、`Codex`；交接开头的 `Source:` 照旧写全（`Claude·Win`）。
7. **第 8 项 安装时提醒另一边**：Windows 上 `meme install`：在运行的发行版里（用推送时找 Agent 的办法，登录 shell 的 `command -v`）有 `claude`、`codex`、`opencode`、`pi` 之一，就提示 "Agents also in WSL (Ubuntu): claude, codex. To use `! meme continue` in them, install meme there too:" 加安装命令；停着的发行版不查、不启动。WSL 里 `meme install`：Windows 的用户目录下有这几家的家目录，就反过来提示在 Windows 上也装。安装命令放在一个常量里，第二组有了安装脚本再定成最终的写法，现在先指向 README 的安装一节。
8. **第 11 项 `meme report`**（arch.md 6.5）：
   - 输出一份能直接贴进 issue 的文字：开头 "This report holds no conversation content. Read it before you paste it."；meme 版本、系统和 CPU、环境、表结构版本；各来源最新会话的 Agent 版本；`status` 的全部内容；日志里最近 20 条错误和慢命令；
   - 遮掉：家目录写成 `~`，用户名换成 `<user>`，项目路径按出现的先后换成 `project-1`、`project-2`；
   - `meme report --session <id>`：再加这个会话的结构，不给内容：每种记录类型几行、各有哪些字段名、文件大小、Agent 版本、meme 认出几轮、两层报警各报了什么；
   - 出错提示加一句 "To report it, run `meme report` and paste what it prints into an issue."；
   - `.github/ISSUE_TEMPLATE/bug_report.yml`：运行了什么、期望、实际、贴 `meme report`、勾"我看过报告，没有不想公开的内容"。

**验收**
- 每条都有测试，改前失败、改后通过（第 1 条 LICENSE 没有测试；第 2 条的 Windows 版本信息到第二组验收，`--sourcemap` 用一个会出错的单文件验）。
- 第 5 项：关掉以后，用 `MEME_ENV=win` 加假的 WSL 跑 `ls -a`、`status`：没有 WSL 的会话和来源，假 `wsl.exe` 一次都没被调用；打开时第 ⑤ 步的测试照旧全过。
- 第 6、7 项：假 `wsl.exe` 报"没装"时，第一条命令最多调用两次，记下"没装"；之后一天内一次都不调用；把记下的时间改成 25 小时前，下一条命令又问；"装了、没在运行"每条命令都问；有 Program Files 里的 `wsl.exe` 时不用缓存。找不到 `wsl.exe` 时多花的时间不到 0.05 秒；很慢时命令在超时后照常结束，`status` 写 "WSL did not respond"。
- 第 9 项：只有 Windows 会话的镜像里，`ls`、`show`、`status` 的标签没有平台，交接的 `Source:` 有；加一个 WSL 会话后都恢复带平台。
- 第 8 项：用假的 WSL 和假的 Windows 用户目录：有 Agent 时出现提示和安装命令，没有时不出现；WSL 停着时不启动它，也不提示。
- 第 11 项：报告里没有家目录、用户名、项目路径、会话内容（用带着这些的合成会话测，逐个查不在输出里）；`--session` 只有结构。
- 源码测试、构建出的单文件上的端到端测试全部通过；作者全部会话的交接和 `m1-11` 逐字相同（这一步不改交接）。
- 打 `m1-12`，不 push。

**第 ⑫ 步做法和结果（2026-10-22）**

提交（代码库，11 个，`63089f1`…`709d5ff`，打 `m1-12`，没 push）：
1. `docs`：MIT 的 `LICENSE`（Copyright (c) 2026 Jordon），`package.json` 加 `"license": "MIT"`，两份 README 末尾加许可证一节。
2. `build`：每个单文件都带 `--sourcemap`（Linux 版 77.8 → 78.1 MB）；在 Windows 上编译 Windows 版时带 `--windows-title`、`--windows-publisher`、`--windows-version`（`0.1.0.0`）、`--windows-description`、`--windows-copyright`，在别处编译时打印 "built off Windows, so meme.exe has Bun's version information, not meme's"。
3. `feat(platform)`：日志里每条错误写成 "ERROR [meme 0.1.0] …"。
4. `feat`（第 5、6、7 项）：`readsWsl(platform)` 是唯一的判断，`MEME_NO_WSL=1` 关掉；关掉时 `createContext` 用 `dropSources` 删掉镜像里 WSL 的来源和只属于它们的会话。`runningDistros` 返回 `{ running, silent }`；分清 WSL 自己的 `wsl.exe`（Program Files）和 `System32` 的空壳：空壳先问 `--running`，没有在运行的再问 `--list --quiet`，一个都没有就在 `meta` 记 `wsl_absent`，24 小时内不再问；"没在运行"从不记。等 `wsl.exe` 最多 5 秒（`MEME_WSL_TIMEOUT_MS`），用 `Promise.race` 加计时器，到时杀掉；没回答时列表、全屏列表、`status` 顶上写 "WSL did not respond within 5 seconds; its sessions are as of …"，`status` 的来源行写 "no answer"，不再说 "is not running"。测试的办法也变了：`MEME_WSL_RUNNING` 照旧直接给出在运行的发行版；没给时找替身 `wsl.exe`（Program Files 里的或 PATH 上的 `wsl`），真去问它；两个都没有时才按 `MEME_WSL_DIR` 的文件夹列。
5. `feat`（第 9 项）：`label()` 看 `namePlatforms()`：`createContext` 导入完以后，镜像里的会话只有一种平台就只写 `Claude`；交接的 `Source:` 和上游会话的小标题用 `fullLabel()`，一直写全。
6. `feat(cli)`（第 8 项）：`meme install` 在 Windows 上对每个在运行的发行版，用登录 shell 的 `command -v` 找 `meme` 和四家的命令；有 Agent、没有 meme 就写 "Agents also in WSL (Ubuntu): Claude Code, Codex. To use `! meme continue` in them, install meme there too:" 和安装方法；WSL 里看 Windows 用户目录下有没有 Agent 的家目录、旁边有没有 `.meme`。安装方法是常量 `INSTALL_HINT`，现在指向 README 的 "Install from source"，第二组有了安装脚本再换。
7. `feat(cli)`（第 11 项）：`meme report`：开头 "This report holds no conversation content. Read it before you paste it."；meme 版本和表结构版本、系统和 CPU、每个来源最新的会话里读到的 Agent 版本（读不出版本的跳过，最多看 5 个）、`status` 的全部（`status` 拆出 `statusLines`）、日志里最近 20 条错误和慢命令（每条最多 8 行）。遮挡：项目路径（原样的、和换掉符号的目录名）→ `project-N`，Windows 用户目录下的名字、`/home/<名字>`、`Users\<名字>` → `<user>`，家目录 → `~`，家目录最后一段、`USER`、`USERNAME`、读到的 Windows 用户名单独出现时 → `<user>`，最后再过一遍脱敏规则。（不用 `os.userInfo()`：没有 `USER` 时 Bun 返回 "unknown"，会把 "(version unknown)" 也遮掉。）`--session <id>`：每种行（`type`，加 `subtype`、`payload.type` 或和 `type` 不同的 `message.role`）几行、字段名（一层），文件个数和大小，Agent 版本，meme 读出的轮数、各种记录几条、结束状态，两层报警。意外的错误后面加一行 "To report it, run `meme report` and paste what it prints into an issue."。
8. `docs`：README 命令表加 `meme report`；`.github/ISSUE_TEMPLATE/bug_report.yml`（运行了什么、期望、实际、贴 `meme report`、勾"我看过报告"）。
9. `refactor(cli)`：`report.ts` 的注释里去掉 Agent 的名字（"适配器以外不认 Agent"的测试）。
10. `test`：`test/unit/release.test.ts`、`test/e2e/release.test.ts`，每条都先在改前的代码上失败。
11. `docs`：README 的测试钩子加 `MEME_WSL_TIMEOUT_MS`（`MEME_NO_WSL` 按定的不写）。

验收结果：
- 测试：源码 349 个通过、2 个跳过；构建出的 Linux 单文件上端到端 139 个通过、1 个跳过；读真会话的测试 0 个认不出的类型。11 个提交逐个在临时 worktree 里检查过，单独都能通过类型检查。
- 第 5、6、7 项：替身 `wsl.exe` 记下每次调用：关掉开关后一次都没调用，`ls -a`、`status` 里没有 WSL；"没装"第一条命令调用 2 次，之后 `ls`、`status` 都 0 次，记录改成 25 小时前又问；"装了没运行"每条命令都问；Program Files 里的那个每次都问；不回答时（超时缩到 0.3 秒）命令照常结束，`status` 写 "WSL did not respond within 0.3 seconds; its sessions are as of …"；没有 `wsl.exe` 时 `runningDistros` 不到 50 毫秒。
- 第 9 项：只有 Windows 会话时 `ls`、`show`、`status` 写 `Claude`，交接写 `Source: Claude·Win`；加一个 WSL 会话后都写平台。
- 第 8 项：替身 WSL 里有 `claude`、`codex` 没有 `meme` 时提示；有 `meme`、没有 Agent、发行版停着时都不提示，停着时 `wsl.exe` 一次都没调用；WSL 里 Windows 有 Claude Code 没有 `.meme` 时提示，建了 `.meme` 就不提示。
- 第 11 项：合成会话里的家目录、Windows 用户名 `me`、项目名 `acme-secret-merger`、对话里的 "TOP-SECRET" 都不在报告里，项目路径成了 `project-1`。用作者的真实数据（临时镜像）生成一份 `report --session 447d4e32`：`jihd`、`<用户>`、各项目名、`!!` 那条命令的内容都没出现；Pi 会话的结构按 `message/…` 分得清。
- 交接：和 `m1-11` 比，作者 43 个会话 × 5 种情形只有正在写的开发窗口 `26cc51f5` 不同；`status` 逐字相同（作者两边都有会话，标签照旧写平台）。
- 第 10 项：Windows 版本信息和第 7 项在 Actions 上量时间，到第二组；`--sourcemap` 用一个会出错的单文件验过（`t.ts:2:24`），meme 自己的单文件没找到能稳定触发内部错误的办法，没再验。

**留给第二组**：安装脚本（第 2 项）定下来以后，把 `INSTALL_HINT` 换成一条命令；在 Actions 的 Windows 机器上编译 `meme.exe`、看版本信息（第 10 项），跑 `ls`、`status` 量时间（第 7 项）。

### ⑬ 发布准备（二）：安装脚本、GitHub Actions、baseline 版、CI 上真跑（2026-10-22 作者定，tag `m1-13`）

**依据**：下面"发布准备"的第 1、2、13 项；第 7 项里在 Actions 上量时间的部分；第 10 项（`meme.exe` 的版本信息要在 Windows 上编译才能设，第 ⑫ 步实测）；第 ⑫ 步留下的 `INSTALL_HINT`。作者 10-22 定：**正式发布时仓库公开，安装脚本从 GitHub Release 下载**。

**10-22 查到的**
- Bun 1.4.2 三种 x64 都有 baseline 目标：`bun-linux-x64-baseline`、`bun-windows-x64-baseline`、`bun-darwin-x64-baseline`（本机都编译成功）。也有 musl 版（Alpine），这一步不发，以后再说。
- GitHub 的 runner：Linux x64 `ubuntu-latest`；Linux arm64 `ubuntu-24.04-arm`（2026-01-29 起私有仓库也能用，2 核）；macOS Intel `macos-15-intel`（最后一个 x86_64 镜像，支持到 2027-08）；macOS Apple 芯片 `macos-latest`；Windows `windows-latest`。私有仓库用免费分钟数，macOS 按 10 倍、Windows 按 2 倍算。
- 本机能经 WSL 调用 Windows 自带的 PowerShell 5.1，`install.ps1` 可以在本地的临时目录里测，不改用户的 PATH。

**约束**：同第 ⑫ 步。另外：推送和在 GitHub 上跑工作流要先问作者（推上去才会跑，会用掉私有仓库的分钟数）；这一步不建 Release、不打 `v*` tag（作者定发布前删掉所有 tag，见下面"正式发布前"）。

**任务**
1. **baseline 版**（第 1 项）：`scripts/build.ts` 加 `linux-x64-baseline`、`darwin-x64-baseline`、`windows-x64-baseline`，文件名 `meme-<系统>-x64-baseline`（Windows 加 `.exe`）；不带参数时打全部 8 个，`SHA256SUMS` 包括全部。
2. **`install.sh`**（第 2 项，POSIX sh，Linux、macOS、WSL）：
   - 认系统和 CPU：Linux、macOS；x86_64、aarch64/arm64；Apple 芯片上的 Rosetta 终端也装 arm64 版；x64 不支持 AVX2 就装 baseline 版（Linux 看 `/proc/cpuinfo`，macOS 看 `sysctl`）；Git Bash、MSYS 里提示改用 `install.ps1`。
   - 从 `https://github.com/jordonjill/meme/releases/latest/download/` 下载（`MEME_VERSION=v0.1.0` 时用那个版本的），`curl` 或 `wget`；用 `SHA256SUMS` 核对（`sha256sum` 或 `shasum -a 256`），对不上就停，什么都不装。
   - 放进 `~/.local/bin/meme`（`MEME_INSTALL_DIR` 可改）；这个目录不在 PATH 上时，往所用 shell 的配置文件（bash 的 `~/.bashrc`，zsh 的 `~/.zshrc`，其他 `~/.profile`）加一行，只加一次，并说清加在哪；`MEME_NO_MODIFY_PATH=1` 不改。
   - 最后运行 `meme install`。
   - `MEME_FROM=<目录>` 从本地目录装（测试用）。
3. **`install.ps1`**（第 2 项，Windows PowerShell 5.1 和 PowerShell 7）：x64 版（Windows on Arm 也装 x64 版，系统会模拟）；不支持 AVX2（`IsProcessorFeaturePresent(40)`）就装 baseline 版；下载、用 `Get-FileHash` 核对；放进 `%USERPROFILE%\.local\bin\meme.exe`；不在用户 PATH 上就加进去（也加进当前窗口），提示"新开的终端才认得 `meme`"；`MEME_NO_MODIFY_PATH`、`MEME_INSTALL_DIR`、`MEME_FROM`、`MEME_VERSION` 同上；5.1 上先开 TLS 1.2；最后运行 `meme install`。
4. **GitHub Actions**：
   - `ci.yml`：推到 `main`、提 PR 时，在 `ubuntu-latest` 上：Bun 1.4.2、`bun install --frozen-lockfile`、类型检查、`bun test`、打 Linux 版、对它跑端到端测试。
   - `release.yml`：手动运行（`workflow_dispatch`）和推 `v*` tag 时。打包：Ubuntu 上打非 Windows 的 6 个，Windows 上打 2 个 Windows 版（带版本信息，并读出来核对，第 10 项）。在 5 种机器上真跑（第 13 项）：Linux x64、Linux arm64、macOS Intel、macOS Apple 芯片跑那个单文件的端到端测试，Windows 跑一组冒烟命令；Windows 上量 `ls`、`status` 的时间（第 7 项，Actions 的 Windows 没装 WSL）；每种机器上用 `MEME_FROM` 跑一遍安装脚本，装进临时目录。只有推 `v*` tag 时才建 Release，而且是草稿：8 个单文件、`SHA256SUMS`、`install.sh`、`install.ps1`。
   - 版本都钉死（Bun 1.4.2、各个 action 的版本）。
5. **`INSTALL_HINT` 换成一条命令**：Linux/WSL/macOS `curl -fsSL https://github.com/jordonjill/meme/releases/latest/download/install.sh | sh`，Windows `irm https://github.com/jordonjill/meme/releases/latest/download/install.ps1 | iex`。
6. **README 两份**：安装一节先写这两条命令（注明发布后可用），保留"从源码安装"。

**验收**
- 本地：打出 8 个单文件，`sha256sum -c SHA256SUMS` 通过；`install.sh` 的测试（假的单文件和假的 `uname`、`sysctl`、cpuinfo）：Linux x64 有 AVX2、没有 AVX2、arm64、macOS 两种、Rosetta 下都选对文件；校验和不对时停下、什么都没装；PATH 那一行只加一次、`MEME_NO_MODIFY_PATH` 时不加；最后运行了 `meme install`。shellcheck 没有警告。`install.ps1` 用本机的 Windows PowerShell 5.1 从 `dist/` 装进 `%TEMP%`（不改 PATH）能装好、能运行；校验和不对时停下。actionlint 检查两个工作流没有问题。
- GitHub 上（推送前问作者）：`ci.yml` 通过；手动运行 `release.yml`，5 种机器都通过；`meme.exe` 的版本信息是 meme 0.1.0.0；Windows 上 `ls`、`status` 的时间记进本节；macOS、arm64 上端到端测试的结果记进本节。
- 作者全部会话的交接和 `m1-12` 逐字相同（这一步不改交接）。
- 打 `m1-13`，不 push（推送单独问）。

**第 ⑬ 步做法和结果（2026-10-22，本地部分）**

提交（代码库，7 个，`92c4426`…`cabe2df`，没 push，还没打 tag）：
1. `build`：8 个目标（加 `linux-x64-baseline`、`darwin-x64-baseline`、`windows-x64-baseline`）。
2. `build`：`install.sh`。认 `uname -s`/`-m`，Rosetta 看 `sysctl.proc_translated`，AVX2 在 Linux 看 cpuinfo（测试用 `MEME_CPUINFO` 换）、在 macOS 看 `machdep.cpu.leaf7_features`；Git Bash/MSYS/Cygwin 指向 `install.ps1`；`curl` 或 `wget`，`sha256sum` 或 `shasum -a 256`；bash 在 macOS 上写 `~/.bash_profile`、在 Linux 上写 `~/.bashrc`，zsh 写 `~/.zshrc`，其他写 `~/.profile`，行是 `export PATH="<目录>:$PATH"`，有了就不再加；测试用 `MEME_RELEASE_URL` 换下载地址。
3. `build`：`install.ps1`。用 `IsProcessorFeaturePresent(40)` 看 AVX2；出错一律 `throw`（经 `irm | iex` 运行时是用户自己的 PowerShell，`exit` 会把窗口关掉）；用户 PATH 直接读写注册表 `HKCU\Environment`，保持 `REG_EXPAND_SZ`（.NET 的 `SetEnvironmentVariable` 会写成 `REG_SZ`，原有的 `%USERPROFILE%\...` 就不展开了），再设一个用户变量让 Windows 通知新开的程序；5.1 上开 TLS 1.2、下载时关掉进度条；只用 ASCII 字符（5.1 把不带 BOM 的脚本按系统代码页读）。
4. `build`：`.github/workflows/ci.yml`、`release.yml`，`test/ci/sessions.ts`、`test/ci/windows.ps1`。action 钉在提交上：checkout v7.0.1、setup-bun v2.2.0、upload-artifact v7.0.2、download-artifact v8.0.2（10-22 查的最新版，核对过用到的输入项都在）。Windows 那份检查脚本会改所在机器的用户 PATH，只在 Actions 上跑。
5. `feat(cli)`：`INSTALL_HINT` 换成两条一条命令。
6. `docs`：两份 README 的安装一节：两条一条命令（注明第一次正式发布以后可用），"从源码安装"放在后面，8 个目标。
7. `test`：`install-script.test.ts`（12 条）、`install-ps1.test.ts`（2 条，经 WSL 调本机的 Windows PowerShell 5.1，全在 Windows 的临时目录里，`MEME_NO_MODIFY_PATH`、`MEME_NO_WSL`、`USERPROFILE` 和 `MEME_HOME` 都指到临时目录，不碰作者的 PATH 和数据；Windows 刚写的 exe 会被占一会儿，清理时重试），以及"提示、README、脚本里的安装命令一致"。

本地验收结果：
- 打出 8 个单文件，`sha256sum -c SHA256SUMS` 全部通过；Linux 的 baseline 版能运行。
- `install.sh`：12 条测试通过（Linux x64 有/没有 AVX2、arm64、macOS 两种、Rosetta、Git Bash；PATH 那行只加一次、zsh、`MEME_NO_MODIFY_PATH`；校验和不对什么都不装；从本地 HTTP 服务下载）；shellcheck 0.11.0 没有警告；`dash -n` 通过。
- `install.ps1`：本机 Windows PowerShell 5.1 从 `dist/` 装进临时目录、运行 `meme install` 通过；校验和不对时停下、什么都没装。两份 `.ps1` 都用 PowerShell 的解析器查过语法。
- actionlint 1.7.12（带 shellcheck）检查两个工作流没有问题。
- 测试：源码 364 个通过、2 个跳过；Linux 单文件上端到端 153 个通过、1 个跳过；读真会话 0 个认不出的类型；7 个提交单独都能通过类型检查。
- 交接和 `m1-12` 比，作者 43 个会话 × 5 种情形只有开发窗口不同；`status` 逐字相同。

**GitHub 上的验收（2026-10-26，作者同意推送以后）**

推送 `main`（连同 `m1-12`）前先加了一个提交：`release.yml` 上传的 artifact 只保留 1 天（私有仓库 artifact 存储只有 500 MB，8 个单文件不压缩约 620 MB）。仓库仍是私有的，用的是账号的免费分钟数；作者确认不必为此公开。

三轮 `release.yml`（都是手动运行，没有建 Release）：
1. 第一轮（`40259428893`，`276e3ef`）：打包、Windows 打包（版本信息核对通过）、Linux x64、Linux arm64、Windows 都通过；两台 Mac 各失败 25 条。原因：
   - 23 条是测试环境：macOS 的临时目录 `/var/folders/…` 是指向 `/private/var/folders/…` 的链接，测试用前者写会话的目录，meme 拿到的当前目录是后者。真实使用时 Agent 记的也是真实路径，不是 meme 的问题。改测试：`tempDir()` 返回真实路径。
   - 其中 F13 那条在 Mac 上测出一个**真问题**："No sessions in <目录> — showing all projects"（`ls`、`continue`）和 "— searching all projects"（`search`）里的目录不收短，目录深时一行 145–184 列。Linux 上补测也复现了。改成按宽度收短目录（全屏列表的提示本来就换行，不改）。
   - 2 条 OpenCode 的："关着的 OpenCode 旁边 meme 不建文件"，Mac 上数据库旁多了 `-wal`、`-shm`。Mac 上 Bun 用系统的 SQLite，它关闭数据库后留下空的 `-wal`、`-shm`。测试改成比较 meme 读之前和之后的目录（名字、大小、修改时间都不变）。
2. 第二轮（`40260039810`，`79e28cf`）：两台 Mac 只剩 1 条：`-shm` 的修改时间变了。这是**真问题**：meme 看到 `-wal` 就当 OpenCode 开着，以普通只读方式打开，SQLite 会写 `-shm`，也就是在 Mac 上读 OpenCode 时会动它的文件夹。改成 `-wal` 是空的就和没有 `-wal` 一样，用 `immutable` 打开，什么都不建、不碰（Linux 上放一个空 `-wal` 也能复现，加了测试）。
3. 第三轮（`40260393920`，`6536991`）：**全部通过**。CI（`ci.yml`）三次推送都通过。

各机器的结果（第三轮）：
| 机器 | 单文件 | 测试（源码；端到端测的是单文件） | 安装脚本 |
|---|---|---|---|
| Linux x64（`ubuntu-latest`） | `meme-linux-x64` | 362 通过、5 跳过 | `install.sh` 装好、能运行 |
| Linux arm64（`ubuntu-24.04-arm`） | `meme-linux-arm64` | 362 通过、5 跳过 | 同上 |
| macOS Intel（`macos-15-intel`） | `meme-darwin-x64` | 344 通过、23 跳过（只在 Linux 上跑的） | 同上 |
| macOS Apple 芯片（`macos-latest`） | `meme-darwin-arm64` | 344 通过、23 跳过 | 同上 |
| Windows（`windows-latest`） | `meme-windows-x64.exe` | 读两个会话（标签 `Claude`、`Codex`，只有一种平台）、`show`、`search`、`continue --plain` | `install.ps1`：5.1 装好并把目录加进用户 PATH（仍是 `ExpandString`），7 装好、按设置不改 PATH |

- 第 10 项：在 Windows 上编译的两个 exe，版本信息是 "meme 0.1.0.0 / Jordon / meme: coding-agent sessions in one place / Copyright (c) 2026 Jordon. MIT License."。
- 第 7 项：Actions 的 Windows 机器**装了 WSL**（WSL 自己的 `wsl.exe` 在），所以量到的不是"没装 WSL"的情形：`ls` 第一次 80/100 毫秒、之后中位数 69/129 毫秒，`status` 84/113、74/124 毫秒（第一轮/第三轮）。"没装 WSL"只有替身 `wsl.exe` 的测试，真机还要请只用 Windows 的人试（第三组）。
- 第 13 项：macOS 两种和 Linux arm64 的单文件第一次真正运行过，端到端测试都通过。
- CI 提示：`ubuntu-latest` 从 2026-10-19 起陆续换成 Ubuntu 26。

这一轮的提交（代码库，5 个，`276e3ef`…`6536991`）：artifact 保留 1 天；`fix`：没有会话的提示按宽度收短目录；`test`：临时目录用真实路径、OpenCode 目录前后比较、F13 加深目录；`fix(adapters)`：空的 `-wal` 按没有处理；`test`：空 `-wal`。每个提交单独都能通过类型检查。

收尾：作者全部会话（现在 42 个）× 5 种情形的交接和 `m1-12` 比，只有开发窗口和另一个正在用的会话 `a808de49`（另一个项目，"active 1 second ago"/"40 seconds ago"）不同；`status` 逐字相同。第 ⑬ 步共 12 个提交（`92c4426`…`6536991`），打 `m1-13`；`main` 已在 origin 上，`m1-13` 没 push。

### 发布准备（功能完整以后再做）

**发布 0.1.0（2026-10-26 作者定）**
- **不做 npm**：第一版只发 GitHub Release 和两份安装脚本（第 4 项的"定 npm 包名"取消）。单文件不依赖 Node；上 npm 要每个平台一个包再加一个总包，又是一套要维护的东西，以后有人要再加。这改了 [arch.md](arch.md) D5 和第 7 节"Bun 单文件为主，npm 为辅"，arch.md 由作者改。
- **先私有发布**：仓库还是私有的，Release 只有作者和协作者看得到、下得到；两条一条命令安装在私有期间不能用（不带登录信息，返回 404），作者自己装用 `gh release download v0.1.0` 再 `MEME_FROM=<目录>` 运行安装脚本。以后仓库改成公开，这个 Release 原样公开，一条命令安装就能用。私有期间发现问题：删掉 Release 和 tag 重打，或者发 0.1.1。第三组剩下的（Windows 上真机测 Codex、请只用 Windows 的人试用、LinuxDO 首发帖）放在公开之前做。
- **版权人**：LICENSE 和 `meme.exe` 的版本信息写 "Jordon"。
- **删掉全部 `m1-*` 标签**（本地和 origin，共 22 个）。提交都还在，以后要对比就用下表的提交号：

| 标签 | 提交 | 日期 |
|---|---|---|
| `m1-1` | `13aa633` | 2026-10-08 |
| `m1-2` | `9b0a5a9` | 2026-10-10 |
| `m1-2.1` | `55109ac` | 2026-10-10 |
| `m1-3` | `b38d927` | 2026-10-10 |
| `m1-4` | `74fbd5f` | 2026-10-10 |
| `m1-5` | `20e2604` | 2026-10-10 |
| `m1-6` | `80c48ac` | 2026-10-12 |
| `m1-6.1` | `60d900c` | 2026-10-12 |
| `m1-7` | `76a5916` | 2026-10-12 |
| `m1-7.1` | `72bd27a` | 2026-10-12 |
| `m1-8` | `f3ca0e1` | 2026-10-12 |
| `m1-8.1` | `893bbc9` | 2026-10-12 |
| `m1-8.2` | `348f15d` | 2026-10-12 |
| `m1-8.3` | `24f2483` | 2026-10-12 |
| `m1-8.4` | `e70b5a4` | 2026-10-12 |
| `m1-9` | `7f294db` | 2026-10-13 |
| `m1-9.1` | `a499848` | 2026-10-13 |
| `m1-10` | `2496161` | 2026-10-13 |
| `m1-10.1` | `625fdb9` | 2026-10-13 |
| `m1-11` | `a706bcd` | 2026-10-22 |
| `m1-12` | `709d5ff` | 2026-10-22 |
| `m1-13` | `6536991` | 2026-10-26 |

**做法和结果（2026-10-26）**
1. 删掉 22 个 `m1-*` 标签：先删 origin（一次推送），再删本地；两边都剩 0 个。删之前对照表已写进上面。
2. 在 `main` 的 `6536991` 上打 `v0.1.0`（带说明的 tag，"meme 0.1.0"）并推送，`release.yml` 跑通（5 种机器的测试都通过），建了草稿。**草稿多了 6 个 `.map` 文件**：第 ⑫ 步加 `--sourcemap` 后，Bun 除了把映射嵌进单文件，还在旁边另写一份带全部源码的 `.map`，上传时 `dist/meme-*` 把它们也带上了（`SHA256SUMS` 里也有）。实测把单文件单独拷到别处，调用栈照样对回源码行，所以 `.map` 用不上。
3. 修：`scripts/build.ts` 编译完删掉旁边的 `.map`（`4478b4d`）。草稿没发布过，删掉草稿和 `v0.1.0`（本地和 origin），推 `main`，在 `4478b4d` 上重打 `v0.1.0`。
4. 第二次 `release.yml`（`40261485087`）：全部通过，草稿附件 11 个：8 个单文件、`SHA256SUMS`、`install.sh`、`install.ps1`。
5. 发布前用 `gh release download` 从草稿下 `SHA256SUMS`、`install.sh`、`meme-linux-x64`，`sha256sum -c` 通过，`MEME_FROM` 装进临时的 HOME，`meme --version` 是 0.1.0。
6. `gh release edit v0.1.0 --draft=false` 发布：https://github.com/jordonjill/meme/releases/tag/v0.1.0 ，发布时间 2026-10-26 03:01 UTC，是"最新版本"；仓库仍是私有，不登录访问 `releases/latest/download/install.sh` 返回 404（预期）。origin 上只剩 `v0.1.0` 一个 tag。

**仓库公开（2026-11-17 前后，作者改的）**：`jordonjill/meme` 是公开的，`v0.1.0` 是最新版本，附件 11 个；不登录访问 `releases/latest/download/` 下的 `install.sh`、`install.ps1`、`SHA256SUMS` 都返回 200。两条一条命令在作者机器上实际装了一次（都装进临时目录，`MEME_NO_MODIFY_PATH=1`，临时的 `MEME_HOME`，装完删掉）：
- WSL：`curl -fsSL https://github.com/jordonjill/meme/releases/latest/download/install.sh | sh` 下载 `meme-linux-x64`、核对、装好，`meme install` 正常，`meme --version` 是 0.1.0；139 秒（大多是下载 78 MB）。
- Windows PowerShell 5.1：`irm https://github.com/jordonjill/meme/releases/latest/download/install.ps1 | iex`（`USERPROFILE` 指到临时目录、`MEME_NO_WSL=1`）下载 `meme-windows-x64.exe`、核对、装好，`meme install` 正常；156 秒。

**还没做**：第三组（Windows 上真机测 Codex、请只用 Windows 的人试用、LinuxDO 首发帖）。仓库已经先公开了，这几件现在是公开以后做。

**正式发布前**（2026-10-22 作者定）：删掉所有 tag（本地和 origin 上的 `m1-1` … `m1-*`），版本定为 0.1.0（`package.json` 现在就是 0.1.0）。Release 要一个 tag，叫什么（比如 `v0.1.0`）到时候和作者确认。

（2026-10-10 从第 ④ 步挪出来。）
1. GitHub Actions 打 5 个单文件（Linux x64/arm64、macOS x64/arm64、Windows x64），附上校验和；先在本地把 5 个都打出来、核对校验和。
   - **本地 5 个已打出（2026-10-10）**：`bun scripts/build.ts` 在 WSL 里交叉编译出 `meme-linux-x64`（81.5 MB）、`meme-linux-arm64`（81.4 MB）、`meme-darwin-x64`（69.5 MB）、`meme-darwin-arm64`（62.4 MB）、`meme-windows-x64.exe`（86.2 MB），写出 `dist/SHA256SUMS`，`sha256sum -c` 全部通过。第一次打 macOS 和 arm64 要下载对应的 Bun 运行时，共约 2 分 40 秒。`file` 核对架构都对；两个 macOS 版都带代码签名段（Bun 自动加的临时签名，Apple 芯片的 Mac 不跑完全没签名的程序）。Linux x64 和 Windows x64 实际运行过；arm64 和两个 macOS 版本机跑不了，要到对应机器上试。还没做：`baseline` 版（老 CPU，release.md）、GitHub Actions。
2. `install.sh`、`install.ps1`：判断系统和 CPU、下载、核对校验和、放进 `~/.local/bin`（Windows 是 `%USERPROFILE%\.local\bin`）、需要时加进 PATH、运行 `meme install`；可以指定从本地目录装，方便测试。
3. README（英文）+ `README.zh-CN.md`。
   - **2026-10-10 已写**（作者要求先写）：能做什么、从源码安装（还没有安装包和安装脚本）、在终端和在 Agent 里怎么接着做、命令表、全屏列表的按键、搜索范围、删除、WSL 和 Windows（含 PowerShell 5.1 管道乱码的办法）、数据和隐私、开发。写的时候顺手修了两处：`meme install` 和 `meme status` 的来源表格按旧的 `CC` 宽度对齐，`Codex` 那一行错了一列；`meme ls --help` 还写着 "Tab switch source"。等有了安装脚本和 Release，要把"从源码安装"换成一条命令安装。
4. 定 npm 包名；LinuxDO 首发帖草稿。

**WSL 和 Windows 的 5 项**（2026-10-12 作者定，依据 [arch.md](arch.md) 6.2 节；这次只写进计划，不实现，发布准备也还没开始）。第 ⑤ 步 B1–B6 的真机测试结果，决定第 5 项要不要把 Windows 读 WSL 关掉。

5. **Windows 读 WSL 的总开关**（2026-10-13 作者定：**保留** Windows 读 WSL，第 ⑤ 步第二、三轮真机测试每条命令多 150–170 毫秒，在验收内；总开关只留作后路，照下面做）：只在一处判断"Windows 上要不要加 WSL 的来源"，关掉就回到不对称：WSL 读两边，Windows 只读自己。先不对用户公开（不进 `--help`、README），只给自己留后路。
   - 现在 Windows 读 WSL 的地方散在几处：`createContext` 开头问 `wsl.exe`、`platform.wsl` 喂给两家适配器的 `roots`、`continue` 推送到 WSL、`forget` 用 WSL 里的 codex、`install` 列来源。改成都看同一个判断（比如平台层的一个函数），关掉时这几处都不碰 `wsl.exe`。
   - **验收**：关掉以后，用 `MEME_ENV=win` 加假的 WSL 跑端到端测试：`ls -a`、`status` 里没有 WSL 的会话和来源，假 `wsl.exe` 一次都没被调用（记下调用次数）；打开时现有的第 ⑤ 步测试照旧全过。
6. **没装 WSL 时零代价**：
   - 有 `%ProgramFiles%\WSL\wsl.exe` 就用它（现在已经这样，约 0.1 秒）；
   - 没有它时，先判断装没装 WSL：问一次已安装的发行版（`wsl.exe --list --quiet`，不是 `--running`）；确认"没装"就记下来（比如记在数据库的 `meta` 里，带时间），一天内不再调用 `wsl.exe`；
   - 只缓存"没装"，不缓存"没在运行"：不然用户启动 WSL 以后最多一天都看不到它的会话。"装了但没在运行"每次照旧问。
   - **验收**：用假 `wsl.exe` 模拟"没装"：第一条命令调用一次，记下"没装"；接下来一天内的命令一次都不调用（看假 `wsl.exe` 的调用记录）；把记下的时间改成一天以前，下一条命令又问一次。模拟"装了、没在运行"：每条命令都问。有 Program Files 里的 `wsl.exe` 时不走这套判断。
7. **只有 Windows 的测试**（作者没有 Windows 沙盒）：
   - 用假的 `wsl.exe` 测三种情况：找不到、很慢（一直不返回，到超时，现在 `WSL_TIMEOUT_MS` 是 5 秒）、报"没装"；量每条命令多花多少时间；
   - 配 GitHub Actions 时，在它的 Windows 机器上跑一遍 `meme.exe ls`、`status`，量时间。它是 Windows Server，WSL 的情况和家用 Windows 不完全一样，只算近似；
   - 正式发布前请一两个只用 Windows 的人试。
   - **验收**：三种情况都写成测试并通过：找不到时多花的时间可以忽略（不到 0.05 秒）；"没装"时第一条命令以后不再多花时间（第 6 项）；很慢时命令不会卡死，最多多花超时那么久，并且 `status` 里写 "WSL did not respond"（2026-10-12 作者同意加）。Actions 上 `ls`、`status` 的时间记进本节。试用的人能装好、`ls` 正常、没有多余的提示或弹窗。
8. **安装时提醒另一边**：Windows 上 `meme install` 发现 WSL 里有 `claude` 或 `codex`，就提示 "Agents also in WSL (<发行版>): install meme there too to use \`! meme continue\` in them"，并给出在 WSL 里的安装命令；在 WSL 里装时反过来，发现 Windows 那边有 Agent 就提示在 Windows 上也装。
   - 查 WSL 里有没有 Agent 可以用现在 `continue` 推送时的办法（`findInWsl`：用户的登录 shell 找命令）；只查正在运行的发行版，不为这个启动 WSL。WSL 里查 Windows 那边，看 `/mnt/c/Users/<用户>/` 下有没有两家的目录或命令。
   - **验收**：用假的 WSL 和假的 Windows 用户目录跑端到端测试：有 Agent 时出现这一行和安装命令，没有时不出现；WSL 停着时不启动它，也不提示。提示里的安装命令和发布时的安装脚本一致（第 2 项）。
9. **只有一种平台时标签不写平台**：和筛选行同一个规则（镜像里只有一种平台时，列表、`show`、`status`、`install` 的标签都只写 `Claude`、`Codex`，不写 `·Win`）。交接内容开头的 `Source:` 照旧写全（`Claude·Win`），因为接手的 Agent 要知道是哪个系统的会话。
   - **验收**：只有 Windows 会话的镜像里，`ls`、`show`、`status` 的标签没有平台后缀，交接的 `Source:` 有；加一个 WSL 会话后，所有地方都恢复带平台。

10. **meme.exe 的 Windows 版本信息**（2026-10-13 作者定）：现在 `Get-Command meme` 的版本列写 `1.4.2.0`，资源管理器里的属性也是 Bun 的。打包时设 meme 自己的版本、产品名、说明（Bun 的 `--compile` 有 Windows 元数据的选项，到时候按当时的 Bun 核对）。
    - **验收**：`(Get-Command meme).Version` 是 meme 的版本号；文件属性里写 meme。
11. **`meme report`**（arch.md 6.5 节，2026-10-12 定，10-13 补进本节）：输出一份可以直接贴进 issue 的报告（版本、环境、`status`、最近的错误；遮掉用户名和项目路径；不含对话内容），`--session <id>` 只给结构；出错提示加一句怎么报告；GitHub 的 issue 模板。
12. **LICENSE 文件**（MIT，PRD）。
13. **在 CI 上跑 macOS 和 Linux arm64 的单文件程序**：本地打出来过，从没运行过。
14. **找人在 Windows 上真机测 Codex**：`Codex·Win` 的读取、推送（`codex.cmd`）、删除（Windows 的 codex）、PowerShell 里中文输出，现在只用假的测过。

**验收**
- 在干净的 HOME 里，WSL 和 Windows 都能一条命令装好、用起来。
- Release 页面上能下载到各系统的单文件。
- 第 5–14 项各自的验收（见上）。

---

## 7. 开发约定

- **两个地方**：代码在 `~/work/meme`，全部用英文；设计文档在 `~/work/private/docs/meme`，用中文。设计有变化，就回来改设计文档，并写上日期。
- **每一小步的顺序**：先按本文写测试，再实现，然后在作者的真实会话上跑一遍，最后更新文档。
- **不提交真实会话**，也不提交任何从真实会话导出的东西。
- **trajectory 固定在 0.4.3**。要升级时，先跑"对回原记录 ID 的比例"那组测试。
- **M0 的原型脚本**放在会话的临时目录里，没有进仓库。可以参考它们的写法，但要按本文重写，不要直接复制。
- 提交信息用英文；每一小步结束时打一个标签（`m1-1` 到 `m1-9`）。
- **Agent 升级检查单**（2026-10-13 作者定）：Claude Code 或 Codex 升级以后——
  1. 跑读真会话的那组测试（`MEME_REAL_SESSIONS=1 bun test test/unit/real-sessions.test.ts`），两层报警都应是 0；
  2. 对一个开着的会话跑 `meme forget <id>`，应该被拒绝（"is open in …"）；关掉以后应该能删。认不出时，登记的位置或格式变了，见 §8；
  3. 在那家 Agent 里 `! meme continue` 拉一次，看交接有没有被存成文件、截断。

---

## 8. 风险和要尽早验证的事

| 事项 | 什么时候验证 | 不行怎么办 |
|---|---|---|
| 交互界面在 Windows 终端里能不能用（raw 模式、方向键、中文宽度） | ✅ ① 已验证：Windows Terminal 和 WSL 都正常 | 先只做普通文字输出，交互界面往后放 |
| 在 Windows 上启动 `codex.cmd` / `claude.exe`，引号和空格 | ✅ ④：作者在经典 PowerShell 里实测 `claude.exe` 在会话目录启动、自己运行 `meme continue`；`codex.cmd` 只用假的测过（参数原样到达，本机 Windows 没装 Codex）。⑤：经 `wsl.exe` 启动 WSL 里的 Agent，第一条消息里的引号、`%`、`^`、`&`、`|`、中文实测原样到达 | 推送时改成只打印一条让用户自己复制运行的命令 |
| ~~在交互式界面里 skill 能不能被可靠地调用~~ | —— | 2026-10-10：第一版不装 skill，这一条去掉 |
| Agent 模式下接力内容太长，被 Agent 的命令输出截断（Claude Code 的 `!` 和 Bash 工具默认只留 3 万字符） | ✅ ② 已处理，⑥、⑧.1 改过 | 公共上限 1.5 万 token，各家的在档案里：Claude Code 2.7 万字节（⑧.3，原来 2.5 万字符），Codex 3.6 万字节，认不出在哪家时取最紧的（⑧.1）。超出时按六步删：`↳` 行（最旧的先删）→ 压缩摘要（3000 → 1000 字 → 去掉）→ 最后 2 轮中间的步骤 → AI 的话 → 最早改的文件 → 中间的用户的话（§4.6.6）。~~超出时删中间的用户的话~~（2026-10-10 的做法，第 ⑥ 步起是上面的六步；更早的"超过就写文件输出 @文件"10-10 已去掉） |
| 终端推送时新 Agent 一打开就为 `meme continue` 弹权限确认 | ✅ ② 已处理（Claude Code）；✅ ③ 作者实测 Codex 没有弹审批（§6 ③） | Claude Code 用 `--allowedTools "Bash(meme:*)"`；Codex 找它的审批设置 |
| Codex 有没有类似 `!` 的直接跑命令的写法 | ✅ ③ 实测：有，但结果不发给模型，用户要再说一句 | —— |
| Codex 对命令输出的上限 | ✅ ③ 实测：约 4 万字节（1 万 token，按字节数 ÷ 4） | 在 Codex 里接力内容不超过 3.6 万字节（§4.6.6） |
| 推送到 Codex 时，模型跑 `meme continue` 给的 `max_output_tokens` 太小，接力内容被截断 | ✅ ③ 作者实测：模型给了 `max_output_tokens=10000`，接力内容完整（§6 ③） | 第一条消息里已经要它留够 1 万 token；不行就再改第一条消息 |
| Codex 分叉的上级、回退后两个文件怎么拼成一个会话 | ✅ ③ 实测并实现：按 `history_base` 拼（§4.5） | —— |
| Codex 的 `/delete` 具体删了哪些东西 | ✅ ③ 的 A5（2026-10-10）：`codex delete --force` 删会话文件、`threads` 那一行、历史库里的轮次和条目（§3.5） | 用 Codex 自己的 `codex delete`；不能用就只提示用户在 Codex 里 `/delete`，镜像跟着删（§3.5） |
| trajectory 以后升级改了格式 | 一直 | 版本固定，加上对照测试 |
| **trajectory 不维护了**（2026-10-12 加，arch.md 6.1 节第 5 条、D19） | 一直；作者报问题、或报警器报警时顺带看一眼它的提交记录。10-12：274 star，Letta 维护，最后一次提交 09-25 | 把 meme 用到的部分（Claude Code、Codex 适配器和统一格式那层，约 1,000 行，Apache-2.0，保留许可证说明）复制进 `src/vendor/trajectory/`，自己维护。**什么时候复制**：Claude Code 或 Codex 改了格式、meme 读不对了，而 trajectory 两周内没修；或者它三个月没有任何提交。现在不复制。在那之前，meme 自己从原文件补的几处（Codex 的 `compacted` 项、Claude Code 的本地命令、`isMeta`）争取提交给它 |
| 正则搜索在程序里匹配会不会太慢 | ✅ ① 实测一次搜索 5–12 毫秒（§4.8） | 先用 SQL 按其中的固定文字筛一遍 |
| 单文件约 80 MB | 已知 | 可以接受；以后看 Bun 能不能把它变小 |
| Windows PowerShell 5.1 把 meme 的输出接到管道上时按 GB2312 解码，中文乱码 | ✅ ④ 实测（2026-10-10）：直接显示正常，只有接到管道上才乱 | 不改 meme；README 写上先运行 `[Console]::OutputEncoding = [Text.Encoding]::UTF8`（发布准备时写） |
| **Claude Code 把超过约 3 万字节的命令输出存成文件**，只给模型看开头 2KB（2026-10-12 真机测试时发现，§6 ⑤ 测试进度） | ✅ ⑧.3 已处理：作者本机 2.1.280–2.1.296，`!` 和 Bash 工具都这样，B4 是第三次 | 档案改成 2.7 万字节；交接第三行要模型把存下的文件读全，防它以后调低门槛 |
| **`forget` 认不出开着的会话**（2026-10-12 B5 事故） | ✅ ⑧.3、⑧.4：Claude Code 读它的会话登记 `~/.claude/sessions/<pid>.json`（2.1.296），看进程还在不在；Codex 看 `~/.codex/thread-writer-locks/<id>.lock` 被哪个进程 `flock` 着（0.162.1）。都是没有文档的内部做法 | 没有登记目录时查不到，最近 5 分钟写过的就拒绝。**登记目录还在、但新版本不再登记**时会把开着的当成关着的：升级 Claude Code 或 Codex 以后，对一个开着的会话跑一次 `meme forget <id>`，看是否还拒绝 |
| **Windows 读 WSL 太慢或有弹窗**（2026-10-12 加，arch.md 6.2 节） | ✅ 第 ⑤ 步第二轮真机测试（§6 ⑤）：读 WSL 每条命令多花约 150–170 毫秒，WSL 停着时多约 85 毫秒（只问 `wsl.exe`），`wsl --shutdown` 后不会把 WSL 启动，没有弹窗。另有偶尔 10 秒的一次，原因待查（⑧.3 加了慢命令的 log） | 发布准备第 5 项的总开关：关掉 Windows 读 WSL，回到不对称（WSL 读两边，Windows 只读自己） |
| Windows 上的 Codex 通过 PowerShell 运行命令，`meme continue` 的中文会不会乱 | 以后在 Windows 上用 Codex 接力时实测 | 照上一条的办法，或在第一条消息里让 Codex 先设好 UTF-8 |
