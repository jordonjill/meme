# A1 公开数据调研：不同编码 Agent 在同一仓库里会不会反复踩同样的坑

> 调研日期：2026-09-30。只查看了数据结构，没有下载任何大文件。
> 背景：作者本机只有 Claude Code 的会话（15 个主会话，约两周），没有其他 Agent 的会话，也没有 Codex 账号，所以 PRD 假设 A1 改用公开数据来检验。
>
> **2026-10-08 说明**：按 [PRD v0.6](../../design/prd.md)，这里检验的假设（不同 Agent 会反复踩同样的坑）已经**移到第二版记忆层**，列在 [arch.md](../../design/arch.md) 第 10 节"第二版之前再验证的"里，不再是第一版的前提。本文留作第二版开工前的依据。

**标注约定**
- **已验证**：用 `gh`、`curl`、Hugging Face API 或 datasets-server 亲自查看过。
- **子任务核对**：由并行的子任务核对，其中关键项做过抽查。
- **未验证**：只有二手信息，或者没能打开。

---

## 结论

**公开数据能检验一个"弱化版"的 A1**：在同一个仓库或同一个环境里，不同 Agent 会不会在**不同任务**上踩到同一个仓库特有的坑，以及每踩一次浪费多少步。

- SWE-Milestone、SWE-bench 的 django 子集和 Terminal-Bench 2.0，足以给出带置信区间的数字，工作量是几周。
- SWE-chat 能补充真实世界的信号，但以 Claude Code 为主，同一个仓库里出现多个 Agent 的情况可能很少（未验证）。

**公开数据回答不了的问题：**
1. **私有仓库里的坑有多频繁。** 在私有仓库、真实本地环境和内部工具链里，坑出现得有多频繁，公开数据反映不出来。A1 最关心的是配置类和环境类的坑，而基准测试的容器事先把环境配好了，这类坑会被系统性地低估。
2. **经验在不同 Agent 之间能不能真正迁移、会不会被照做。** 这必须靠干预实验：用 Harbor 回放，或者 meme 自己做 A/B。
3. **记错一条经验的代价**，以及检索和注入环节的实际效果。
4. **真实团队里多个 Agent 共用一个仓库有多普遍。** 目前只有 AIDev 的间接证据，约 8%–31%，未复算。

也就是说，公开数据适合回答"这种机会是否存在、有多大"，回答不了"meme 能不能兑现这个价值"。后者还要靠作者自己的会话，以及用 Harbor 做的小规模多 Agent 对照实验。

---

## 一、候选数据集排名

