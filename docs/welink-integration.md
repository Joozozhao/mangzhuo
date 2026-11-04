# Welink 品鉴后台接入与验收记录

更新日期：2026-11-04。

2026-11-04 已按用户提供的 `GET /taste/public/wineType` 接入公开酒款目录，实际返回 `code: "00000"`、`count: 0`、`data` 数组 44 条。该公开接口与下述需登录的 `/taste/applet` 接口独立；当前公开目录接通不代表在线登录、酒局创建或评分已完成线上联调。目录缓存与验证见 [竹影手札实施记录](design/2026-11-04-bamboo/review.md)。

## 当前交付边界

已取得本地后端源码 `vote-app/`，并在原工程新增 `/taste/applet` 原生 JSON 接口。小程序保留原有页面与桌上品鉴，在「酒局」增加在线品鉴。**新增接口尚未确认线上接通**：2026-10-21 09:50（Asia/Shanghai）只读访问 `https://applet.51welink.com/taste/applet/tastes` 返回 HTTP 404，不能据本地代码认定线上已经接通。

原 `http://applet.51welink.com/page/wechat.html` 是公众号网页授权入口。公众号 OAuth 与小程序 `wx.login` 是两条身份链路，不能直接互换 code、openid 或会话。

| 功能 | 数据与评分方式 |
| --- | --- |
| 品酒手记、桌上品鉴 | 保留本机存储与原五维评分，原记录不会自动上传或迁移 |
| 在线品鉴 | 使用 Welink 原有四张品酒表；按编号猜酒款，每款综合评分 0～100 整数；主持人结束后汇总 |
| Welink 资料 | 后台保存昵称与小程序身份，头像保存在本机 |
| 云开发身份 | `IDENTITY_PROVIDER: 'cloud'` 时使用原云函数方案，见 `wechat-identity.md`；不能当作 Welink 登录态 |

## 新增接口契约

实现：`vote-app/vote-admin/src/main/java/com/welink/voteadmin/applet/`。

默认基地址为 `miniprogram/config.js` 中的 `https://applet.51welink.com`。接口统一前缀 `/taste/applet`，成功响应 `{code:0,data:...}`，列表额外返回同级 `count`。失败使用非 2xx HTTP 状态和 `{code:<状态码>,msg:...}`。

登录通过后端向微信校验临时 code；客户端须同时收到 openid 与该响应的新 JSESSIONID 才视为成功。后续显式携带 Cookie，并与基地址隔离。服务端 session 属性为 `appletOpenId`，空闲超时 7200 秒，区别于公众号的 `openId`。

| 方法 | 相对路径 | 请求 | 返回 data |
| --- | --- | --- | --- |
| POST | `/login` | `{code}` | `{openid,nickname}`，响应携带 JSESSIONID |
| POST | `/logout` | — | `{}`，失效服务端会话 |
| POST | `/profile` | `{nickname}`，1～20 字 | `{nickname}` |
| GET | `/tastes?page=1&limit=15` | page 1～100000，limit 1～50 | `[{id,title,status,isOwner,createdAt}]` |
| POST | `/tastes` | `{title,names,authentication}` | `{id}` |
| GET | `/tastes/{id}` | 正整数编号 | `{id,title,status,isOwner,samples,choices,answers}` |
| POST | `/tastes/{id}/scores` | `{answers:[{sampleId,guessedName,score}]}` | `{submitted:true}` |
| POST | `/tastes/{id}/close` | 仅创建者 | `{status:1}` |
| GET | `/tastes/{id}/results` | 仅已结束活动 | `{title,participantCount,samples:[{sampleId,number,name,average,count,correct}]}` |

创建标题 1～32 字，酒样按真实编号顺序填写 2～20 个互不相同的酒名，每项 1～100 字。主持人口令沿用原系统 `wechat.secretKey + 当日日期(yyyyMMdd, Asia/Shanghai)`；由主持人输入，前端不内置密钥、不持久化口令。请求完成或离开页面后清除输入。

详情 `samples` 为 `{sampleId,number,actualName?}`：新接口在进行中仅向主持人返回真实酒款；结束后所有已登录参与者可见。`choices` 为不附带酒样编号的候选文本；`answers` 只包含当前身份已提交的答案。每次提交必须覆盖全部酒样，不可重复编号，猜酒款须在候选中，评分为 0～100 整数。更新评分与结束活动通过事务和同一活动行锁串行处理；实际数据库锁行为仍需联调验证。

会话过期（401）清除本机在线登录态，并引导用户主动重新登录；不静默重放创建、评分、结束等写请求。网络超时后的写入结果可能不确定，应先刷新活动确认，避免重复创建。

## 本地验收

后端 39 项 MockMvc/微信客户端测试通过，Java 17 构建已生成包含新接口的 `vote-admin/target/vote-admin.jar`。请求与身份层 25 项子用例通过（Node 统计 27 项，包含 2 个父测试）。这些结果均由主验收复核。

微信开发者工具中，17 项模拟 HTTP 流程检查通过：登录、在线列表卡片实际显示、详情、0/100 分提交、活动编号分享、结束、结果失败后重试、创建失败不跳转并清口令、401 清除详情并引导登录、不静默重放、无运行异常、本机原数据保持不变。已目视复核列表与结果截图；编号输入框宽 255px、按钮宽 75px，头像为 68×68px 圆形。

