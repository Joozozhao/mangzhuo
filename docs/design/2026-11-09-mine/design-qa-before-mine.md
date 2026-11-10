# 酒局记录票签改版设计检查 · 2026-11-09

final result: passed

检查范围：用户选择的方案 3 在现有微信原生小程序“桌上品鉴 → 酒局记录”区域的实现。结论只覆盖该区域的模拟器视觉和已检查的交互，不代表真机或整个小程序验收。没有初始化独立网页原型、改变原生导航或发布线上版本。

## 视觉依据和截图

- source visual truth: `docs/design/2026-11-09-gather/03-room-tickets.png`，即本轮用户选择的第三张图，原始尺寸 852×1846，设计提示的名义内容视口 390×844。
- implementation screenshot: `docs/design/2026-11-09-gather/implementation-adjusted.png`，实际微信开发者工具窗口 1848×1868；模拟器为 iPhone 17，工具显示缩放 83%。其中手机屏幕区域裁剪为 668×1452 像素，保存于 `implementation-phone-final.png`。
- viewport: 微信 iPhone 17 模拟器；未通过运行时查询确认 CSS 视口和 deviceScaleFactor。本次是同宽归一后的组件视觉比较，不宣称整页像素 1:1。
- state: 本机现有 7 场酒局，全部筛选选中，比较相同的 6776（进行中、6 款、1 人）与 1561（已揭晓、4 款、1 人）。
- full-view comparison evidence: `docs/design/2026-11-09-gather/comparison-records-final.png`，源图记录区与实际记录区在同一张图内并排，均等比缩放为 390 像素宽。
- focused comparison evidence: `docs/design/2026-11-09-gather/comparison-first-two-final.png`，分别裁剪相同两场酒局，按 350 像素卡宽归一后并排检查；不是仅分别打开两张图。
- 面向用户的实际记录区截图：`docs/design/2026-11-09-gather/implementation-records-final.png`。
- 旧四栏检查报告已保存在 `docs/design/2026-11-09-gather/design-qa-before-ticket-redesign.md`。

## Findings

当前没有需要继续修复的 P0/P1/P2 问题。

| 必查项 | 实际检查 |
| --- | --- |
| 字体与文字层级 | 房间号使用 Georgia 数字，名称为系统宋体，数据与状态使用系统无衬线；辅助字至少 12px。原生字形与生成稿存在细微字重差异，归为 P3。自定义长名称在已揭晓筛选中可读，超过两行时在卡片内截断，完整无障碍名称仍保留。 |
| 间距与布局 | 左侧房间索引、右侧状态/标题/数据/操作归为同一独立票签；虚线、上下切口、轻圆角和留白清楚区分各场酒局。已修复初版边距过大和选中线过长，当前首两卡与源图的宽度及结构一致。 |
| 色彩与视觉令牌 | 纸白 #f7f6ef、竹绿 #274d3b、淡竹绿索引区；进行中为绿底浅字，已揭晓为轻描边；同时保留明确状态文字，不只依赖颜色。 |
| 图片与图标 | 记录区无酒瓶照片、品牌素材或纹理图片；原有底部导航保持真实图标。新箭头使用 Tabler 官方 arrow-right SVG，已随小程序打包及附 MIT 许可，无外网运行依赖。 |
| 页面文字 | 移除设计稿“设计示例”标签，读取实际本机记录。状态只由 status 决定；房间号不在默认名称中重复，旧状态后缀仅在展示层移除。9926 实际 3 人参与与设计稿的 2 人不同，按真实数据展示。 |

## Comparison history

1. 初次比较：`comparison-first-two.png`、`implementation-first.png`。发现 [P2] 票签沿用原页边距，明显比方案稿窄；筛选高亮也铺满整列而非文字下方短线。
2. 修复：仅在本机记录区域缩小左右边距，放宽票签；标题调整为 60rpx；筛选按钮内部使用带短底边的文字容器，同时保留每项至少 48px 的可点击高度。350px 以下使用单独边距和自动换行。
3. 中间检查发现短线使用负定位伪元素时被原生 button 边界裁切；改为内部容器的底边后短线可见。
4. 修复后重新从微信开发者工具截取 `implementation-adjusted.png`，生成并实际打开 `comparison-records-final.png` 与 `comparison-first-two-final.png`。未发现新的 P0/P1/P2 视觉问题。

## 交互与代码检查

- 实际点击“进行中”：只显示 6776、6956、1581，已揭晓记录移除，选中状态同步。
- 实际点击“已揭晓”：显示 1561、9926、6888、3188；9926 名称展示不再与状态冲突。`implementation-revealed.png` 保存该状态。
- 实际点击 9926 的“查看结果”进入 `packages/blind/pages/reveal/reveal`，显示对应 3 款酒与参与人数 3 人。
- 刷新后返回酒局页，7 场记录仍在，最终保持“全部”选中。
- 微信控制台已检查：可见开发者工具预加载、热重载和既有 WXSS 选择器警告，未见酒局页 JavaScript 异常。运行时查询尺寸的控制台输入未成功执行，因此不据此宣称 CSS 尺寸已核实。
- `node --test tests/gatherTickets.test.cjs tests/onlinePages.test.cjs tests/sessionExpiry.test.cjs`：23/23 通过。覆盖真实本地存储读取的隔离测试、精确状态筛选、品评结束与揭晓区别、未知状态、刷新后保留筛选、空筛选、名称格式、原导航、在线分页与登录/过期行为。
- JavaScript 语法检查、WXML 标签结构检查、引用图标存在性与 `git diff --check` 均通过。WXML 检查在去除模板表达式后进行，避免把表达式中的 && 误作 XML 错误。
- 本轮界面工作不写入或迁移用户酒局数据，不发送创建、评分或揭晓请求。

## Open Questions / 未覆盖

真机字体回退、Android、320/350px 原生模拟器渲染、VoiceOver 朗读和在线真实服务未在本轮验收。窄屏样式及空状态有实现，业务逻辑的相应边界有测试，但不等同于这些设备的视觉通过。

## Implementation Checklist

- [x] 左侧房间号票签与状态/名称/数据/操作分区。
- [x] 全部、进行中、已揭晓筛选；有品评结束记录时额外显示该筛选。
- [x] 使用真实数量、保留存储、导航与原有在线行为。
- [x] 同图视觉比较、修复、重新截取并比较。
- [x] 相关回归检查与静态检查。
- [ ] 真机和 Android 字体/布局复核。

## Follow-up Polish

P3：Georgia 数字统一使用斜体，与生成稿中个别数字字形不同；宋体字重受系统字体回退影响。后续可在真机上微调字重，不阻挡本次票签区交付。

图标来源：[Tabler arrow-right](https://github.com/tabler/tabler-icons/blob/main/icons/outline/arrow-right.svg)，许可副本：`miniprogram/assets/icons/tabler-LICENSE.txt`。
