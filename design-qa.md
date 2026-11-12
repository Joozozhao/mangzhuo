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

## 2026-11-11 · 知味九阶独立介绍页

final result: passed

本轮是在现有小程序中新增可阅读、可分享的品阶介绍页，沿用已选定的纸白、竹绿、宋体与李白插画。视觉参考用于延续产品风格；新页的章节、原生返回导航与规则内容属于本次明确新增的设计，并非原页面的逐像素复刻。前文历史检查记录保留。

### 视觉依据与本轮截图

- source visual truth: `/tmp/mine-member-level-initial.png`，804×1748 px，现有「我的」品阶名片与纸页风格。
- implementation: `/tmp/mangzhuo-guide-top.png`、`/tmp/mangzhuo-guide-story.png`、`/tmp/mangzhuo-guide-overview.png`、`/tmp/mangzhuo-guide-current.png`、`/tmp/mangzhuo-guide-rules.png`、`/tmp/mangzhuo-guide-ending.png`。
- 标准视口：iPhone 17 模拟器，屏幕 402×874 CSS px，内容窗口 402×776；源图与实现截图均为 804×1748 px，以截图 2 倍密度归一比较，排除系统状态栏与原生导航差异。
- 小屏视口：HUAWEI Mate X6 外屏模拟器，屏幕 346×781 CSS px，内容窗口 346×714；截图 692×1562 px。证据为 `/tmp/mangzhuo-guide-narrow-top.png`、`/tmp/mangzhuo-guide-narrow-story.png`、`/tmp/mangzhuo-guide-narrow-overview-final.png`、`/tmp/mangzhuo-guide-narrow-ending.png`。
- state: 当前本机二阶「寻芳友」，8 场、554 分；九阶完整显示，长卷与总览均使用会员服务中的同一套门槛。
- full-view comparison evidence: 同一多图对照输入中打开源图、标准视口实现页、长卷及总览，复核整体风格、字阶、留白、颜色与插画；有意新增的原生二级导航与章节结构不作为风格偏差。
- focused comparison evidence: 同时检查长卷当前品阶、规则段落及 346 px 总览表头和页尾返回入口，确认称号、数字、细则与按钮均清晰可见。

### 必查表面与交互

| 表面 | 本轮结果 |
| --- | --- |
| 字体与排版 | 宋体用于题名、诗句和章节，系统无衬线用于规则与操作，Georgia 用于积分。九阶正文保持可读对比，未来阶位不整卡降低透明度。 |
| 间距与布局 | 独立整页滚动取代长卷弹层，内容不再与胶囊或底部栏叠压。两种视口的实际页面宽度分别为 402 与 346 px，无横向溢出。 |
| 颜色与令牌 | 沿用纸白 #f7f6ef、票面 #fbfaf5、竹绿 #274d3b、细边 #b9c5b1，朱红与赭色仅作文字点缀。 |
| 图像与图标 | 复用实际品牌 SVG 插画、锁定标志和 Tabler 右箭头，无新增占位图、手绘图标或大图依赖。 |
| 文案与状态 | 九阶称号与门槛源于 memberLevel；新增原创阐释并修正九阶重复诗意与印文。规则写明双门槛、单样百分、个人偏好独立及本机统计范围，不展示未实现的胜率或跳级条件。 |

- 两个「我的」入口、原生页面返回、页尾回到档案、三个章节锚点、长卷/总览切换、定位当前品阶与公开分享路径均通过开发者工具验证。分享仅返回公开介绍页路径。
- 目录按钮高 48 px、阅读切换和定位按钮高 44 px、返回按钮高 48 px；运行时异常监听为 0。
- 139 项 Node 测试通过，覆盖当前阶位、双门槛差一分、最高阶、返回刷新、目录与模式切换及分享边界；2 个变更 WXML 与全量 28 个 WXSS 官方编译通过，JavaScript 语法与差异空白检查通过。

### Comparison history

