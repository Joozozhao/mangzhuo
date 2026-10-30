# 盲酌 · 微信身份与品鉴资料（部署与配置说明）

> 当前默认配置为 `IDENTITY_PROVIDER: 'welink'`，使用自有品鉴后台登录；部署与当前验收结果见 [welink-integration.md](welink-integration.md)。本文以下内容保留为 `IDENTITY_PROVIDER: 'cloud'` 时的云开发方案与历史验收记录，不代表当前 Welink 链路已部署。两种身份不能互相替代，Welink 模式仅同步昵称，头像保存在本机。

配套产品流程文档：docs/wechat-profile-design.md（本文档与其保持一致，负责工程实现与部署侧）。

官方能力依据：

- 头像昵称填写（chooseAvatar / input type=nickname）：https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/userProfile.html
- 腾讯官方登录与头像昵称教程：https://intl.cloud.tencent.com/zh/document/product/1219/68263

## 1. 架构边界

| 层 | 文件 | 职责 |
|---|---|---|
| 身份服务 | miniprogram/services/identity.js | 微信登录、资料保存、头像持久化、Canvas 头像绘制降级 |
| 本地数据 | miniprogram/services/storage.js | 当前用户与酒局/成员/盲猜/评分本地存储（userId 稳定） |
| 云适配 | miniprogram/services/cloudDb.js | 云/本地双模读写；旧 getCurrentUser 已废弃，固定返回本地用户，禁止使用（避免 openid 冒充 userId 导致关系漂移） |
| 云函数 | cloudfunctions/login/index.js | getWXContext 校验身份 + users 集合资料存取 |
| 配置 | miniprogram/config.js | CLOUD_ENV_ID（云环境 ID，可留空用动态环境） |

关键不变量：

- 本地 userId（含演示账号 user_master）永远稳定；openid 只是附加身份字段，不回写 ownerId / members.userId / guesses / ratings。
- 不调用 wx.login 拿 code 充当登录成功；登录成功 = 云函数 login 通过 getWXContext 返回 OPENID。
- 不静默读取微信昵称/头像；昵称建议必须用户点击填入，头像必须用户通过 chooseAvatar 选择。
- 云端 members 名片更新必须同时限定 userId + _openid（演示 userId 在不同设备间不唯一）。
- 云端资料的头像只保存 cloud:// fileID；云上传失败本地 wx.saveFile 降级后，wxfile:// 路径仅存本机，绝不写入云端 users/members（不可跨设备访问）。

## 2. 微信身份功能部署步骤

1. 微信开发者工具开通云开发，获得环境 ID。
2. 将环境 ID 填入 miniprogram/config.js 的 CLOUD_ENV_ID（留空则使用开发者工具当前选定环境）。
3. 云控制台创建 users 集合，客户端权限设为仅本人可读写（或仅服务端访问）。云函数使用 getWXContext 校验身份。资料字段由服务端按 _openid 归属；头像云存储设为可读、仅上传者可写。既有 members 若已接入云端，更新仅匹配本人 _openid。酒局其余集合迁移另行实施。
4. 对 cloudfunctions/login 执行「上传并部署：云端安装依赖」（已补 package.json，依赖 wx-server-sdk ~2.6.3）。本次身份功能不需要部署其他酒局云函数。
5. 真机预览验证下方清单。

## 3. 运行行为

- 云环境未配置 / 函数未部署 / 网络失败：点「微信登录」弹出明确失败提示（"登录服务暂不可用"），保持游客模式，浏览酒识、本地打卡、本地资料保存不受影响。
- 登录成功：loginState=wechat 并记录 openid；若服务端已有资料则按 profileUpdatedAt 较新者载入（新设备找回头像昵称）。
- 保存资料：昵称必填（≤20 字）；新头像先持久化（云存储 avatars/ 前缀，失败退 wx.saveFile），持久化失败则整体不覆盖旧资料；成功后同步本机所有已参与酒局的成员名片。
- 云端同步为 await 如实回传：已绑定微信身份但同步失败时，页面提示"已保存到本机，云端同步未完成"并可重试；头像为本地路径时明示"头像仅保存在本机"。
- users 集合以 openid 作为确定 doc ID（doc(openid).set），显式写入 _openid，幂等防并发重复建档；profileUpdatedAt 以服务端 Date.now() 为准，客户端时间不可信。
- 分享酒卡 / 战报海报：Canvas 异步加载头像（cloud:// 先换临时 URL），8 秒超时或加载失败自动降级圆形底 + emoji。

## 4. 验收清单（需真机 + 已配置云环境）

- [ ] 游客状态进入「我的」，显示演示昵称与游客标识，入口文案为"完善头像昵称"
- [ ] 资料页头像 chooseAvatar 可选图，昵称框点击出现微信昵称建议且可自定义
- [ ] 未点建议时昵称不会被自动填入微信昵称
- [ ] 保存后房间成员名片、排行榜、对比页、酒局报告头像昵称同步更新
- [ ] 分享酒卡底部出现头像 + 昵称署名；头像断网时降级 emoji 不卡死
- [ ] 断网/未部署云函数时登录给出失败提示，游客流程全部可用

## 5. 本次未部署/未验证项

- 云环境 ID 尚未提供，config.js 的 CLOUD_ENV_ID 暂留空（动态环境）。
- 本次未执行 login 云函数部署，也未操作云控制台；实际云端集合与权限状态需配置时确认。
- 真实微信登录、昵称建议面板、chooseAvatar 真机授权、云存储上传链路均未真机验收（本次未进行真机或模拟器交互验证）。
- 本地既有演示酒局（room_demo_*）仍为单机数据，不因此次接入变为多设备共享。

## 6. 集成审查记录

- 补齐云端资料显式 _openid、确定文档 ID 与服务端时间戳。
- 仅修改昵称时保留原云端头像；临时头像转为本地文件后清空待保存临时路径，重试不再使用已移动的文件。
- 资料云同步与尚未启用的酒局 members 集合同步分开处理；本地头像的保存范围明确提示用户。
- 酒卡头像先完成异步加载再绘制，旧渲染回调通过令牌作废；避免 Canvas 保存状态跨异步等待影响新卡。
- Kimi 完成实现与语法检查，主代理完成源码集成审查；本次没有运行自动测试、模拟器交互或真机登录验收，也未部署云函数。
