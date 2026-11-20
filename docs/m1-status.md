# meme 第一版首页（存档）

> 这是 2026-10-13 第一版时的文档首页，留作记录：第 1–4 节的状态、路线图和导航已过时，现状和导航见 [README.md](README.md)；第 5 节问题清单里仍有有用的内容。

> 更新：2026-10-13（第 ⑤ 步真机测试三轮都通过；开发窗口做完全面复查）
> meme 把 Claude Code、Codex 等编码 Agent 的会话**如实转成统一格式存下来**，换一个 Agent 也能**接着做**（第一版支持 Claude Code、Codex）。第一版是纯代码，不调用 LLM；第二版在这个基础上做记忆层。

---

## 1. 当前状态

| 阶段 | 状态 |
|---|---|
| 调研 | ✅ 完成：市场、各 Agent 接入面、原生落点、模型调用、评测方法 |
| PRD | ✅ v0.7（10-12）：第一版 = 如实转化 + 接力，纯代码；不装 skill、不生成接力文件 |
| 概要架构 | ✅ v0.3，10-12 补 6.1–6.4 节和 D19、D20：不调用 LLM，不用 hook，不用后台任务 |
| 记忆层设计 | 🟡 读取、抽取、写入已定，注入还在讨论；第二版之前再继续 |
| **当前** | 第一版的五步设计都已完成。M1 开发计划见 [plan.md](design/plan.md)，代码在 `~/work/meme`：第 ① 到 ⑧ 小步已完成（标签 `m1-1` 到 `m1-8.4`）；中英文 README、五个平台的交叉编译也已做完。<br>· 第 ⑥ 步交接打磨：交接内容的结构、长度和删减顺序见 [handoff.md](research/market/handoff.md) 7.3 节；<br>· 第 ⑦ 步 Agent 升级的防护：每家一份档案、读不了时降级、两层报警（[arch.md](design/arch.md) 6.1 节、D19）；<br>· 第 ⑧ 步在哪接着做：推送只在会话开始的目录启动，拉取在别处接会提醒；跨设备暂不支持，Windows 和 WSL 算一台机器（arch.md 6.3、6.4 节、D20）；之后的 8.1–8.4：各家长度上限（Claude Code 2.7 万字节）、`forget` 不删开着的会话等。<br>· 第 ⑤ 步真机测试：三轮都通过（2026-10-13）；Windows 读 WSL 保留（arch.md 6.2 节）。<br>**正在做**（2026-10-13）：开发窗口的全面复查回来了（33 条问题、文字问题、PRD 逐条验收、已知缺口），正在逐项定修哪些，修复算第 ⑨ 步。<br>**推迟的**：发布准备（plan.md 共 9 项，其中 Windows 和 WSL 的 5 项见 arch.md 6.2 节；另加"用户怎么报问题"，见 arch.md 6.5 节）；AI 摘要模式放到第一版以后（handoff.md 7.9 节）。<br>**第 ⑩ 步**（2026-10-13）：第一版再加两家 Agent：OpenCode 1.x、Pi（第一版共四家；Copilot CLI 放到发布后），只做核心功能；真机测试 H1–H6、W1–W4 已通过，打了 `m1-10`（2026-10-13）；第一版的四家都接上了。**之后**：，先本机试跑（2026-10-13 定，PRD 第 2 节、arch.md 6.1 节第 6 条）；你自己用几天 |

代码仓库：`~/work/meme`（里面有指向本文档的 `CLAUDE.md`；本地提交，标签到 `m1-8.4`，还没 push）。

---

## 2. 路线图

```
第一版 基础层（纯代码，如实）                      M0 → M1 → M1.5 LinuxDO 首发
  读取各家会话 → 转成统一格式存下来 → 列出、检索 → 在新会话里接力
                                   │
第二版 记忆层（用 LLM）               ▼  建在基础层之上            M2
  会话卡 · 提炼 → 写入经验库 → 注入 → 反馈
```

