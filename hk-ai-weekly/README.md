# AI 周报 demo（零二次处理 · 真实数据）

按 `docs/AI周报_v1零二次处理产品方案.md` 的规则，用 Gangtise 接口真实数据生成 10 个用户 case 的纯文本邮件正文，并提供多类港股自选组合与无自选热门兜底的交互式 HTML 演示。最新版含 AI 概念组合，历史版保持原六类组合。

- 生成脚本：`fetch_data.py`（旧版取数）、`fetch_support.py`（新版行情转换、指数与看点）、`build_emails.py`（按规则组装）、`build_demo.py`（生成演示数据）
- 输出：`emails/case_01_2stocks.txt` ~ `emails/case_10_25stocks.txt`、`demo_data.js`（历史版）、`demo_data_2026-10-28.js`（最新版）、`download-qr.png`
- 原始数据：`raw/`（历史版，完整保留）、`raw-2026-10-28/`（最新版）
- 数据窗口：历史版 **2026-10-08 ~ 2026-10-14**；最新版 **2026-10-22 ~ 2026-10-28**

## 零、交互式用户分型演示

直接用浏览器打开 `docs/ai-weekly-demo/index.html`，无需安装依赖或启动服务。最新版支持八种用户状态（7 类组合 + 热门兜底），历史版支持七种（6 类组合 + 热门兜底）；均支持单人邮件预览、双人对比、规则解释及键盘左右方向键切换。

| 演示类型 | 纳入港股只数 | 演示重点 |
|---|---:|---|
| 少自选观察型 | 2 | 短邮件、聚焦标的 |
| 科技成长型 | 6 | 科技观点密集、热点命中自选 |
| AI 概念型（仅最新版） | 8 | 智谱、商汤、范式智能、金山云、腾讯、阿里、中芯、快手；覆盖大模型、AI 云、算力与应用 |
| 稳健收息型 | 6 | 金融与能源内容 |
| 消费生活型 | 6 | 消费行业观点与催化 |
| 均衡配置型 | 11 | 跨行业完整邮件 |
| 重度自选型 | 25 | 触发前 5/后 5、汇总行与催化上限 |
| 无港股自选 · 热门港股版 | 6 | 固定热门池兜底，不伪装成个人推荐；引导添加港股自选 |

各类人物仅是**典型港股自选组合**，不代表产品已经具备新手、专业、活跃度等用户画像能力；无自选状态使用固定热门池，不属于个性化推荐。所有邮件均明确标注港股专属，美股、A 股不纳入统计。页面打开时不重新调用 API、不做 LLM 改写。

演示版的机构观点展示**完整标题与完整首句摘要**，不展开数千字线索全文；「后续关注」覆盖未来数周、季度及更长期事件，不局限于下周。正文通过 `build_email(full_clues=True)` 生成，邮件只做视觉排版。原 10 个纯文本 case 仍保留最初的标题 34 字、摘要首句 50 字截断规则。

个人版 CTA 引导下载云锋 App 查看港股，热门版 CTA 引导下载后添加港股自选。按钮与 `download-qr.png` 均指向 **https://www.yfyy.com/download**，同时覆盖 PC 扫码与手机点击场景；未模拟 deeplink、个股详情或自选页跳转。

修改人物或规则后，从项目根目录重建静态数据：

```bash
python docs/ai-weekly-demo/build_demo.py
```

## 零点一、最新版数据与重跑

页面默认展示最新版，可切换到历史完整版。两版原始数据与生成文件完全独立，不用旧数据填补新版缺口。

| 版本 | 数据完整性 |
|---|---|
| 最新版（2026-10-22 ~ 2026-10-28） | 完整：34 只港股日 K 714 行、指数行情、合并投研线索 293 条、个股看点 34 条、一页通 34 篇（34/34 含未来催化）、热点话题 11 篇；`warnings=[]`。AI 概念组合含智谱等 8 只港股 |
| 历史版（2026-10-08 ~ 2026-10-14） | 完整：行情、看点、线索、催化、热点 |

