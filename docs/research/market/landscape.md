# 跨 Agent 记忆插件：调研与计划

> 整理日期：2026-09-30；证据截至 2026-09-30
> 目标：做一个记忆插件，同时供 Claude Code、Codex、Pi、OpenClaw、Hermes 等不同的 Agent 使用，并且能自我进化、自我学习。
>
> **2026-10-08 说明**：第 1–10 节的调研事实仍然有效。**第 11 节"计划"和第 12 节"待决事项"已经过时**：
> - 计划以 [PRD v0.6](../../design/prd.md) 为准：第一版只做基础层（纯代码的如实转化 + 接力），记忆层放到第二版。
> - 第 12 节第 1、2 项已经定了：起步做 Claude Code、Codex，Pi 放到 P1；做成开源项目。
> - 第 12 节第 5 项"待核实的事实"里，Cursor 会加载 Claude Code 插件的 hooks，已经由 [native.md](../tech/native.md) 证实；其余几项转到 [问题清单](../../README.md)。

**调研方法**
- **基础材料**：《Agent 自进化与记忆体系调研报告》（没有收进本仓库）（证据截至 2026-09-29）。
- **第一路：各 Agent 的接入面。** 按 Agent 分 6 组并行查阅官方文档、仓库源码（`gh`）和 release 记录。以下四项另用 `gh` 单独复核过：仓库与版本、SEP-2640 的合并状态、Hermes `MemoryProvider` 的方法名、OpenClaw 的 `plugins.slots.memory`。
- **第二路：现有的跨 Agent 记忆方案。** 查了现有的跨 Agent 记忆项目、跨 Agent 学习、可移植格式、用户痛点和适配问题。stars 和 release 都是 2026-09-30 用 `gh api` 实时查询的。
- **标注**：【未验证】表示没有找到一手源码或文档；【推断】表示由已知事实推出、没有直接证据。

**阅读指南**
- 只看结论：先看第 0 节，再看第 10–12 节。
- 看竞品和选型：第 2–5 节。
- 动手做适配：第 6–9 节。

**术语**：文中的 harness 指 Agent 的运行框架，例如 Claude Code、Codex CLI、Pi。本文"Agent"和"harness"混用。

---

## 目录