| 里程碑 | 内容 | 预计 |
|---|---|---|
| M0 技术打通 | 逐项验证 [arch.md](design/arch.md) 第 10 节的 V1–V9 | 约 1 周 |
| M1 第一版 | PRD 第 5.1 节 | 约 3 周 |
| M1.5 首发 | LinuxDO 发布（**推迟**：等功能完整后再做发布准备，2026-10-10） | 约 1 周 |
| M2 记忆层 | 按 memory.md 实现 | 待定 |

---

## 3. 第一版的步骤

按数据流向一步一步来。每一步都是：先讨论定框架 → 用一次性脚本验证 → 写进详细设计。

| 步骤 | 要定什么 | 对应的验证项 | 状态 |
|---|---|---|---|
| **1. 读取** | 各家会话在哪、怎么读、读出来有什么；WSL 和 Windows 两边怎么处理 | V1、V2、V3 | ✅ Claude Code 已实测并定下四条（[sessions.md](research/tech/sessions.md) 第 5 节）；Codex 10-08 已实测（sessions.md 第 7 节），第 ③ 小步已接入 |
| **2. 统一存储** | 统一格式保留什么；怎么脱敏；镜像怎么存；怎么同步删除；增量导入 | V4 | ✅ 已实测并定下五条（[storage.md](research/tech/storage.md) 第 3 节）；不压缩；外层字段清单挪到第 3 步 |
| **3. 列出与检索** | `meme ls` 显示什么；`meme show`；`meme search`；外层字段清单 | —— | ✅ 已定：`meme ls`（照 `/resume` 的样子，标出来源，不显示"最后停在哪"）；`meme show` 已定（默认每轮折成一行，需要时展开）；`meme search` 已定（不建索引，用法照 rg）；只在终端输出；外层存"每个会话 8 项 + 每条记录 4 项"（[format.md](design/format.md)）（[list.md](research/tech/list.md)） |
| **4. 接力** | 接力内容提取什么、长度预算；在新会话里拉取、在终端推送；截断测试 | V5、V6、V7、V8 | ✅ 接力内容已定，10-12 第 ⑥ 步定稿以 [handoff.md](research/market/handoff.md) 7.3 节为准；V5 小试已做；V6、V7、V8 都已测通（[relay.md](research/tech/relay.md) 第 4、5 节；V6 的 skill、V7 的接力文件已被 D17、D18 取代） |
| **5. 安装与发布** | 编程语言、是否走 npm；`meme install` / `forget`；skill；兼容表；首发 | —— | ✅ 基本定完（10-10：第一版不装 skill，接力由用户用命令选，见 arch D17）：TypeScript + Bun 单文件为主、npm 为辅；安装、`meme forget`、产品语言（英文为主，附中文 README）、名字（`meme`，先放个人账号）都已定；兼容表先不做；npm 包名和首发帖留到首发前（[release.md](research/tech/release.md)；README 已写） |

---

## 4. 文档导航

### 设计 `design/`

| 文件 | 内容 | 状态 |
|---|---|---|
| [prd.md](design/prd.md) | 产品需求：目标、用户故事、范围、成功标准、里程碑 | v0.7（10-12），**最新** |
| [arch.md](design/arch.md) | 概要架构：模块、流程、数据目录、接入方式、Agent 升级的防护、WSL 和 Windows、在哪接、用户怎么用（6.1–6.4 节）、技术选型、决策 D1–D20、M0 验证项 | v0.3，10-12 补充，**最新** |
| [plan.md](design/plan.md) | **M1 开发计划**：流程、每条命令的功能说明、技术架构（技术栈、目录、数据库表、适配层接口、关键算法、系统差异）、测试、第 ① 到 ⑧ 小步的任务和验收、发布准备（9 项） | 由开发窗口维护，**最新** |
| [format.md](design/format.md) | 统一格式的外层存什么：每个会话 8 项（后加 3 项）、每条记录 4 项，另有记读不了的两张表；各从哪来、为什么存 | v0.4（10-12），已定 |
| [memory.md](design/memory.md) | 第二版记忆层设计：读取、抽取、写入、注入 | v0.2；整体属于第二版 |

