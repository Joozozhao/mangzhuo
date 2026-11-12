# 盲酌 · 三版设计预览

这是对现有微信小程序的视觉方向探索，共三版，每版包含首页、酒局、酒识、我的。原型用于选择页面与组件；没有替换小程序业务代码、提交或部署。

后续用户已选 A「竹影手札」，现已迁入小程序。实际实施记录与模拟器截图见 [方案一实施效果](../../docs/design/2026-11-04-bamboo/index.html)。本目录继续保留最初三版原型用于对比。

## 查看

在项目根目录运行：

```sh
python3 -m http.server 8791 --bind 127.0.0.1
```

打开 <http://127.0.0.1:8791/design-demos/2026-11-04/>。当前会话已启动此服务。也可直接打开 `index.html`（文件模式的本地保存与页面联动取决于浏览器的文件访问策略，推荐 HTTP 方式）。不依赖 npm、外部字体或 CDN。

- **A 竹影手札**：纸白竹绿，宋体与题签，东方手札氛围。入口 `a.html`。
- **B 夜酌俱乐部**：暖炭琥珀，强调大字和聚会氛围。入口 `b.html`。
- **C 白日品鉴室**：亮白钴蓝，现代编辑网格，记录操作直接。入口 `c.html`。

顶部切换四个页面；「页面联动」让内部导航同步到另外两版；「单版细看」放大单个方案。每个预览下方可以为当前页面选择方向，也可整套选择。底部「我的组合」自动保存在此浏览器，并能导出 Markdown 选择记录；不会向服务器提交选择。

## 交互与数据范围

四个栏目、文章阅读、酒识搜索/分类、手记入口、创建/加入酒局等为前端原型交互。所有预置手记、房间、人物与数字为演示。原型新增手记仅保存在对应方向的浏览器 localStorage，和微信小程序本机存储完全独立。在线登录、真实多人加入、评分计算、分享给微信好友、相册导出与后台请求不属于此次原型验收。

品牌插画直接引用项目 `miniprogram/assets/brand/` 的既有文件。酒识内容依据仓库内知识资料，未重新验证其中标准的现行状态。页面使用本机字体，其他设备上的字形可能不同。

## 选定后的替换位置

| 选择页面 | 对应小程序源文件 |
| --- | --- |
| 首页 | `miniprogram/pages/index/index.wxml`、`index.wxss` |
| 酒局 | `miniprogram/pages/gather/gather.wxml`、`gather.wxss` |
| 酒识 | `miniprogram/pages/knowledge/knowledge.wxml`、`knowledge.wxss` |
| 我的 | `miniprogram/pages/mine/mine.wxml`、`mine.wxss` |
| 通用视觉 | `miniprogram/app.wxss`、`miniprogram/styles/organized.wxss`、`miniprogram/components/brand-nav/`、`miniprogram/custom-tab-bar/` |

HTML 原型不能直接覆盖 WXML。实施时依据用户最终选择，把排版与样式迁移到原页面，保留已有事件绑定、身份和存储接口；跨版组合后需统一导航、字体、按钮及间距。小程序编译、微信模拟器和真机检查应在迁移后另行进行。

## 文件

- `design-brief.md`：共同内容、设计假设与消息协议。
- `index.html`、`review.css`、`review.js`：三版对比与选择工具。
- `a.html`、`b.html`、`c.html`：三个独立的可交互原型。
- `screenshots/`：本轮浏览器渲染截图。
- `qa.md`：实际检查结果与验收范围。