- [0. 结论摘要](#0-结论摘要)
- [1. 与已有调研报告的关系](#1-与已有调研报告的关系)
- [2. 现有的跨 Agent 记忆项目](#2-现有的跨-agent-记忆项目)
- [3. 跨 Agent 学习与离线整理的现状](#3-跨-agent-学习与离线整理的现状)
- [4. 可移植性与交换格式](#4-可移植性与交换格式)
- [5. 用户痛点](#5-用户痛点)
- [6. 各 Agent 的接入面](#6-各-agent-的接入面)
- [7. 会话归一化工具与相关标准](#7-会话归一化工具与相关标准)
- [8. 跨 Agent 的适配问题](#8-跨-agent-的适配问题)
- [9. 对插件接入层设计的含义](#9-对插件接入层设计的含义)
- [10. 空白点与差异化定位](#10-空白点与差异化定位)
- [11. 计划](#11-计划)
- [12. 待决事项](#12-待决事项)

---

## 0. 结论摘要

1. **跨 Agent 记忆已经是红海。** Hindsight、claude-mem、agentmemory、memU、ECC、Mem0、Supermemory、Honcho、EverOS、TencentDB Agent Memory 等都已支持多个 Agent。"支持的 Agent 多""共享存储""后台合并"都不能当差异点。
2. **"在 A 里学、在 B 里用"已经有人做，但都是"共享一个存储，谁都能读"。** 没有人验证经验迁移到另一个 Agent 后是否真的有效。
3. **目前没有被广泛采用、又与 Agent 无关的记忆格式。** 事实上的分工是：指令用 AGENTS.md，程序性知识用 SKILL.md（agentskills.io），访问协议用 MCP。
4. **各 Agent 的接入能力差别很大，但有公共部分。** 所有 11 个目标 Agent 都支持 MCP 工具；多数支持会话开始注入、工具调用后观测、轮末观测和压缩前观测。会话结束事件普遍不可靠。
5. **不要把记忆写进 CLAUDE.md 或 AGENTS.md。** 多家 Agent 会交叉读取这两个文件（Pi、OpenCode、Hermes、DeepSeek Harness、Cursor 都读 CLAUDE.md），写进去会被重复加载。
6. **差异化定位：跨 Agent 的"经验编译器"。** 从所有 Agent 的会话里学习，验证通过后，按各家的上限编译成记忆包，在会话开始时注入。共有 4 个差异点，见第 10 节。
7. **计划分四个阶段。**
   - 阶段 0：验证前提，建评测集。
   - 阶段 1：做 Claude Code、Codex、Pi 三家的离线最小可用版。
   - 阶段 2：做自进化闭环。
   - 阶段 3：扩展到更多 Agent。
   - 详见第 11 节。

---

## 1. 与已有调研报告的关系

### 1.1 已有报告中直接适用的结论

| 结论 | 出处（报告章节） | 对本插件的含义 |
|---|---|---|
| 不设验证门控时，自进化的提升会被吐回去，甚至跌破起点。VALVE 中 Claude-4.6 不设门控时峰值 +5.6，最终 −6.5 | 2.5、2.9 | 经验晋升必须先过固定的验证面板 |
| 打乱任务顺序后，AWM、ReasoningBank 都低于不带记忆的基线（Salesforce 2608.18066） | 2.9 | 评测时要多次运行、打乱顺序，并始终和无记忆基线比较 |
| 零样本自写的 skill 平均让表现下降 8–12pp（SkillsBench） | 2.9 | 必须有外部反馈信号，才能产出 skill |
| 强模型演化出的技能给弱模型用，效果更好（WikiSkill：9B 用 27B 演化的技能得 70.2%，用自己演化的只有 63.4%） | 2.5、5.6 | 整理和提炼交给强模型离线做 |
| 用多个模型的轨迹对比出经验，再迁移给没参与的模型（ContraMem 2608.22533） | 2.3、5.6 | 同时用多个 Agent，天然就能拿到对比信号 |
| 失效的记录必须在检索层过滤掉；只删记录时，泄露率与不处理相同 | 2.15 | 撤销要真正生效，派生产物要重新生成 |
| 被投毒的技能库会像蠕虫一样自我传播（EVOMAL 2608.25776） | 2.5、2.14 | 共享之后，一个 Agent 被投毒会扩散到所有 Agent |
| subagent 默认拿不到主会话的记忆；记忆的可迁移性还没有通用格式 | 3.9、四 | 跨 Agent 的可迁移性是公认空白 |
| ACE 以单条规则为单位做增量更新，每条带 helpful / harmful 计数 | 2.3 | 可以直接用来维护经验条目 |

### 1.2 本次调研对已有报告的更正

- **letta-ai/trajectory**：v0.4.0（2026-09-25）只新增了 Slack 会话 schema，agent 的 trajectory-v1 格式没有变化；当前版本是 v0.4.3，同一天发布。报告 3.6 节把 v0.4.0 描述为"把不同 harness 的会话转成统一格式"，并不准确：统一格式是这个库原本就有的能力。
- **Hermes 的 MemoryProvider 接口**：随 v0.7.0（2026-04-03，PR #4623）上线，不是 v0.21.5 才有。v0.21.5 做的是把内置的记忆提供者迁出核心。
- **Gemini CLI 的 `save_memory` 移除时间**：本次查到约为 v0.40.0（2026-04），报告写的是 v0.44.0（2026-05），两者不一致，待核实。另外，Gemini CLI 的免费和个人档位已于 2026-06-18 停止服务，由 Antigravity CLI 接替。
- **Kimi CLI（Python，MoonshotAI/kimi-cli）已归档**：后继产品是 Kimi Code CLI（MoonshotAI/kimi-code，npm `@moonshot-ai/kimi-code` 2.1.1）。
- **Pi 的版本和 MCP 支持**：本次查到 Pi 已发布 v0.99.0（2026-09-29，起内建 MCP）和 v0.99.1。报告写的是"v0.87.1（09-22）之后没有新版本""不内置 MCP"，前后只差一周，版本号却跨度很大，建议复核。
- **会话存储格式**：OpenCode 和 OpenClaw 的会话已改存 SQLite，不再是 JSON/JSONL 文件；Hermes 也用 SQLite（`state.db`）。
- **Cursor 的 IDE Memories**：从 2.1（2025-11）起消失，文档页已改为指向 Rules。官方没有明确宣布，属于【推断】。
- **当前版本**：Claude Code 是 2.1.285（本机实测），Codex CLI 是 0.159.2。

---

## 2. 现有的跨 Agent 记忆项目

### 2.1 总表

表中缩写：CC = Claude Code，DSH = DeepSeek Harness。

| 项目 | 支持的 Agent | 集成方式 | 跨 Agent 共享什么 | 自进化 | 本地优先 | stars / 最新 release |
|---|---|---|---|---|---|---|
| **Mem0** | Python 共享核心：CC、Codex、Cursor、Kimi、Antigravity。TS：OpenClaw、OpenCode、Pi、DSH（Cordis）。Hermes 用独立的 memory-provider 插件。另有 Agent Plugins v1 便携包 | 每个 Agent 一个原生插件，放在 `integrations/*`，共享 `agent-plugin-core`。hooks 采集，后台 flush 写入。MCP 提供 `search_memories`，另带 6 个 skill。DSH 版挂在 `system-prompt/assemble` 和 `session/event` 两个扩展点上 | Python 宿主之间共享 repo 作用域（git remote 哈希成 `agent_id`，再加 `app_id`）和个人记忆。**TS 宿主"不继承 repo/dir/mine 合约"**，各用各的作用域 | 服务端做抽取、去重和冲突解决；没有技能学习 | 可以用开源版或自托管，但插件默认连它的云平台 | 66.3k；SDK v2.2.1 / ts-v3.3.1（2026-09-25） |
| （OpenMemory） | —— | 2026-07-29 的 PR #6530 把它移出 monorepo，归档到 `mem0ai/openmemory/openmemory-archive/`。这个 repo 现在改做**会话迁移 CLI**，可以在 CC、Codex、OpenCode 之间互相迁移（beta）。roadmap 里还有：迁移 Skills、MCP、CLAUDE.md / AGENTS.md，支持 OpenClaw / Hermes | 会话的导入导出，不是 MCP | 会话 | 无 | 是 | 76 |
| **Hindsight** | `hindsight-coding-agents` 包（npm v0.8.0）覆盖 20 个：CC、Codex、Dcode、opencode / opencode2、Kilo、Cursor CLI、Copilot CLI、Grok Build、Qwen、Kimi、Droid、ZCode、TraeCode、Antigravity CLI、Devin、Cline、pi、Prime Agent、DSH。Hermes、OpenClaw 等另有单独集成，总数 60 多个 | 共享一个"反思并注入"的核心，每个 Agent 一个薄入口：原生 hooks（SessionStart / UserPromptSubmit / Stop）、MCP、配套 skill。opencode 用原生插件，Dcode 走 Agent Plugin。服务端每个记忆库暴露一个 MCP 端点 `/mcp/{bank_id}/` | 默认记忆库是 **`coding-agent::{gitProject}`，与 Agent 无关，所有 Agent 共享**。内容包括 git 历史、会话，以及知识页面（架构、约定、进行中的工作） | 有：observations 在后台合并，带证据和证据计数；心智模型和知识页面在后台重写 | 有本地 daemon 和 docker | 42.9k；v0.10.2（2026-09-29） |
| **Supermemory** | 插件：CC、Codex、Cursor、OpenCode、OpenClaw、Muse Code，各自一个独立 repo。Hermes 内置了它作为 provider | 原生插件（hooks + 工具），另有托管 MCP `mcp.supermemory.ai/mcp` | 用户画像（静态和动态两部分）。Codex、CC、OpenCode 共用一个"collision-safe repository container"。OpenClaw 默认用 `openclaw_{hostname}`，不共享 | 自动抽取、处理矛盾、遗忘过期内容；没有 skill 学习 | server 可以自托管，但插件默认连云 | 31.0k；server-v0.0.8（2026-08-17） |
| **rohitg00/agentmemory** | CC、Codex（两者共用同一个插件目录）、Copilot CLI、OpenClaw、Hermes、pi、Cursor、OpenCode（22 个 hooks）、Devin。Gemini CLI、Cline、Goose 只接 MCP，Aider 走 REST | 一个本地 server（iii 引擎，端口 3111），加原生插件、hooks、54 个 MCP 工具和 17 个 skill | 同一个 server 上的所有 Agent 共享 observations、sessions、lessons 和程序性记忆层；可以用 `agentId` 隔离；与 MEMORY.md 双向同步 | 4 层合并（working → episodic → semantic → procedural，README 称为"sleep consolidation"），加上艾宾浩斯衰减和 lessons。`import-jsonl` 只支持 CC | 是，不配 API key 也能跑 | 29.0k；v0.9.29（2026-08-16） |
| **memU** | Codex、CC、Cursor、OpenClaw、Hermes、WorkBuddy、Cola、pi；另有 `memu-agent` 自动探测其他 Agent | **每个宿主一个 sidecar 二进制**：定时任务只读地挖掘宿主的会话日志（JSONL 或 SQLite），然后在宿主的指令文件（AGENTS.md / CLAUDE.md / SOUL.md）里加一段，让 Agent 回答前先执行 `retrieve`。不用 MCP，也不用 hooks | 共享 LLM wiki 和 skill Markdown。原话："What one host's sessions taught memU, another host retrieves." | 有："self-evolve jobs"由宿主 Agent 自己判断是新建 skill、修改已有 skill，还是什么都不做 | SQLite / Postgres，或用云 | 14.5k；v2.0.0-beta.0（2026-07-23，预发布），稳定版 v1.5.1 |
| **claude-mem** | CC、Codex、OpenCode、Cursor、Windsurf、Antigravity CLI（**已移除 Gemini CLI**）、OpenClaw gateway、Grok Bot。Hermes、Goose、omp 还在 roadmap（#2825） | 每个宿主一个安装器：CC / Codex / Cursor / Windsurf / agy 用 hooks，OpenCode 用插件；另有可配置 schema 的会话文件监听器（已内置 Codex JSONL 的 schema）；再加 MCP 搜索和一个本地 worker。在 Cursor 上把上下文写进 `.cursor/rules/*.mdc`，而不是用 hook 注入 | 所有宿主写进同一个 worker 数据库，用 `platform_source` 区分来源；内容是 observations 和摘要 | AI 压缩摘要；有一个 `<project>:dream` 命名空间【细节未验证】 | worker 在本地，但安装流程默认引导用户登录托管的 observer / CMEM Pro | 95.0k；v13.28.0（2026-09-26） |
| **ECC** | CC 稳定；Codex 有原生插件；Kimi 有引导安装；Cursor、OpenCode 是 beta；Gemini、Zed、Antigravity、Qwen、Hermes、OpenClaw、CodeBuddy、JoyCode 是实验级；Pi 只有薄适配层；Copilot 只放指令文件 | 按 Agent 放置文件的安装器加适配器。例如 Cursor 的 hook 适配器把它的 20 种事件转成 CC 格式，复用同一套脚本 | skills、rules、agents（程序性内容）。instincts 放在与 Agent 无关的 `~/.local/share/ecc-homunculus`。会话记忆默认按 Agent 分开，Cursor 要设 `ECC_AGENT_DATA_HOME=~/.claude` 才共享 | 有：CLv2 的 instincts 是 YAML，带 0.3–0.9 的置信度和 project / global 作用域，在 2 个以上项目出现就晋升为 global；`/evolve` 把 instincts 聚类成 skill，也能导入导出 | 是 | 269.7k；v2.2.1（2026-09-08） |
| **basic-memory** | CC、Codex、Cursor、VS Code、Claude / ChatGPT，以及任何 MCP 客户端；Obsidian 可以直接读写同一份文件 | 只有 MCP | Markdown 知识图谱 | 无 | 是 | 4.1k；v0.23.2（2026-08-25） |
| **engram** | CC（插件）、Pi、OpenCode、Gemini CLI、Codex、Cursor、VS Code、Antigravity、Windsurf | Go 单二进制，主要走 MCP stdio；`engram setup <agent>` 负责写各家的配置 | 由 Agent 主动写入的结构化 observation（What / Why / Where / Learned）；用 `topic_key` 就地更新；有会话交接；Git Sync 导出压缩块，可以跨机器共享 | 没有自动学习，靠 Agent 主动调用 `mem_save` | 是（SQLite） | 6.9k；v2.2.1（2026-09-25） |
| **Honcho** | CC、Codex、Cursor、DSH、OpenCode、OpenClaw（都是官方插件）；Hermes 上游内置；也支持任意 MCP 客户端 | 原生插件加 hooks。所有插件读同一个 `~/.honcho/config.json`，每个 Agent 一个 `hosts.<harness>` 配置块 | peer card、用户表征、会话摘要。**默认每个宿主一个 workspace**（例如 `claude_code`、`dsh`），要指向同一个 workspace 才会共享 | 服务端的 deriver 在后台推理，另有 dream 任务；做的是用户建模，不是 skill | 可以用 `honcho start` 本地起，或自托管 | 7.4k；v3.2.1（2026-09-24） |
| **ByteRover CLI**（原 Cipher） | 自称支持 22 个以上 Agent；Hermes 内置了它作为 provider | MCP 加规则文件 | `.brv` 上下文树（Markdown），带类似 git 的分支和合并 | curate 操作要人工审阅，没有自动进化 | 是 | 5.0k；3.16.1（2026-05-27）。**repo 已归档**（最后 push 于 2026-06-25），许可证是 Elastic 2.0 |
| **Letta Code** | 本身就是一个 Agent。通过 `@letta-ai/trajectory` 读 CC、Codex、Hermes、OpenClaw、OpenHands、Deep Agents 的会话；能安装 ClawHub 和 Hermes Skills Hub 上的 skill | `/init` 时依次执行 `letta trajectories detect/export`，把历史切成若干批，交给只读子 agent 分析，结果写进 MemFS | **单向**：其他 Agent 的历史导入到 Letta agent | 有：memory block 学习、skill 学习、`/sleeptime` 做 dreaming | MemFS 是本地 git，默认用 Letta Cloud | 3.5k；v0.33.8（2026-09-29） |
| **EverOS** | DSH、Hermes、OpenClaw、CC（CC 还在预发布）、Dify。配套的 EverMe CLI 覆盖 CC、Cursor、Codex、Kimi、Hermes、OpenCode、OpenClaw | 宿主插件自动走 recall → capture → seal；EverMe 用 hooks 加 MCP resource `mem://profile` | 用户的 episodes / profile 和 Agent 的 cases / skills 分开存。官方原话："same store serves every host, **partitioned per app**"，即默认按应用分区 | 有：离线记忆演化，合并 episode 簇，精炼 profile 和 skills | 是（Markdown + SQLite + LanceDB） | 13.3k；v1.4.1（2026-09-24） |
| **TencentDB Agent Memory** | DSH、CC、Codex、CodeBuddy、WorkBuddy、Hermes、OpenClaw、OpenCode（v2.0.1 新增了 OpenCode、DSH、Codex、WorkBuddy） | **LLM API 代理**：只改 base URL。官方原话："No plugin, hook, or MCP server is required" | Chat Memory（L0–L3）、Skill（带版本、触发边界和验证规则）、Wiki、CodeGraph。权限分 private / team / restricted，可以把资产"装配"给指定 Agent | 有：从会话和工具调用里自动抽 Skill，也能导入历史会话做冷启动 | 自托管 | 27.5k；v2.0.1（2026-08-25），v2.0.2-beta.3（2026-09-21） |

### 2.2 清单以外、和跨 Agent 直接相关的项目

- **huggingface/funes**（494 star，v1.4.0，2026-09-26）：把 CC、Codex、pi、Hermes 的会话索引进同一份记忆，用自己的 turns JSONL 格式。
- **AVIDS2/memorix**（817 star，v1.9.7）：通过 MCP、rules、hooks 覆盖约 18 个 Agent。DeepSeek Harness 官方文档列出的三个记忆 MCP 之一。
- **kenn-io/agentsview**：本次调研的 11 个 Agent 全部支持，包括 DeepSeek Harness、Kimi、Qwen，以及 OpenClaw 和 OpenCode 的 SQLite。形态是本地 SQLite 归档 + 文件监听 + MCP server。未发布的变更里新增了"AgentsView Memory"（MCP 召回 + 出错时直接放行、不阻断会话的 SessionStart hook）。**这是一个需要持续关注的竞品。**
- **letta-ai/trajectory**（264 star，v0.4.3）：会话格式归一化库，见第 7 节。

### 2.3 来源

- Mem0：[agent-plugin-core README](https://github.com/mem0ai/mem0/tree/main/integrations/agent-plugin-core)，[PR #6530](https://github.com/mem0ai/mem0/pull/6530)，[mem0ai/openmemory](https://github.com/mem0ai/openmemory)
- Hindsight：[coding-agents README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/coding-agents)
- Supermemory：[README](https://github.com/supermemoryai/supermemory)，[codex-supermemory](https://github.com/supermemoryai/codex-supermemory)
- agentmemory：[README](https://github.com/rohitg00/agentmemory)
- memU：[README](https://github.com/NevaMind-AI/memU)
- claude-mem：[plan-23 / #3611](https://github.com/thedotmack/claude-mem/issues/3611)
- ECC：[README](https://github.com/affaan-m/ECC)，[CLv2 SKILL](https://github.com/affaan-m/ECC/tree/main/skills/continuous-learning-v2)
- engram：[README](https://github.com/Gentleman-Programming/engram)
- Honcho：[README](https://github.com/plastic-labs/honcho)
- EverOS：[plugins](https://github.com/EverMind-AI/plugins)，[EverMe](https://github.com/EverMind-AI/EverMe)
- TencentDB：[README](https://github.com/TencentCloud/TencentDB-Agent-Memory)，[v2.0.1](https://github.com/TencentCloud/TencentDB-Agent-Memory/releases/tag/v2.0.1)
- Letta Code：[initializing-memory skill](https://github.com/letta-ai/letta-code/blob/main/src/skills/builtin/initializing-memory/SKILL.md)
- funes：[repo](https://github.com/huggingface/funes)
- agentsview：[repo](https://github.com/kenn-io/agentsview)

---

## 3. 跨 Agent 学习与离线整理的现状

**结论：有，但都是"共享一个存储，谁都能读"的模式，没有人验证迁移后是否真的有效。**

### 3.1 明确做到"在 A 里学、在 B 里用"的项目

- **memU v2**：做得最直接，粒度到 skill。从任意宿主的日志里蒸馏 skill，任意宿主都能检索到。蒸馏由宿主 Agent 自己完成，`MemoryService` 本身不调用 LLM。
- **Hindsight**：在"信念"这一层**有意跨 Agent 合并**。
  - 默认 `observationScopes: "shared"`。文档给的理由：如果按 Agent 分开，同一个 repo 会"grow two parallel sets of beliefs … each blind to the other"；而且"Which agent happened to be typing does not change whether a convention or a decision is true"。
  - 用 `--import-conversations` 回填历史时，只有 CC、Codex、DSH、pi、Prime Agent 能靠会话里记录的 cwd 准确归到对应 repo。
  - opencode、Kilo、Cursor、Cline、Copilot、Devin 的历史存在内部 SQLite 里，schema 没有版本号，所以直接跳过。
- **其他共享存储的项目**：agentmemory（lesson 级）、TencentDB（skill 级，走代理）、Supermemory（共享 repo container）、Mem0（只在 Python 宿主之间共享）、Honcho（要配成同一个 workspace）。

### 3.2 有没有跨 Agent 的离线整理（dreaming）

- **Hindsight**：同一个记忆库里所有 Agent 写入的文档，会在后台持续合并成 observations；知识页面按 `mental_model_min_refresh_interval_seconds` 周期重写。这是最接近"跨 Agent dreaming"的做法，但它是增量合并，不是把会话拿出来重放。
- **Letta Code 的 `/init`**：一次性分析多个 Agent 的历史。
  - 按约 200KB 或 20 个会话切成一批，交给子 agent 分析，优先用 `deepseek-v4.1-flash`。
  - 它专门提醒：harness 注入的 system-reminder 文本不是用户说的话。
  - `/sleeptime` 的 dreaming 似乎只处理 Letta 自己的会话【未完全验证】。
- **letta-ai/trajectory**：底层设施，描述里写明"designed … for memory formation, dreaming, search"，详见第 7 节。
- **Codex 原生也做了**：见 [`external-agent-migration/src/memory_import.rs`](https://github.com/openai/codex/blob/main/codex-rs/external-agent-migration/src/memory_import.rs)。
  - 它把 CC 的 `~/.claude/projects/*/memory/*.md` 复制到 `~/.codex/memories/extensions/external_agent_import/`，再调用 `enqueue_global_consolidation`，触发第二阶段的合并子 agent。
  - 内置规则写着："Treat imported content as source material, not authoritative instructions"。
  - 这是单向、一次性的导入。
- **只处理自家会话的**：
  - memU 按宿主分别跑定时任务。
  - Honcho 的 dream 在多个宿主共用一个 workspace 时，理论上就是跨 Agent 的【推断】。
  - OpenClaw 自带的 dreaming（light / deep / REM）、Codex 的两阶段整理、CC 的 auto memory，都只处理本 Agent 的会话。

---

## 4. 可移植性与交换格式

**结论：目前没有被广泛采用、又与 Agent 无关的"记忆"格式。** 事实上的分工是：

| 内容 | 事实标准 |
|---|---|
| 指令 | AGENTS.md |
| 程序性知识 | SKILL.md（agentskills.io） |
| 访问协议 | MCP。MCP 本身没有记忆原语，[memorywire](https://arxiv.org/pdf/2606.01138) 打算以 MCP 扩展的形式提出 |
| 用户偏好 | 粘贴一段文本摘要 |

### 4.1 指令层和打包层

- **AGENTS.md**
  - Claude Code 从 2.1.277（2026-09-18）开始支持，规则是**同目录没有 CLAUDE.md 时才读 AGENTS.md**（[The Register](https://www.theregister.com/ai-and-ml/2026/09/18/anthropic-decides-to-support-openais-markdown-instructions-spec/5297588)）。
  - 有[博客](https://blog.szypowi.cz/p/claude-code-reads-agents.md-only-when-telemetry-is-on/)发现这个功能受远程开关 `tengu_agents_md_mod` 控制，设了 `DISABLE_TELEMETRY` 就会静默不加载；另有用户评论说 2.1.281 之后已修复【未验证】。
- **`.agents/skills/`**：Codex 和 Cursor 都会读；Claude Code 仍然只读 `.claude/skills`（[#16345](https://github.com/anthropics/claude-code/issues/16345)、[#31005](https://github.com/anthropics/claude-code/issues/31005) 仍未关闭）。
- **[Agent Plugins v1](https://agent-plugins.org/specification)**（1.0.0 正式版，1.1.0 是工作草案）
  - 只标准化了 skills 和 MCP 两类组件，hooks 只能作为客户端扩展，所以 Mem0 的便携包"has no lifecycle hooks"。
  - 可移植的部分只有 `plugin.json`、`skills/`、`mcp.json`。
  - 接受它的客户端：Codex、Cursor、Hermes、OpenClaw、Qwen。**不接受**：Claude Code、Gemini、OpenCode、Pi、DeepSeek Harness。
- **agentskills.io 与 SEP-2640**：见第 7.3 节。

### 4.2 会话 / 轨迹层

- [ATIF v1.7](https://www.harborframework.com/docs/agents/trajectory-format)（Harbor）
- trajectory-v1（letta-ai/trajectory）
- funes 的 turns JSONL
- Hindsight 的 `--conversations` 交换文件
- claude-mem 的 `transcript-watch.json` schema

### 4.3 记忆交换提案（采用度都很低）

- [MacPaw Portable Memory](https://github.com/MacPaw/portable-memory)（2026-07，3 star）：`.mem` 目录由 JSONL、manifest、CHECKSUMS 和 tombstones 组成；记录类型里有 procedure 和 preference；能从 OpenAI、Claude、Mem0 的导出文件里导入。
- [MIF](https://github.com/modeled-information-format/MIF)（13 star）：JSON-LD 加 Markdown，带 W3C PROV 溯源。
- [PAM](https://portable-ai-memory.org/spec/v1.0/)
- [W3C AI Agent Memory Interop CG](https://www.w3.org/community/ai-agent-memory-interop/2026/07/16/version-1-0-charter-adopted-ai-agent-memory-interoperability-community-group/)：2026 年通过章程。
- 有[文章](https://dev.to/stantyan/i-tested-7-ai-memory-products-for-portability-all-7-lock-you-in-31pm)评价："a format which only one product writes is not portability"。

### 4.4 厂商自带的迁移工具

- **`hermes claw migrate`**（[文档](https://hermes-agent.nousresearch.com/docs/guides/migrate-from-openclaw)）：把 OpenClaw 的 MEMORY.md、USER.md 和每日笔记合并进 Hermes，以 `§` 分隔并去重；SOUL.md 直接复制；有 `--preset user-data` 选项。反方向是 `openclaw migrate hermes`，以追加方式写入。
- **Codex `/import`**（[说明](https://codex.danielvaughan.com/2026/05/13/codex-cli-agent-migration-system-import-claude-code-sessions-skills-config/)）
  - 迁移内容：CLAUDE.md 改名为 AGENTS.md；skills 移到 `.agents/skills`；最近 30 天的会话导入为 rollout；迁移 MCP 配置；hooks 只迁 command 类型。单向。
  - 引入这个功能的版本说法不一，在 0.128 到 0.140 之间；0.147 起也能导入 Cursor 的 skills。
- **Claude**：`claude.com/import-memory`，2026-03 推出。做法是让旧助手生成一段文本摘要，再粘贴过来。
- **Gemini**：[2026-03-26 推出](https://9to5google.com/2026/03/26/gemini-import/)。聊天记录用 zip 上传，记忆同样靠提示词生成摘要。

---

## 5. 用户痛点

- **HN**（[49760187](https://news.ycombinator.com/item?id=49760187)）：
  - "We have a CLAUDE.md file whose only content is 'please read .agents/agents.md'"
  - "I had to maintain duplicate files or rely on symlinks…"
- **Claude Code [#6235](https://github.com/anthropics/claude-code/issues/6235)**：5,187 个 👍，2026-08-17 关闭。
- **Claude Code [#31005](https://github.com/anthropics/claude-code/issues/31005)**："only resolves half of this request … `.agents/skills/` … remains unaddressed"（2026-09-28）。
- **Claude Code [#16345](https://github.com/anthropics/claude-code/issues/16345)**："sync tools, symlinks … duplicate content … drift, conflicts, duplicate search results"。
- **Codex [#7138](https://github.com/openai/codex/issues/7138)**：AGENTS.md 超过 32 KiB 会被**静默截断**。
- **[iranti](https://www.iranti.dev/blog/claude-code-codex-shared-memory)**："Then you switch to Codex — and it starts blank." / "When you switch tools, you're the context bridge."
- **[OpenMemory README](https://github.com/mem0ai/openmemory)**："Developers feel locked in to their primary harness"。
- **TencentDB [#1092](https://github.com/TencentCloud/TencentDB-Agent-Memory/issues/1092)**：订阅套餐要求直连模型厂商，走不了代理，只能改成用 hook 旁路直连 MemoryCore。
- **claude-mem [#3608](https://github.com/thedotmack/claude-mem/issues/3608)**：写路径和读路径计算"项目身份"的规则不一致，结果是"memory scattered across five keys"。

---

## 6. 各 Agent 的接入面

### 6.1 总表

图例：✓ 支持，✗ 不支持，~ 部分支持或有条件。

| Agent（版本） | ① 插件机制 | ② 注入：启动 / 每轮或每次调用 / 子代理 | ③ 观测：工具 / 轮末 / 压缩 / 会话文件路径 | ④ 会话存储 | ⑤ 工具暴露 | ⑥ 原生记忆（能否关） | ⑦ Skills 目录 / SEP-2640 | ⑧ 后台任务 |
|---|---|---|---|---|---|---|---|---|
| **Claude Code** 2.1.285 | `.claude-plugin/plugin.json` + `hooks/hooks.json` + `.mcp.json` + `skills/`；有 marketplace；没有记忆专用的插件类型 | `SessionStart` ✓ / `UserPromptSubmit` ✓（另有 Pre/PostToolUse、PostToolBatch）/ `SubagentStart` ✓，都用 `additionalContext` | PostToolUse ✓ / Stop（带 `last_assistant_message`）✓ / PreCompact + PostCompact（带 `compact_summary`）✓ / 有 `transcript_path` 和 `agent_transcript_path` ✓；SessionEnd 默认只有 1.5 秒 | `~/.claude/projects/<slug>/<sid>.jsonl`，按 uuid / parentUuid 组成树；子代理在 `<sid>/subagents/agent-*.jsonl`；默认 30 天清理 | MCP stdio / http / sse / ws；没有原生工具 API | CLAUDE.md + auto memory（`memory/MEMORY.md`）；可用 `autoMemoryEnabled:false` 关闭 | `.claude/skills`、`~/.claude/skills`（**不读** `.agents/skills`）/ ✗ | 只有会话内的 Cron 和 `/loop`（7 天过期），需要自建 daemon |
| **Codex CLI** 0.159.2 | `.codex-plugin/plugin.json`；**也能装 `.claude-plugin` 和 Agent Plugins 1.0**；hook 要先通过信任审核 | `SessionStart` ✓ / `UserPromptSubmit` ✓（另有 Pre/PostToolUse）/ `SubagentStart` ✓；注入上限约 2.5k token | PostToolUse ~（不覆盖 WebSearch 等托管工具）/ Stop ✓ / Pre/PostCompact（没有摘要字段）✓ / 有 transcript_path ✓（官方称"不是稳定接口"）；SessionEnd 最长 3 秒 | `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`，每行 `{timestamp,type,payload}`；.zst 压缩和 SQLite 迁移的代码已经在了，默认未开启 | MCP stdio / streamable HTTP；原生工具（`dynamicTools`）只对 app-server 嵌入方开放 | AGENTS.md + memories（**默认关**，自带两阶段整理）；`~/.codex/memories/extensions/` 可以挂接（未写入文档） | `.agents/skills`、`~/.agents/skills`、`.codex/skills` / ✗（issue #48000） | 没有调度器，需要 daemon，或用 cron 跑 `codex exec` |
| **Pi** 0.99.1 | TS 扩展，工厂函数 `(pi: ExtensionAPI)`；放在 `~/.pi/agent/extensions` 或 `.pi/extensions`；`pi install npm:\|git:`；`/reload` 热重载 | `pi.sendMessage(…,{deliverAs:"nextTurn"})` ✓ / `before_agent_start` 每轮触发 ✓，`context` 每次 LLM 调用前触发 ✓ / 没有内建子代理，官方示例起的子进程会加载全局扩展 ~ | `tool_call` / `tool_result` ✓ / `turn_end`、`agent_end` ✓ / `session_before_compact`（可以替换摘要）✓ / `ctx.sessionManager.getSessionFile()` ✓ | `~/.pi/agent/sessions/--<cwd>--/<ts>_<uuid>.jsonl`，v3 格式，id / parentId 组成树，分支存在同一个文件里 | `pi.registerTool` 原生注册；MCP stdio / HTTP（默认 codemode，要设 `exposure:"direct"`） | **无**（只读 AGENTS.md / CLAUDE.md） | `~/.pi/agent/skills`、`.pi/skills`、`.agents/skills` / ✗ | 没有，可以在 `session_start` 里起定时器，或自建 daemon |
| **OpenClaw** 2026.9.6 | `openclaw.plugin.json`；**`kind:"memory"` 独占 `plugins.slots.memory` 槽位**；另有 `slots.contextEngine` 槽位；`openclaw plugins install clawhub:\|npm:` | 通过 `before_prompt_build` 注入（prependContext / appendSystemContext 等）/ 每轮 ✓ / 子代理：hook 在 Gateway 全局生效，另有 `prepareSubagentSpawn` ~ | before/after_tool_call ✓ / `agent_end`、`llm_output` ✓ / before/after_compaction（只能观测）✓ / 没有路径（数据在 SQLite） | `~/.openclaw/agents/<id>/agent/openclaw-agent.sqlite`（`transcript_events` 表）；`sessions/` 下有 JSONL 归档 | `api.registerTool` + MCP stdio / SSE / HTTP | MEMORY.md + 每日笔记 + **dreaming（默认开）** + memoryFlush + Skill Workshop；可以换掉槽位，也可以逐项关闭 | `<ws>/skills`、`.agents/skills`、`~/.openclaw/skills`；ClawHub / ✗ | **`api.registerService` + cron / heartbeat ✓** |
| **Hermes** 0.21.5 | **`MemoryProvider` 插件**，同时只能有一个外部 provider，与内建记忆并存，用 `memory.provider` 选择；另有通用插件 `register(ctx)` | `system_prompt_block()` ✓ / `prefetch()` 的结果包成 `<memory-context>` 附在用户消息上，每轮 ✓ / 子代理 ✗（`skip_memory=True`） | `post_tool_call` ✓ / `sync_turn`（完整消息）✓ / `on_pre_compress`（v2 可以阻塞压缩）✓ / 没有路径 | `~/.hermes/state.db`（SQLite + FTS5）；`hermes sessions export --format trace` 可以导出成 Claude Code 的 JSONL 格式 | provider 的 `get_tool_schemas` / `handle_tool_call` + MCP stdio / HTTP | MEMORY.md / USER.md + 后台 review + curator；`memory_enabled`、`user_profile_enabled` 设为 false 可以关闭 | `~/.hermes/skills`；`.agents/skills` 需要信任 / ✗ | **内建 cron ✓**（gateway 每 60 秒检查一次） |
| **Gemini CLI** 0.62.0 | 扩展：`gemini-extension.json` + `hooks/hooks.json` + `skills/`；`gemini extensions install` | `SessionStart` ✓ / `BeforeAgent` ✓，`BeforeModel` 可以改写整个 `llm_request` / 子代理只能靠 BeforeModel【未验证】 | AfterTool ✓ / AfterAgent ✓ / PreCompress（只读）✓ / 有 transcript_path ✓；**SessionEnd 不等待** | `~/.gemini/tmp/<slug>/chats/session-*.jsonl`；**默认 30 天自动删除** | MCP stdio / SSE / HTTP；没有原生工具 | 分层 GEMINI.md + 项目 MEMORY.md（模型直接改文件）+ Auto Memory（实验性，默认关）；**没有统一的关闭开关** | `.gemini/skills` 或 `.agents/skills`（用户级和项目级都有）/ ✗ | 没有，可以仿照 Auto Memory 在 SessionStart 时拉起后台进程 |
| **OpenCode** 1.18.33 | TS 插件返回 `Hooks`；放在 `.opencode/plugins`、`~/.config/opencode/plugins`，或在 `opencode.json` 的 `"plugin"` 里列 npm 包；没有 marketplace | 没有启动专用的 hook（用 `session.created` + `experimental.chat.system.transform`）~ / `chat.message`、`system.transform` 每次调用都触发 ✓ / 子会话在同一进程内【推断】~ | `tool.execute.after` ✓ / `session.status` 变为 idle ✓ / `experimental.session.compacting`（可以加上下文、换提示词）✓ / 没有路径（用 SDK 的 `client`） | `~/.local/share/opencode/opencode.db`（SQLite，表 session / message / part） | 插件导出 `tool`、`.opencode/tools/*.ts`、MCP local / remote | **无**（读 AGENTS.md，没有时回退读 CLAUDE.md） | `.opencode/skills`、`.claude/skills`、`.agents/skills` 及对应的全局目录 / ✗ | 没有，可以在常驻 server 进程里跑定时器 |
| **Cursor** IDE 与 cursor-agent | `.cursor-plugin/plugin.json`（2.5 起）、`hooks.json`（`~/.cursor`、`.cursor`）；**会强制加载 `.claude/settings*.json` 里的 hooks** | `sessionStart` 的 `additional_context` ✓ / **`beforeSubmitPrompt` 不能注入 ✗**，只能靠 `postToolUse` 的 `additional_context` / `subagentStart` ✗ | postToolUse ✓ / stop、afterAgentResponse ✓ / preCompact（只读）✓ / 有 transcript_path ✓；sessionEnd 不等待返回 | `~/.cursor/projects/<p>/agent-transcripts/<uuid>/<uuid>.jsonl`（格式类似 Claude Code，**经常缺 tool_result**）；IDE 的数据在 `state.vscdb` | MCP stdio / SSE / HTTP；没有原生工具 | Memories 已移除【推断】；用 rules / AGENTS.md；云端 Automations 另有 memory 工具 | `.agents`、`.cursor`、`.claude`、`.codex` 四处的 skills / ✗ | 本地没有；云端 Automations 有 cron，但看不到本地会话 |
| **DeepSeek Harness** 0.2.0-rc.2 | Cordis npm 插件 + YAML patch；`dsh plugin --profile p add`；**能直接运行 Claude Code / Codex 的 hooks.json** | `agent/created` ✓ / `agent/pre-step` ✓ / `subagent/start` ✓；另有 systemPrompt section | `tools/post-execute` ✓ / `agent/turn-stopping` ✓ / `compaction/*` 事件 ✓ / 走 CC 桥时 transcript_path 为空 | `~/.dsh/sessions/--<cwd>--/<sid>/session.vN.jsonl.zstd`；**默认上传给 DeepSeek** | 原生工具插件 + MCP stdio / HTTP | **无** | `.dsh/skills`、`.agents/skills`、`~/.dsh/skills`；不在 agentskills.io 采用者名单上 / ✗ | `packages/schedule`（提醒式）；插件本身是常驻服务 |
| **Kimi Code** 2.1.1 | `kimi.plugin.json`（字段 systemPrompt / hooks / mcpServers / skills）；`/plugins install` | 插件的 `systemPrompt` 是静态的，SessionStart 只能观测 ~ / `UserPromptSubmit` 的 stdout 会进上下文 ✓ / SubagentStart 只能观测 ✗ | PostToolUse ✓ / Stop ✓ / Pre/PostCompact ✓ / **没有路径**（要查 `session_index.jsonl`） | `~/.kimi-code/sessions/<wdkey>/<sid>/agents/main/wire.jsonl` | 只有 MCP | 无 | `~/.kimi-code/skills`、`.agents/skills` / ✗ | 只有会话内的 SessionHeartbeat（60 秒） |
| **Qwen Code** 0.24.7 | `qwen-extension.json`；**能装 Claude Code 插件、Gemini 扩展和 Agent Plugins** | 与 Claude Code 的 hooks 兼容：SessionStart / UserPromptSubmit / SubagentStart 都支持 `additionalContext` ✓✓✓ | 与 Claude Code 的事件全套兼容，另有 PostCompact；有 transcript_path ✓ | `~/.qwen/projects/<cwd>/chats/<sid>.jsonl`（类似 Claude Code 的树结构） | MCP | QWEN.md + auto-memory + auto-dream（**默认开**，可以关） | `~/.qwen/skills`、`.qwen/skills`、`.agents/skills`（最后一项只部分验证）/ ✗ | 只有会话内的 cron |

### 6.2 分 Agent 说明

#### Claude Code 2.1.285

本机 `claude --version` 是 2.1.285，本地会话文件的结构也实地核对过。

- **插件**
  - 目录结构：`.claude-plugin/plugin.json`，加上 `skills/`、`agents/`、`hooks/hooks.json`、`.mcp.json`、`bin/`、`monitors/`（实验性）。
  - 安装：先 `/plugin marketplace add`，再 `claude plugin install x@mkt`。
  - 代码目录 `${CLAUDE_PLUGIN_ROOT}` 在 `~/.claude/plugins/cache/...` 下，每个版本都会变；持久数据要放在 `${CLAUDE_PLUGIN_DATA}`（`~/.claude/plugins/data/<id>/`）。
  - 插件根目录下的 CLAUDE.md 不会被加载。
- **注入**
  - 统一用 `hookSpecificOutput.additionalContext`，内容以 system-reminder 的形式出现。
  - `SessionStart` 的 matcher 是 `startup|resume|clear|compact|fork`，压缩后会重新执行。
  - 超过 10k 字符的内容会存到磁盘，只注入 2k 字符的预览。
- **观测**
  - 公共字段：`session_id`、`transcript_path`、`cwd`、`prompt_id`；在子代理里还有 `agent_id` / `agent_type`。
  - 取最终回复应该用 `Stop.last_assistant_message`，因为会话文件的写入可能滞后。
  - SessionEnd 默认只给 1.5 秒，可以用 `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` 调到 60 秒。
  - 另有 `InstructionsLoaded` 事件；handler 类型有 command / http / mcp_tool / prompt / agent，支持 `async`。
- **存储**
  - 本地实测的记录类型：user、assistant、attachment、system（turn_duration、away_summary）、file-history-snapshot、queue-operation、ai-title、last-prompt、cost-state、continued-in。
  - `cleanupPeriodDays` 默认 30 天。
- **原生记忆**
  - CLAUDE.md 分 managed / user / project / local 四级，另有 `.claude/rules`。据文档，v2.1.277 起只在没有 CLAUDE.md 时读 AGENTS.md。
  - auto memory 每个会话只加载 MEMORY.md 的前 200 行或 25KB。
  - 关闭或调整：`autoMemoryEnabled:false`、`CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`、`autoMemoryDirectory`（改存储位置）、`claudeMdExcludes`（排除指定文件）。
- **来源**：https://code.claude.com/docs/en/hooks ，/plugins-reference ，/memory ，/skills ，/sessions

#### Codex CLI 0.159.2

Codex 的文档已从 developers.openai.com 308 跳转到 learn.chatgpt.com。

- **插件**
  - 清单是 `.codex-plugin/plugin.json`（字段 skills / mcpServers / hooks / commands）。
  - 命令：`codex plugin marketplace add owner/repo`、`codex plugin add`。
  - **也接受 `.claude-plugin/marketplace.json` 和 `plugin.json`，以及 Agent Plugins 1.0。**
  - hook 同时拿到 `PLUGIN_ROOT` 和 `CLAUDE_PLUGIN_ROOT` 两个环境变量；非 managed 的 hook 必须按哈希逐个信任。
- **hooks**
  - 配置在 `~/.codex/hooks.json`，或 `config.toml` 的 `[[hooks.<Event>]]` 里。
  - 只执行 command 和 mcp_tool 两类 handler；prompt / agent 类型能解析，但会被跳过。
  - SessionStart 的 matcher 是 `startup|resume|clear|compact`。
  - 注入上限 `additionalContextLimit` 约 2.5k token。
  - 在子代理里，`session_id` 是父会话的 id。
  - SessionEnd 最长 3 秒，`reason` 固定为 `other`；没有客户端连接、空闲 30 分钟后也会触发。
- **存储**
  - 行类型有 session_meta、response_item、event_msg、turn_context、compacted、token_usage_record 等（见 `codex-rs/history/src/rollout_payload.rs`）。
  - 有一个默认关闭的开关 `local_thread_store_compression`，开启后会把 7 天前的文件压成 `.jsonl.zst`。读取器现在就应该兼容 .zst。
- **原生记忆**
  - `[features] memories` 默认关闭。
  - 开启后，启动时跑两阶段流程：先逐个会话抽取，再由整理子代理维护 `~/.codex/memories/`（MEMORY.md、memory_summary.md、rollout_summaries/、skills/），相当于内建的 dreaming。
  - 源码里有一个未写入文档的挂接点：`~/.codex/memories/extensions/<name>/instructions.md` + `resources/*.md`。整理子代理必须读取这里；删除资源会触发遗忘。Codex 自己就是用它导入 Claude Code 的 MEMORY.md。
- **参考实现**：`external-agent-migration` crate 能解析 Claude Code 和 Cursor 的会话 JSONL（`records_cla.rs`、`records_cur.rs`），可以直接借鉴来写格式转换。
- **来源**：https://learn.chatgpt.com/docs/hooks ，https://github.com/openai/codex（`codex-rs/memories/README.md`、`ext/skills/src/host_roots.rs`）

#### Pi 0.99.1（earendil-works/pi）

- **扩展**
  - 用 jiti 加载，不需要构建。
  - 官方规则：定时器和 socket 在 `session_start` 里启动，在 `session_shutdown` 里清理，清理要幂等。
- **注入**
  - `before_agent_start` 返回 `{message?, systemPrompt?}`，官方推荐改 `systemPromptOptions` 里的 sections。
  - `context` 在每次 LLM 调用前触发，可以返回 `{messages}`。
- **观测与压缩**
  - `session_before_compact` 可以返回 `{cancel}`，也可以返回自定义的 `{compaction}`。
  - `pi.appendEntry()` 写入 `custom` 条目，不发给模型；`custom_message` 条目会发给模型。
- **存储**：v3 JSONL。第一行是 `{"type":"session","version":3,...}`，其余条目类型有 message、compaction、branch_summary、custom、custom_message 等。
- **MCP**
  - v0.99.0 起内建，支持 stdio 和 streamable HTTP，不支持 SSE。
  - 工具名是 `mcp__<server>__<tool>`。
  - 默认是 codemode，模型通过 QuickJS 脚本调用工具；必须设 `"exposure":"direct"`，工具才会作为普通工具暴露。
- **原生记忆**：没有。但 Pi 会读 CLAUDE.md，写进 CLAUDE.md 的记忆会被重复加载。
- **来源**：https://github.com/earendil-works/pi/tree/main/packages/coding-agent/docs（extensions.md、session-format.md、mcp.md、skills.md），https://github.com/earendil-works/pi/releases/tag/v0.99.0

#### OpenClaw 2026.9.6

- **记忆槽位**（已核对 `docs/plugins/manifest.md`）
  - 清单里声明 `"kind": "memory"`，由 `plugins.slots.memory` 选中。默认是 `memory-core`，设为 `"none"` 表示不用记忆插件。
  - 插件调用 `api.registerMemoryCapability()`，独占地提供 memory_search / memory_get。
  - 另有 `plugins.slots.contextEngine` 槽位；`registerContextEngine` 的生命周期是 ingest / assemble / compact / afterTurn / prepareSubagentSpawn。
  - 不独占的附加接口：`registerMemoryPromptSupplement`、`registerMemoryCorpusSupplement`。
- **hooks**（`api.on`）
  - `before_prompt_build`，推荐带上 `{requiresToolAuthority:true}`。
  - `after_tool_call`、`llm_input` / `llm_output`、`agent_end`、`before_compaction` / `after_compaction`、`session_end`（总共只有 2 秒排空时间）。
  - 非内置插件要设 `plugins.entries.<id>.hooks.allowConversationAccess:true` 才能访问会话内容。
  - 注意：不同运行时（内嵌的 Pi runner、Codex app-server、Copilot 等）接通的 hook 不完全一样。
- **兼容包格式**：能安装 Claude、Codex、Cursor 的插件包和 Agent Plugins，但**其中的 hooks.json 只会被识别，不会执行**。
- **原生记忆**
  - dreaming 默认开启（light → REM → deep 三阶段，把候选提升进 MEMORY.md）。
  - 关闭方法：`plugins.entries.memory-core.config.dreaming.enabled:false`、`agents.defaults.compaction.memoryFlush.enabled:false`、`skills.workshop.autonomous.mode:off`。
  - 换掉记忆槽位后，工作区启动时是否还会注入 MEMORY.md【未验证】，大概率仍会注入。
- **存储**：数据在 SQLite 里，导出用 `openclaw sessions export-trajectory`。
- **后台**：`api.registerService` 挂在 Gateway 的生命周期上，可以在进程内跑整理任务，不需要另起 daemon。
- **来源**：https://github.com/openclaw/openclaw/tree/main/docs（plugins/manifest.md、plugins/hooks/reference.md、plugins/sdk-overview/memory-and-context.md、concepts/dreaming.md、reference/database-schemas/layout.md、automation/cron-jobs.md）

#### Hermes Agent 0.21.5

- **MemoryProvider 接口**（`agent/memory_provider.py`，已核对）
  - 主要方法：`name`、`is_available`、`initialize(session_id, **kw)`、`system_prompt_block`、`prefetch`、`queue_prefetch`、`sync_turn`、`get_tool_schemas`、`handle_tool_call`、`on_turn_start`、`on_session_end`、`on_session_switch`、`on_pre_compress`、`on_delegation`、`on_memory_write`、`backup_paths`、`shutdown`。
  - `initialize` 会收到 `agent_context`，取值为 primary / subagent / cron / flush。
  - 设 `pre_compress_checkpoint_api_version = 2`，并配置 `compression.checkpoint_required` 后，压缩会等 provider 归档完会话才进行（基类默认值为 1）。
- **加载规则**
  - 发现顺序：内置 → `$HERMES_HOME/plugins/` → 项目目录（需要 `HERMES_ENABLE_PROJECT_PLUGINS=1`）→ entry point `hermes_agent.memory_providers`。先找到的生效，所以名字要唯一。
  - 内建记忆始终开着，外部 provider 只能有一个（`add_provider` 会拒绝第二个）。
  - `on_memory_write` 会把内建记忆的写入同步给 provider。
- **注入**
  - 每轮的 `prefetch` 结果和 `pre_llm_call` 的输出包成 `<memory-context>`，附在用户消息里，不进系统提示。
  - `delegate_task` 创建的子代理带 `skip_memory=True`，provider 注入不到子代理。
- **存储**
  - `state.db` 的 messages 表有 `active` 列，用来标记压缩代次。
  - 全文索引有 `messages_fts`、`messages_fts_trigram`、`messages_fts_cjk`。
- **后台**
  - cron 任务存在 `~/.hermes/cron/jobs.json`，支持不调用模型的纯脚本任务（`no_agent`）。
  - 前提是 gateway 在运行。
- **来源**：https://github.com/NousResearch/hermes-agent/blob/main/agent/memory_provider.py ，`website/docs/developer-guide/memory-provider-plugin.md`，`website/docs/user-guide/features/hooks.md`，`website/docs/developer-guide/session-storage.md`

#### Gemini CLI 0.62.0

- **hooks**
  - 配置在 settings.json 的 `hooks` 里，总开关是 `hooksConfig.enabled`。
  - `BeforeAgent.additionalContext` 只作用于当前这一轮，内容包在 `<hook_context>` 里。
  - `BeforeModel` 可以替换请求，或者直接合成一个响应；但 hook 只看得到文本，改写会丢信息。
  - `AfterModel` 每个流式 chunk 都会触发一次。
  - 环境变量有 `GEMINI_SESSION_ID`，另外设了 `CLAUDE_PROJECT_DIR` 作为别名。
- **存储**
  - 第一行是元数据（含 `memoryScratchpad`），之后是 MessageRecord（带 toolCalls、tokens），以及 `$set`、`$rewindTo` 这类更新记录。
  - 子代理的会话在 `chats/<parentSid>/<sid>.jsonl`。
  - `general.sessionRetention` 默认 30 天。
- **Auto Memory**：开关是 `experimental.autoMemory`。它扫描空闲超过 3 小时、且有 10 条以上用户消息的会话，生成补丁和 SKILL 草稿放进 `.inbox/`，用户在 `/memory inbox` 里批准后才生效。
- **来源**：https://github.com/google-gemini/gemini-cli/blob/main/docs/hooks/reference.md ，docs/extensions/reference.md ，docs/cli/auto-memory.md ，docs/tools/memory.md ，docs/cli/session-management.md ，packages/core/src/services/chatRecordingTypes.ts

#### OpenCode 1.18.33（仓库已迁到 anomalyco/opencode）

- **Hooks 的 key**：`chat.message`、`chat.params`、`experimental.chat.system.transform`、`experimental.chat.messages.transform`、`tool.execute.before` / `after`、`tool.definition`、`experimental.session.compacting`、`event`。
- **事件**：`session.idle` 已废弃，改用 `session.status`，判断 `status.type==="idle"`。
- **v2 插件 API**（`define({id,setup})`）目前还不覆盖聊天生命周期，见 issue #35408。
- **兼容开关**：`OPENCODE_DISABLE_CLAUDE_CODE*` 可以关闭对 Claude Code 文件的兼容读取。
- **外部订阅**：`opencode serve` 提供 SSE 端点 `/event`。
- 另外，第二路调研发现 OpenCode 移除了 `chat.message` 事件，与这里列出的 key 不一致，待核实。
- **来源**：https://opencode.ai/docs/plugins/ ，https://github.com/anomalyco/opencode/blob/dev/packages/plugin/src/index.ts ，packages/core/src/database/database.ts ，https://opencode.ai/docs/skills/ ，/rules/

#### Cursor（IDE 与 cursor-agent CLI）

- **hooks.json**：格式是 `{"version":1,"hooks":{event:[{command,matcher,timeout,failClosed,loop_limit}]}}`。
- **注入与续跑**
  - `stop` 和 `subagentStop` 可以返回 `followup_message`，让 Agent 自动继续跑（默认 loop_limit 为 5）。
  - supermemory 的做法印证了：每轮召回只能放在第一个工具结果之后。
- **观测**
  - 公共字段 `transcript_path`（关闭会话记录时为 null），环境变量 `CURSOR_TRANSCRIPT_PATH`。
  - CLI 在 2026-01 到 05 月之间补齐了 session / stop / subagent 相关的 hooks。
  - 云端 agent 没有 sessionStart 和 sessionEnd。
- **加载第三方配置**：会读 `.claude/settings*.json` 里的 hooks、CLAUDE.md 和 `.claude/skills`。**cursor-agent 里这个行为是硬编码开启的，无法关闭**（论坛帖 166558，官方员工 2026-07-29 确认）。
- **存储**：JSONL 里的 tool_use 可能是 `id:null`，而且没有 tool_result（agentsview #1627），所以在 Cursor 上必须靠 hook 采集。
- **来源**：https://cursor.com/docs/hooks ，https://cursor.com/docs/reference/third-party-hooks ，https://cursor.com/docs/plugins ，https://cursor.com/docs/context/skills ，https://forum.cursor.com/t/no-way-to-opt-out-of-third-party-claude-code-codex-config-loading-the-flag-is-hardcoded/166558

#### DeepSeek Harness（dsh）0.2.0-rc.2

官方仓库是 deepseek-ai/deepseek-harness，目前是预发布（developer preview）。

- **插件**
  - "一切皆插件"：模型适配、工具、会话日志、agent 循环、UI 都是插件。
  - 包格式是 npm 包，`package.json` 里写 `"dsh":{"bundle":{"patch":"./cordis.patch.yml"}}`。
  - 桥接包 `@deepseek-ai/dsh-hooks-claude-code` 和 `@deepseek-ai/dsh-hooks-codex` 能直接运行现成的 hooks.json（SessionStart / UserPromptSubmit / Pre/PostToolUse / Stop / SubagentStart/Stop），但 `transcript_path` 是空字符串。
  - 原生插件可以通过 `ctx.sessionPersistence` 读会话。
- **注意**
  - 基础包默认会上传会话日志（插件 `session-log-deepseek`），要在隐私上提醒用户。
  - 官方文档列出了三个记忆 MCP：Memorix、MCP reference memory、Engram。
  - plastic-labs/dsh-honcho 用到的事件名（`agent/created`、`agent/turn-stopping`、`system-prompt/assemble`）来自第三方源码，不是官方文档。
- **来源**：https://github.com/deepseek-ai/deepseek-harness（packages/hooks/README.md、packages/hooks/hooks-claude-code/README.md、packages/session/session-persistence-jsonl/README.md、docs/subsystems/skills.md、docs/user/guide/mcp-memory.md）

#### Kimi Code 2.1.1

- **hooks**：只能写在 `config.toml` 的 `[[hooks]]` 或插件清单里，字段只有 event / matcher / command / timeout。
- **注入**：只有 UserPromptSubmit 的 stdout 会进入上下文；exit code 2 表示阻断。
- **子代理**：只有当自定义的 agent 模板里包含 `${plugin_sections}` 时，插件的提示段落才会进入子代理。
- **来源**：https://github.com/MoonshotAI/kimi-code（docs/en/customization/hooks.md、plugins.md、configuration/data-locations.md）

#### Qwen Code 0.24.7

- **hooks**
  - handler 类型有 command / http / function / prompt。
  - `UserPromptSubmit` 会在每次支持的模型调用前触发，包括回传工具结果的那次调用，所以不严格是每轮一次，去重时要注意。
- **原生记忆**：关闭要设 `memory.enableManagedAutoMemory:false` 和 `memory.enableManagedAutoDream:false`。
- **兼容格式**：原生加载 Agent Plugins v1，但只激活其中的 skills 和 MCP。
- **来源**：https://github.com/QwenLM/qwen-code/blob/main/docs/users/features/hooks.md ，memory.md ，extension/agent-plugins.md

---

## 7. 会话归一化工具与相关标准

### 7.1 letta-ai/trajectory

Apache-2.0，npm `@letta-ai/trajectory`，PyPI `agent-trajectory`。

- **支持的来源**
  - 能列举本地会话（`listTrajectories`）：claude-code、codex、pi、omp、openclaw（旧的 JSONL 路径）、hermes（`state.db`）、droid、letta-code、deepagents。
  - 只能解析、不能列举：opencode（`{info,messages}` 导出的 JSON）、gemini-cli（整个会话的 JSON）、cursor（只认 SWE-chat 的 JSONL，**不读** agent-transcripts）、copilot-cli、openhands、atif 1.0–1.7。
  - **不支持**：DeepSeek Harness、Kimi、Qwen。
- **API**：`normalizeTranscript({source, transcript})` 是纯函数，返回 `{records, diagnostics}`。
- **trajectory-v1 schema**
  - 记录按顺序排列：`meta{role,source,cwd,git_branch,model}`，以及 `user`、`assistant{content, tool_calls[{id,name,args}]}`、`tool{tool_call_id,content,ok?}`、`reasoning`、`observation`、`system`（默认关）。
  - 工具结果里的 `ok` 字段，只在宿主提供可靠的成功 / 失败信号时才填。
  - 缺点：**不关联子代理，也没有 token 用量**。
- **canonical 视图**（CANONICAL.md）：增加了基于 sha256 的 `record_id` 和 `content_hash`，以及 `stable_source_record_id`，支持分块增量上传。
- Letta Code 的 dreaming 就是用它从本机所有 Agent 的会话里学习（https://www.letta.com/blog/trajectory）。

### 7.2 其他归一化工具

- **agentsview**（https://github.com/kenn-io/agentsview）：覆盖面最广，见 2.2 节。
- **Harbor ATIF v1.7**（https://github.com/harbor-framework/harbor）
  - 能嵌套 `subagent_trajectories`，每一步都带 metrics。
  - 自带 claude_code、codex、gemini_cli、hermes、openclaw、opencode、pi、cursor_cli、kimi_cli、qwen_code 的转换器。
- **cass**（Dicklesworthstone/coding_agent_session_search）：32 个连接器，不含 DeepSeek Harness。
- **specstory**：只导出 Markdown。
- **ccusage、tokscale**：只提取用量。
- **OTel GenAI 语义约定**：仍处于 Development 状态。

### 7.3 Skills 与插件标准

- **agentskills.io**
  - frontmatter 必填：`name`（小写字母、数字、连字符，1–64 字符，必须等于目录名）和 `description`（不超过 1024 字符）。
  - 采用者名单包括 Claude Code、Codex、Gemini CLI、OpenCode、Cursor、pi、Hermes、OpenClaw；**不含** Kimi、Qwen、DeepSeek Harness。
  - `.agents/skills` 只是实现指南里的建议，不是强制规范。
- **SEP-2640 Skills Extension**
  - PR 已于 2026-09-13 合并，状态为 Final；扩展 id 是 `io.modelcontextprotocol/skills`。
  - 方法有 `skills/list`、`skills/get`，URI 形如 `skill://<prefix>/<name>/...`，并要求校验 digest。
  - 官方客户端矩阵里只有 mcpc 完整支持，ChatGPT、fast-agent、Inspector 部分支持。**本次调研的所有 Agent 都不支持。**
- **Agent Plugins 1.0**：见 4.1 节。

---

## 8. 跨 Agent 的适配问题

### 8.1 注入上限差异很大

| Agent / 项目 | 上限 |
|---|---|
| Codex AGENTS.md | `project_doc_max_bytes` 32 KiB，超出部分被静默截断 |
| Codex hook 注入 | `additionalContextLimit` 约 2.5k token |
| Claude Code MEMORY.md | 前 200 行或 25KB |
| Claude Code hook 注入 | 超过 10k 字符只注入 2k 预览 |
| Hermes | MEMORY.md 2,200 字符，USER.md 1,375 字符，写满时直接报错（[文档](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory)） |
| OpenClaw | 强匹配时最多注入 3 条精简记忆（[memory-config](https://docs.openclaw.ai/reference/memory-config)） |
| ZCode | `hooks.maxOutputBytes`，超过时整段注入都会被丢弃 |
| ECC | SessionStart 8,000 字符，最多 6 条 instinct |
| agentmemory | 2,000 token |
| Hindsight | recall 的 `max_tokens` 为 2000 |

### 8.2 hook 协议差异

详细记录见 [Hindsight README](https://github.com/vectorize-io/hindsight/tree/main/hindsight-integrations/coding-agents) 和 [claude-mem plan-23](https://github.com/thedotmack/claude-mem/issues/3611)：

- Qwen 的 hook 超时以毫秒为单位，别家都是秒。
- Kimi 在 SessionStart 的输出到不了模型。
- ZCode 不保留会话记录。
- Droid 在用户取消后不发 Stop 事件。
- Codex 会拒绝 `suppressOutput` 字段，在 Windows 上还需要 `commandWindows`。
- OpenCode 移除了 `chat.message` 事件（与 6.2 节列出的 key 不一致，待核实）。
- Antigravity 的 `agy` 用的是 `PreToolUse` 和 camelCase 的 protojson，而不是 Gemini 的 `BeforeTool`（claude-mem #4057）。

### 8.3 提示缓存

- Hermes 用会话开始时的固定快照来保住前缀缓存。
- Hindsight [#3061](https://github.com/vectorize-io/hindsight/issues/3061)：把记忆插到系统提示的开头会破坏缓存。
- Hindsight [#4317](https://github.com/vectorize-io/hindsight/issues/4317)：DeepSeek Harness 集成在会话中途注册工具，导致缓存失效；issue 称 DeepSeek 官方 API 上缓存未命中的价格是命中的 **50 倍**。
- Hindsight [#4404](https://github.com/vectorize-io/hindsight/issues/4404)：DeepSeek 异步写缓存，agent 循环跑得比缓存写入还快，前缀缓存始终不命中。
- claude-mem [#2872](https://github.com/thedotmack/claude-mem/issues/2872)：注入内容里带精确到分钟的时间戳，导致缓存失效。
- agentmemory [#720](https://github.com/rohitg00/agentmemory/issues/720)：OpenCode 插件每轮都改系统提示，缓存命中率下降约 10 个百分点。

### 8.4 按模型适配

**没有找到任何项目按模型族（Claude / GPT / DeepSeek）改写记忆文本。**

- 现有的都只是"按宿主配置"：Honcho 的 `hosts.<name>`、Hindsight 的 `banks` / `paths`、Mem0 的宿主能力表。
- memU 的 README 记录了一个模型差异："If the selected model declines the setup steps, retry with Opus … Sonnet 5 can occasionally do this"。
- [HarnessSafe](https://arxiv.org/abs/2608.06984) 发现，Agent 框架的架构和模型后端都会显著影响安全结果。

### 8.5 安全

- [Darktrace 的 history poisoning](https://dev.to/analista_83/history-poisoning-turns-coding-agents-into-attackers-496d)：Claude Code、Codex、Kiro 存在磁盘上的会话历史，都不校验内容是否真由模型生成。所有从会话文件里挖记忆的跨 Agent 工具都会继承这个风险。
- 现有的防护都只覆盖局部：
  - Hermes 扫描注入、外泄和不可见 Unicode 字符。
  - Codex 的导入规则要求把导入内容当作素材，而不是指令。
  - Hindsight 保留 `harness:` / `source:` 标签，不让用户改写。
  - agentmemory 在写入时打上不可变的来源标记。
  - dsh-memory-porter 要求每条记忆都带能逐字核对的原文证据。
- **没有任何项目在 Agent 之间设隔离或晋升关卡。**

---

## 9. 对插件接入层设计的含义

### 9.1 采集和注入能力分级

所有目标 Agent 都能用 hook 或插件确定性地采集，写入不必依赖模型主动调用工具；区别在于注入能力。

**A 级：确定性采集，且支持每轮注入**
- hook + 命令行型：Claude Code、Codex、Qwen、Gemini。其中 Claude Code、Codex、Qwen 连子代理也能注入。
- 进程内插件型：Pi、OpenCode、OpenClaw、DeepSeek Harness。
- provider 槽位型：Hermes、OpenClaw。

**B 级：确定性采集，但注入受限**
- **Cursor**：没有每轮注入，也没有子代理注入。只能在 sessionStart 注入；每轮召回只能退而求其次，放到 postToolUse 的 `additional_context`，或者写成 `alwaysApply` 的 rule 文件。
- **Kimi Code**：启动时只能注入静态的 systemPrompt，每轮只有 UserPromptSubmit 的 stdout 能进上下文，hook 里拿不到会话文件路径。
- **Hermes**：子代理拿不到记忆注入。

**所有 Agent 共同的限制**
- **通过 MCP 写入记忆，要靠模型自己决定调用。** 所以自我学习不能只靠模型主动写，主要数据来源应该是 hook 采集加离线整理。
- **会话结束事件都不可靠**：Claude Code 默认 1.5 秒，Codex 最多 3 秒，Gemini 不等待，OpenClaw 2 秒，Cursor 不等返回。采集必须在每轮结束时（Stop / AfterAgent / agent_end / turn_end）增量写到本地暂存文件，会话结束时只发一个"已结束"的信号。

### 9.2 11 个 Agent 共同支持的能力

- **MCP stdio 工具**：全部支持。注意 Pi 要设 `exposure:"direct"`。
- **SKILL.md**：放在 `~/.agents/skills` 可以覆盖除 Claude Code 以外的 Agent，但 Hermes 要配置 `skills.external_dirs`，DeepSeek Harness 读的 `<agentsHome>/skills` 是否就是这个目录【未验证】。Claude Code 只读 `.claude/skills`。
- **本地会话日志**
  - JSONL：Claude Code、Codex、Pi、Gemini、Cursor、Kimi、Qwen、DeepSeek Harness（zstd 压缩）。
  - SQLite：OpenClaw、Hermes、OpenCode。
- **事件语义的公共集合**：`session_start`、`before_turn`（Cursor 除外）、`after_tool`、`turn_end`、`pre_compact`、`session_end`（尽力而为）。

### 9.3 规范事件与各 Agent 事件名的对应

| 规范事件 | Claude Code / Qwen | Codex | Gemini | Cursor | Kimi | Pi | OpenCode | OpenClaw | Hermes | DeepSeek Harness |
|---|---|---|---|---|---|---|---|---|---|---|
| session_start 注入 | SessionStart | SessionStart | SessionStart | sessionStart | 插件 systemPrompt | session_start 时调用 sendMessage，或 before_agent_start | session.created + system.transform | before_prompt_build / agent:bootstrap | system_prompt_block | agent/created、prompt section |
| before_turn 注入 | UserPromptSubmit | UserPromptSubmit | BeforeAgent / BeforeModel | ✗（改用 postToolUse） | UserPromptSubmit 的 stdout | before_agent_start / context | chat.message / system.transform | before_prompt_build | prefetch | agent/pre-step |
| after_tool | PostToolUse | PostToolUse | AfterTool | postToolUse | PostToolUse | tool_result | tool.execute.after | after_tool_call | post_tool_call / sync_turn | tools/post-execute |
| turn_end | Stop | Stop | AfterAgent | stop | Stop | agent_end | session.status 变为 idle | agent_end | sync_turn | agent/turn-stopping |
| pre_compact | PreCompact / PostCompact | PreCompact / PostCompact | PreCompress | preCompact | PreCompact | session_before_compact | experimental.session.compacting | before_compaction | on_pre_compress | compaction/* |
| subagent | SubagentStart | SubagentStart | （BeforeModel）【未验证】 | ✗ | ✗ | 子进程 | 子会话 | prepareSubagentSpawn | on_delegation（只能观测） | subagent/start |

### 9.4 第一路调研建议的完整架构

整体是：常驻 daemon + 一个 MCP 入口 + 三类薄适配层 + 离线导入。

- **核心：本地 daemon**
  - 负责存储（SQLite + 全文索引 + 向量）、召回 API、采集暂存、整理任务调度、会话文件导入。
  - 对外提供 Unix socket 或 localhost HTTP。
  - 之所以要自带调度：只有 OpenClaw（registerService）、Hermes（cron）、DeepSeek Harness 在宿主内有可用的调度能力，其余都得靠 daemon 或系统 cron。
- **MCP 入口**：一个 stdio 转发程序接到 daemon，提供 `memory_search`、`memory_write`、`memory_get`、`memory_feedback`，所有 Agent 通用。
- **三类适配层**
  - **hook + 命令行系**（Claude Code、Codex、Qwen、Gemini、Cursor、Kimi，以及 DeepSeek Harness 的 Claude Code 桥）
    - 统一用一个 `memhook --harness <h> <event>` 程序：把 stdin 输入转成规范事件，调用 daemon，再按各家格式输出（`additionalContext`、`additional_context` 或纯 stdout）。
    - Claude Code 和 Codex 可以放在同一个仓库，同时带 `.claude-plugin` 和 `.codex-plugin` 两套清单，各自显式传 `--harness`。不要靠环境变量判断宿主，因为 Codex 也会设 `CLAUDE_PLUGIN_ROOT`。
  - **进程内 TS 系**（Pi、OpenCode、OpenClaw、DeepSeek Harness）：一个共享的 npm 核心包，每个宿主一层薄包装，走进程内事件。
  - **provider 槽位系**
    - Hermes：实现 `MemoryProvider`（Python），做 prefetch、sync_turn、on_pre_compress，并用 v2 checkpoint 在压缩前归档。
    - OpenClaw：声明 `kind:"memory"` 并调用 `registerMemoryCapability`，需要时再加一个 context engine。
- **离线导入（后台整理的数据来源）**
  - 可以直接用 trajectory：Claude Code、Codex、Pi、Hermes。
  - OpenClaw：trajectory 只认旧的 JSONL 路径，新的 SQLite 要自己写读取器。
  - OpenCode：trajectory 能解析导出的 JSON，但本地的 `opencode.db` 要自己写读取器。
  - 需要补写读取器：DeepSeek Harness（zstd）、Kimi 的 `wire.jsonl`、Qwen、Gemini 的新 JSONL，可以参考 agentsview。
  - Cursor：以 hook 采集为主，因为它的会话文件经常缺 tool_result。
  - 统一格式用 trajectory-v1 的 canonical 视图；需要关联子代理或需要 metrics 时，改用 ATIF。
  - Claude Code 和 Gemini 默认只保留 30 天会话，Codex 即将对旧文件做 .zst 压缩，**导入至少每天跑一次**，或者提示用户调大保留期。

### 9.5 防止重复注入和重复触发

- **不要把记忆写进 CLAUDE.md 或 AGENTS.md。** Pi、OpenCode、Hermes、DeepSeek Harness、Cursor 都会读 CLAUDE.md，会被重复加载。
- **Cursor 会强制运行 `.claude/settings*.json` 里的 hooks。** 所以 Claude Code 的适配层要以插件形式安装，hooks 放在插件自己的 hooks.json 里。Cursor 是否也会加载 Claude Code 插件里的 hooks【未验证】；`memhook` 里要检测 `CURSOR_VERSION` 环境变量或 `cursor_version` 字段，是 Cursor 就跳过。
- 每轮注入带一个 `<mem turn=...>` 标记，按 `(harness, session_id, turn/tool_call_id)` 去重。
- 学到的 skill 统一加命名空间前缀（如 `mem-*`），和各宿主自己的 skill 学习器区分开：Hermes 的 skill_manage / curator、OpenClaw 的 Skill Workshop、Gemini 和 Qwen 的自动 skill、Codex 的 memories/skills。
- Claude Code 的 skill 放在插件的 `skills/` 目录，不要放进 `~/.claude/skills`，否则 Cursor 和 OpenCode 会重复读到。

### 9.6 与各家原生记忆共存

| Agent | 策略 |
|---|---|
| Claude Code | 可以选择关闭 auto memory |
| Codex | memories 默认关闭；如果用户开着，可以通过 `memories/extensions/` 把我们的记忆交给它（这个接口没有写进文档，有风险） |
| OpenClaw | 把 `plugins.slots.memory` 指向本插件，并关掉 dreaming 和 memoryFlush，否则会整理两遍 |
| Hermes | 保留内建记忆，本插件作为唯一的外部 provider；也可以把内建记忆的两个开关都关掉 |
| Qwen | 必须关闭 AutoMemory 和 AutoDream |
| Gemini | 保持 Auto Memory 关闭 |

### 9.7 信任与隐私

- Codex 的 hook 要用户在 `/hooks` 里手动信任。
- OpenClaw 要开启 `allowConversationAccess`。
- Pi 和 Hermes 的项目级插件要单独信任或启用。
- DeepSeek Harness 默认会上传会话日志，要提醒用户。
- **暂时不依赖 SEP-2640。** skill 以文件形式分发；MCP server 可以顺带实现 `skills/list`，等客户端支持了自然生效。

---

## 10. 空白点与差异化定位

### 10.1 现在没有项目做的事

1. **把结论写回各家的原生记忆位置。** 没有项目把跨 Agent 合并出的结论，按各家的上限编译回各自的原生位置。memU 只加一段"先去 retrieve"的指令；Codex 的导入是单向、一次性的。
2. **按目标编译记忆。** 同一条经验，没人按模型族（措辞、标签风格）和各家上限（32KiB / 200 行 / 2,200 字符 / 3 条）分别生成；也没有对缓存友好的注入策略标准，各项目都在零散打补丁。
3. **标注经验的适用范围。** 没人区分三类经验：与 Agent 无关的、只适用于某个 Agent 的（比如涉及 `apply_patch` 或 `Edit` 这类工具名）、只适用于某个模型的。Hindsight 的 shared 模式反而会把只对某个工具成立的建议混进同一套信念。
4. **测量迁移效果。** 没有项目测量"在 Codex 里学到的经验，能不能提升 Claude Code 的表现"。EvoAgentBench 测的是迁移，但不是跨 Agent 的迁移【未验证】。
5. **跨 Agent 的信任链。** 只有来源标签：没有签名的会话记录，没有"在 A 里学到、先在 B 里验证通过才晋升"的机制，也没有投毒扩散后的回滚。
6. **统一的身份解析。** 项目、用户、会话的标识各家自定：Hindsight 用 gitProject，Mem0 和 ECC 各自哈希 git remote，claude-mem 用目录名或 git 根目录。同一个 repo 在不同工具里的记忆经常对不上。
7. **带置信度和作用域的通用经验格式。** ECC 的 instinct YAML（confidence / scope / source / evidence）最接近，但只有 ECC 自己在用。AGENTS.md 和 SKILL.md 都表达不了情景记忆、置信度和溯源。
8. **既不依赖代理、也不依赖各家 hook 的统一采集层。** 代理和订阅套餐冲突；各家 hook 协议不同，而且改得频繁。现有的替代方案只有"读会话文件"（memU / funes / trajectory），但做不到实时，会话文件也可能被伪造。

### 10.2 差异化定位：跨 Agent 的"经验编译器"

**不做又一个记忆库。** 从所有 Agent 的会话里学习，验证通过后，编译成各家原生能读的形式。

**差异点 1：离线编译、会话开始时注入一次，不做每轮召回**

- **做法**
  - 后台整理时，为每个项目、每个 Agent 各生成一份记忆包，内容先经过验证，再按该 Agent 的上限裁剪。
  - 每个会话只在开始时注入一次，之后每轮不再动态检索；不常用的内容走 MCP 按需查询。
- **好处**
  - 只依赖"会话开始"这一个事件。Cursor 这类不能每轮注入的 Agent 也能正常用，竞品的每轮召回在这里只能退而求其次。
  - 会话内容保持不变，不破坏提示缓存（见 8.3 节）。
  - 不需要代理，订阅套餐也能用。
  - 记忆包是文件，存在我们自己的 git 库里，能审阅、能回滚。撤销一条经验只需重新编译一次，所有 Agent 同步生效，正好解决已有报告里说的"标记失效不等于真的忘了"。
- **更正**：初版曾设想把记忆写回 CLAUDE.md、AGENTS.md 等原生文件。第一路调研证实这会造成跨 Agent 的重复加载（见 9.5 节），因此改为上面的做法。只有 skill 这类有专属目录的内容才写文件（Claude Code 用插件的 `skills/`，其余用 `~/.agents/skills/mem-*`）。

**差异点 2：给每条经验标注适用范围——通用 / 只适用某个 Agent / 只适用某个模型**

- 例如"改完代码跑 `pytest -x`"是通用的；"用 `apply_patch` 之前要先……"只对 Codex 成立。
- 同时用多个 Agent，天然就有对比数据：同一个仓库、同一类任务，Codex 做成了、Claude Code 没做成，差别就是经验（ContraMem 的思路）。

**差异点 3：在另一个 Agent 上验证过才晋升为通用，而且效果可以测量**

- 在 A 里学到的经验，先只对 A 生效；在 B 上也证明有用后，才升为"通用"。
- 每条经验记录被哪些会话用过、结果如何（ACE 式的有用 / 有害计数），有害的自动退役。
- 插件自带评测：和不带记忆的基线比较，每个配置多次运行，并打乱任务顺序。
- 这一点研究上有支撑（VALVE、Salesforce 复评），产品上是空白（10.1 第 4 条）。

**差异点 4：跨 Agent 的信任链**

- 每条经验都带上来源 Agent 和原文证据。
- 读过网页、issue 这类不可信内容的回合，不参与晋升。
- 按来源隔离，出问题时按来源整批回滚。
- 会话文件本身可能被伪造（8.5 节），导入时要做校验。

**基础设施上顺带解决**：统一项目标识（10.1 第 6 条）。这是跨 Agent 共享的前提。

---

## 11. 计划

原则：
- 存储和采集尽量复用：用 trajectory 读会话；Markdown + git 作为唯一真源，SQLite 只做随时可重建的索引。
- 精力放在学习、验证、编译三步上。
- 先做离线闭环，再做实时层。

### 11.1 阶段 0：验证前提（约 1 周）

- **抽样看真实会话**：用 trajectory 导出最近在 Claude Code、Codex、Pi 里的会话，抽 50 个，看不同 Agent 反复踩同一个坑的情况多不多。如果很少，差异点 2 和 3 的价值要打折。**这是整个方向最关键的一步验证。**
- **建评测集**：从自己的仓库挑 20–40 个有测试、Claude Code 和 Codex 都能跑的真实任务，优先挑历史上出过错的。
  - 指标：成功率、同一个错误再犯的比例、token 消耗。
  - 规则：和不带记忆的基线比较；每个配置跑 3 次；打乱任务顺序。
  - 固定各家原生记忆的开关，否则分不清提升来自哪一方。
- **定经验条目格式**：内容、作用域（全局 / 项目）、适用范围（通用 / 某 Agent / 某模型）、证据（会话 ID + 原文引用）、来源 Agent、信任等级、置信度、有用 / 有害计数。可以参考 ECC 的 instinct YAML。

### 11.2 阶段 1：离线版最小可用（2–3 周）

- **代码结构**：一个仓库同时产出 Claude Code 插件、Codex 插件和 Pi 扩展，共用一个命令行核心。
- **不做常驻服务**：hook 调用命令行工具往本地文件追加记录；系统 cron 每天跑一次"导入 → 整理 → 编译"。以后要做实时检索时再加常驻服务。
- **采集**：每轮结束时写本地文件，另外每天用 trajectory 导入一次。
- **整理**：用强模型提炼候选经验，先进待审区，用命令行人工审阅。
- **编译**：每个项目、每个 Agent 各生成一份记忆包，以 Codex 的 2.5k token 为基准裁剪，会话开始时注入。
- **完成标准**：在评测集上，Claude Code 用上在 Codex 里学到的经验后，稳定好于不带记忆的基线。

起步三家的具体接法：

| | Claude Code | Codex | Pi |
|---|---|---|---|
| 插件形态 | Claude Code 插件，与 Codex 共用一个仓库 | Codex 插件，同一个仓库。Codex 也能装 Claude Code 插件，但要显式传宿主参数 | TS 扩展 |
| 实时采集 | Stop hook（带 `last_assistant_message`） | Stop hook | `agent_end` 事件 |
| 离线采集 | trajectory 读 `~/.claude/projects/` | trajectory 读 `~/.codex/sessions/`，要兼容 .zst | trajectory 读 `~/.pi/agent/sessions/` |
| 注入记忆包 | SessionStart hook 的 `additionalContext` | SessionStart hook，上限约 2.5k token | `before_agent_start` 事件 |
| skill 输出 | 插件自带的 `skills/` | `~/.agents/skills/mem-*` | `~/.agents/skills/mem-*` |
| 按需检索 | MCP | MCP | MCP，要设 `exposure:"direct"` |
| 原生记忆 | 有 auto memory，可以关 | 有 memories，默认关 | 没有 |
| 注意 | —— | 用户要在 `/hooks` 里手动信任 | 会读 CLAUDE.md |

### 11.3 阶段 2：自进化闭环（2–3 周）

- **记录效果**：记下每个会话用的是哪一版记忆包、结果如何，据此更新每条经验的计数。可以直接采用 ACE 的逐条增量更新做法。
- **验证后才晋升**：升为"通用"之前，先在一组固定的验证任务上对比用和不用，或者在另一个 Agent 上验证通过。没通过就继续只对原 Agent 生效，或者退役。
- **对比学习**：从不同 Agent 做同类任务的成败对比中提炼经验。
- **升级成 skill**：多步流程、而且多次验证通过的经验，生成 SKILL.md，同时放进 Claude Code 插件的 `skills/` 和 `~/.agents/skills/`，经人工确认后生效。

### 11.4 阶段 3：扩展

- **可选的实时层**：通过 MCP 检索不常用的记忆。注入时不插在系统提示开头，也不带精确时间戳，避免缓存失效。
- **接入更多 Agent**，按接入成本排序：
  1. Qwen Code：能直接安装 Claude Code 插件，hook 也兼容，几乎不花成本。
  2. OpenCode。
  3. Hermes：它的 MemoryProvider 接口在会话开始时注入一份固定快照，和我们的做法一致。
  4. OpenClaw：要占用它唯一的记忆插件槽位，并关掉它自带的 dreaming 和 memoryFlush，否则会整理两遍。
  5. Cursor。
- **安全**：隔离不可信内容；按来源回滚；校验导入的会话文件；把投毒测试（参考 PMPA 2609.13889）加进评测集。
- **按模型改写措辞**：只有评测显示不同模型确实有差别时才做。
- **持续关注竞品**：agentsview（AgentsView Memory）、Hindsight、memU、ECC 的后续版本。

---

## 12. 待决事项

1. **起步接哪几家**：建议 Claude Code、Codex、Pi。三家的会话 trajectory 都能读；Claude Code 和 Codex 都有 hooks，Pi 有进程内扩展。
2. **给谁用**：自己用、团队内部用，还是做开源产品？团队共享的话，要加权限和多人冲突处理。
3. **各家原生记忆开不开**：主要是 Claude Code 的 auto memory。开着，两套学习并行，会干扰评测；关掉，就完全依赖本插件。建议评测期间关掉，上线后做成可选。
4. **存储自己做还是用现成的**：比如用 Hindsight 做检索后端，本插件只做学习和编译层。倾向先自己做最简单的 Markdown + git，避免被某个项目绑定。
5. **待核实的事实**：
   - Gemini CLI `save_memory` 的移除版本（见 1.2 节）；
   - Pi 的版本号跨度（见 1.2 节）；
   - OpenCode 的 `chat.message` 是否已移除（见 6.2、8.2 节）；
   - Cursor 是否会加载 Claude Code 插件里的 hooks（见 9.5 节）；
   - DeepSeek Harness 读的 `<agentsHome>/skills` 是否就是 `~/.agents/skills`（见 9.2 节）。