最新版取数使用 `gangtise-data/scripts/quote.py`、`gangtise-agent/scripts/security_clue.py`、`hot_topic.py`、`agents.py`。此前积分不足的响应已被新账户的成功结果覆盖；账户切换通过 `GTS_ACCESS_KEY` / `GTS_SECRET_KEY` 环境变量完成，凭据不写入文档。需要重跑时，从项目根目录执行（只覆盖最新版，不影响旧版）：

```bash
CODES=$(python -c "import json; print(','.join(json.load(open('docs/ai-weekly-demo/raw-2026-10-28/pool.json'))))")
python gangtise-skills/gangtise-data/scripts/quote.py --securities "$CODES" -sd 2026-09-28 -ed 2026-10-28 --adjust none -od docs/ai-weekly-demo/raw-2026-10-28/quote-hk > docs/ai-weekly-demo/raw-2026-10-28/quote_hk_out.txt 2>&1
python gangtise-skills/gangtise-agent/scripts/security_clue.py --page-from 0 --page-size 500 -st 2026-10-22 -et 2026-10-28 -q bySecurity --securities "$CODES" -od docs/ai-weekly-demo/raw-2026-10-28 > docs/ai-weekly-demo/raw-2026-10-28/clue_raw.txt 2>&1
python gangtise-skills/gangtise-agent/scripts/hot_topic.py --page-from 0 --page-size 100 -sd 2026-10-22 -ed 2026-10-28 --hot-category morning,evening --with-securities > docs/ai-weekly-demo/raw-2026-10-28/hot_topic_out.txt 2>&1
python gangtise-skills/gangtise-agent/scripts/agents.py -a stock-one-pager --securities "$CODES" > docs/ai-weekly-demo/raw-2026-10-28/onepager_extra_raw.txt 2>&1
python docs/ai-weekly-demo/fetch_support.py > docs/ai-weekly-demo/raw-2026-10-28/fetch_support_out.txt 2>&1
AI_WEEKLY_RAW=docs/ai-weekly-demo/raw-2026-10-28 AI_WEEKLY_CATA_DIR=docs/ai-weekly-demo/raw-2026-10-28/onepager AI_WEEKLY_DEMO_OUT=docs/ai-weekly-demo/demo_data_2026-10-28.js AI_WEEKLY_VERSION=最新数据 AI_WEEKLY_GLOBAL=WEEKLY_DEMO_DATA_LATEST python docs/ai-weekly-demo/build_demo.py
```

## 一、数据来源（全部 Gangtise 真实接口）

| 数据 | 接口 | 本次用量 | 积分 |
|---|---|---|---|
| 周行情（30 只港股日K） | `open-quote/kline-hk/daily` | 390 行 | 0（行情免费） |
| 指数行情（恒指/恒生科技/国企） | `open-quote/index/kline/daily` | 39 行 | 0 |
| 个股看点 | `open-ai/stock-summary/getList` | 30 条 | 90 |
| 投研线索 | `open-ai/security-clue/getList`（7 天窗口） | 200 条 | 1,000 |
| 一页通（催化段） | `open-ai/agent/stock-one-pager` | 30 篇 | 1,500 |
| 热点话题 | `open-ai/hot-topic/getList`（早报+晚报） | 11 份 | 550 |
| **合计** | | | **约 3,140 积分 ≈ ¥314** |

> 另外有一条线索重复拉取（首次输出未落盘）浪费约 1,000 积分 ≈ ¥100。

## 二、YF 侧规则处理（零 LLM，只做删/改/拼）