| # | 数据集 | 内容 | 同一批任务上跑过的 Agent | 格式 | 规模 | 许可 | 适合 A1 的程度（1–5） |
|---|---|---|---|---|---|---|---|
| 1 | **SWE-Milestone-log**（DeepCommit-ai） | 7 个真实仓库，每个按版本区间拆成 9–23 个**前后衔接**的里程碑任务，共 98 个 | 4 个 CLI：Claude Code（18 个模型）、Codex（6）、Gemini CLI（4）、OpenHands（7）；每个仓库有 35 次端到端运行和 10 次逐里程碑运行 | log.tar.gz 原始轨迹、工具调用和 token 统计、每个里程碑的评测结果 | 约 64.8 GB | MIT，需要登录 Hugging Face（自动批准） | **5** |
| 2 | **Terminal-Bench 2.0 轨迹**（yoonholee 的归一化版，以及 harborframework 官方原始版） | 89 个任务容器，52,104 次运行，其中 34,462 条带完整步骤 | 26 个 Agent，包括 Codex 3,532 条、Claude Code 3,092、Gemini CLI 1,766、OpenHands 6,198，以及 goose、Droid、opencode、Junie 等；每个"任务 × Agent"组合一般跑 5 次 | 归一化版是 parquet，步骤字段统一；官方版是 ATIF-v1.2 加各 Agent 的原生日志 | 归一化版 220 MB；官方仓库约 121.6 GB | Apache-2.0 | **4** |
| 3 | **SWE-bench experiments**（Verified / Lite） | Verified 共 500 个任务、12 个仓库：django 231、sympy 75、sphinx 44、matplotlib 34、sklearn 32 等 | Verified 有 175 个带元数据的提交，其中 164 个附了轨迹，涉及 68 个 Agent 名、83 个模型：mini-SWE-agent 48、OpenHands 8、SWE-agent 8，以及 Agentless、TRAE、Warp、Jules、Amazon Q 等。**没有 Claude Code 和 Codex CLI** | 各家格式不一（json / txt / md），存在公开的 S3 上 | 每条 60–800 KB | 仓库未声明许可 | **4** |
| 4 | **SWE-bench-Live 提交** | Python 1,888 个任务、223 个仓库，每个仓库中位数 2 个任务；另有多语言版 1,077 个 | Claude Code（原生 stream-json，5 个模型）、OpenHands（2）、SWE-agent（6）。**同一个模型在三种 Agent 上都跑过**的任务：gpt-5.5 有 210 个，deepseek-v4-pro 有 220 个 | 每个任务一个 trajectory.json | 仓库约 1.27 GB | 数据 MIT，提交仓库未声明 | **4**（比较 Agent）/ 2（同一仓库多个任务） |
| 5 | **SWE-bench Pro** | v1 共 731 个任务，V2 共 642 个，都是 11 个仓库，每个仓库 4–82 个任务 | S3 上有 SWE-agent 的 15 次运行（多个模型）；Inferact 发布了 610 条 Codex CLI 轨迹；Harbor 复现实验里 Codex 在 100 个任务上各跑了 12 次。官方说 V2 发布时附带 Claude Code、Codex、mini-swe-agent 的轨迹，但**下载位置未验证** | S3 上是 JSON；Inferact 版是 ShareGPT 格式，没有 instance_id | Inferact 版 648 MB | MIT；S3 未声明 | **4** |
| 6 | **SWE-chat**（SALT-NLP，真实会话） | 205 个仓库、5,851 个真实开发会话、14,459 个 commit | 约 85% 是 Claude Code，另有 OpenCode 623、Gemini CLI 59、Cursor 19、Copilot 2（Agent 标签不完全可靠）。**同一仓库里有没有出现多个 Agent：未验证** | parquet 加原生 JSONL | 约 14.7 GB | ODC-BY，需要登录（自动批准） | **4** |
| 7 | **Multi-SWE-bench 轨迹** | 7 种语言、约 1,632 个任务、约 39 个仓库（论文数字，未复核） | 3 个 Agent（MSWE-agent、MagentLess、MopenHands），各约 12 个模型 | 每次运行一个 zip | 6.3 GB | CC0-1.0 | 3 |
| 8 | **nvidia/Open-SWE-Traces** | 约 15.1 万条轨迹，带 repo 字段 | OpenHands、SWE-agent、mini-swe-agent 跑同一批任务；Claude Code 和 OpenCode 的数据标为"即将发布" | —— | 约 380 GB | CC-BY-4.0 | 3 |
| 9 | **SWE-smith 系列** | 59,136 个合成 bug、222 个仓库，每个仓库中位数 120 个 | SWE-agent（Claude 3.x 系列）、mini-swe-agent-plus（Kwai，65,994 条）、用 Claude Code 驱动 GLM-5.3（约 1,200 条）。三者的任务是否重叠未验证 | parquet / tar.zst | 约 10.7 GB 起 | MIT / MIT / 其他 | 3 |
| 10 | **AIDev**（Agent 提交的真实 PR） | 71,677 个精选 PR、6,673 个仓库、81,716 条评审评论 | Codex 35.5k、Copilot 23.5k、Devin 6.2k、Cursor 4.1k、Claude Code 1.9k、Jules 0.5k。**没有轨迹** | parquet | 6.1 GB | CC-BY-4.0 | 3 |
| 11 | SWE-Gym 轨迹 | 2,438 个任务、11 个仓库（pandas 737、MONAI 374、moto 343 等） | OpenHands 6,055 条，另有 Moatless（规模未验证） | —— | 301 MB | 未声明 / MIT | 2 |
| 12 | Pi 会话（pi-share-hf 标签） | 作者本人在 pi-mono 仓库里的 627 个真实会话；汇总版 1,291 个 | 只有 Pi 一个 Agent | JSONL | 225 MB | 其他 / MIT | 2（只能做单 Agent 基线） |
| 13 | DataClaw 个人导出；公开仓库里的 `.specstory/history` | 个人导出的 Claude Code / Codex 会话；约 1.6 万份 specstory 文件 | 同一用户用了多个 Agent，但在同一项目里是否重叠未验证 | JSON / Markdown | 小 | 随仓库而定 | 2 |
| 14 | nebius SWE-agent-trajectories、SWE-rebench-openhands | 分别 80k 条和 67k 条（后者覆盖 1,823 个仓库） | 各自只有一个 Agent | —— | 1.1 GB 以上 | CC-BY-4.0 | 2 |
| 15 | DCAgent 的 Harbor 运行、Harbor parity-experiments | 同一组 100 个 Verified 任务，每个跑 3 次（共 1000 多个数据集）；SWE-bench Pro 的 100 个任务上 Codex 跑了 12 次 | 大多是 terminus-2，少量 opencode；模型多为微调版 | ATIF / conversations | 42.6 GB（parity） | 多数未声明 / Apache | 2（只适合做同一 Agent 的噪声基线） |
| 16 | OpenHands feedback、SWE-bench-CL、EvoAgentBench、Context-Bench、LoCoBench-Agent、VALVE、LiveSWEBench、Aider polyglot | 没有公开轨迹，或者任务不是真实仓库，或者没有 repo 字段 | —— | —— | —— | —— | 0–2 |