### 调研 `research/`

| 分类 | 文件 | 内容 | 状态 |
|---|---|---|---|
| 市场 `market/` | [landscape.md](research/market/landscape.md) | 竞品、各 Agent 接入面、适配问题（09-30） | 第 1–10 节有效；第 11、12 节过时 |
| | [trends.md](research/market/trends.md) | 2026-09 至 10 月新出现的 Agent、记忆新思路、用户原话 | 有效 |
| | [ideas.md](research/market/ideas.md) | 新研究、14 个产品点子、红旗清单 | 有效，主要供第二版参考 |
| | [frontends.md](research/market/frontends.md) | 多 Agent 前端与跨 Agent 会话续接、迁移工具、协议 | 有效，第一版的主要依据 |
| | [handoff.md](research/market/handoff.md) | 跨 Agent 交接：9 种情况、9 条路线；meme、Cindy、memmy、catchup 的源码细节；30 多个产品带什么、怎么交、长度上限；十几家 AI 摘要怎么写；论文证据；对"AI 摘要 / 不用 AI"两种模式的建议；竞品提醒 | 10-08 首版，10-12 重写；7.3 节是第一版交接内容的定稿；7.9 节剩下的只涉及 AI 摘要模式（不在第一版） |
| | [clients.md](research/market/clients.md) | 类 Cherry 客户端、Vibe Kanban、issue 痛点统计、社区声音 | 有效，第一版的主要依据 |
| 技术 `tech/` | [sessions.md](research/tech/sessions.md) | 会话读取实测：Claude Code 会话的结构、trajectory 读出来丢了什么、WSL 和 Windows；参照 cc-switch 怎么读会话（第 6 节） | 10-08，第 1 步 |
| | [list.md](research/tech/list.md) | 列出与检索：Claude Code `/resume` 的样子、cc-switch 的做法、会话怎么结束的实测、中文搜索实测、`meme ls` `meme show` `meme search` 的决定 | 10-08，第 3 步已定 |
| | [release.md](research/tech/release.md) | 安装与发布：语言选择、Bun 打包实测（大小、启动、WSL 和 Windows）、Windows 的坑 | 10-08，第 5 步已定；第 4 节装 skill 的部分已被 D17 取代 |
| | [relay.md](research/tech/relay.md) | 接力：接力内容的样子、长度实测、WSL 读 Windows 仓库的换行符坑、已定的接力内容 | 10-08，第 4 步已定；接力内容以 handoff.md 7.3 节为准，skill 和接力文件已被 D17、D18 取代 |
| | [storage.md](research/tech/storage.md) | 统一存储实测：SQLite 镜像、增量导入、同步删除、删干净、脱敏 | 10-08，第 2 步 |
| | [native.md](research/tech/native.md) | 各 Agent 的原生加载位置、交叉读取、沙箱 | 有效；第一版只用到沙箱部分（不装 skill） |
| | [llm-access.md](research/tech/llm-access.md) | 订阅模式与 API 模式的条款、额度、成本 | 第二版才用；Anthropic 10-07 的变化待补 |
| 评测 `eval/` | [eval-survey.md](research/eval/eval-survey.md) | 记忆插件怎么证明有效、基准、实验方案 | 有效，主要供第二版参考 |
| | [a1-data.md](research/eval/a1-data.md) | 用公开数据检验"不同 Agent 反复踩同样的坑" | 对应的假设已移到第二版 |

通用背景：《Agent 自进化与记忆体系调研报告》（2026-09-29，没有收进本仓库）

---

## 5. 问题清单

### 5.1 第一版待定（在对应步骤里解决）

