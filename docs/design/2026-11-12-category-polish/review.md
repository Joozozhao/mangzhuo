# 酒识文章分类细节修复 · 2026-11-12

针对用户截图中的分类按钮，修复文字靠上、上下留白不均及圆角与行间距不统一的问题。

## 调整

- 分类按钮采用居中布局，标签独立包裹，文字水平、垂直居中。
- 单行按钮统一最小高度 44 px，字号 13 px；自然换行并保留 8 px 的行列间距。
- 圆角统一为胶囊形；选中及未选中状态沿用竹绿、米白配色。
- 增加 `aria-pressed`，明确表达当前选中分类。
- 标签允许在宽度受限时换行，按钮可随内容增高。

## 验证

- 微信开发者工具原生模拟器，402 px 窗口宽度。
- 7 个分类逐一点击，结果类别均与选择一致；对应 `aria-pressed` 均为 `true`。
- 当前分类实测均为 44 px 高，标签上下留白各约 12.9 px。
- 既有酒识页面测试 2 项通过；官方 WXML / WXSS 编译及 `git diff --check` 通过。
- 本轮是模拟器验证，未做 iOS / Android 真机检查。

截图及尺寸、筛选结果分别保存在 `before.png` / `after.png` 和 `before.json` / `after.json`。

![前后对比](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-12-category-polish/comparison.png)
