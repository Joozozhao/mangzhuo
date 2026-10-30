# Welink 后端部署状态检查与联调准备

更新日期：2026-10-21。

本说明配套只读部署探测脚本 [scripts/check-welink-deployment.cjs](/Users/joozo/Github/Codex/mangzhuo/scripts/check-welink-deployment.cjs:1)，用于以固定安全读取路径、不携带登录 Cookie、不读取线上敏感配置的方式，检查 Welink 后端新端点 `/taste/applet` 与旧端安全读取端点的部署状态。

## 期望 HTTP 401 与 404 的核心差别

线上探测的核心判断依据是 HTTP 响应码与响应体格式：

1. **HTTP 404 Not Found**
   - **技术含义**：表示该公开路径没有返回可用的新接口；应检查反向代理转发规则、服务部署版本和实际上下文路径。
   - **判定结论**：新增小程序接口**尚未部署或路由未接通**。应先修复路径，再继续登录与业务联调。

2. **HTTP 401 Unauthorized 与 JSON `{"code":401,"msg":"..."}`**
   - **技术含义**：客户端向 `/taste/applet/tastes` 发起匿名 GET 请求时，这与 `AppletController.list` 的 `identity(request)` 对匿名会话的预期行为一致。
   - **判定结论**：公开路径的匿名响应符合约定，可继续真实业务联调。该检查不能独立证明响应来自哪个组件，也不验证微信凭证、数据库读写或完整部署健康。

3. **公众号 HTML 页面与重定向拦截**
   - 若返回 HTTP 302 重定向至微信 OAuth，或返回带有 `<!DOCTYPE html>` 的公众号入口页面，说明网关将小程序端点错误地重定向到了公众号网页授权路由（如原 `/page/wechat.html`），属于路由配置问题，需要检查实际响应来源。

4. **旧端读取端点的安全预期**
   - 探测端点包括 `/taste/wechat/gettaste?id=0&sort=`、`/taste/wechat/gettastetype?tasteId=0`、`/taste/wechat/getcolumns?tasteId=0`。
   - 严禁检查写路由（如 `/taste/wechat/updatetastestatus`）。
   - 预期旧端对匿名请求在鉴权层拦截并返回 HTTP 200 且 `code` 为非 0 整数且 `msg="relogin"`，或直接返回 HTTP 401/403。若返回 HTTP 200 且业务 `code=0`，或者缺少 `code` 字段，一律判定安全校验失败。

## 本地 Stub 验证脚本运行

检查脚本零外部依赖，仅使用 Node.js 原生模块。可通过本地 HTTP 桩（loopback）验证不同响应分支的判定准确性：

```bash
# 查看帮助与参数规范
node scripts/check-welink-deployment.cjs --help

# 验证通过场景（需显式开启本地 HTTP 许可）
node scripts/check-welink-deployment.cjs --base-url http://127.0.0.1:8080 --allow-local-http

# 机器可读 JSON 输出
node scripts/check-welink-deployment.cjs --base-url http://127.0.0.1:8080 --allow-local-http --json
```

脚本已在本地通过下列测试场景的回归验证：
- **全部通过场景**：新接口返回 401 JSON，旧端返回 `relogin`，退出码 0；
- **404 场景**：新接口返回 404，报告明确标出未部署，退出码 1；
- **重定向场景**：检测到 302 重定向，拦截并报告失败，退出码 1；
- **HTML 场景**：检测到 `Content-Type: text/html` 或 HTML 标签，报告非预期响应，退出码 1；
- **旧端数据泄露**：旧端匿名返回 200 `code: 0`，报告严重异常，退出码 1；
- **请求悬挂（Body Hang）**：服务端发送响应头后挂起数据传输，脚本在设定超时内安全中止并退出 1；
- **缺失 code 字段 / 非法 500**：旧端响应结构异常或返回非预期的 HTTP 500 时严格判定失败；
- **IPv6 回环地址**：支持 `http://[::1]:port` 回环开发验证。

## 部署环境与启动配置

目标部署服务为 `vote-admin` 模块：

1. **部署目录与构建产物**
   - 源码模块：`vote-app/vote-admin/`
   - 构建产物路径：`vote-app/vote-admin/target/vote-admin.jar`
   - 运行环境依赖：Java 17 运行时。

