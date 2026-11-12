# 首页酒局快捷入口 · 2026-11-12

final result: passed

## 范围与视觉依据

用户希望把酒局页的“已有一席，凭号入座”和“第一次盲品？先看看示例酒局”提升到首页并做设计。本轮在首页“记一杯”下方、“最近手记”前增加两张并排入口卡片。

- source visual truth: 用户截图 `reference.png`（976×288 px 的局部截图）及当前首页 `before.png`（804×1748 px）。用户截图用于确认入口及风格，新布局按要求改成首页双列卡片，属于明确的布局调整。
- implementation: `after.png`（804×1748 px），以及目标页 `join.png`、`demo.png`。
- viewport: 微信开发者工具原生 iPhone 17，内容窗口 402×776 CSS px；完整屏幕截图 804×1748 px。首页前后截图以相同 2 倍截图密度比较；局部参考不作为完整视口的逐像素目标。
- state: 当前游客及已有本地手记；首页回到滚动位置 0 后捕获。
- full-view comparison: `comparison.png`，同一画布并排对照首页调整前后。
- focused comparison: `focused-comparison.png`，同一画布对照用户指定的原入口与新的首页入口。

## 设计与行为

- 两张卡片共享对齐、字号与细边框；左侧浅竹绿为“凭号入座”，右侧纸白为“初次盲品？”。
- 标题用现有宋体，说明用系统字体，复用现有桌上品鉴、书页及右箭头图标。
- 加入卡说明“输入本机房间号”，对应现有桌上品鉴功能；示例卡说明“先看看示例酒局”。
- 主按钮与两个入口在本轮标准视口首屏均完整可见；卡片实测各 `173 × 112` CSS px，顶边相同，左右间距 8 px。
- “凭号入座”实际打开 `/packages/blind/pages/join/join`。
- “初次盲品？”实际打开 `/packages/blind/pages/reveal/reveal?roomId=room_demo_01`，示例显示 4 款酒样。

## 检查结论

- P0/P1/P2: 无本轮遗留项。已对照原入口、新首页全景与局部，未发现文字裁切、卡片错位、遮挡主操作或跳转错误。
- Comparison history: 首次原生检查确认两条跳转；返回后 SDK 自动保留了页面滚动位置，最终改为回到首页顶部重新取图和测量，确认两张卡片顶边一致、首屏完整。
- 既有首页回归测试通过；JavaScript 语法、官方 WXML/WXSS 编译及 `git diff --check` 通过。
- 未新增业务接口或图片依赖。本轮验证覆盖标准模拟器视口及两个导航入口，未进行实体手机验收。

![首页前后对比](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-12-home-shortcuts/comparison.png)

![入口细节对比](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-12-home-shortcuts/focused-comparison.png)
