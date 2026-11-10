# 我的页方案 3 与四栏票签账册设计检查 · 2026-11-09

final result: passed

检查范围：用户选定「我的」页方案 3（分区档案：`docs/design/2026-11-09-mine/03-separated-archive.png`）并要求同步到其他一级页面（首页、酒局、酒识、我的）。本次检查覆盖微信开发者工具 iPhone 17 模拟器下的视觉对比、主要交互与自动化回归测试，不代表真机、Android 或线上接口验收。

## 视觉依据和截图

- source visual truth: `docs/design/2026-11-09-mine/03-separated-archive.png`（852×1846 px，名义内容视口 390×844）及酒局票签源图 `docs/design/2026-11-09-gather/03-room-tickets.png`。
- implementation screenshots:
  - 我的：`docs/design/2026-11-09-mine/implementation-mine.png`（手机屏幕裁剪版 `implementation-mine-phone.png`，668×1452 px）
  - 首页：`docs/design/2026-11-09-mine/implementation-home.png`（手机屏幕裁剪版 `implementation-home-phone.png`，668×1452 px）
  - 酒识：`docs/design/2026-11-09-mine/implementation-knowledge.png`（手机屏幕裁剪版 `implementation-knowledge-phone.png`，668×1452 px）
  - 酒局：`docs/design/2026-11-09-gather/implementation-adjusted.png`（手机屏幕裁剪版 `implementation-phone-final.png`，668×1452 px）
- viewport & normalization: 微信开发者工具 iPhone 17 模拟器（83% 窗口显示缩放）。对比前均按 390 px 宽度等比缩放归一，排除模拟器外壳与状态栏差异。
- state: 游客模式（2 篇手记、7 场参与酒局、2 种已记香型），手记真实日期 2026.10.27 / 2026.10.02。
- full-view comparison evidence: `docs/design/2026-11-09-mine/comparison-mine-final.png`（选定方案 3 与原生「我的」页并排同宽对比）及 `docs/design/2026-11-09-mine/overview-four-tabs-final.png`（首页、酒局、酒识、我的四栏同步全景）。
- focused region comparison: `comparison-mine-final.png` 已清晰呈现身份票切口、三张统计票虚线、手记册日期栏与右侧箭头的完整细节，无需额外局部放大图。

## Findings

当前没有需要继续修复的 P0/P1/P2 问题。

| 必查项 | 实际检查 |
| --- | --- |
| 字体与文字层级 | 标题采用宋体（Songti SC / STSong），统计与日期采用 Georgia 数字，辅助标签采用系统无衬线；字号层级与方案 3 一致。原生字体与生成图存在轻微字重差异，归为 P3。 |
| 间距与布局 | 「我的」页按方案 3 拆分为顶部身份票、中部三列独立统计票、下部一体式日期手记册；「首页」同步了「酒卡」切口票签与「最近手记」日期账册；「酒局」同步了模式切换短横线、本机房间票签与在线活动票签；「酒识」同步了分类短横线、续读切口票签及编号知识/酒款账册。 |
| 色彩与视觉令牌 | 统一使用纸白 `#f7f6ef`、票面浅米白 `#fbfaf5`、竹绿 `#274d3b`、浅竹绿存根 `#e5eadb` 与细绿边框 `#b9c5b1`。 |
| 图片与图标 | 新增标准右向尖括号 `miniprogram/assets/icons/chevron-right.svg` 与右箭头 `arrow-right.svg`（均来自 Tabler Icons，附 MIT 许可 `tabler-LICENSE.txt`），无内联手绘或外链依赖。 |
| 页面文字与状态边界 | 游客状态明确显示「游客模式」与「资料与手记保存在本机」，去除了底部重复的登录入口与未完善时的默认占位“微信昵称”；日期严格解析真实存储日期，不把历史日期伪造为“今天”。 |

## Comparison history

1. 初次渲染检查发现 `app.wxss` 的全局 `.profile-hint` 样式使「我的」页提示语带上了浅黄底框，且热重载前未注入 `dateMonthDay` / `dateYear` 字段，同时游客态下显示了占位文字“微信昵称”。
2. 修复：将类名独立为 `.mine-profile-hint`，过滤未登录未完善时的默认占位“微信昵称”，为身份票右侧登录按钮左侧补齐垂直虚线分隔，并重新编译小程序使 JS 日期字段在「首页」和「我的」页同时生效。
3. 重新截取并生成 `comparison-mine-final.png` 与 `overview-four-tabs-final.png`，确认四栏页面的切口票签、虚线存根、短横线指示器与账册列表完全统一。

## 交互与代码检查

- `node --test tests/*.test.cjs`：全部 49 个测试套件 / 105 个子测试 100% 通过（含新增 `tests/mineTickets.test.cjs` 15 项与 `tests/gatherTickets.test.cjs` 10 项）。
- 4 个一级页面的 JS 语法检查、WXML 结构检查及 `git diff --check` 均通过。
- 清除了 `mine.wxss` 与 `knowledge.wxss` 中的标签选择器告警。

## Implementation Checklist

- [x] 「我的」页方案 3：切口身份票、三张独立统计票、一体式日期手记册。
- [x] 「首页」同步：酒卡切口票签入口、最近手记日期账册、全部手记胶囊按钮。
- [x] 「酒局」同步：模式与状态短横线筛选、桌上酒局票签、在线品鉴活动票签。
- [x] 「酒识」同步：四栏短横线导航、续读切口票签、编号知识账册与酒款目录账册、详情页信息票签。
- [x] 模拟器逐页截图、同框对比图与 105 项自动化测试通过。
