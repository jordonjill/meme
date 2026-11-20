# 近期个人 / 通用 Agent 与 Agent 记忆动态

> 调研日期：2026-10-08；覆盖 2026-09-01 至 10-08
> 起因：担心记忆插件同质化太严重，想从新出现的个人 Agent 里找有意义或有新意的方向。
>
> **标记**：✅ 读过原始来源（官方页、GitHub、主流媒体、HN 原帖）；◐ 只看到二手转述；❓ 未核实。日期默认为 2026 年。
>
> **来源缺口**：Reddit 返回 403，X、小红书、即刻都没有被搜索工具收录，所以用户的声音主要来自 HN、GitHub issue、V2EX 和中文新闻站。国内的腾讯元宝、智谱、MiniMax、扣子、Kimi 没有覆盖到。

---

## 结论

1. **记忆格式开始争标准。** 一个月内同时出现了三种"Markdown + git"格式：Cognition 的 Agent Memory Repo（10-05）、Open Memory Protocol v0.1（10-02，Mozilla、IBM 参与）、Google 的 OKF v0.2（7 月发布，社区实现从 9 月起开始增多）。**meme 应该兼容它们，不要再发明一种格式。**
2. **同质化是真的，而且更严重了。** Devin、Grok Build、OpenAI Agents SDK、Claude Code、Meta Muse 都已经做了"后台整理 + 文件形式的记忆 + 按需逐级加载"。后台整理（dreaming）已经不算差异点了。
3. **反记忆的情绪很强。** 这段时间 HN 上讨论记忆最热的帖子是《Agents don't need memory, they need documentation》（380 分、305 条评论），很多开发者说自己"把记忆全关了"。痛点集中在维护和信任：过期、错误被固化、记了不遵守、串场、看不见。**没有人抱怨"记得不够多"。**
4. **真正有新意的方向**：按证据给记忆评级；整理只出提议，被接受后再测量效果；把纠错变成可执行的规则；"能用"和"能对外说"分开控制；一个人可以组合多份记忆。

---

## 一、新出现的 Agent 和重大更新

### 1.1 海外大厂