---

## 二、各候选说明与链接

### 1. SWE-Milestone（arXiv 2603.13428）

- 论文 https://arxiv.org/abs/2603.13428 ，代码 https://github.com/DeepCommit-ai/SWE-Milestone
- 任务数据 https://huggingface.co/datasets/DeepCommit-ai/SWE-Milestone-data
- 日志 https://huggingface.co/datasets/DeepCommit-ai/SWE-Milestone-log
- **已验证**：许可 MIT；顶层目录就是 7 个仓库及各自的版本区间（ripgrep、dubbo、element-web、navidrome、nushell、scikit-learn、go-zero）。每个仓库的里程碑数：go-zero 23、element-web 18、nushell 13、dubbo 12、sklearn 12、ripgrep 11、navidrome 9。
- **子任务核对**：各 Agent 和模型的运行数只看了 ripgrep、sklearn 两个仓库，另外 5 个按同样的结构推断。
- **未验证**：原始轨迹是不是 Claude Code / Codex 的原生 JSONL，要登录才能看。
- **为什么最贴合 A1**：这是唯一一个同时满足"同一个在演进的仓库、多个前后衔接的任务、多个真实 CLI Agent"的数据集。
- **缺点**：
  - 只有 7 个仓库，推广不到所有仓库，只能逐个仓库报告。
  - 端到端运行是一次很长的会话，Agent 在会话内部就会积累经验，这会干扰结论；但反过来，也可以直接用来测"同一会话内的重复踩坑"。

### 2. Terminal-Bench 2.0

- **归一化版** https://huggingface.co/datasets/yoonholee/terminalbench-trajectories
  - 从 tbench.ai 的公开榜单抓取，每一步统一为 `src / msg / tools[{fn,cmd}] / obs`。
