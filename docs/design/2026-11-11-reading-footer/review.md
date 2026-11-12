# 酒识详情收尾区域优化 · 2026-11-11

用户截图指出文章末尾的“杯中练习”、行动按钮、编辑说明与整理日期排列松散。本轮在现有米白与竹绿风格内调整这一段展示。

## 已调整

- 杯中练习使用浅绿色背景和细边框，把标题、练习说明及主按钮放在同一区域；按钮与说明之间保留明确间距。
- 主按钮保留现有竹绿样式及 48 px 最小高度，右侧复用现有箭头图标。
- 内容来源和整理日期并排排列，宽度不足时允许换行；删除重复的“品鉴记录建议”说明。
- 有出处时，单列参考资料和明确的复制动作；无出处时不显示空列表。
- 阅读态缩小页面底部空白并保留菜单及安全区空间；列表页仍使用原来的留白。
- 酒款详情中的“写下自己的感受”复用相同布局。

本轮未修改文章正文、知识数据或接口，也未新增服务器内容。

## 验证

- 微信开发者工具原生模拟器：402 px 窗口宽度。
- 检查无出处的本地文章、有出处的本地文章、在线文章及酒款详情四种状态。
- 实际点击“记下我的品鉴”，已打开 `pages/checkin/checkin`。
- 执行既有知识服务与页面测试，11 项通过。
- 微信官方 `wcc`、`wcsc` 编译通过，`git diff --check` 通过。
- 说明文案使用渐进增强的均衡换行，较旧渲染引擎仍按普通文本换行；未做 iOS/Android 真机验收。

## 原生截图

调整前：

![调整前](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-reading-footer/before.png)

调整后：

![调整后](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-reading-footer/after.png)

在线文章和参考资料：

![参考资料状态](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-reading-footer/remote.png)

酒款详情：

![酒款详情](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-reading-footer/wine.png)