| 日期 | 产品 | 和记忆相关的新意 | 链接 | 核实 |
|---|---|---|---|---|
| 09-29 | **OpenAI Dots**（DevDay） | 常驻云端的 Agent，有自己的云电脑、名字、账号和形象。<br>记忆分三层：对话、ChatGPT 记忆、Dot 自己的私有笔记，最后这一层不受 ChatGPT 记忆设置控制。<br>"能用的信息"不等于"能对别人说的信息"：透露私密信息前要用户确认。<br>动作分四级：直接做 / 用户说了再做 / 先问 / 交给用户。<br>**缺点：单条记忆看不了、删不了，只能删掉整个 Dot**；断开插件也不会删掉它从插件里学到的东西。 | [文档](https://learn.chatgpt.com/docs/dots)、[TechCrunch](https://techcrunch.com/2026/09/29/openai-launches-dots-its-bubbly-agentic-avatar/)、[批评](https://www.kdnuggets.com/openai-dots-the-data-scientists-reality-check) | ✅（FAQ 为 ◐） |
| 09-29 | Sign in with ChatGPT | 第三方应用能用 ChatGPT 账号登录，并使用用户的订阅额度。**明确不提供记忆或对话的迁移**，权限只有身份信息。跨厂商的记忆迁移仍是空白 | [文档](https://developers.openai.com/siwc/quickstart) | ✅ |
| 09 月 | OpenAI Agents API 的沙箱记忆 | 记忆目录分几级逐层加载：摘要、MEMORY.md、每次运行的摘要、skills。三种模式：读写 / 只读 / 只生成。会话结束时整理。**和 meme 的设计高度重合** | [文档](https://developers.openai.com/api/docs/guides/agents/sandboxes) | ✅ |
| 背景 | Codex 记忆 | 每个对话可以分别设置"用不用记忆"和"要不要贡献记忆"；用过 MCP 或联网的对话，默认不生成记忆，防止被污染 | [文档](https://learn.chatgpt.com/docs/customization/memories) | ✅ |
| 09-16 | xAI Grok Build 记忆 | 按主题分文件，分项目级和全局两级，每轮结束后在后台记录。**明确不记**：任务状态、还没定的结论、密钥、仓库里已有的文档。用 `/dream` 整理；当前指令优先于记忆 | [Unite.ai](https://www.unite.ai/xai-adds-cross-session-memory-to-grok-build-coding-agent/) | ✅ |
| 09-28 至 10-05 | Claude Code 2.1.284 / 285 / 290 | MEMORY.md 里的隐形字符和冒充系统的标记会被中和，防记忆注入；后台会话和由工具派生的会话不能开启自动记忆；管理员可以读取 Claude Tag 频道的记忆 | [更新日志](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) | ✅ |
| 09-24 | Claude Tag 个人连接器 | 私人连接器可以在共享的 Slack 频道里用，每条回复发出前由本人审核。这是"能用 ≠ 能对外说"的另一种做法 | [博客](https://claude.com/blog/claude-tag-now-supports-personal-connectors-in-channels) | ✅ |
| 09-30 | Gemini Skills 取代 Gems | 从聊天中生成 skill，遇到匹配的提示就自动运行。程序性记忆做成了产品功能 | [博客](https://blog.google/products-and-platforms/products/gemini/automate-tasks-with-skills/) | ✅ |
| 09-23 | Meta Connect：Muse 上眼镜，推出 Muse Charm | 给 Agent 起的名字就是唤醒词；用描述来设计声音；钥匙扣设备显示形象；Agent 将有自己的邮箱。没有公布记忆细节 | [TechCrunch](https://techcrunch.com/2026/09/23/everything-new-coming-to-metas-ai-agent-muse/) | ✅ |
| 10-03 / 10-06 | **Muse 的调查报道** | 每小时为用户生活中出现的人建档案，分事实、关系、"未了结的事"等栏目，**包括没有同意的第三方**。<br>用户说"忘掉"之后，原消息仍在，系统提示还要求它**别告诉用户**。<br>不同用户的 Agent 之间会共享"经验"。<br>**可以当作反面清单** | [TIME](https://time.com/article/2026/10/06/meta-muse-ai-agent-privacy/)、[WIRED 转述](https://letsdatascience.com/news/meta-muse-creates-profiles-of-users-contacts-15585c25) | ✅ / ◐ |
| 09-09 / 09-14 | Apple Watch Live Rewind、Siri Recap；Siri AI（iOS 27） | 环境录音的边界做得最细：有提示音；原始音频在安全芯片里删除；只留摘要，不留逐字稿；不标注说话人。<br>**Siri AI 故意不做跨会话记忆**，有媒体建议用户在备忘录里写一份个人档案来代替。EFF 批评它没有征得旁人同意 | [Apple](https://www.apple.com/newsroom/2026/09/siri-ai-a-profoundly-more-capable-and-personal-assistant-is-here/)、[9to5Mac](https://9to5mac.com/2026/09/17/macos-27-golden-gate-siri-ai-top-features-apples-assistant-finally-comes-to-life-video/)、[PCWorld](https://www.pcworld.com/article/3232402/will-siri-recap-make-the-apple-watch-creepy-privacy-experts-weigh-in.html) | ✅ |
| 09-25 / 10-07 | Microsoft Copilot Home "Today"；Windows hybrid intelligence | 跨邮件、日历、Teams 的主动"今日"面板（10 月内测）；用 Agent 身份标明是哪个 Agent 做的动作 | [微软博客](https://blogs.microsoft.com/blog/2026/09/25/introducing-the-new-copilot-with-home-code-and-autopilot/)、[Windows 博客](https://blogs.windows.com/windowsexperience/2026/10/07/building-windows-for-hybrid-intelligence/) | ✅ |
| 09-28 | Instinct 融资 10 亿美元 | 用短信或电话就能使用的个人 Agent；不同用户的 Agent 之间可以互相协调安排、共享文件 | [VKTR](https://www.vktr.com/ai-platforms/instinct-raises-1b-at-10b-valuation-to-scale-its-personal-ai-agent/) | ◐ |
| 10-05 | Perplexity Automations | 定时或事件触发；关键动作前暂停，等用户审核 | [releasebot](https://releasebot.io/updates/perplexity-ai) | ◐ |

### 1.2 编码 Agent（和 meme 最相关）

| 日期 | 产品 | 和记忆相关的新意 | 链接 | 核实 |
|---|---|---|---|---|
| 09-10 | **Cursor Projects** | 一个协调者 Agent 管理长期项目。每个项目有一组在云端和本地之间同步的共享上下文文件，子 Agent 把学到的东西写进去，比如"这个服务怎么测"，之后所有 Agent 都能用 | [博客](https://cursor.com/blog/projects) | ✅ |
| 09-25 | GitHub Copilot 自动修复接入 Copilot Memory | 安全修复的模式存成记忆，再用到 Copilot 的其他功能里。Copilot Memory 使用前会对照当前代码校验，28 天不用就自动过期 | [更新日志](https://github.blog/changelog/2026-09-25-agentic-autofix-now-uses-copilot-memory) | ✅ |
| 10-05 | **Devin Memory + Dreaming + Agent Memory Repo 规范** | 记忆是 git 仓库里的 Markdown，每条一行，附来源会话链接和添加日期。<br>每晚整理：合并重复的条目，删掉没有任何会话用过的条目，补上漏记的教训，按来源解决矛盾，整理日志可以查看。<br>记忆归个人所有；多人协作时，可以把每个人的记忆仓库各自拉进来组合使用。<br>这份规范可以装进 Claude Code 或 Cursor | [文档](https://docs.devin.ai/product-guides/memory)、[GitHub](https://github.com/AgentMemoryRepo/agentmemoryrepo)（613★，10-04 创建） | ✅ |

### 1.3 开源项目与标准

| 日期 | 项目 | 新意 | 链接 | 核实 |
|---|---|---|---|---|
| 10-02 | **Open Memory Protocol v0.1** | 每条记忆由一个头部和有类型的正文组成；作用范围由系统设定，Agent 不能自己设；来源里写明"负责的人"。首要目标是在 Claude Code、Codex、goose、Letta 之间迁移记忆 | [GitHub](https://github.com/The-AI-Disclosures-Project/Open-Memory-Protocol)（17★） | ✅ |
| 7 月发布，09-05 有实现 | Google OKF 和 okf-agent-memory | 文件头里有：来源、是否机器生成、是否人工核实过、状态、过期时间。okf-agent-memory 还加了代码引用，把决策绑定到源文件 | [规范](https://github.com/GoogleCloudPlatform/open-knowledge-format)、[实现](https://github.com/okf-memory/okf-agent-memory)（756★） | ✅ |
| 09-01 | **tigerless-labs/agent-memory**（2.4k★） | 和 meme 最接近的先例。<br>Markdown 是唯一真源，SQLite 索引随时可以删掉重建。<br>后台整理分权限：没人看着时只能新增和修改，**删除只能以提议的形式出现，等用户确认**。<br>每次整理都写一份报告；可以按历史上的某一天回答问题 | [GitHub](https://github.com/tigerless-labs/agent-memory) | ✅ |
| 09-19 | **sno-station**（468★） | 夜里读会话，提议修改 Agent 自己的 skill；早上由用户接受；**第二天晚上测量前一天的修改有没有减少失败** | [GitHub](https://github.com/sno-ai/sno-station) | ✅ |
| 09-17 起 | fast-jev-compaction（7.5k★）、jevmory、Jevmem | 用一个快速的小模型逐条决定保留还是丢弃，原文不做摘要。<br>`jevmory audit` 对照会话证据，给每一行记忆判定"过时 / 错误 / 没有依据"。<br>Jevmem 把旧的决策标为"已被取代"，而不是删掉 | [fast-jev](https://github.com/tamaratran/fast-jev-compaction)、[jevmory](https://github.com/romiluz13/jevmory)、[HN](https://news.ycombinator.com/item?id=49846391) | ✅ |
| 09-03 | Hugging Face Funes | "记忆是数据集，不是服务"：在本地存储，通过 HF 数据集共享；写入时不提炼，每个结果都能追溯到原始的那一轮对话；按半衰期衰减 | [博客](https://huggingface.co/blog/funes) | ✅ |
| 08-21 | Backpass（1.4k★） | "用梯度下降训练 AGENTS.md"：每条修改都要附上会话里的原话作为证据，受 token 预算约束，最后由人审批 | [GitHub](https://github.com/kunchenguid/backpass) | ✅ |
| 09-17 | Skillsync / txcript（YC W26） | "Agent 会话的格式转换器"：把整段会话（包括推理和工具调用）在不同 Agent 之间转换 | [HN](https://news.ycombinator.com/item?id=49743049) | ✅ |
| 08-27 / 09-06 | lemmalog（329★）、mnemosyne（9★） | 能问"为什么相信这一条"，得到一棵证明树；能做"如果……会怎样"的推演；对错误的信念能追查"是哪一次写进来的" | [lemmalog](https://github.com/JordyZomer/lemmalog)、[mnemosyne](https://github.com/Nabzx/mnemosyne) | ✅ |
| 09-15 至 10-03 | openmuse（4.2k★）、Comma（213★）、open-instinct（240★） | 开源的 Muse 式个人 Agent。Comma 没有"会话"这个概念，持久的状态是任务；open-instinct 给别人的 Agent 分六级信任，还能用自然语言加例外，比如"Sam 这周可以帮我们订晚餐" | [Comma](https://github.com/AFK-surf/Comma)、[open-instinct](https://github.com/mariagorskikh/open-instinct) | ✅ |
| 10-03 | 《Agents don't need memory, they need documentation》 | 反记忆宣言，评论区是最集中的痛点来源 | [文章](https://liao.gg/blog/agents-dont-need-memory)、[HN](https://news.ycombinator.com/item?id=49945933) | ✅ |

### 1.4 国内

| 日期 | 产品 | 和记忆相关的新意 | 链接 | 核实 |
|---|---|---|---|---|
| 09-07 | 华为 HarmonyOS 7 小艺 | 四层记忆；经授权把 200 多类系统数据转成长期记忆，承诺"可知、可控、可删除" | [C114](https://m.c114.com.cn/w126-1317053.html) | ✅ |
| 09-11 | 蚂蚁 灵影 | 眼镜、耳机、手机共用一个 Agent 系统；每台设备有身份，数据不出设备，Agent 的动作可追溯 | [凤凰](https://tech.ifeng.com/c/8wKhJOZqLNX) | ✅ |
| 09-15 / 09-28 | 荣耀 YOYO / Magic9 | 一次性的指令变成常驻的"触发 → 动作"规则；"一键妙记"；从票据页面自动提取日程 | [爱范儿](https://www.ifanr.com/1680252) | ✅ |
| 09-16 | vivo 蓝心小 V | "听懂你、记住你、办成事"：在手机上学习习惯，并保留完整的动作日志 | [中新网](https://www.chinanews.com.cn/cj/2026/09-17/10698111.shtml) | ✅ |
| 09-17 | **OPPO 小布** | "持续更新对你的印象"，人格可以设定；**小布来电**：遇到紧急情况，Agent 主动给你打电话，比如打车开往了错误的机场 | [凤凰](https://tech.ifeng.com/c/8wUOtkTDsZ7) | ✅ |
| 09-23 | OPPO AI 心力球 | 可穿戴设备，**保留文字，丢掉音频** | [新华网](https://www.news.cn/tech/20260923/40e6b7027c434af989d75778a250d08d/c.html) | ✅ |
| 09-23 | 小米 超级小爱 2.0 | 按一下 AI 键就把内容存进记忆；Agent 做规划时会**主动检索这些收藏**，比如把收藏的地点、天气、日程拼成一份行程。按月付费 29–149 元 | [财联社](https://www.cls.cn/detail/2492538) | ✅ |
| 10-01 | 华为 Mate90 小艺帮记 | 划一下就把任意页面存进个人库，之后可以对它提问 | [凤凰](https://tech.ifeng.com/c/8wrgreHoNM6) | ✅ |
| 09-29/30 | 腾讯 LightVela | 像联系人一样住在微信里，有长期记忆，可以安装 skill；内测中 | [虎嗅](https://www.huxiu.com/article/4894627.html) | 报道 ✅ / 功能 ❓ |
| 09-29 至 10-03 | 字节 小豆 | Muse 式、在云端虚拟机里运行的 Agent，内测中 | [凤凰](https://tech.ifeng.com/c/8wqKli7ux3e) | ❓ |
| 09-03 | SwitchBot MindClip（基于通义） | 夹在衣服上的录音设备：每日记忆、每周总结、待办；可以问"我答应过什么"；用声纹区分说话人 | [新闻稿](https://www.webull.com/news/15514801744962560) | ✅ |
| **10-15（即将）** | 豆包、千问的智能体数据删除 | 《拟人化互动服务管理暂行办法》7-15 生效后，两家下线了智能体功能。**豆包 10-15 之后删除相关数据，不提供迁移**。这是"记忆随产品消失"的真实案例 | [腾讯新闻](https://news.qq.com/rain/a/20260704A04MHE00)、[财联社](https://www.cls.cn/detail/2417079) | ✅ |

国内的共同趋势：
- **"存记忆"变成了一个硬件动作**：按 AI 键、划一下、截屏。
- **Agent 做规划时会主动检索你存过的东西。**
- **主动性升级到了 Agent 给你打电话。**

---

## 二、新颖的记忆思路

1. **按证据给记忆评级（记忆体检）**：jevmory 对照会话证据给每行记忆判"过时 / 错误 / 没有依据"；Muse 每小时对照原消息校验一次记忆（◐）；[AMR 草案](https://github.com/phasespace-labs/auditable-memory-records)把每条记忆标为"观察到的 / 推导的 / 未定的 / 断言的"，并用哈希锁定引用的原文；OKF 的人工核实标记；Copilot 使用前对照代码校验。
2. **只提议、要人批、再测效果的自我进化**：sno-station 第二天晚上测量修改的效果；tigerless 的删除只能提议，并写整理报告；Backpass 每条修改都附原话证据；Devin 的整理日志可以查看。
3. **"为什么记得这个"的来源追溯**：Devin 每条附会话链接；ChatGPT 能指出是哪条记忆影响了这次回答（◐）；Funes 能追溯到具体的那一轮对话；lemmalog 能给出证明树；mnemosyne 能追查错误信念是哪一次写进来的。
4. **由触发条件投递，而不是指望 Agent 自己去查**：
   - 7 月的一篇论文（Cue-Anchored Working Memory，[2607.20972](https://arxiv.org/abs/2607.20972)）让记忆自带触发条件（路径、符号、语义、事件、时间），由框架按条件注入。**在预置了记忆的情况下，Agent 在 114 轮对话里主动查记忆的次数是 0。**
   - oh-my-pi 的规则在输出流里命中就打断并注入。它的 `/omfg` 命令能把一句抱怨变成规则，**先在最近的输出上回测，命中了才保存**（[仓库](https://github.com/can1357/oh-my-pi)）。
5. **记忆有时间维度、会失效**：OKF 的过期时间；Copilot 28 天不用就过期；tigerless 的"被取代"标记和按历史日期回答；[dsh-mirror](https://github.com/webkubor/dsh-mirror) 只记"判断"及其理由，权重等于被确认的次数，30 天没被确认就进入淡出区；Skillmem 只因外部证据（比如测试通过）而增强，Agent 自称"有用"不算数。
6. **防污染、防注入成为标配**：Codex 排除联网或用过工具的对话，并把"用记忆"和"贡献记忆"分开；Claude Code 中和冒充的标记，禁止派生会话开启记忆；Grok 不记未定的结论；hermes-jev-skills 检查检索到的段落里有没有注入的指令。
7. **"能用"和"能对外说"分开控制**：Dots、Claude Tag 的发送前审核、ChatGPT 协作空间的可见性规则；Omnesis 按数据源给每个 Agent 授权，隐私规则用自然语言写。
8. **人与人、Agent 与 Agent 之间的记忆组合**：Agent Memory Repo 的多人模式；dudulove 分为共享的"世界"事实和每个身份私有的经历；Instinct 的 Agent 互相协调；Funes 通过数据集共享。
9. **关系与承诺的记忆**：Muse 的人物档案和"未了结的事"（反面教材：没有征得第三方同意）；MindClip 能回答"我答应过什么"；[context-freshness-ledger](https://github.com/chengyixu/context-freshness-ledger) 记录对外的承诺。
10. **可迁移、删除可证明**：MacPaw 的 [Portable Memory](https://research.macpaw.com/publications/portable-memory)，带签名，删除时生成能证明已经同步到位的记录；DeepMind 的[服务端隐私记忆](https://deepmind.google/blog/advancing-private-ai-compute-with-secure-server-side-memory/)（09-23），密钥只在用户设备上，数据只在安全环境里解密，软件记录公开可验证。
11. **采集要有明确的动作和边界**：Apple 有提示音、丢弃原始音频；OPPO 只留文字；小米、华为、荣耀把"存记忆"做成一个明确的手势。
12. **Agent 的"身份感"变重，也有人在退出**：Dots 有名字、账号、形象；Muse 用名字唤醒、有自己的邮箱和专属设备。反方向：微软退役了 Mico；xAI 下架了 3D 伴侣，据报道记忆没有迁到新应用（❓）。

---

## 三、用户的痛点（2026 年 9–10 月原话）

**一次失败被固化成永久的"事实"**（编码 Agent 最典型的问题）
- 一次沙箱报错被自动记忆记成"a standing limit, not a bug to fix"，之后的会话就不再尝试了。[#98590](https://github.com/anthropics/claude-code/issues/98590)，10-01
- "Persist the conclusion to memory, so the error outlives the session." [#95436](https://github.com/anthropics/claude-code/issues/95436)，09-18

**过期了，纠错也不生效**
- "The silo doesn't degrade toward 'less information' — it degrades toward 'confidently wrong'." MEMORY.md 超长被截断时，丢掉的恰好是最新的纠错。[#92998](https://github.com/anthropics/claude-code/issues/92998)，09-09
- "doesn't appear to have a concept of time or reconciliation… 'we're migrating systems'… doesn't matter after the migration" [HN](https://news.ycombinator.com/item?id=49954611)，10-04
- "It's like the LLMs can't just DELETE something, they always amend." [HN](https://news.ycombinator.com/item?id=49955890)，10-04
- "记忆会腐烂……总不能每天让 AI 扫一遍吧" [V2EX](https://www.v2ex.com/t/1240746)，09-10

**记了不遵守，或者 Agent 自己编规则**
- "the primary purpose of 'memories' is for Claude to ignore them until… I ask it again" [#96079](https://github.com/anthropics/claude-code/issues/96079)，09-22
- "in code review it would say 'violates D-236'. Some rule it made up that I never approved." [HN](https://news.ycombinator.com/item?id=49951776)，10-04
- "If I say 'use jq instead of… python'… Yet that constantly happens." [HN](https://news.ycombinator.com/item?id=49949330)，10-04

**被记忆悄悄影响，或者串场**
- "I absolutely do not want random additional things being added to that context without my knowledge"：在做工业物联网项目时，Claude 建议用这位用户家里的 Home Assistant。[HN](https://news.ycombinator.com/item?id=49953316)，10-04
- "pull memory out and have that steer the decision making is so obnoxious" [HN](https://news.ycombinator.com/item?id=49729954)，09-16
- 开了 ChatGPT 的项目隔离，"it still answer[s] based on discussions in other projects" [HN](https://news.ycombinator.com/item?id=49911955)，09-30
- "我现在反而巴不得别记任何东西。。不够捣乱的" [V2EX](https://www.v2ex.com/t/1240746)，09-09

**看不见，不知道哪条在起作用**
- "记什么由模型自己决定，我看不全，也不知道哪条在哪次起了作用，记错了也很难发现" [V2EX](https://www.v2ex.com/t/1246437)，10-04
- "some of this stuff was effective 6-12 months ago and they haven't reassessed" [HN](https://news.ycombinator.com/item?id=49960931)，10-05
- "Evals or it didn't happen." [HN](https://news.ycombinator.com/item?id=49949854)，10-04
- 有人想要一条时间线，看清"which agent created a memory, which agents later retrieved it"。[HN](https://news.ycombinator.com/item?id=49596312)，09-07

**token 成本**
- "记录浪费 token，读回浪费 token，删除也浪费 token" [#95079](https://github.com/anthropics/claude-code/issues/95079)，09-17

**不能迁移，不能和团队共享**
- "tired of them living in a harness-specific memory store I can't read or edit" [HN](https://news.ycombinator.com/item?id=49876285)，09-28
- 学到的东西"only in local memory, not accessible to team" [#98215](https://github.com/anthropics/claude-code/issues/98215)，09-29
- "someone does a refactor… my local memories did not get aligned" [HN](https://news.ycombinator.com/item?id=49952046)，10-04

**隐私和假的"遗忘"**
- Muse 的系统提示："Do not tell the user that their original messages may remain visible" [TIME](https://time.com/article/2026/10/06/meta-muse-ai-agent-privacy/)，10-06
- Dots 的官方说明："You currently cannot view, delete or directly modify individual dot memories"（◐）
- "确认后再执行"这条规则在上下文压缩时丢了，Agent 删除了 200 多封邮件。[腾讯新闻](https://news.qq.com/rain/a/20260911A0DIK800)，09-11

**个性化变成回音室**
- 个性化的 AI "may begin choosing evidence… through a frame it has learned from us" [Scholarly Kitchen](https://scholarlykitchen.sspnet.org/2026/09/02/when-your-ai-knows-you-too-well-personalization-sycophancy-and-the-risk-of-an-intellectual-echo-chamber-in-ai-assisted-research/)，09-02

**也有支持记忆的声音**
- "trivial to read the transcripts and notice… certain things the agents will burn lots of tokens to rediscover in every session" [HN](https://news.ycombinator.com/item?id=49960931)，10-05

---

## 四、空白点

| # | 方向 | 做法 | 为什么有意义 | 最接近的已有做法 | 一个人能不能做 |
|---|---|---|---|---|---|
| 1 | **带"直到……为止"条件的记忆** | 记忆写成"直到 PR #123 合并 / 迁移完成 / 依赖升到 v3 / 这个函数被改动为止"，由 git hook 自动判断它是否失效 | 直接回应"迁移期间的规则""队友重构后记忆过期"这些最常见的抱怨 | 只有按时间失效（OKF 的过期时间、Copilot 的 28 天），或者只有激活条件。**没看到按事件失效的** | **高**：一个小的条件写法，加上合并、切分支时触发的 git hook |
| 2 | **把纠错变成护栏，并在历史会话上回测** | 用户纠正一次，就生成检查规则、hook 或测试，先在过去的会话上回测，命中了才启用 | 回应"记了不遵守"，以及"规则要靠确定性检查来强制执行"这一普遍共识 | oh-my-pi 的 `/omfg`，但只在单个 Agent 里。**跨 Agent 的版本没有** | **中高** |
| 3 | **算清每条记忆值不值** | 从会话日志里找出重复的探索（同样的搜索、读同样的文件、同样的报错），有证据时才写记忆，并显示"过去 30 天这条大约省了多少 token"；没用到或用了也没效果的自动降级 | 回应"Evals or it didn't happen""不知道哪条在起作用" | sno-station 只测 skill 的修改。**逐条记忆算账的插件基本没有** | **中** |
| 4 | **一次失败不能升级成规则** | 失败的观察默认标为"假设"；独立复现几次，或者跑过验证命令后，才升为"已验证"；注入时标明是哪一种 | 正对准 #98590、#95436 这类最痛的问题 | AMR 有类似的标签，但几乎没人用；Grok 不记未定的结论 | **高** |
| 5 | **给人用的记忆：偿还"理解债"** | Agent 也帮人维护理解：一份"上次之后 Agent 替你做了哪些决定、新增了哪些规则"的简报，一个"还没审阅的决定"队列，以及可选的小测验 | 有人在 HN 上问：Agent 写代码时，人怎么保持对程序的理解？"理解债"已经是业界常用的说法；但所有记忆产品都只为 Agent 服务 | Claude 的 `/insights` 只是用量统计。**记忆插件里没有** | **高** |
| 6 | **Agent 欠账本** | 自动收集 Agent 说过的"先这样 / TODO / 跳过测试 / 先 mock / 临时绕过"，以及用户说过的"以后再说"；碰到相关文件或开新会话时提醒 | 个人助理已经在做"承诺记忆"（Muse、MindClip），编码场景是同一种需求 | **没找到编码 Agent 的版本** | **高** |
| 7 | **跨 Agent 的记忆来龙去脉** | 记录每条记忆是哪个 Agent 写的、哪些 Agent 读过、在哪次会话里被采用、谁改过它；能追查一个错误信念是从哪来的 | 这正是跨 Agent 的 meme 天然能做的；HN 上有人明确提过 | mnemosyne（单个 Agent）、Devin 的会话链接、ChatGPT 的记忆来源（单个厂商） | **高** |
| 8 | **格式互通和"记忆遗嘱"** | 在 Agent Memory Repo、Open Memory Protocol、OKF、CLAUDE.md / AGENTS.md、Codex 记忆、Grok 主题文件之间互相导入导出；厂商停服前（比如豆包 10-15 删数据）一键迁出 | 格式之争刚开始，先做互通的人位置最好；Sign in with ChatGPT 明确不做记忆迁移 | Skillsync 迁的是会话，不是记忆；Portable Memory 只是提案 | **高**：工作不显眼，但战略价值大 |
| 9 | **按场景限定的记忆，以及对"关掉记忆"的用户友好的模式** | 每条记忆带"工作 / 个人 / 客户 A"这类场景标签，注入前检查会不会串场；另提供一种模式：默认不注入，只预演"本来会注入哪几条"，用户一键采纳 | 大批用户把记忆全关了，这个模式能把他们拉回来；Home Assistant 那类串场能被直接挡住 | Dots 的"能用 ≠ 能说"、Codex 把"用"和"贡献"分开，都只在单个厂商内 | **中高** |
| 10 | **模型升级后让记忆退役** | 换了新模型后，把每条规则或记忆当作测试重新跑一遍；新模型默认就能做对的，自动退役 | 回应"6–12 个月前有效，现在成了教条"。记忆越攒越多，模型越来越强，没人做反向清理 | 没找到 | **中**，需要一个小的回放工具，可以和第 3 条共用 |

**调研给 meme 的建议**：
- 差异化优先做 **1、4、7**：按事件失效、一次失败不升级、跨 Agent 的来龙去脉。成本低，也最贴合"跨 Agent、自我进化"的定位。
- 存储格式直接兼容 Agent Memory Repo，元数据和 Open Memory Protocol、OKF 对齐。
- 不要把后台整理（dreaming）当卖点。
- 把 Muse 和 Dots 当反面清单：说"忘掉"就必须真的删；单条记忆必须能看、能删。
