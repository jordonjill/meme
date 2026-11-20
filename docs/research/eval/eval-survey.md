# 记忆插件如何证明自己有效：调研报告

> 调研日期：2026-09-30
> 目的：弄清现有记忆插件和项目用什么方法证明自己有效，特别是在编码场景和跨 Agent 场景下，为 meme 设计验证方案。

**标注约定**
- 【自报】：作者或厂商自己报告的结果。
- 【独立】：第三方复现的结果。
- 【未核实】：没找到或没读到一手来源。
- 【估算】：调研时自行推算的数字。

---

## 总判断：市面上大多数说法都很弱

- **对话记忆基准**：LoCoMo、LongMemEval 这类分数几乎全是厂商自报。常见问题有三种：
  - 把检索召回率和答题准确率混在一起比；
  - 自己替竞品配置参数，再报竞品的分数；
  - 对着测试集调参。
- **编码任务**：用真实编码任务、做过"开记忆 vs 关记忆"对照的，只有 Hindsight 的 sde-bench 一家。
- **跨 Agent 迁移**：没有任何记忆产品测过"在 A 里学到的经验能不能帮到 B"。研究里真正测过的只有两项，结果都出现了接近零甚至为负的迁移。
- **编码类的严谨评测结果普遍偏负面**：自动生成的记忆或 skill，效果经常还不如关掉记忆。

---

## 一、各项目怎么证明自己有效