- **官方原始版** https://huggingface.co/datasets/harborframework/terminal-bench-2-leaderboard
  - **已验证**：共 76 个提交，大多数是 89 个任务 × 5 次 = 445 次运行。
  - **已验证**：`ClaudeCode__GLM-4.7` 这个提交既有 `agent/trajectory.json`（ATIF-v1.2，Agent 名为 claude-code 2.1.34），也有 Claude Code 原生的 `sessions/projects/-app/*.jsonl`。
  - **已验证**：Gemini CLI 的提交带有 `gemini-cli.trajectory.json`。
  - **已验证**：`copilot-cli__claude-opus-4.6` 这个提交抽查的那次运行只有 `exception.txt`，`copilot.txt` 是空的，没有轨迹。说明官方版里不是每个提交都有可用的轨迹。
  - README 注明新提交已于 5 月 14 日关闭。
- ATIF 格式规范：https://github.com/harbor-framework/harbor/blob/main/docs-mintlify/core-concepts/agents/atif.mdx
- **Terminal-Bench 2.1**（https://github.com/harbor-framework/terminal-bench-2-1/tree/main/leaderboard/submissions）
  - **已验证**：维护者自己跑了 Claude Code、Codex、Gemini CLI、Cursor CLI、Terminus-2、mini-swe-agent。
  - 轨迹放在 Harbor Hub 上，官方说"公开可读"，但不登录打开任务页面会返回 404。能不能用 `harbor hub trial download` 下载，未验证。
- **已验证的数据质量问题**：
  - 观察结果截断到 5000 字符。
  - 有 1/3 的运行没有步骤（Droid、goose 抽样都是空的）。
  - 部分 mini-swe-agent 行的 msg / cmd 是 `"$34"` 这样的占位符，是抓取时没还原的引用，需要回官方原始版补全。
- 抽样中已经能看到环境类的坑，比如"7z 命令不存在"、"ModuleNotFoundError: toml"。
- **局限**：89 个任务都是一次性的容器，不是长期维护的仓库，"项目约定"类的坑很少。

### 3. SWE-bench experiments

- 仓库 https://github.com/SWE-bench/experiments
- **已验证**（稀疏克隆了所有 `metadata.yaml`，逐个查看 `assets.trajs` 字段）：
  - Verified 目录有 182 个，其中 175 个有元数据，164 个附了轨迹（162 个在 S3 上）。
  - Lite 的 84 个里有 65 个附了轨迹。
  - Multimodal 的 22 个里一个都没有，官方明确说 Multimodal 不要求提交轨迹。
  - Multilingual 的 14 个全是 mini-SWE-agent。
- S3 可以匿名列目录和下载，例如 https://swe-bench-submissions.s3.amazonaws.com/?list-type=2&prefix=verified/20250524_openhands_claude_4_sonnet/trajs/
- **已验证**：格式差异很大。Warp 一条约 800 KB，是完整日志；Google Jules 一条约 5 KB，基本只是摘要。
- 2025-11-18 起，Verified 只接受学术机构提交，所以 Claude Code 和 Codex **以后也不会出现**在这里。
- **抽查了 3 个 django 任务**。在 django-11133 上：
  - OpenHands CodeAct 2.1 + Claude 3.5 Sonnet（2024 年）和 mini-SWE-agent + GPT-5.2（2026 年）报出了完全相同的 `ImproperlyConfigured: Requested setting DEFAULT_CHARSET, but settings are not configured`。
  - 两边的路径分别是 `/testbed/...` 和 `/workspace/django__django__3.0/...`，说明比对前必须先把路径归一化。
  - 这只是同一任务上的个例，不能当作证据。

### 4. SWE-bench-Live