1. 首轮标准视口与风格参考对照通过；346 px 总览发现「参局 / 场」表头换成两行，属于 P2 小屏排版问题。
2. 将列名简化为「场次」「积分」，保留说明段中的计分语义；重新编译后确认表头实际文本为「品阶称号场次积分」，页面宽度仍为 346 px。
3. 复看 `/tmp/mangzhuo-guide-narrow-overview-final.png`，表头已恢复单行，九阶数值与当前标记均完整。恢复 iPhone 17 默认模拟器后再次验证完整导航与阅读流程。

Implementation checklist: 本轮 P0/P1/P2 均已解决。当前验收覆盖原生开发者工具的两种视口；尚未进行实体手机验收。无需继续 P3 微调即可检查本轮页面。

## 2026-11-12 · 品鉴档案方案 1

final result: passed

- source visual truth: 用户选定的方案 1 `/Users/joozo/.codex/generated_images/01a1a569-19c0-7e52-bd3c-19e57620508c/exec-b0a4e098-6964-44ca-a32b-a58c50cc4f32.png`，用于替换原有拥挤身份票。
- implementation: `/tmp/mz-profile-card-standard-guest.png`、`/tmp/mz-profile-card-standard-signed-in.png`、`/tmp/mz-profile-card-standard-long-name.png`。
- 同框对比：`/tmp/mz-profile-card-comparison.png`。源图卡片裁切后等比归一为 732 px 宽，与原生卡片同宽并排。实际账号保留用户现有头像，生成图中的示意头像不作为替换要求。
- 402 px 视口下改成上下两行：上行为头像、身份、登录或编辑操作，下行为品阶与晋升差距。移除原有左侧大存根、重复印文、嵌套品阶框与多余昵称标签，延续纸白、竹绿、宋体和细绿分隔线。
- 游客态、登录态、超长昵称与忙碌态均检查；资料卡实测 366×157.94 CSS px，头像 48 px、登录 44 px、品阶入口 63.2 px。头像和昵称编辑入口、品阶导航通过，页面测试状态恢复真实账号，未写入资料或品鉴记录。
- 全量 139 项测试及变更 WXML、28 个 WXSS 编译通过。没有遗留 P0/P1/P2；本段仅记录 402 px 开发者工具检查，不代表真机验收。

## 2026-11-12 · 知味九阶书法与山水优化

final result: passed

本轮依照用户对既有页面的明确优化要求实施，保留现有晋升规则、章节与交互，将题名升级为真实书法轮廓，并换用呼应「循味登阶」的山水配图。

### 视觉依据与比较证据

- source visual truth: 上轮原生页面 `/tmp/mangzhuo-guide-top.png`、`/tmp/mangzhuo-guide-story.png`、`/tmp/mangzhuo-guide-overview.png`，延续项目已选纸白与竹绿风格。
- 标准视口：iPhone 17，402×874 CSS px，内容窗口 402×776，截图 804×1748 px。实现截图 `/tmp/mz-member-art-top.png`、`/tmp/mz-member-art-story.png`、`/tmp/mz-member-art-overview.png`、`/tmp/mz-member-art-current.png`、`/tmp/mz-member-art-rules.png`、`/tmp/mz-member-art-ending.png`；九阶逐段检查另见 `level-2`、`level-4`、`level-6`、`level-8` 同前缀截图。
- full-view comparison evidence: `/tmp/mz-member-art-compare-cover.png` 将原页面与实现页面以相同 804 px 宽度放入同一画布，已实际打开对照；系统时间与原生导航区域不参与风格判断。
- focused comparison evidence: `/tmp/mz-member-art-compare-reading.png` 同框检查雅叙和总览；`/tmp/mz-member-art-compare-chapters.png` 检查中卷、下卷及最终称号的书法、阈值与诗句。
- 小屏：HUAWEI Mate X6 外屏模拟器，346×781 CSS px、内容窗口 346×714；截图 692×1562 px。`/tmp/mz-member-art-narrow-top.png` 与 `/tmp/mz-member-art-narrow-overview.png` 已目检，另保存同前缀的雅叙、各阶、规则和页尾截图。

### 必查表面与实际结果