| 项目 | 用的基准（主要数字） | 编码专项？ | 跨 Agent / 迁移评测？ | 自报还是独立 | 方法说明 | 用户在产品里能看到的效果指标 |
|---|---|---|---|---|---|---|
| **Hindsight** | 论文：LongMemEval 91.4%、LoCoMo 89.61%（[2512.12818](https://arxiv.org/abs/2512.12818)）。[AMB 页面](https://benchmarks.hindsight.vectorize.io/)：LME-S 94.6、LoCoMo 92、BEAM-1M 73.9 | **有**：[sde-bench](https://github.com/vectorize-io/sde-bench)，在 boltons 仓库上做 61 个修 bug 任务，混入 140 段干扰对话，指标是每题需要纠正几次。结果：Claude Code 0.85→0.36，Codex CLI 1.34→0.47，opencode 1.20→0.80（[博客](https://github.com/vectorize-io/hindsight/blob/main/hindsight-docs/blog/2026-08-06-hindsight-0-9-0.md)；用[公开输出](https://github.com/vectorize-io/agent-memory-benchmark/tree/main/outputs/sdebench)重算过，数字吻合） | 在多个 Agent 上各自做开 / 关对比，但记忆是预先灌进去的语料，**没有测迁移** | 【自报】。README 说"已被 VT 和华盛顿邮报独立复现"，但这两方都是论文合著者，**不算独立** | 每组只跑 3 次，没给置信区间，只和"无记忆"比较。其中"关键决策只出现在过去对话里"这一类题，按设计就必须有记忆才能做对（无记忆 0–2%，有记忆 28–65%）。数据集标着 `published=False`。每天的 CI 评测里，裁判模型和被测模型是分开的，还设了陷阱题（[system-evals](https://github.com/vectorize-io/hindsight/tree/main/hindsight-system-evals)） | **有"采信率"**：回答里带"🧠 From Hindsight memory"引用的轮次占多少；另有检索率，用 `hindsight-coding-agents stats` 查看（[README](https://github.com/vectorize-io/hindsight/blob/main/hindsight-integrations/coding-agents/README.md)）。一个用户两天的真实数据：1360 轮里只检索了 7 次，占 0.5%（[coding_agents](https://github.com/vectorize-io/hindsight/blob/main/hindsight-system-evals/hindsight_system_evals/coding_agents/README.md)） |
| **Mem0** | README：LoCoMo 92.5、LME 94.4、BEAM-1M 64.1、10M 48.6（[README](https://github.com/mem0ai/mem0)）。2025 年论文：LoCoMo J 分 66.88 / 68.44（[2504.19413](https://arxiv.org/abs/2504.19413)） | 无，插件只有单元测试 | 无 | 【自报】。分数来自托管平台，含"开源版没有的专有优化"。有争议：[Zep 的反驳](https://blog.getzep.com/lies-damn-lies-statistics-is-mem0-really-sota-in-agent-memory/)；[Letta 只用文件系统 + grep 就得到 74.0%，超过 Mem0 报的 68.5%](https://www.letta.com/blog/benchmarking-ai-agent-memory/) | 检索取前 200 条，用 gpt-4o 当裁判（[memory-benchmarks](https://github.com/mem0ai/memory-benchmarks)）。论文说的"10 次运行"只重复了裁判打分这一步，还剔除了对抗类题目 | 只有遥测文件 telemetry.jsonl，没有效果指标（[插件](https://github.com/mem0ai/mem0/tree/main/integrations/claude-code-plugin)） |
| **claude-mem** | 没有公开基准。LoCoMo 评测只停留在规划文档，结果还是 `{J±std}` 占位符（[playbook](https://github.com/thedotmack/claude-mem/tree/main/.maestro/playbooks/Wizard-2026-02-22/2026-02-22-LoCoMo-Eval)） | 只在自家仓库上比较过 5 个查询的 token 消耗（[smart-explore](https://github.com/thedotmack/claude-mem/blob/main/docs/public/smart-explore-benchmark.mdx)） | 无 | 【自报】。"约 10 倍 token 节省"被 [#4138](https://github.com/thedotmack/claude-mem/issues/4138) 指出无法验证 | 只跑了 1 次，样本只有 5 个；从没测过召回率；FTS5 短语匹配有 bug（#4130） | 有"上下文经济"指标，但节省量是用"发现成本减去读取成本"估算的，属于记账，不是实测（[TokenCalculator](https://github.com/thedotmack/claude-mem/blob/main/src/services/context/TokenCalculator.ts)） |
| **rohitg00/agentmemory** | LongMemEval-S，**只测检索**：R@5 95.2%，只用 BM25 时 86.2%（[LONGMEMEVAL.md](https://github.com/rohitg00/agentmemory/blob/main/benchmark/LONGMEMEVAL.md)） | 名义上有：自建 15 题的语料，但 R@5 已经到 1.000，连 grep 都有 0.967，分不出高下（[scorecard](https://github.com/rohitg00/agentmemory/blob/main/docs/benchmarks/2026-05-20-coding-agent-life-v1.md)） | README 写着"works across agents"，但没测过 | 【自报】。README 把自己的 R@5 和竞品的答题准确率放在同一行比；它自己的表里 MemPalace 还更高，和宣传的"第一"矛盾 | 无法复现：引用的脚本不存在（[#1313](https://github.com/rohitg00/agentmemory/issues/1313)），数据集被 gitignore 了（[#1314](https://github.com/rohitg00/agentmemory/issues/1314)） | "节省 92% token"是模型估算【未核实】 |
| **ECC**（continuous-learning / instincts） | **没有任何基准** | 无 | 能导入导出，在 2 个以上项目出现就提升为全局，但**没评估过迁移效果** | —— | 置信度在 0.3–0.9 之间，靠启发式规则加减（[SKILL.md](https://github.com/affaan-m/ECC/blob/main/skills/continuous-learning-v2/SKILL.md)）；相关性权重是手工定的（[instinct-relevance.js](https://github.com/affaan-m/ECC/blob/main/scripts/lib/instinct-relevance.js)） | 使用次数（近 7 天、30 天）。计数有 bug：缺日志时记为 0，已删除的 skill 也算进去，179 对实际 117（[#3218](https://github.com/affaan-m/ECC/issues/3218)） |
| **memU** | 旧版 LoCoMo 92.09%，官网已标为"历史结果"（[memu.pro/benchmark](https://memu.pro/benchmark)）；当前 README 没有数字 | 无 | 无。`memu-agent detect` 只检查有没有装好 | 【自报】。裁判模型和运行次数都没公开【未核实】 | [memU-experiment](https://github.com/NevaMind-AI/memU-experiment) | "10 倍 token 减少"只是宣传语【未核实】 |
| **Supermemory** | README 里 LME、LoCoMo、ConvoMem 都写"第一"（[README](https://github.com/supermemoryai/supermemory)）。研究页一处写 Recall@20 97%，另一处写 gpt-5 下 84.6，**召回率和准确率混着用**（[longmembench](https://supermemory.ai/research/longmembench/)） | SMFS 检索任务：README 说 110 题，[smfs.ai](https://smfs.ai) 说 20 题（Claude 16→18，Codex 19→19），**两处题数对不上**，也没公开代码和数据 | Claude 和 Codex 各自做开 / 关对比，没测迁移 | 【自报】。LoCoMo 只写"第一"，不给数字 | 有开源的 [MemoryBench](https://github.com/supermemoryai/memorybench) | 无 |
| **MemPalace** | LME R@5：原始 96.6%，混合检索在 450 道留出题上 98.4%。LoCoMo R@10 60.3% / 88.9%。**全部只测检索**（[README](https://github.com/MemPalace/mempalace)） | 无 | 无 | 【自报】。经社区审计（[#875](https://github.com/MemPalace/mempalace/issues/875)）后公开纠错并撤回：所谓"100%"是针对 3 道错题调出来的；LoCoMo 取前 50 条时必然全中；召回率和答题准确率混着比（[HISTORY.md](https://github.com/MemPalace/mempalace/blob/main/docs/HISTORY.md)） | 每题结果都提交了 JSONL，可以逐条审计。透明度最好，但也是最典型的反面教材 | 无 |
| **Letta Code 技能学习** | Terminal-Bench 2.0 全部 89 题，Sonnet 4.5。只用轨迹：相对 +21.1%；加上验证器反馈：相对 **+36.8%（绝对 +15.7pp）**（[blog](https://www.letta.com/blog/skill-learning/)） | 是 | 无，只是设想 | 【自报】 | **在同一批 89 题上学、又在这 89 题上测，没有切分训练集和测试集**；"加反馈"那一组用了验证器日志，近似泄题；没写跑了几次、用什么随机种子 | 无 |
| **Letta 其他评测** | [Context-Bench](https://www.letta.com/blog/context-bench/)：Filesystem 子集是用 SQL 生成的虚构实体，Sonnet 4.5 得 74.0%，花费 $24.58。[Skills 子集](https://www.letta.com/blog/context-bench-skills/)：+14.1%。[Context-Bench V2](https://www.letta.com/blog/evaluating-memory-in-production-agents/) 是私有的，**没给数字**。[Recovery-Bench](https://www.letta.com/blog/recovery-bench/)：让模型从 gpt-4o-mini 弄坏的环境里恢复，成功率从原生的 26.3% 降到 11.2%（[repo](https://github.com/letta-ai/recovery-bench)） | Recovery-Bench 算（终端任务） | Recovery-Bench 是换一个模型来接手，测的是恢复能力，不是记忆迁移 | 【自报】；有公开的[排行榜](https://leaderboard.letta.com/) | 基于 [letta-evals](https://github.com/letta-ai/letta-evals)。Context-Bench 测的是单次会话内的上下文管理，**不是跨会话记忆** | 无 |
| **Honcho** | LME-S 90.4%（全上下文基线 62.6%）；LoCoMo 89.9%；BEAM-100K 0.63（[blog](https://plasticlabs.ai/blog/research/Benchmarking-Honcho)，[evals](https://honcho.dev/evals/)） | 否 | **没有**。Claude、Codex、Cursor、OpenCode 的插件共用一份配置，宣传"context can follow you between tools"（[codex-honcho](https://github.com/plastic-labs/codex-honcho)），但没测过 | 【自报】，按 commit 存档（[honcho-benchmarks](https://github.com/plastic-labs/honcho-benchmarks)）。有一个独立的小测试（3 个问题 × 3 次）发现：还没做 dream 整理之前，用户表征是空的（[honcho-probe](https://github.com/jacksonmlukas/honcho-probe)） | 用 GPT-4o 判对错；作者自己承认结果有波动、题目有歧义 | 有遥测字段 `X-Honcho-Host`，技术上能按 Agent 分析，但没公开数据（[harness-plugin-core](https://github.com/plastic-labs/honcho/tree/main/harness-plugin-core)） |
| **engram** | **没有质量基准**，只有 Go 的性能测试。检索评测的规划 issue 已关闭，但没交付（[#619](https://github.com/Gentleman-Programming/engram/issues/619)） | 是 | 无 | —— | —— | 无 |
| **EverOS / EverMemOS** | LoCoMo 94.42、LME-S 94.00、EverMemBench 66.67（[benchmarks/README](https://github.com/EverMind-AI/EverOS/blob/main/benchmarks/README.md)） | 否 | 本项目没有；同一家公司另做了 EvoAgentBench，见第二节 | 【自报】，提供了 reproduce.sh，但复现和裁判相关的 issue 还开着（#3、#87、#331）。有第三方称只复现出 38.38%（自报 92.32%），这是二手转引【未核实】（[bloo-mind](https://essays.bloo-mind.ai/posts/2026-05-20-mem-eval/)） | **每个基准换了不同的答题模型和判分模型**；EverMemBench 用 micro 平均，和别家的 macro 平均不可比，README 自己也承认；生产环境的检索流程和论文不一致（[#65](https://github.com/EverMind-AI/EverOS/issues/65)） | 无 |
| **TencentDB Agent Memory** | README 只报了 PersonaMem 48%→76%（[README_CN](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/main/README_CN.md)）。媒体转述：接入 OpenClaw 后 SWE-bench 58.4→64.2，token 从 3474M 降到 2375M（[marktechpost](https://www.marktechpost.com/2026/05/23/tencent-open-sources-tencentdb-agent-memory-a-4-tier-local-memory-pipeline-for-ai-agents/)） | SWE-bench 那项算，但它做的是上下文卸载，不是跨会话学习 | 无。一个记忆中心同时接 Claude Code、Codex、CodeBuddy、OpenCode | 【自报】，没给运行次数、模型等细节 | —— | 没找到"记忆效果"这个页面名【未核实】。仓库里有管理员看板"线上调用情况"：渗透率、绕过率及原因、缓存命中、召回命中数（[zh-CN.ts](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/main/MemoryPanel/web/src/i18n/zh-CN.ts)，[analytics-sql.ts](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/main/MemoryCore/src/gateway/analytics/analytics-sql.ts)）。另有 **`/analyse` 资产反思**：让模型在回答末尾说明每条用到的记忆或 skill 有没有起作用。这是模型自评，不是因果归因（[INSTALL_CN](https://github.com/TencentCloud/TencentDB-Agent-Memory/blob/main/INSTALL_CN.md)） |
| **prime-agent `/refine`** | **没有单独评测 `/refine`**。ARC-AGI-3 等基准测的是整个 harness；Factorio 只有一句定性描述"raising the production score run over run"（[blog](https://www.primeintellect.ai/blog/prime-agent)） | harness 定位是编码 | 无 | 【自报】 | 有快照和回滚，没做消融 | 无 |
| **microsoft/SkillOpt** | 6 个基准 × 7 个模型 × 3 种运行方式（直接调用 / Codex CLI / Claude Code）。GPT-5.5 在 Codex 里 +24.8，在 Claude Code 里 +19.1（[2605.23904](https://arxiv.org/abs/2605.23904)） | 部分（SpreadsheetBench 要执行代码） | **有**：论文表 4(b) 做了 Codex 与 Claude Code 之间的互相迁移（数字见第四节）；仓库里有 [run_transfer.py](https://github.com/microsoft/SkillOpt/blob/main/skillopt_sleep/experiments/run_transfer.py) | 【自报】，**有小规模第三方部分复现**：[gbrain-evals](https://github.com/garrytan/gbrain-evals/blob/main/docs/benchmarks/2026-06-03-skillopt.md) 在 Claude Code 和 Codex 上结论都成立；Haiku 学的迁到 Sonnet 0→1.00，Sonnet 学的迁到 Haiku 0→0.71。但原始记录丢了，训练集和留出集用的是同一套评分规则 | **方法最严谨的一个**：只有在验证集上严格变好才接受修改。[evalkit](https://github.com/microsoft/SkillOpt/blob/main/docs/sleep/evalkit.md) 用 McNemar 检验、bootstrap 置信区间，还做 A/A 检查（同一配置跑两次，确认差异在噪声内）。Sleep 模式（5 晚 × 10 题）只用了一个随机种子（42），作者承认 ±1–2pp 以内算噪声；换种子 42 / 43 / 44 分别得到 −1.9 / +3.6 / +4.7（[RESULTS.md](https://github.com/microsoft/SkillOpt/blob/main/docs/sleep/RESULTS.md)） | 每晚一份报告，外加等人工审核的修改提案 |
| **Reef** | 复现 Meta-Harness：在 Terminal-Bench 子集上重测，Reef 22/60，上游 21/60，作者明说"not a held-out task evaluation"（[README](https://github.com/Human-Agent-Society/reef/blob/main/recipes/meta_harness/examples/terminal_bench/README.md)）。SkillClaw 设了对照组，进化 6 晚后 +12.05 分，属于初步结果（[skillclaw](https://github.com/Human-Agent-Society/reef/blob/main/recipes/skillclaw/README.md)） | 部分 | 无 | 【自报】，但写得很坦白 | 每次测量重复 2 次，只接受严格变好的修改；用 Harbor 0.20.0 | 无 |
| **Perplexity Brain** | 离线：44 个合成用户画像、640 题，开知识库 vs 关知识库（其他记忆功能都保留），准确率 0.600→0.661。**近 30 天每日成对回放**：正确性 +9.3，时效性 +8.0，召回 +8.9，token 省约 15%。随机化线上实验：和记忆相关的不满意下降 6.9%（原文 403 打不开，读的是 [Wayback 快照](https://web.archive.org/web/20260902032229/https://www.perplexity.ai/hub/blog/brain-agentic-memory-as-a-knowledge-wiki)） | 否 | 无 | 【自报】；有第三方报道明确写"no independent benchmark yet"（[fourweekmba](https://fourweekmba.com/perplexity-brain-self-improving-agent-memory/)） | 只保留"让数字变好"的改动，所以评测器同时也是优化器，**有对评测集过拟合的风险**。LoCoMo 跑了 3 次；在 LME-S 上没有显著差异 | 用户能看到主题、来源链接、知识图谱。归因指标：84% 的题目里，Agent 确实访问了与标准证据绑定的来源 |
| **Codex memories** | **没有官方评测**（[docs](https://learn.chatgpt.com/docs/customization/memories.md?surface=app)，[讨论 #12567](https://github.com/openai/codex/discussions/12567)） | 是 | 无 | —— | —— | 代码里有 **`MemoryCitation`**：模型输出"文件:行号 + 说明"，推送到界面显示（[citations.rs](https://github.com/openai/codex/blob/main/codex-rs/memories/read/src/citations.rs)）。还有 OTEL 计数器 `codex.memories.usage` 和 `codex.memories.tool.call`（[memory_usage.rs](https://github.com/openai/codex/blob/main/codex-rs/core/src/memory_usage.rs)，[PR #24583](https://github.com/openai/codex/pull/24583)）。**没有公开的汇总数据** |
| **Claude Code auto memory** | **没有官方评测**（[docs](https://code.claude.com/docs/en/memory)）。能找到的相关数字：API 的 memory tool 配合 context editing 在内部评测上 +39%（[blog](https://claude.com/blog/context-management)）；dreaming 功能的客户 Harvey 自称"6 倍"，只见于媒体报道【未核实】 | 是 | 无 | —— | —— | 界面会提示"Saved / Recalled N memories"。`/skill-doctor` 只看 skill 的使用量和上下文占用（[docs](https://code.claude.com/docs/en/skills#find-unused-skills)） |

---

## 二、可以直接拿来用的编码 Agent 记忆 / 持续学习基准

下面的 arXiv 编号都确认存在。所有结果都是作者自报，**没有一项被独立复现**。

| 名称 | 测什么 | 任务流怎么设计 | 运行成本 | 支持多个 Agent？ | 链接、许可证与结论 |
|---|---|---|---|---|---|
| **CL-Bench（Berkeley）** [2606.05661](https://arxiv.org/abs/2606.05661) | 有状态的系统比无状态的系统多拿多少收益，以及归一化后的收益 | 其中 `codebase_adaptation` 共 19 个真实 PR 修复：先做 tablib 的 9 个，再做 tenacity 的 10 个，按仓库分块、按顺序进行 | ACE 方法每次运行 $62.80 | **内置 claude、codex、mem0、ace、icl 五种系统**。Claude 那一路用原生的 auto memory 目录，支持预置种子记忆、做快照、注入 skill（[README](https://github.com/pgasawa/continual-learning-bench/blob/main/src/systems/claude/README.md)） | [repo](https://github.com/pgasawa/continual-learning-bench)，Apache-2.0。结论：**最朴素的上下文学习（ICL）效果最好**。只有 19 题，统计效力低 |
| **VALVE** [2609.32990](https://arxiv.org/html/2609.32990) | 带验证门槛的 skill 库能不能自我进化 | 用 SWE-smith 的 4 个仓库，每个仓库切成 100 题测试集 + 固定的 50 题验证面板 + 约 1000 题的进化任务流；每题跑 3 次 | **每次运行 50–122 小时** | 只用 mini-SWE-agent | 没找到代码，9 月 26 日刚发布。报告收益 +14.9，回撤减少 75% |
| **VibeMemBench** [2609.23570](https://arxiv.org/abs/2609.23570) | 现成的记忆系统在真实仓库的编码任务上有没有用 | 111 个目标、90 个仓库，另有 3634 条历史轨迹，按时间顺序排列以防泄漏；每个目标跑 4 个随机种子，用 1 万次 bootstrap 算置信区间；设了"无关记忆"对照组 | 没给金额 | mini-SWE-agent，另有 5 个留出的解题模型。经验冻结后迁移给这 5 个模型，属于**跨模型**迁移 | 代码状态为"Coming"（[dir](https://github.com/AlibabaResearch/DAMO-ConvAI/tree/main/VibeMemBench)）。**12 个组合里有 11 个不比关掉记忆好**；冻结的已验证经验只多出 +1.1 到 +4.5pp |
| **SWE Context Bench** [2602.08316](https://arxiv.org/html/2602.08316) | 相关任务之间能不能复用经验 | 1100 个基础任务 + 376 个相关任务，覆盖 51 个仓库。对比 5 种条件：无上下文、自选轨迹、标准答案轨迹、自选摘要、标准答案摘要 | 没给 | 5 个模型，测了 Mem0、Supermemory 等 | 没找到代码。用标准答案摘要约 +8pp；不加筛选的上下文几乎没用，甚至有害 |
| **EvoAgentBench** [2607.05202](https://arxiv.org/html/2607.05202v1) | 训练阶段学到的东西能不能迁移到测试阶段 | SWE 部分用 Verified 的 87 题训练、56 题测试；离线构建后冻结；跑 3 次 | 只报了轮数 | 2 个框架（OpenClaw、Nanobot）；构建经验的模型和评测用的模型不同 | [repo](https://github.com/EverMind-AI/EvoAgentBench)。出自 EverMind，和 EverOS 是同一家，有利益关系。**每种方法都至少在一种设置下出现负迁移** |
| **SWE-Bench-CL** [2507.00014](https://arxiv.org/html/2507.00014) | 顺序做题时的遗忘、前向迁移和后向迁移、学习曲线面积 | 从 Verified 取 8 个仓库、273 题，按时间和难度排成课程 | 约 $15–150【估算】 | 只有作者自研的 Agent | [repo](https://github.com/thomasjoshi/agents-never-forget/)，MIT。**实验还没做完，只是个提案** |
| **SWE-smith / SWE-bench-Live** | 任务来源，不是持续学习基准 | SWE-smith 可以为任意仓库合成任务，共 5.2 万个实例；Live 每月新增 50 题 | 需要 Docker | Harbor 有 [swesmith 适配器](https://github.com/harbor-framework/harbor/tree/main/adapters/swesmith) | [SWE-smith](https://github.com/SWE-bench/SWE-smith)，[Live](https://github.com/microsoft/SWE-bench-Live)。Live 的规则**允许仓库级的通用指令，禁止针对单个题目的解法**，这正好划出了记忆插件的合规边界 |
| **SkillsBench** [2602.12670](https://arxiv.org/abs/2602.12670) | skill 到底有没有用 | 87 题，成对比较"无 skill / 人工整理的 skill / Agent 自己生成的 skill" | 没给 | **v4 有 18 种"模型 × Agent"组合**，含 Claude Code、Codex、Gemini CLI、OpenHands | [repo](https://github.com/benchflow-ai/skillsbench)，Apache-2.0。人工整理的 skill +16.6pp；早期版本里**自己生成的 skill 平均没有收益**，最新 HTML 版报告为 −8~−11pp（后一个数字来自 fork 的摘录，未逐字核实） |
| **SkillLearnBench** [2604.20087](https://arxiv.org/abs/2604.20087) | 自动生成 skill 的方法效果如何 | 20 题、100 个实例（其中 SWE 5 题） | 每种方法约 39–59 万 token | 固定用 Sonnet 4.6 | [repo](https://github.com/cxcscmu/SkillLearnBench)，MIT。最好的方法也只补上了约 45% 的差距 |
| **ContinualSkillBench** [2608.03874](https://arxiv.org/html/2608.03874) | skill 库在顺序做题中怎么演化 | 5 个领域各 100 题，按依赖关系排序；**不含编码** | 没给 | **基于 Harbor，用 Codex CLI 和 Claude Code** | ICL 0.605，维护 skill 库 0.602，两者几乎一样 |
| **EvoHarnessBench** [2609.04280](https://mas-orchestra.salesforceresearch.ai/evoharness/) | 工具集不断扩张时会不会遗忘（这里的 harness 指工具集，不是 CLI） | 17 条任务流、802 题，来自企业运维任务，不是 SWE | 没给 | 测了 Codex、Claude Code | Salesforce |
| **Fragility 协议** [2608.18066](https://arxiv.org/html/2608.18066) | 自我改进本身稳不稳定 | WebArena、SCUBA（**网页任务，不是编码**）。同一配置跑 3 次，用默认顺序和 2 种打乱顺序；做 Welch t 检验 | 每次运行约 $25–29 | —— | [repo](https://github.com/SalesforceAIResearch/self-improve-fragility)，Apache-2.0。同一配置的多次运行之间最多相差 10pp；默认顺序里暗藏由易到难的课程，打乱后 +1.5% 变成 −4.5% |
| **MemoryAgentBench / Evo-Memory / LoCoBench-Agent** | 通用记忆能力 | 分块增量注入；只做了易→难和难→易两种顺序；LoCoBench-Agent 的"multi-session"其实是**单次会话内** | —— | MemoryAgentBench 已接入 mem0、letta | [MAB](https://github.com/HUST-AI-HYZ/MemoryAgentBench)，[Evo-Memory](https://arxiv.org/html/2511.20857)，[LoCoBench-Agent](https://github.com/SalesforceAIResearch/LoCoBench-Agent)。都**不是**跨会话的编码记忆 |
| **MERIT** [2609.05441](https://arxiv.org/abs/2609.05441) | 检索到的记忆是否真的被用上 | 自动检查泄漏；设了"记忆被篡改"对照组；3 个模型 × 3 个随机种子，实验方案事先注册 | **23,440 个回合共 $42.57** | 工具型 Agent | 结论：**即使检索对了，也只有 55% 的情况 Agent 真的照着做** |
| **Terminal-Bench 2.x / Harbor-Index** | 通用的终端任务能力 | 89 题 / 82 题，题目彼此差异很大 | 前沿模型跑一轮要"几百美元"（[tbench](https://www.tbench.ai/news/harbor-index)） | Harbor 原生支持 | 题目之间没有可以学到的共同结构，**不适合用来测记忆** |

**命名陷阱**：Harbor 里的 `clbench` 适配器对应的是腾讯的 Context Learning（[2602.03587](https://arxiv.org/abs/2602.03587)），不是上面 Berkeley 的 Continual Learning Bench。

---

## 三、产品里、线上怎么衡量记忆有没有用

**GitHub Copilot 的 agentic memory**（[blog](https://github.blog/ai-and-ml/github-copilot/building-an-agentic-memory-system-for-github-copilot/)，【自报】）是目前做法最完整的线上评测：
- 每条记忆都带一个指向代码位置的引用，使用前实时校验。
- 做了对抗测试：故意注入和代码相矛盾的记忆，但没给数字。
- 线上 A/B 测试：coding agent 的 PR 合并率 83%→90%，代码审查好评 75%→77%，p<0.00001。
- 同一个记忆池由 coding agent、代码审查、CLI 三个入口共同写入。

**Perplexity Brain**（见第一节）：离线消融、每日成对回放、随机化线上实验三层都有。归因方式是看 Agent 有没有访问与标准证据绑定的来源（84%）。

**Meta "Organizational Second Brain"**（[engineering.fb.com](https://engineering.fb.com/2026/09/02/ml-applications/organizational-second-brain-ai-learns-from-experts/)，【自报】）：
- **定向回放**：在触发专家反馈的原场景里重新运行 Agent，Agent 不知道自己在被测试；再由一个不知情的裁判，把新输出和专家反馈对照打分。
- 之后跑领域回归测试集；改动以 PR 形式交专家审核；每个修复过的问题都加进回归集。
- 结果只有定性描述（"zero regressions"）。

**TencentDB**：
- 有用量和成本类的代理指标：渗透率、绕过率、召回命中数和分数（[metric-tracking-recall.ts](https://github.com/TencentCloud/TencentDB-Agent-Memory)）。
- `/analyse` 让模型自己说明每条记忆有没有用。
- **没有**因果意义上的"记忆被用上"指标。

**Hermes / OpenClaw**：
- 注意名字别搞混：Hermes 实际有的是 **Curator**（[curator.md](https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/curator.md)），用 `.usage.json` 记录每个 skill 被查看、使用、修改的次数，14 天没用标为过期，30 天归档。Skill Workshop 是 **OpenClaw** 的功能，修改要走"提案 → 评估 → 应用"的流程（[docs](https://docs.openclaw.ai/tools/skill-workshop/proposals)）。
- OpenClaw 的 `skills curator status` 只统计可信的 `skill.used` 事件，并明确写着"not recorded, not proof that a skill was never used"（[cli](https://docs.openclaw.ai/cli/skills)）。
- 两者都只记用量，不评估效果。

**Claude Code**：
- `/skill-doctor` 只看使用量和上下文占用。
- **`claude plugin eval`**（[docs](https://code.claude.com/docs/en/plugin-evals)）：默认每个用例在"装插件"和"不装插件"两种条件下各跑 3 次，报告两组分数和差值。不装插件时必然为 0 的评分项（比如"是否调用了 skill"）会自动排除，避免差值虚高。
- **对 meme 的关键限制**：每次运行都在隔离环境里，里面**没有记忆，也没有 skill**，所以要用 scaffold_script 或用例里的"earlier conversation"来预置状态。

**Codex**：有 `MemoryCitation` 和两个 OTEL 计数器（见第一节），没有公开结果。

**ChatGPT Dreaming V3 和 Cursor / Windsurf**：
- ChatGPT Dreaming V3 报了事实召回 41.5→82.8 等数字，只见于二手报道（[digitalapplied](https://www.digitalapplied.com/blog/chatgpt-memory-dreaming-v3-openai-2026-guide)）【未核实】。
- Cursor 和 Windsurf 的记忆功能没找到任何公开评估。

**记忆归因类指标一览**：

| 指标 | 来源 |
|---|---|
| 回复里有没有显式引用记忆（采信率） | Hindsight |
| 引用记忆的出处 | Codex |
| 使用前校验记忆的引用 | Copilot |
| 是否访问了标准证据来源的比例 | Perplexity |
| 检索到了多少、实际用上多少（只有 55%） | MERIT |

这些都说明："召回了"不等于"用上了"，"用上了"更不等于"有帮助"。其中只有 Copilot 和 Perplexity 真正做了线上对照实验。

---

## 四、跨 Agent 迁移的评估

**真正单独测过"Agent A 产出、Agent B 使用"的，只有两项研究：**

1. **MUSE-Autoskill**（[2605.27366v2](https://arxiv.org/html/2605.27366v2)）
   - 设置：把 Codex、Claude Code、MUSE 各自生成的 skill 注入 Hermes，全部用 GPT-5.5，在 SkillsBench 的 75 题上测。
   - 结果：

     | 注入 Hermes 的 skill | 分数 | 相对无 skill |
     |---|---|---|
     | 无 skill | 37.24 | —— |
     | 人工写的 | 48.02 | +10.78 |
     | **Codex 生成的** | 37.01 | **−0.23** |
     | Claude Code 生成的 | 45.97 | +8.73 |
     | MUSE 生成的 | 51.90 | +14.66 |

   - 局限：每题只跑 5 次；接收方只有 Hermes 一个；skill 在同一批题上生成又在同一批题上测，作者自己说收益可能被高估；作者本身就是被比较的一方。

2. **SkillOpt 表 4(b)**（[2605.23904](https://arxiv.org/html/2605.23904)）
   - 以下数字是从网页抽取的，各列的确切含义没有逐字核实。

     | 迁移方向 | LiveMath | SpreadsheetBench |
     |---|---|---|
     | Codex → Claude Code | 基线 40.8，迁移后 +1.6，在接收方里直接优化可到 56.5 | 22.1，+59.7，80.4 |
     | Claude Code → Codex | 35.2，+12.8，78.4 | 27.5，+43.6，85.0 |

   - 结论：**迁移效果不对称，而且很依赖具体基准**。在 LiveMath 上，从 Codex 迁到 Claude Code 几乎没剩下什么收益。gbrain-evals 做过小规模的跨模型复现（见第一节）。

**只跨模型、不换 Agent 的研究**：
- ContraMem（[2608.22533](https://arxiv.org/abs/2608.22533)）：3 个强模型构建的记忆给 Qwen3.7 用，18.5→35.5，McNemar 检验 232 对 23。
- WikiSkill（[2608.27454](https://arxiv.org/abs/2608.27454)）：强模型的 skill 给弱模型用，24.3→50.5；反过来弱模型的 skill 给强模型也有效；跑了 3 次。
- **SkillLens**（[2605.23899](https://arxiv.org/abs/2605.23899)）：做了"生成方 × 使用方"矩阵，**25% 是负迁移**（SWE-bench 13%，ALFWorld 47%）；而且擅长提炼经验的模型，不一定擅长使用经验。
- SkillWeaver（[2504.07079](https://arxiv.org/abs/2504.07079)）：强模型产出的 API 给弱模型用，最多相对 +54.3%。
- StateM（[2608.15089](https://arxiv.org/abs/2608.15089)）：runbook 原样换给 GPT-5.6 仍然有效。
- VibeMemBench 和 EvoAgentBench（见第二节）也属于跨模型。
- Agent KB（[2507.06229](https://arxiv.org/abs/2507.06229)）自称跨框架，但**没有单独做"只拿框架 A 的经验去测框架 B"的实验**，而且会把同一道测试题的诊断写回知识库，迁移效果没有被隔离出来。

**产品方面**：agentmemory、Honcho、TencentDB、Hindsight 的 Cursor 博客（[blog](https://hindsight.vectorize.io/blog/2026/06/12/cursor-persistent-memory)）、engram 都只是宣称"可以跨工具使用"，都没有测过。[agentskills.io](https://agentskills.io) 只承诺格式可移植。

**结论**："没有产品测量过跨 Agent 迁移"**基本成立**，但要补一处限定：
- GitHub Copilot 的多个入口共用一个记忆池，并做了线上 A/B，但比的是"记忆开 vs 关"，**没有按"这条记忆是哪个 Agent 写的"拆开**。
- 研究层面已经有人测过（MUSE-Autoskill、SkillOpt），结果**可能为零甚至为负**。

所以 meme 如果做一个受控的跨 Agent 迁移测量，会是记忆插件里的第一个。

---

## 五、没有 Codex 订阅，怎么低成本跑第二个 Agent

**可选方案**：
- **Codex CLI + OpenAI API key**
  - 官方支持用 API key 登录，按 API 标准价计费（[auth docs](https://developers.openai.com/codex/auth)）。Harbor 的 codex 适配器默认也走 `OPENAI_API_KEY`，要另外设置才会用 auth.json。
  - 便宜的模型：Hindsight 实验用过 GPT-5.4 mini；GPT-5.6 Luna 标价 $0.20 / $1.20 每百万 token（来自第三方汇总 [cloudzero](https://www.cloudzero.com/blog/openai-pricing/)，官网 403，未核实）。
  - 用 API key 登录时，本地 memories 功能能不能用【未核实】。
- **Codex + OpenRouter**
  - 必须设 `wire_api="responses"`，chat 协议已在 2026 年 2 月移除（[OpenRouter 教程](https://openrouter.ai/blog/tutorials/codex-cli-openrouter/)）。
  - 最好还是配 OpenAI 的模型，配别家模型会出现"Unknown model"警告。
- **Pi + DeepSeek**
  - 有官方接入文档（[DeepSeek×Pi](https://api-docs.deepseek.com/quick_start/agent_integrations/pi_mono/)）。
  - V4.1-Flash 高峰价：输入 $0.30、输出 $1.20，缓存命中 $0.006；非高峰时段半价（[pricing](https://api-docs.deepseek.com/quick_start/pricing)）。
- **OpenCode + Zen**
  - DeepSeek V4 Flash $0.14 / $0.28。
  - 有一些免费模型，但**多数会用你的数据做训练**（[Zen](https://opencode.ai/docs/zen/)）。
- **OpenRouter 免费模型**
  - 限额是每天 50 次请求，充过 $10 后升到每天 1000 次；每分钟 20 次（[limits](https://openrouter.ai/docs/api_reference/limits)）。
  - 一个 Agent 任务要 20–100 次请求，所以每天大约只够跑 10–50 个任务【估算】。
- **固定模型、只换 Agent**
  - DeepSeek 提供兼容 Anthropic 格式的接口（[doc](https://api-docs.deepseek.com/guides/anthropic_api)），Claude Code、Pi、OpenCode 可以都接同一个 DeepSeek 模型，这样就能把 Agent 本身的影响单独分离出来。
  - 注意：通过 Claude Code 走 OpenRouter 调开源模型，缓存命中率低，成本会被放大（[Harbor-Index](https://www.tbench.ai/news/harbor-index)）。

**Harbor 能提供什么**（[repo](https://github.com/harbor-framework/harbor)，Apache-2.0）：
- 源码中已确认内置了 claude_code、codex、pi、opencode、hermes、openclaw、mini_swe_agent 等适配器。
- 用 `--skill` 注入 skill 时，会把内容的 SHA-256 摘要写进 lock 文件（[skills.mdx](https://github.com/harbor-framework/harbor/blob/main/docs-mintlify/core-concepts/jobs/skills.mdx)），保证可复现。
- 支持 MCP server。
- 输出统一的 ATIF 轨迹格式，meme 可以直接拿来当学习素材。
- **限制：每次试验都在一个全新的容器里。** 做持续学习需要把记忆存储放在容器外面：通过 `mounts` 挂载目录，或者用宿主机上的 MCP 服务；同时用 `--n-concurrent 1` 保证按顺序执行。这一条是推断，没有实测。

**每题成本参考**：

| 来源 | 成本 | 性质 |
|---|---|---|
| [SWE-rebench](https://swe-rebench.com/)（111 题） | Codex agent $1.59/题，Claude Code $3.39，Cursor $0.41；便宜模型 $0.10–0.15（GPT-5.6 Luna $0.11，DeepSeek-V4 Pro $0.15） | 第三方排行榜【独立】 |
| Hindsight sde-bench | 每组 61 题 $17–39，约 $0.3–0.6/题 | —— |
| Terminal-Bench 2.1 + DeepSeek-V4 Flash | 445 次试验约 $15，约 $0.03/次；GPT 参考组约 $1.3/次（[StateM](https://arxiv.org/abs/2608.15089)） | 按总额推算【估算】 |
| Context-Bench | 整轮 $24.58 | —— |
| MERIT | 2.3 万个回合共 $42.57 | —— |
| VALVE 全规模 | 每次运行 50–122 小时 | 个人开发者跑不起 |

**试点预算示例**【估算】：2 个 Agent × 3 种条件 × 3 个随机种子 × 40 题 = 720 次试验。用 DeepSeek Flash 或 Luna，按每次 $0.05–0.15 算，约 **$40–110**。

---

## 六、对 meme 验证方案的启示

**可信的做法（照着做）**：
- 在**留出题**上做"开 vs 关"对照；每个条件至少跑 3 次，至少试 2 种打乱后的任务顺序，报置信区间。可以照搬 Fragility 协议和 VibeMemBench 的"4 个随机种子 + bootstrap"。
- 成对检验照搬 SkillOpt evalkit 的做法：McNemar 检验 + bootstrap 置信区间 + A/A 检查。
- 一定要放三类**强基线**：
  - 朴素的上下文学习（ICL）；
  - 人工手写的 AGENTS.md / CLAUDE.md 笔记；
  - 直接对历史对话做 grep。
  
  理由：Letta 的 grep 方案得到 74%；CL-Bench 里 ICL 最好；ContinualSkillBench 里 ICL 和 skill 库打平。打不过这些基线，就说明不了 meme 有用。
- 加两个对照组：**无关的记忆**、**被篡改的记忆**（参考 VibeMemBench、MERIT）。
- 结果按"题目是否必须依赖记忆"**分层报告**，不要只报总分。sde-bench 里"决策只在过去对话中出现"那类题，按设计就必然赢。

**便宜又有新意的方案：冻结快照，测跨 Agent 迁移**
1. 用现有的 Claude Code 在训练任务流上跑，开着 meme 积累记忆。
2. 把积累的记忆冻结成快照，以 skill 或 MCP 的形式注入。
3. 在留出题上，用第二个 Agent B 跑：Pi 或 OpenCode（配 DeepSeek），或者 Codex（配 API key）。对比四种条件：
   - B 不带记忆；
   - B + A 积累的记忆；
   - B + B 自己积累的记忆；
   - B + 人工写的笔记。
4. 尽量让所有 Agent 用同一个模型（比如都用 DeepSeek Flash），这样测出来的就是 Agent 本身的影响。

这是目前**没有任何产品做过**的测量。MUSE-Autoskill 里 Codex 生成的 skill 迁移后是 −0.23，说明结果完全可能是零或负，必须如实报告。

**任务流**：
- 先用 CL-Bench 的 `codebase_adaptation` 做冒烟测试，它已经内置了 claude 和 codex 两路。
- 再参照 VALVE 的做法，用 SWE-smith 缩小规模自己切：1–2 个仓库，每个切成约 30 题测试集 + 20 题固定验证面板 + 100–200 题进化任务流。
- 只保留基线通过率在 30–70% 之间的题（[2603.23749](https://arxiv.org/abs/2603.23749)），避开太容易和太难的题。

**线上指标**：
- 可以同时做三类：Codex 式的引用出处、Hindsight 式的采信率和读取率、TencentDB 式的绕过率。
- 但要明确这些**只是代理指标**：MERIT 显示检索对了也只有 55% 被用上；Hindsight 真实数据里的读取率只有 0.5%。
- 要真正证明"有用"，得学 Copilot 或 Perplexity 做开关 A/B，或者学 Meta 做定向回放。

**要避免的坑（上面各项目都犯过）**：
- **在同一批题上学完又在同一批题上测**：Letta 的 +36.8%、MUSE-Autoskill 都是这样。
- **验证器反馈泄题。**
- **召回率和答题准确率混着比**：MemPalace、agentmemory、Supermemory。
- **对着测试集调参**：MemPalace 的"100%"。
- **只用一个随机种子，或者只用默认顺序**：默认顺序里暗藏由易到难的课程。
- **把估算的 token 节省当成实测**：claude-mem、agentmemory。
- **用使用次数代替效果**：ECC 的计数 bug。
- **把合著者的复现称为"独立复现"**：Hindsight。
- **评测器同时也是优化器，又不留出数据**：Perplexity 有这个风险。
- **Harbor 并行跑会打乱顺序，而且容器之间的记忆不共享。**
- **`claude plugin eval` 的运行环境里默认没有记忆**，要自己预置。
- **心理预期要放低**：SkillsBench 里自己生成的 skill 效果为负；VibeMemBench 12 个组合里有 11 个不如关掉记忆；EvoAgentBench 和 SkillLens 都出现了负迁移。**如实报告零收益和负迁移，本身就能让 meme 比大多数项目更可信。**