- 数据 https://huggingface.co/datasets/SWE-bench-Live/SWE-bench-Live
- 提交仓库 https://github.com/SWE-bench-Live/submission（已验证存在，约 1.27 GB，未声明许可）
- **子任务核对**：同一个模型在三种 Agent 上都跑过的任务有 210 / 220 个，分布在 143 个仓库，每个仓库最多 13 个。
- **用途**：这是"**固定模型、只换 Agent**"的最好样本。
- 每个仓库的任务太少，只能做同一任务上的跨 Agent 分析，做不了跨任务分析。

### 5. SWE-bench Pro

- 代码 https://github.com/scaleapi/SWE-bench_Pro-os（MIT）；V2 每个仓库的任务数已用 Hugging Face 统计接口核对。
- S3：`traj/README.md` 说要有 AWS 账号，但匿名列目录成功了，能看到 15 次运行，全是 SWE-agent。https://scaleapi-results.s3.amazonaws.com/?list-type=2&prefix=swe-bench-pro/&delimiter=/
- Codex CLI 轨迹 https://huggingface.co/datasets/Inferact/codex_swebenchpro_traces
  - **已验证**：MIT，610 行，只有 `conversations` 一个字段；数据卡给出了每个仓库的数量（ansible 96 …… tutanota 20）。
  - 没有标明模型，从系统提示推测是 GPT-5.4（未验证）。
  - 要用题目文本去匹配任务 ID。
- V2 协议以及 Claude Code / Codex / mini-swe-agent 的封装：https://github.com/scaleapi/SWE-bench_Pro-os/blob/main/v2/README.md
  - labs.scale.com 说"trajectories ship with the release"，但只找到 Docent 上的在线查看页 https://docent.transluce.org/dashboard/032fb63d-4992-4bfc-911d-3b7dafcb931f 。**批量下载的位置未验证。**
- Harbor 复现实验 https://huggingface.co/datasets/harborframework/parity-experiments （adapters/swebenchpro）：Codex + gpt-5-mini，原版和 Harbor 各跑 6 次。
- **优点**：包含 Go、TS、JS 这类大型仓库（teleport、webclients），环境类的坑应该比 django 多。

### 6. SWE-chat（真实数据）

- 数据 https://huggingface.co/datasets/SALT-NLP/SWE-chat（**已验证**：ODC-BY，需要登录，自动批准，约 14.7 GB）
- 论文 https://arxiv.org/abs/2604.20779
- 格式转换工具 https://github.com/letta-ai/trajectory（Apache-2.0）
  - 能把 Claude Code、Codex、Gemini CLI、OpenCode、Pi、OpenHands 等十几种格式统一成同一种结构。
  - 工具返回里有真实的错误标志时，会给出 `ok` 字段，正好用来识别失败的调用。
  - Agent 标签的审计见 https://github.com/letta-ai/trajectory/blob/main/PARITY.md
- **隐私处理**：用 Presidio 和 TruffleHog 脱敏；只收录许可允许再分发的仓库；数据还在持续增长。
- **第一件要做的事**：登录后跑一次 `sessions.groupby('repo_id').agent.nunique()`，看有多少仓库出现过 2 个及以上的 Agent。

### 7–10. 其他

- **Multi-SWE-bench**：轨迹 https://huggingface.co/datasets/ByteDance-Seed/Multi-SWE-bench_trajs（已验证 CC0，6.3 GB）；说明 https://github.com/multi-swe-bench/experiments
- **Open-SWE-Traces**：https://huggingface.co/datasets/nvidia/Open-SWE-Traces（已验证 CC-BY-4.0，约 380 GB）
- **SWE-smith**：
  - 任务 https://huggingface.co/datasets/SWE-bench/SWE-smith
  - 轨迹 https://huggingface.co/datasets/SWE-bench/SWE-smith-trajectories 、https://huggingface.co/datasets/Kwai-Klear/SWE-smith-mini_swe_agent_plus-trajectories-66k 、https://huggingface.co/datasets/liangzhidanta/claude-code-glm53-swesmith-trajectories
  - 最后这个数据集的数据卡自称 PRIVATE，并限制再分发，但在 Hugging Face 上实际是公开的、不用登录。使用前要注意授权问题。