| 表面 | 本轮结果 |
| --- | --- |
| 字体与文字层级 | 「知味九阶」、三个章节及九阶称号共 13 个 SVG，来自官方 Ma Shan Zheng v2.003 的真实 TTF 轮廓。全部 30 个不同汉字映射有效，没有文字节点、内嵌字体或远程字体依赖。称号在当前品阶、雅叙和总览中统一使用；说明与门槛仍为可阅读正文。 |
| 间距与布局 | 页首采用书法题名、留白诗句和右下山水；三章增加上卷、中卷、下卷标记。两种视口实测页面宽度分别为 402、346 px，无横向溢出、称号裁切或与状态标签重叠。 |
| 色彩 | 纸白 #f7f6ef、竹绿 #274d3b、浅竹绿 #eef2e9、细边 #b9c5b1 延续原有风格，朱红只用于小印与当前标记。 |
| 图片与资源 | 新配图为透明水墨山水、竹径与行者，实际使用文件约 169 KiB；13 个书法 SVG 合计 97,986 字节，保留 OFL 与字形来源。完整字体、生成原图和 QA 截图均未加入运行资源。 |
| 状态与可访问名称 | SVG 同时保留正确中文 title 与页面 aria-label；图片加载失败自动显示原称号。原生实际模拟一次当前称号加载失败，确认文字回退后还原正常显示。两个视口最终 calligraphyErrors 均为空。 |
| 规则和交互 | 两项晋升条件、所有阈值和用户积分来自原有服务；喜好与主观评分继续独立。两处档案入口、三个目录锚点、雅叙/总览切换、当前阶位定位、页尾返回与公开分享路径均通过，两种视口运行时异常均为 0。 |

- 点击区域实测：目录 48 px、阅读模式 44 px、当前阶位定位 44 px、返回档案 48 px。
- `node --test tests/*.test.cjs`：141/141 通过。新增验证完整称号资源与真实路径轮廓、加载失败后原称号和积分保持正确；全量回归通过。
- 官方编译器检查变更 WXML 与全量 28 个 WXSS 通过；JS 语法与 `git diff --check` 通过。
- Comparison history：标准视口首先同框检查题名、配图与前一版的风格关系，再逐阶检查及切换总览；小屏复核同一流程，未发现待修复 P0/P1/P2。完成后恢复 iPhone 17 默认预览尺寸。

Implementation checklist: 书法 SVG、山水配图、各处称号接入、文字回退、标准与小屏 UI 验证均已完成。本轮验收为微信开发者工具模拟器；实体手机与线上发布不在本轮已验证范围内。

## 2026-11-12 · 首页酒局快捷入口

final result: passed

- source visual truth: 用户指定的两处入口截图 `docs/design/2026-11-12-home-shortcuts/reference.png`（976×288 px 局部）与当前首页 `before.png`（804×1748 px）。本轮按要求把原上下排列的入口设计为首页并排卡片。
- implementation: `docs/design/2026-11-12-home-shortcuts/after.png`，目标页验证截图 `join.png`、`demo.png` 位于同目录。
- viewport & state: 原生 iPhone 17，内容窗口 402×776 CSS px，首页截图为相同 2 倍密度的 804×1748 px；当前游客及既有手记，页面滚动位置为 0。
- full-view comparison evidence: 同目录 `comparison.png` 已同框检查首页前后；focused comparison evidence: `focused-comparison.png` 已同框检查原入口与新的双列入口，图标、文字、颜色、留白及角色清晰。
- 两张卡片位于“记一杯”下方，分别为 173×112 CSS px，顶边一致且首屏完整可见。竹绿填色强调凭号加入，纸白卡用于示例体验，说明区分本机房间号和示例酒局。
- 实际点击确认加入页路径与示例房间 `room_demo_01`；示例成功显示 4 款酒样。两张入口均具有明确的可访问名称。
- Comparison history: 完成两条导航后，回首页顶部重新截图和测量，排除 SDK 导航返回后的滚动偏移；最终没有本轮遗留 P0/P1/P2。
- 既有首页测试、JavaScript 语法、官方 WXML/WXSS 编译及差异空白检查通过。本段只验收首页入口设计和导航，不代表实体手机或全项目发布验收。

完整记录：[首页快捷入口设计检查](docs/design/2026-11-12-home-shortcuts/design-qa.md)。

## 2026-11-12 · 品阶目录与阅读切换细节