| # | 问题 | 在哪一步解决 | 出处 |
|---|---|---|---|
| 1 | ~~Codex 的会话读出来丢了什么~~：10-08 已实测，能读，系统注入自动去掉，工具结果没有"是否成功"，推理加密（sessions.md 第 7 节）。回退、分叉、归档第 ③ 步已实测；还没测：`.zst` | 1. 读取 | arch V1 |
| 2 | ~~编程语言；走 npm 还是单文件程序~~：已定，TypeScript + Bun 单文件为主、npm 为辅（release.md） | 5. 安装与发布 | —— |
| 3 | ~~接力内容的提取规则和长度预算~~：已定（handoff.md 7.3 节）。如实提取够不够用：V5 小试 7 个案例都答对，正式测试以后再做 | 4. 接力 | PRD 第 11 节；arch V5 |
| 4 | ~~Codex 沙箱里不能写 `~/.meme`~~：10-08 已验证，沙箱里能读不能写；`meme` 在沙箱里只读、跳过增量导入（relay.md 第 5 节） | 4. 接力 | PRD R2；arch V8 |
| 5 | ~~第一版要不要包含 Pi~~：已定，不包含，属第二级、有人要才加（D19，arch.md 6.1 节） | —— | PRD 第 11 节 |
| 6 | Codex 归档第 ③ 步已实测；`.zst` 的同步删除只用模拟数据测过 | 遇到 `.zst` 时 | storage.md 2.5 节 |
| 7 | ~~Codex 回退后一个会话有两个文件、分叉会重放上级历史~~：第 ③ 步已实测并实现（一个会话对应多个文件，按 `history_base` 拼，新文件不重放历史） | —— | storage.md 第 4 节 |
| 8 | 对外怎么讲：cc-switch 已经能"一处看会话"，PRD A4 写的"先讲一处看、一处搜，再讲接力"要不要改成先讲接力。10-09 补：**memmy**（记忆张量，国内团队，约 2k★）已经在讲"跨 Claude Code、Codex 接着做"，LinuxDO 上一定会被问"和 memmy 有什么区别"，README 和首发帖要正面回答：它是从记忆里召回，meme 是把会话如实交过去，而且不装服务、不调用模型 | 首发前 | sessions.md 第 6 节；PRD A4；handoff.md 第 8 节 |
| 9 | ~~接力时告诉接手的 Agent 上一轮做完没有；会话还在别的窗口运行时先提示~~：已做（Source 行的 `last turn:`、"may still be running" 提醒） | —— | list.md 第 3 节 |

### 5.2 记忆层待定（第二版之前解决）

| # | 问题 | 现状 | 出处 |
|---|---|---|---|
| 1 | **默认作用范围要不要收窄** | memory.md 4.1 节写的是"判断为通用的经验，一生效就注入所有 Agent"。但研究显示全局记忆反而更差：Scope Before You Persist 里全局检索 0.713，低于不用记忆的 0.775；VibeMemBench 里 12 种组合有 11 种不如关掉记忆 | memory.md 4.1；ideas.md 红旗清单 |
| 2 | **反馈怎么判断** | memory.md 4.5 节由 LLM 判断有用或有害；ideas.md 提出给每条经验配一个能自动检查的判据，并指出 LLM 当评判不可靠 | memory.md 4.5；ideas.md |
| 3 | **存储格式要不要兼容** | 最近出现了三种"Markdown + git"格式：Agent Memory Repo（10-05）、Open Memory Protocol（10-02）、Google 的 OKF（7 月，9 月起社区实现增多）；trends.md 的建议是兼容，不再自创格式 | trends.md；memory.md 5.5 |
| 4 | **常驻层写到哪里**，有三点等你确认 | native.md 的结论还没写进 memory.md 6.3、6.4 节：<br>① 常驻层原则改为：静态预编译，用户级写进各 Agent 专属的原生文件，项目级由插件或 hook 按当前目录读取；<br>② Codex 的用户级改用 SessionStart hook，不写 `~/.codex/AGENTS.md`；<br>③ Claude Code 的项目级改用插件的 SessionStart hook，不写 MEMORY.md | native.md；memory.md 6.3、6.4 |
| 5 | 注入的其余问题 | 各层挑哪些、用什么格式、和其他产品的对比 | memory.md 6.4 第 2–4 项 |
| 6 | 默认模型 | 第二版才调用 LLM；到时候在同一批会话上比较 2–3 个模型 | PRD 第 6 节 |
| 7 | **差异化方向** | ideas.md 里有 14 个候选点子，比如经验判据、会话小票、编译成护栏，都还没讨论。10-09 补：memmy 已经把 memory.md 的主体（抽取 → 分层经验库 → hook 注入 → reward 反馈）做出来了，而且做得更重；照原设计做就是和它正面撞。第二版开工前要先定差异点，或者把 meme 定位成如实会话的底座，让别家的记忆层来接 | ideas.md；handoff.md 第 8 节 |
| 8 | 记忆层的前提假设 | 跨 Agent 重复踩坑是否常见；能不能自动判断经验起了作用 | arch 第 10 节；a1-data.md；eval-survey.md |

