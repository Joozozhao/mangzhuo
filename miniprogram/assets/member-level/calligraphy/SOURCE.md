# 书法字形来源

这些 SVG 使用 Google Fonts 官方 **Ma Shan Zheng Regular（马善政毛笔楷体）**
Version 2.003 的真实 TTF 字形轮廓生成。字体项目：
<https://github.com/googlefonts/mashanzheng>。

- 字体下载（已验证 `main` 地址可用）：
  <https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf>
- 原始许可：
  <https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/OFL.txt>
- TTF SHA-256：`6d2546bb189c732a8ca29af9e22457b152387d158aa459e4ac2ce1e51788b7fb`
- OFL.txt SHA-256：`d7bdb1cee215b689e23c2f95672a6084c790542170648267a55114103d756a08`
- 许可证：**SIL Open Font License 1.1**；完整原文随附于 `OFL.txt`。
- 许可文件版权：Copyright 2018 The Ma Shan Zheng Project Authors
  (https://github.com/googlefonts/mashanzheng)
- TTF 内部版权原文：Copyright 2018 The MaShanZheng Project Authors
  (https://github.com/googlefonts/mashanzheng)

构建工具为 fontTools（首次构建使用 4.68.0）：`BoundsPen` 测量真实曲线边界，
`TransformPen` 翻转 Y 轴，`SVGPathPen` 导出单个同色路径。沿用字体自身 advance，
附加 0.025 em 字距；按字数统一画布宽度，所有题名共用基线和高度；真实笔画四周
至少保留 0.12 em 边距。坐标最多一位小数，保留原始二次曲线与笔锋。
填色为 `#274d3b`，背景透明；不包含文字节点、嵌入字体或外部渲染依赖。

在项目根目录重建（TTF 和依赖缓存均只放 `/tmp`）：

```sh
curl --fail --location \
  https://raw.githubusercontent.com/google/fonts/main/ofl/mashanzheng/MaShanZheng-Regular.ttf \
  --output /tmp/MaShanZheng-Regular.ttf
UV_CACHE_DIR=/tmp/mangzhuo-fonttools-cache uv run --no-project \
  --with fonttools==4.68.0 python scripts/build-member-calligraphy.py \
  --font /tmp/MaShanZheng-Regular.ttf
```

脚本验证字体校验和，以及全部 30 个不同汉字的 cmap 映射和非空字形，
并输出 13 个 SVG 的各自字节数及总计。大体积 TTF 不随项目分发。