21 个注册页面文件齐全，36 个 JavaScript 文件语法检查通过，官方编译器完成 23 个 WXML 与 24 个 WXSS 编译。最终前端回归 33 项子用例全部通过（Node 统计 36 项，包含 3 个父测试），其中页面回归 8 项，覆盖口令清理、游客拦截、401 清屏与登录返回、账户隔离、0/100 分及小数拒绝、忙碌防重、列表重试与清理、资料同步提示。

测试使用隔离的网络/服务桩，不连接真实数据库，不调用真实微信登录兑换，也不向线上提交创建或评分。模拟器测试前后恢复原有登录资料，本机手记与酒局须保持不变。模拟器截图中标注的验收活动为模拟数据。

## 部署与真实联调尚需完成

1. 在后端部署环境配置与小程序 AppID 对应的独立 AppSecret。已提供 `vote-admin/src/main/resources/application-applet.yml`，启用 `applet` profile 并注入 `APPLET_APP_ID`、`APPLET_APP_SECRET`，或将同等配置并入私有配置；不要将密钥写入小程序。未配置时登录返回 503。
2. 用 Java 17 构建并部署 `vote-admin`，确认网关将 HTTPS `/taste/applet/**` 转发到该服务。新接口应返回 JSON；匿名请求列表预期 401，不能仍为 404 或公众号 HTML 页面。
3. 核对部署数据库现有 `vote_taste`、`vote_taste_type`、`vote_taste_score`、`vote_taste_user` 表与实体兼容，包括自增主键和 `taste_url` 字段。本次不新增表、不执行迁移、不重跑源码自带初始化 SQL，以免覆盖既有数据。
4. 小程序后台将该 HTTPS 源加入 request 合法域名，配置有效证书。开发 HTTP 覆盖仅用于显式开发环境的本机/局域网地址，体验与正式环境仍使用 HTTPS。
5. 用主持人和参与者两个真实微信身份验收：登录、昵称、创建、参与者开奖前的响应、0/100 分、重复更新、非主持人禁止结束、结束后禁止改分、汇总、会话过期、真机域名校验。数据库事务/并发与跨设备可见性亦在此阶段验证。

### 旧公众号接口已补齐的权限

原公众号 `WechatController` 与新接口共用四张表，本轮同时修复以下绕过路径：

- `/gettaste`、`/syncvote`、`/gettastetype`、`/getcolumns`、`/getvotedetail`、导出和各写接口先验证公众号 `openId` 会话；小程序 `appletOpenId` 不冒充公众号身份。
- 进行中的参与者详情只返回酒样编号；真实酒名与对应图仅主持人可见。候选项按名称排序，使用独立负编号，不与真实酒样 ID 关联。评分回填只含自己的猜测和分数，不返回猜中结果或猜测对应的真实酒样 ID。
- 酒样映射、结果表头、全员结果与 Excel 导出均在结束后开放，主持人也不能提前调用结果接口。导出直接写入响应流，不再将结果文件保留到上传目录。
- 只有创建者可以结束、修改酒局；结束后不能重新开启、改分或修改酒样，已有评分也不能重建酒样。评分、结束、修改酒样共用活动行锁与事务；创建和多表写入失败通过异常回滚。
- 评分兼容旧 weui 的候选编号与 layui 的手填酒名两种表单，均验证完整交卷、本局酒款和 0～100 整数。写接口限定 POST；旧页面结束后禁用重开控件，修正原网页拒绝 1～9 分的校验。
- 公众号授权成功轮换会话 ID，修复首次注册时引用空用户的错误，并移除 OAuth token 和带密钥完整查询 URL 的直接打印。

上述属于本地源码修复，必须与新接口一起部署才会影响线上。原网页部署后需刷新评分表单；部署前已打开、仍以真实候选 ID 提交的旧 weui 表单会被拒绝。实际数据库回滚、锁竞争、两种公众号网页和真实微信身份仍需部署环境联调；不能将 MockMvc 通过等同于整个服务已完成安全验收。

部署后可执行只读检查 `node scripts/check-welink-deployment.cjs`；用法与预期见 [部署检查说明](welink-deployment-check.md)。脚本只检查匿名响应与路径是否部署，不调用登录或任何写接口，也不代替双账号真机验收。

## 主要文件

- 请求与身份：`miniprogram/services/welinkClient.js`、`identity.js`、`config.js`。
- 列表与资料：`miniprogram/pages/gather/`、`profile/`、`mine/`。
- 在线流程：`miniprogram/packages/online/pages/create/`、`detail/`。
- 旧接口权限回归：`vote-app/vote-admin/src/test/java/com/welink/voteadmin/controller/WechatControllerSecurityTest.java`。
- 新后端与测试：`vote-app/vote-admin/src/main/java/com/welink/voteadmin/applet/`、`src/test/java/com/welink/voteadmin/applet/`。
- 前端回归：`tests/*.test.cjs`，运行 `node --test tests/*.test.cjs`。
- 后端回归：在 `vote-app` 使用 Java 17 执行 `mvn -pl vote-admin -am test`。