final result: passed

- source visual truth: 用户圈注 `/var/folders/j2/xj0l7swx5rn571xhfkz5zyww0000gn/T/codex-clipboard-cf987fb7-ee0a-4dc5-a79b-7c4de3eed6d1.png`（1088×1692 px），指出顶部三格目录与下方阅读切换的对齐问题。
- implementation: `/tmp/mz-member-controls-final.png`、`/tmp/mz-member-controls-overview.png`，标准屏幕 402×874 CSS px、内容窗口 402×776，截图 804×1748 px；小屏为 `/tmp/mz-member-controls-narrow-final.png` 与 `/tmp/mz-member-controls-narrow-overview.png`，屏幕 346×781、内容窗口 346×714，截图 692×1562 px。
- full-view comparison evidence: `/tmp/mz-member-controls-comparison.png`，将源图手机区域从 (104,17) 裁为 804×1675 px，与实现的同宽同高区域并排；源图是手动滚动位置，存在约数个 CSS px 的滚动差异，不作为内容间距变化判断。
- focused comparison evidence: `/tmp/mz-member-controls-detail.png`，使用同一锚点位置的修改前后原生截图，分别截取两组控件并排查看。

| 必查表面 | 结果 |
| --- | --- |
| 字体与排版 | 保持 13 px 系统字体，显式设置 1.5 行高和单行标签，按钮使用 flex 居中。两种视口五个标签的垂直中心差均为 0 px，水平方向最多 0.5 px 为单侧细边框导致的内容中心偏差。 |
| 间距与布局 | 目录改三列等宽 grid，去掉导致边缘格视觉较宽的内侧留白；标准屏三格均 134 px，小屏三格约 115.33 px（舍入差小于 0.01 px）。两种视口目录仍高 48 px，阅读切换高 44 px，未牺牲触控区域。 |
| 颜色与令牌 | 继续使用原有纸白、竹绿、细绿边，阅读选中态保持竹绿底、浅色文字，两种阅读状态均检查。 |
| 图片与图标 | 现有书法、山水和图标未改变，无新增运行图片或图标。 |
| 文案与功能 | 五个标签与目标保持原意；实际点击阅读标签可在雅叙/一览间切换，三个目录处理函数将目标定位在吸顶栏下方 64 px，运行异常为 0。 |

Comparison history: 用户圈出的 P2 问题是 min-height 保留了触控高度，但普通块布局让文字偏上；原先检查只覆盖高度，遗漏文字中心。修复为居中布局和等宽分栏后，标准、小屏均实测中心与尺寸，重新同框比较通过。证据数值见 `/tmp/mz-member-controls-metrics.json` 与 `/tmp/mz-member-controls-narrow-metrics.json`。WXML 与全量 28 个 WXSS 编译通过，检查后恢复默认 iPhone 17 模拟器。

Implementation checklist: 两组文字居中、顶部等宽、两种阅读状态与锚点检查完成，无剩余 P0/P1/P2。验收范围为开发者工具模拟器。

## 2026-11-12 · 首页分享入口去重与个人手记定位分析

final result: passed

用户确认删除首页「制作分享酒卡」快捷票签，保留图示的深绿色整行「记一杯」，并询问该功能的实际意义及首页更适合展示的内容。本轮落实去重，另外提出内容层级建议；尚未实施新的首页布局或酒局续接功能。

### 依据与对照