- **AIDev**：https://huggingface.co/datasets/hao-li/AIDev（已验证 CC-BY-4.0）
  - arXiv 2606.28235 报告：精选子集里 8.3% 的仓库有多个 Agent 参与，最活跃的仓库里这一比例是 31.2%。子任务没能复算。
  - 能用的"坑"信号只有评审评论和后续的修补 commit。

### 不适合的数据（原因各一行）

- **VALVE**（arXiv 2609.32990）：用了 4 个 SWE-smith 仓库，每个约 1000 个任务的任务流，但**没有发布数据**，只能借鉴它的方法。
- **SWE-bench-CL**（https://github.com/thomasjoshi/agents-never-forget）：只是把任务重新排了顺序（django 50、sympy 50……共 273），没有轨迹。
- **EvoAgentBench、LoCoBench-Agent、Context-Bench**：没有轨迹，或者任务不是真实仓库。
- **OpenHands feedback**（https://huggingface.co/datasets/OpenHands/openhands-feedback）：只有 275 个会话，没有 repo 字段，内容多是玩具式的提示。
- **LiveSWEBench**（https://github.com/LiveBench/liveswebench）：仓库只有 92 KB，没看到轨迹。
- **Aider polyglot**：题目来自 Exercism，不是真实仓库，也没有公开日志。

---

## 三、用前三个候选测 A1 的方案

### 通用处理流程

1. **分析单元**：（仓库或任务环境 R，坑的签名 S）。
2. **统一格式**：用 letta-ai/trajectory 或 `harbor traces export` 转成 ATIF。每一步保留 Agent、模型、仓库、任务、工具、命令、观察结果、退出码或 ok 标志。
3. **识别失败**：
   - 退出码非 0，或者输出匹配 Traceback、ModuleNotFoundError、`command not found`、`No such file`、ImproperlyConfigured、`error:` 等模式。
   - 工具层面的错误（比如 str_replace 找不到要替换的原文）单独归为"Agent 特有的坑"，不算作仓库层面的坑。
4. **配对修复**：在之后的 k 步里，找一次成功的同类操作，依据是命令结构相似，或者跑的是同一个测试目标。失败命令和修复命令之间的差异，就是一条候选经验。例如"django 要用 `tests/runtests.py`，不要直接用 `pytest`"。
5. **签名归一化**：
   - 去掉路径（如 `/testbed` 和 `/workspace/django__django__3.0`）、行号、十六进制、数字和任务专有的名字。
   - 保留"异常类型 + 消息模板 + 命令结构"。
   - 用 Drain3 提取模板，再用嵌入向量加 LLM 合并同义签名，最后人工抽查。
6. **判断是否仓库特有**：计算提升度 lift = P(S|R) / P(S)，把只在少数仓库出现的签名和通用的坑（比如 sed 引号写错）分开。A1 关心的是前者。

### 指标

- **M1 跨 Agent 复发率**：仓库特有的签名里，至少出现在 2 个不同 Agent 中的比例。更严格的版本还要求至少来自 2 个不同的模型家族。按仓库做聚类 bootstrap，给出置信区间。
- **M2 可迁移暴露率（核心指标）**：Agent Y 在任务 t 上踩到签名 S，而另一个 Agent X 曾在**同一仓库的另一个任务 t′**（t′ ≠ t）上踩过 S 并且修好了。统计这类运行占多大比例，以及从失败到修复浪费了多少步和 token。
  - 必须要求 t′ ≠ t，因为同一任务上的重复有一部分是题目本身导致的。