2. **启动命令与 Profile 激活**
   - 启用专用配置文件：通过命令行参数 `--spring.profiles.active=applet` 或环境变量 `SPRING_PROFILES_ACTIVE=applet` 激活 [application-applet.yml](/Users/joozo/Github/Codex/mangzhuo/vote-app/vote-admin/src/main/resources/application-applet.yml:1)。
   - 启动示例命令：
     ```bash
     java -jar vote-admin.jar --spring.profiles.active=applet
     ```

3. **环境变量注入点（只列名称，密钥值由部署系统保管）**
   - `APPLET_APP_ID`：小程序 AppID，对应配置项 `applet.app-id`。
   - `APPLET_APP_SECRET`：小程序 AppSecret，对应配置项 `applet.app-secret`（由部署系统私密注入，禁止写入代码库或前端工程）。
   - 服务端口：所附配置为 8086，部署时以服务器的实际配置为准（网关反向代理并终结 HTTPS）。

4. **网关与证书配置要求**
   - Nginx 反向代理必须将 `https://applet.51welink.com/taste/applet/` 开头的请求原样透传至后端服务；
   - 必须保持 HTTPS 证书有效，且在微信小程序后台将 `https://applet.51welink.com` 添加至合法 `request` 域名列表。

## 真实双账号联调清单

只读检查通过后，使用两个真实微信身份继续端到端业务验收。旧业务路径若采用有意隔离部署，需结合网关策略解释相应检查项。

> **提示**：当前阶段仅完成本地单元测试、模拟器链路测试及只读探测工具准备，**不能声称真实联调已完成**。

| 序号 | 联调测试项 | 身份角色 | 验收操作与预期结果 |
| :--- | :--- | :--- | :--- |
| 1 | 用户主动触发微信登录与资料建立 | 账号 A（主持人）<br>账号 B（品鉴者） | 进入「酒局」在线品鉴，触发 `wx.login` 换取凭证并建立服务端 Session，返回唯一 openid 与初始昵称。 |
| 2 | 自定义昵称同步 | 账号 A / B | 在个人中心修改昵称为真实品鉴师称谓，调用 `/taste/applet/profile` 成功，刷新后昵称保持。 |
| 3 | 主持人发起新酒局 | 账号 A（主持人） | 输入主持人口令、酒局标题及真实酒款列表（2～20 款），成功创建活动并获取酒局 ID。 |
| 4 | 盲品详情与选项隔离 | 账号 B（品鉴者） | 参与者进入活动页面：能够看到候选酒款名称列表，但看不到真实酒样对应的真实酒款名（`actualName` 仅主持人可见）。 |
| 5 | 品鉴评分与边界值 | 账号 B（品鉴者） | 提交各酒款猜想与评分（验证包含 0 分与 100 分），服务端事务写入 `vote_taste_score`。重复提交时能够正确覆盖更新本人评分。 |
| 6 | 权限隔离与结束活动 | 账号 B（品鉴者）<br>账号 A（主持人） | 参与者 B 尝试调用结束接口返回 403 拒绝；主持人 A 调用 `/close` 成功结束酒局。 |
| 7 | 结果揭晓与改分拦截 | 账号 A / B | 活动结束后，所有参与者可见最终结果及统计均分；再次尝试提交评分应被后端严格拒绝。 |
| 8 | 会话过期主动引导 | 账号 A / B | 服务端 Session 超时失效后发起请求，前端捕获 401 状态码，清理本地在线缓存并引导重新登录，杜绝静默重放写请求。 |

## 本次公开路径检查

2026-10-21 10:08（Asia/Shanghai），主验收对默认 HTTPS 源执行只读脚本：新列表路径与三条旧读取路径均返回 HTTP 404，4 项检查未通过。随后只读请求确认原 HTTP `/page/wechat.html` 与 `/taste/wechat/geturl` 可用，但同域 HTTPS 仍返回 404；这验证了公众号网页入口，不代表小程序所需 HTTPS 接口已接通。需核对 HTTPS 服务与网关路由；未调用真实微信登录、数据库或任何业务写接口。