| 板块 | 数据源 | 规则 |
|---|---|---|
| 本周一览 | 指数 + 自选周行情 | 计算周涨跌幅（首日 preClose → 末日 close）；统计涨跌家数、均值、最好/最弱 |
| 一、自选本周表现 | 个股看点 + 周行情 | 取 `summary` 字段原文；与周涨跌幅 join；按周涨跌幅排序；超长列表按下方限制规则裁剪 |
| 二、机构观点精选 | 投研线索 | 取 `标题 + 证券线索首句`；按标的分组（每只最多 2 条）；全局上限 8 条；按线索条数取前 5 只标的 |
| 三、下周关注 | 一页通「未来催化」表 | **只取表格前两列（时间/阶段 + 催化事件）**；丢弃「关键假设/可能影响/跟踪要点」三列；过滤已过期事件与「时间未明确」行；每只 2 条；超 30 字按标点/括号截断 |
| 四、本周热点回顾 | 热点话题 | 只取话题标题 + 相关标的；**剔除纯 A 股话题**（仅保留含 `.HK/.O/.N/.AO` 标的的话题）；优先级：含用户自选的话题排前；固定 3 条 |

**内容限制规则（长列表）**：
- 自选 ≤12 只：全部逐只展示
- 13-20 只：展示涨幅前 6 + 跌幅前 6，其余合并为汇总行
- \>20 只：展示涨幅前 5 + 跌幅前 5，其余合并为汇总行
- 「下周关注」最多 8 只标的（按 |周涨跌幅| 排序）
- 「机构观点」最多 8 条 / 5 只标的

## 三、10 个 case

| 文件 | 自选只数 | 触发的内容限制 |
|---|---|---|
| case_01_2stocks.txt | 2 | — |
| case_02_3stocks.txt | 3 | — |
| case_03_5stocks.txt | 5 | — |
| case_04_6stocks.txt | 6 | — |
| case_05_8stocks.txt | 8 | — |
| case_06_11stocks.txt | 11 | — |
| case_07_14stocks.txt | 14 | 自选前 6 / 后 6 + 汇总行 |
| case_08_17stocks.txt | 17 | 自选前 6 / 后 6 + 汇总行 |
| case_09_20stocks.txt | 20 | 自选前 6 / 后 6 + 汇总行 |
| case_10_25stocks.txt | 25 | 自选前 5 / 后 5 + 汇总行；下周关注限 8 只 |

邮件长度随自选数增长但**受限制规则约束**：2 只 ≈ 1,200 字符；25 只 ≈ 3,100 字符（不会无限膨胀）。

## 四、真实数据验证结果

1. **个股看点**：30/30 有内容，日期集中 10-03~10-13（港股日更确认），一句话结论本身即口语化，可直接用
2. **投研线索**：7 天窗口一次拉取返回 200 条（达分页上限），头部标的密集（腾讯/阿里多条），说明"每只限取 2-3 条"的规则必要
3. **一页通催化**：30/30 有「未来催化」表；时间口径混杂（`2026年11月`、`2026年Q3`、`未来1-3个月`、`时间未明确`），本次按规则丢弃了过期与未明确的行
4. **热点话题**：11 份报告过滤后仍可用——单一话题常含 10 个标的，其中 A 股 8 个 / 港股 2 个（如"新型电池十五五规划"：A 股 8 只被剔除，保留 00470.HK/03750.HK），证明**过滤规则有效**；但同时说明含港美股标的的话题里，美股大票出现频率高于港股
5. **行情/指数**：免费接口，恒指 `HSI.HI`、恒生科技 `HSTECH.HI`、国企 `HSCEI.HI`

## 五、已知限制（"不做二次处理"的代价）

1. **语言未降级**：催化事件的「时间/阶段」列仍可能出现机构口径（如"未来1-3个月"）；若 Gangtise 交付 C 端催化格式，替换该板块数据源即可解决
2. **看点日期可能早于本周**：如建设银行看点日期为 10-03（两周前），因为看点只保留最新一条，无历史版本
3. **无新闻层兜底**：长尾标的一旦无看点/线索即留空（本次自选池均为热门股，未触发）
4. **行业级线索混入**：个股线索接口会返回行业报告映射（如"综合Ⅱ行业点评报告"映射到新鸿基地产），这是接口的名称匹配行为，需要产品侧接受或后续过滤
5. 本周指数涨幅为负而个股平均为正（如 case_10 平均 +2.02%，恒生科技 -0.48%），说明自选池偏成长股，属正常现象