- source visual truth: `/var/folders/j2/xj0l7swx5rn571xhfkz5zyww0000gn/T/codex-clipboard-4ab62f5c-ebc2-49dd-b99f-0821ccd377e1.png`（844×342 px），用户指定沿用其中深色按钮，并确认移除下方分享票签。
- 修改前原生首页 `/tmp/mz-home-action-current.png`；最终实现 `/tmp/mz-home-action-final.png`。均为 iPhone 17、402×874 CSS px、内容窗口 402×776，截图 804×1748 px。
- full-view comparison evidence: `/tmp/mz-home-action-comparison.png`，修改前后以相同视口、2 倍截图密度、页面顶部位置并排。移除分享票签后最近手记上移属于明确要求。
- focused comparison evidence: `/tmp/mz-home-action-cta-detail.png`，将用户源图 (43,34,708,96) 区域与实现 (48,793,708,96) 区域同框对比，均等效 354×48 CSS px，深色按钮外形、字号、留白与加号位置一致。
- 流程证据 `/tmp/mz-home-action-flow.png`，依次展示当前首页、未提交的个人手记表单，以及通过已有手记打开的酒卡。第三张使用已有手记，没有为测试新增记录。个人手记表单截图 `/tmp/mz-home-action-checkin.png`，酒卡截图 `/tmp/mz-home-action-card.png`；两者已逐张打开检查。
- 首次采集的 `/tmp/mz-home-action-after.png` 保留了约 34 px 页面滚动，未用于顶部状态的设计比较。重新回到页顶后采用 `final.png`，没有据此修改公共导航。

### 检查结果

| 必查表面 | 结果 |
| --- | --- |
| 字体与排版 | 主按钮沿用当前设计系统的字号、字重与文字，保留「记一杯」和右侧加号。 |
| 间距与布局 | 主按钮实测 354×48 CSS px、全行显示，页面无横向溢出。移除票签及其私有样式后，最近手记自然上移；未新增另一组重复快捷按钮。 |
| 颜色与令牌 | 主按钮实际背景 rgb(39,77,59)，对应竹绿 #274d3b；其余纸白和细绿边保持原有设计。 |
| 图片与资产 | 复用现有书法、李白与箭头资产，本轮无新增图片。QA 截图在临时目录，没有加入运行资源。 |
| 文案与交互 | 删除票签、其局部样式及唯一使用的 shareLatest；指定手记的 openNote 与酒卡页保存/分享功能正常。空手记态仍可进入记录，未产生悬空入口。 |

实际流程检查：

1. 首页入口正常：重复票签为 0 个，深色按钮高 48 px。
2. 个人手记表单正常：「记一杯」进入 checkin，酒款目录本次从远程加载成功；没有提交表单。
3. 已有手记打开酒卡正常：所选记录与酒卡记录一致，图片成功生成且分享按钮存在；没有发送分享或保存相册。
4. 空态正常：仅临时将页面 notes 设空测试，随后刷新恢复真实记录。本机 journal 存储测试前后逐字一致。

本轮原有首页定向测试通过，变更 JS 语法、首页 WXML、全量 28 个 WXSS 官方编译和差异空白检查通过。运行时异常 0。检查数值见 `/tmp/mz-home-action-metrics.json`。没有新增与样式实现重复的单元测试。

### 产品定位分析与建议

「记一杯」目前保存独立的个人手记：酒名/盲样编号、香型、闻香、入口、回味和随记，存在本机，可制作酒卡。该记录不自动关联桌上或在线酒局，不计入现有会员品阶；因此它有留存个人感受的用途，但在以盲品酒局为核心的首页，应作为次要入口。按钮名可考虑「写品鉴手记」，使用户知道点击后的结果。

建议首页按状态与任务排序：优先续接本人真实参与的品鉴，没有候选时突出发起/加入；其次是简短的品阶进展与最近品鉴结果，再展示最近手记与一条酒识。李白和书法保留为较轻的页头，让首屏优先出现可操作内容。

可用性边界：当前本机房间列表包含示例局，playing 也可能是长期未揭晓的旧局；没有可靠的最近访问字段。未来续接卡必须排除示例、核验本人参与与阶段，多候选交给用户选择。在线列表本身不足以证明本人正在参与，不能直接把列表首条当「我的当前酒局」。以上是改版建议，未作为已实现功能呈现。

Implementation checklist: 用户确认的分享入口去重已完成，现有记录入口与分享路径验证通过；本轮标准视口无剩余 P0/P1/P2。新的首页内容架构仍为分析建议，实体手机与真实发送分享不在本轮已验证范围内。

范围补充：本段结论对应 16:48 保存的去重版本与上述流程。收尾读取差异时，发现同一工作区另有新增「凭号入座」「初次盲品」两张快捷卡及其方法的并行改动；已保留，没有覆盖。本段截图和验收不代表这些后续新增入口已验证，不能据此宣称当前整个首页的新布局均已通过。