### 5.3 文档里的遗留问题

| # | 问题 | 处理 |
|---|---|---|
| 1 | landscape.md 第 11、12 节的计划和待决事项已过时 | 已在文件开头加说明，正文没改 |
| 2 | llm-access.md 没有覆盖 Anthropic 10-07 的变化（Max、Team 套餐附带 API 额度，订阅额度仍可用） | 已加说明；第二版用到订阅模式之前再重新核对 |
| 3 | a1-data.md 检验的假设已移到第二版 | 已加说明 |
| 4 | memory.md 里的"第一版"指的是记忆层的第一版，"M1"现在对应 M2 | 已加说明，正文没改 |
| 5 | native.md 前后不一致：第 55 行把"Cursor 会不会加载 Claude 插件里的 hook"标为未验证，第 191 行已经确认会加载 | 以第 191 行为准；以后改正第 55 行 |
| 6 | landscape.md 里还有 4 条事实没有核实：Gemini CLI `save_memory` 的移除版本、Pi 的版本号跨度、OpenCode 的 `chat.message` 是否已移除、DeepSeek Harness 的 skills 路径 | 都不影响第一版；接入这几家时再查 |

### 5.4 调研盲区

| # | 问题 | 影响 |
|---|---|---|
| 1 | **LinuxDO 没能直接访问**（调研环境的 DNS 被拦），社区声音来自 V2EX 和 GitHub issue | 首发社区的真实反应没有直接证据；建议你自己去 LinuxDO 搜一下"会话""切换""交接"相关的帖子 |
| 2 | 作者只用 Claude Code，没有 Codex 订阅 | 已用 API key 跑出 Codex 会话并完成第 ③ 步；只剩订阅登录的 Codex（服务端压缩、摘要加密）没测 |
| 3 | 同类工具更新很快：codeg 已经能导入、搜索、恢复会话并交给另一个 Agent；cc-switch 从 v3.11（2026-02）起就能浏览 9 家的会话，v4 重写了阅读页，但没有跨 Agent 接力、正文搜索、命令行、WSL 和 Windows 合并、脱敏（见 sessions.md 第 6 节）；memmy 读取层和 meme 几乎一样，还带记忆层和 `/memmy-resume` 接力（见 handoff.md 第 8 节） | 首发前要再查一次，确认差异点（单个命令行程序、不装插件和服务、零配置、本地离线、跨 WSL 和 Windows、在 Agent 里直接拉取）还成立；最新的竞品对比见 research/market/handoff.md 第 8 节 |
| 4 | "meme"这个名字很难搜索，不带作用域的 npm 包名也已被占用 | 10-08 定：产品名就叫 `meme`；组织名先不定，放个人 GitHub 账号；npm 包名首发前再定（release.md 第 5 节） |

### 5.5 要准备的

- [x] 一个 OpenAI API key：用来运行 Codex，测试读取和接力
- [ ] ~~（可选）一个便宜模型的 key，比如 DeepSeek：只在截断测试里跑 LLM 总结的对比组时用~~：第一版不调用模型，不需要
- [ ] 首发前：定 npm 包名；用带作用域的名字要先确认 npm 上的作用域归你所有（release.md 第 5 节）
