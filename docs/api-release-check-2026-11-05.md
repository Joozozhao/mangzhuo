# 小程序接口接入与发布前检查

更新日期：2026-11-06。当前接口说明以本文为准；早期 `welink-integration.md` 中的 JSESSIONID 登录方案保留作历史参考。

## 已完成的开发

- 登录：`POST /taste/userInfo/wxLogin` 接收 `code`、`avatarUrl`、`nickName`、`sex`，保存 `accessToken`、`openId` 和远端 `userId`。本机酒局使用的 `userId` 不被远端 ID 覆盖。
- 用户资料：`GET /taste/userInfo/{openid}/get` 读取服务端昵称、头像等资料；请求头自动带 `Authorization: Bearer <accessToken>`。
- 昵称：`POST /taste/userInfo/updateNick` 提交 `openid`、`nickname`，不再通过重复 `wxLogin` 更新昵称。
- 头像：`POST /taste/userInfo/uploadWxUrl` 使用 `wx.uploadFile`，文件字段为 `file`，表单携带 `openid`；支持 `http://tmp/`、`wxfile://` 等本机临时文件路径，兼容返回的 `file_url`。
- 酒款目录：`GET /taste/public/wineType` 用于酒款目录和酒款联想，保留最近成功缓存和内置目录降级。
- 酒文化：`POST /taste/public/knowledge`，JSON 参数 `{page,size}`，已接入“慢读文章”。支持实际 `records` 分页结构、正文 `paragraphs`、出处 `sources`、练习 `tip` 和更新日期；接口不可用时继续显示本地文章，不伪造在线内容。
- 成功码接受 `00000`；公开请求不携带身份凭证，公开接口失败不会清除登录态。令牌过期会提示重新登录，不自动重放资料或品鉴写请求。

## 真实接口验证

以下验证在微信开发者工具中完成，使用当前用户原有昵称及原头像内容，没有创建测试昵称或替换为测试图片，也没有输出访问令牌。

| 接口 | 实测结果 |
| --- | --- |
| `wxLogin` | HTTP 200，业务码 `00000`，返回 accessToken、openId、userId |
| `/{openid}/get` | HTTP 200，业务码 `00000`，昵称、头像字段读取成功 |
| `updateNick` | 保存原昵称成功，再次读取结果一致 |
| `uploadWxUrl` | 原头像内容上传成功，业务码 `00000`，返回 HTTPS 图片地址；再次读取资料可见头像 |
| `public/wineType` | HTTP 200，业务码 `00000`，返回 44 款酒；页面显示 44 款，来源为线上目录 |
| `public/knowledge` | POST 返回 HTTP 200、业务码 `00000` 和 11 篇文章；页面在线展示 11 篇，正文、出处和练习提示均已核对 |

另验证：完整“登录 → 读取资料 → 上传头像 → 更新昵称 → 再读取资料”链路通过。过期页面显示“登录凭证已过期，请重新确认身份后继续保存”，并出现重新登录按钮。

## 发布前需要处理的事项

1. **后端延长 accessToken 有效期或提供刷新机制。** 实测本次 JWT 的 `exp - iat` 为 **8 秒**。虽然即时接口调用成功，正常用户阅读、填写和保存无法在 8 秒内完成。小程序已提供过期提示，但不会用静默重放写请求掩盖这个问题。
2. **微信公众平台上配置域名。** `request` 和 `uploadFile` 合法域名需包含 `https://applet.51welink.com`；头像等远程图片使用的 HTTPS 域名需按实际上传返回结果加入 `downloadFile` 合法域名。开发者工具关闭域名校验不能替代真机验证。
3. **隐私及权限配置。** 核对了头像选择、相册保存等说明；仍需在小程序后台确认实际使用的微信隐私接口已声明，并在真机检查授权弹窗。
4. **旧在线品鉴接口另行联调。** `/taste/applet/**` 不在本次提供的新接口清单中，相关本地功能保留。匿名 `GET /taste/applet/tastes` 当前返回 HTTP 403，未返回约定的业务 JSON，不能把在线创建、评分、结束和结果功能算作已验收。

## 自动检查

- Node 回归测试 69 项通过，覆盖 Bearer 鉴权、用户资料、上传、公开知识实际字段、过期处理、缓存与页面降级。
- 小程序 JavaScript 语法检查 38 个文件通过。
- 微信官方 WXML 编译 23 个文件通过，WXSS 编译 25 个文件通过。
- 真机、双账号在线品鉴、微信后台配置和体验版发布尚未完成。