- **M3 单 Agent 基线**：把 M2 里的 X 换成 Y 自己（不同任务），就是单 Agent 记忆本来就能解决的部分。A1 真正的增量价值，是"别的 Agent 有经验、自己没有"的那部分。
- **零模型**：在每个仓库内随机打乱 Agent 标签，检验跨 Agent 复发是否高于仅由出现频率决定的期望值。
- **M4 一句话经验能否预防**：用 LLM 判断"从 X 的修复里生成的一句经验，能否避免 Y 的失败"，并用 150–200 条人工标注来校准这个判断的准确度。最终要做回放实验：用 Harbor 把经验注入 Y 的提示后重跑，比较踩坑率、步数和成功率。
  - Harbor 已支持 claude-code、codex、gemini-cli、antigravity-cli、opencode、openhands、mini-swe-agent（https://github.com/harbor-framework/harbor/tree/main/src/harbor/agents/installed ），也有 swebench-verified、swebenchpro、swesmith 的适配器。
  - Codex CLI 可以接 API key 或任何兼容 OpenAI 格式的接口（SWE-bench Pro V2 的 `locked_codex` 就支持 `--ae OPENAI_API_BASE`），不需要 Codex 订阅。

### 样本量

- M1 要达到 ±5pp，大约需要 385 个仓库特有的签名簇。
- M2 按运行统计要达到 ±3pp，大约需要 1000 条轨迹。
- 校准 LLM 判断：150–200 对，精度约 ±7pp。

### 三个数据集的具体做法

| | A. SWE-Milestone-log | B. SWE-bench Verified（加上 Live 的同模型子集） | C. Terminal-Bench 2.0 |
|---|---|---|---|
| 分析单元 | 7 个仓库 × 35 次端到端运行 | django 的 231 个任务 × 至少 6 个 Agent（约 1,400 条）；sympy 75 个任务 | 89 个任务环境 × 约 10 个 Agent × 5 次 |
| 主要指标 | 先把长会话按里程碑切开，测 M2（跨 Agent、跨里程碑）和会话内的重复 | M2（同一仓库、跨任务、跨 Agent）；用 Live 的数据测"模型相同、Agent 不同"的 M1 | 只能测同一任务上的 M1，但可以用 5 次重复把随机噪声分离出来，而且环境类的坑多 |
| 工作量（粗估） | 1–2 周：先下载 1–2 个仓库的数据，原始格式未知 | 1–2 周：挑 8–12 个 JSON 格式的提交，各写一个解析器 | 2–4 人日出第一批数字：只有一份 220 MB 的 parquet，字段统一 |
| 主要风险 | 只有 7 个仓库；会话内的学习会干扰结论 | 容器事先配好了环境，配置类的坑少；模型可能记住了 django；多是 2024–25 年的旧模型 | 不是长期维护的仓库，没有项目约定；有截断和占位符问题 |

**建议顺序**：
1. 先用 C 快速判断值不值得继续。
2. 再用 B 在 django 上测跨任务的 M2。
3. 然后用 A 测最贴近 A1 的场景。
4. 同时申请 SWE-chat 的访问权限，看看真实世界里有没有多个 Agent 共用的仓库。
5. 最后用 Harbor 做回放实验。

### 可能让结论失真的因素

- **任务筛选偏差**：基准只保留"环境能跑、标准补丁能通过测试"的任务，恰好把环境坏掉的情况筛掉了。
- **同题诱导**：同一任务上的重复，不能说明仓库层面的经验有用。
- **Agent 和模型混在一起**：需要 Live 那种同模型的数据来拆开。
- **模型可能见过这些仓库**：会低估私有仓库里的坑。
- **日志保真度**：有截断、只有摘要、缺退出码、各家格式不一的问题。
- **榜单幸存者偏差**：提交上来的都是调好的最佳配置。
- **Agent 特有的坑不可迁移**：必须和仓库层面的坑分开统计。
- **离线数据测不了遵从度**：就算有了经验，Agent Y 会不会照做，只能靠回放实验。
- **许可问题**：SWE-bench experiments 和 SWE-bench Pro 的 S3 数据未声明许可，轨迹里还夹带第三方代码。
