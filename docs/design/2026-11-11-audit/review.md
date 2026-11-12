# 盲酌小程序功能与体验检查 · 2026-11-11

本轮已启动微信开发者工具，以当前工作区运行版本做原生模拟器走查。视觉语言已有一致性：米白纸页、竹绿、票签和宋体标题可以继续沿用。当前更需要补齐邀请、记录管理和分享后的阅读体验，同时修正部分实际布局问题。

结论：可以继续内部走查，尚不能据本轮检查认定已达到发布测试验收。公开接口和回归测试通过；登录后的双人在线品鉴、真机拍照和保存相册仍有明确验收缺口。

## 本轮验证范围

- 当前工作区包括既有未提交改动，本轮没有修改应用源码。
- 使用微信官方 `miniprogram-automator` 连接开发者工具，捕获并检查当前页面截图。
- `node --test tests/*.test.cjs`：129 项通过，0 项失败。
- 匿名 `POST /taste/public/knowledge`，JSON 参数 `{"page":1,"size":20}`：业务码 `00000`，11 篇。
- 匿名 `GET /taste/public/wineType`：业务码 `00000`，44 条目录记录。这里的 44 是目录条目数，不是 44 种香型。
- 当前模拟器为游客身份，已有 2 条本地手记和 8 个本地房间。未提交新手记、评分或酒局，没有执行登录、上传、服务器写入或微信发消息。正常阅读会更新续读位置及本地目录缓存。

## 按影响排序的问题

### P1-01：本机酒局的微信邀请不能完成跨设备加入

步骤 6 的房间页提供“邀请微信好友入局”，文案还提到扫码；当前界面未提供对应二维码。取到的实际分享路径为 `/packages/blind/pages/join/join?roomCode=6888`。

直接打开该分享路径后，页面 query 已有 `roomCode: "6888"`，输入框对应数据仍为 `roomCode: ""`。加入页 `onLoad()` 未读取参数，提交时只在本机 `storageService.getRoomByCode()` 查询。本机房间没有跨设备的服务器记录，因此仅补上参数读取也不能完成朋友入局。

建议：本机模式统一表达“同机轮流品鉴”，撤下跨设备邀请与扫码承诺；需要朋友各用手机时，引导到在线品鉴。在线邀请必须携带服务端活动标识，并验证另一账号能直接进入。不要只给本机房间码补一条分享链接。

证据：[邀请按钮](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/23-room-actions.png>)、[带参数打开后的加入页](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/24-shared-join.png>)、[加入逻辑](</Users/joozo/Github/Codex/mangzhuo/miniprogram/packages/blind/pages/join/join.js:5>)。

验收：不同设备上的朋友打开邀请后，能定位到目标在线活动；本机模式不出现无法兑现的邀请动作。

### P1-02：新接口成功码判定仍可能把失败当成功

这是源码与离线探针确认的契约风险，尚未在真实写接口中复现错误成功提示。用户约定成功码仅 `00000`，但当前通用 `isSuccessResponse()` 还接受 `0`、`200`、`success: true` 以及部分成功文案。

离线执行当前函数时，`{code:"99999",msg:"成功"}` 和 `{code:"99999",success:true}` 均被接受。它会削弱保存、更新等动作的可信反馈。

建议：用户及公开接口按已约定的 `00000` 严格判定；如果旧在线品鉴接口另有已验证契约，应按接口族明确区分，避免直接全局替换而破坏旧接口。

证据：[判定函数](</Users/joozo/Github/Codex/mangzhuo/miniprogram/services/welinkClient.js:301>)。验收应包含“非 00000 且消息为成功”的反例。

### P2-03：手记离开即丢草稿，保存后缺少维护入口

步骤 2 实测：输入“检查草稿（未保存）”→返回首页→重新进入打卡，内容清空，没有离开确认。现有手记可以打开酒卡，但步骤 4 没有编辑、删除、搜索或备份入口；`journal` 服务只有新增、读取。

建议按先后补齐：自动保存本地草稿并可继续填写；现有手记支持编辑与删除确认；增加本地导出/备份及恢复。关于页已说明数据保存在本机，可把这条说明和备份入口放到“我的”实际操作处。无需为了备份提示而强迫登录。

证据：[填写后](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/04-checkin-draft.png>)、[重新进入](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/06-checkin-return.png>)、[本地存储服务](</Users/joozo/Github/Codex/mangzhuo/miniprogram/services/journal.js:1>)。

验收：返回、切后台、重开后均能继续草稿；修改不新增重复记录；删除可确认；导出再导入保持内容一致。

### P2-04：酒卡和文章分享缺少对应内容的落地页

步骤 3 的酒卡已生成成功，有预览、保存和分享入口。但“分享小程序”固定打开首页；步骤 8 的文章分享固定打开酒识首页，不带篇目。当前酒卡按钮文案相对诚实，体验仍无法让接收者继续阅读这次品鉴。

建议区分“保存/发送图片”与“分享可打开的内容”。文章使用稳定 ID 定位，并处理内容加载和失效。手记如要跨设备打开，必须先有用户主动发布的内容存储能力；仅把本地 noteId 放入链接无效。可先完善图片分享，再做公开手记。

证据：[酒卡](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/10-card.png>)、[酒卡分享路径](</Users/joozo/Github/Codex/mangzhuo/miniprogram/pages/card/card.js:161>)、[文章分享路径](</Users/joozo/Github/Codex/mangzhuo/miniprogram/pages/knowledge/knowledge.js:186>)。

### P2-05：局部宽度错误和重复大题图让内容显得散

步骤 6 的酒样按钮实测宽约 184 CSS px，而同页主要内容区约 354 px，四个酒样挤成窄列，短标题也拆成多行。源码虽写 `width: 100%`，运行结果仍不符合预期，需排查实际样式覆盖并做原生截图回归。

首页的大幅题图可保留；酒局、酒识、我的都重复大题图，酒局还叠加第二块大行动卡，首屏主要被介绍占据。酒识的题图、导航、搜索、续读卡、分类连续堆叠，文章列表靠后。

建议：优先修复酒样按钮占满内容区；二级使用页采用紧凑标题，减少重复介绍；酒局把“发起/加入”放在一组，紧跟进行中的房间；酒识把搜索和分类靠近结果，续读压成一行；“我的”先显示身份、统计和最近手记。先调整层级和间距，不换整套品牌。

证据：[首页](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/01-home.png>)、[酒局](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/16-gather.png>)、[窄列酒样](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/21-room.png>)、[文章首屏](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/14-articles.png>)。

### P2-06：按钮视觉已统一，少量触控和选择语义仍需改善

本轮主要按钮实测高度多为 48 px，酒样拍照/相册按钮也是 48 px，风味和香型多数为 44 px。可继续复用现有按钮基础样式。

十星喜欢程度保持单行，每颗实际约 `31.3 × 44` px；再次点同一星才切换半星，发现成本和误触风险较高。文章分类按钮高度约 40 px，也小于本轮采用的 44 px 触控设计目标。44 px 是本轮设计目标，不据此声称违反完整无障碍标准。

建议保留用户选择的单行十星外观，评估整行拖动与明确半星步进操作；星星可承担展示，选择区承担更大的交互目标。分类按钮增加点击高度，选中态补充清晰文字/形态反馈。还需在真机上测试手指操作和读屏。

证据：[十星选择](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/31-tasting-stars.png>)、[酒识分类](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/14-articles.png>)。

### P2-07：本地新增知识需补出处，列表需说明内容来源

当前服务器返回 11 篇文章，页面合并后显示 16 篇；额外 5 篇来自打包在小程序中的 `newArticles`，其 `sources` 均为空。本轮没有任何知识写入服务器。详情底部已区分“公开内容”和“编辑部”文案，但列表没有直观展示在线/本地来源，容易延续“新增内容已经上传”的误解。

建议给新增 5 篇逐段做来源审核，尤其是酒精浓度与分子缔合、蒸馏组分、味觉感受和留香等解释；未核验前不要用肯定语气当作已证实知识。可参考 [NIDCD 对味觉机制的说明](https://www.nidcd.nih.gov/health/taste-disorders)校对味觉相关表述，本轮没有完成五篇文章的事实核验。来源标识、更新时间和离线说明应简洁，不占用过多首屏。内容运营若要写服务器，还需要明确的后台录入或写入接口。

证据：[新增文章](</Users/joozo/Github/Codex/mangzhuo/miniprogram/utils/knowledge.js:204>)、[当前文章列表](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/14-articles.png>)、[在线文章详情](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/15-article-detail.png>)。

### P2-08：示例房间与个人数据混排，战报容易被误认作真实活动

当前本机 8 个房间中包括 3 个预置示例。示例使用与真实房间相同的列表和报告，报告仍出现“真实结果”，个人参与局数也按成员关系统计，未排除示例房间。

建议示例房间独立放在“体验示例”，列表、揭晓、排行及导出海报保留示例标识，并排除个人累计统计。示例可继续帮助新用户了解玩法。

证据：[房间列表](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/19-gather-actions.png>)、[示例战报](</Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/26-report.png>)、[示例初始化](</Users/joozo/Github/Codex/mangzhuo/miniprogram/services/storage.js:58>)、[参与统计](</Users/joozo/Github/Codex/mangzhuo/miniprogram/pages/mine/mine.js:60>)。

## 实际流程：九步走查

### 1. 首页 — 可用，次要信息可收拢

品牌、主按钮和底部导航清楚。首页保留完整题图合理；后续主要压缩其他页的重复题图。主要按钮 48 px、全部手记入口 44 px。本轮没有做跨尺寸布局或完整对比度验证。

![步骤1：首页](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/01-home.png)

### 2. 打卡与返回 — 填写结构清楚，草稿待完善

酒名、香型和闻香/入口/回味分组易懂，风味标签目标为 44 px。表单较长，保存仅在末尾，建议渐进展开选填内容，并让保存状态更易找到。已复现返回丢草稿。本轮未提交新记录；自动化点击未可靠触发原生表单提交，因此不以该点击结果判断校验是否正常。源码已有酒名必填校验。

![步骤2：填写草稿](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/04-checkin-draft.png)

![步骤2：返回后重新进入，酒名清空](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/06-checkin-return.png)

### 3. 酒卡 — 图片生成可用，接收者体验待补

用已有手记进入酒卡，`imageReady=true`、`busy=false`、`renderError=false`，图像可见。当前固定长版式在短内容时空白偏多，可按内容长短优化密度。分享去首页的问题见 P2-04。相册授权、保存失败恢复与朋友手机上的实际分享卡未验证。

![步骤3：生成酒卡](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/10-card.png)

### 4. 我的与品鉴资料 — 游客界面可用，记录管理待补

统计和手记票签一致，头像昵称弹窗能打开，取消/保存触控目标充足。独立资料页把身份和名片分开，信息清楚。可把弹窗编辑与完整资料页的保存反馈继续统一；个人内容管理见 P2-03。本轮没有登录或保存资料，不能据此证明头像上传、昵称更新或登录持久化通过。

![步骤4：我的](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/11-mine.png)

![步骤4：独立资料页](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/33-profile.png)

### 5. 酒局入口与在线模式 — 模式可辨，在线完整流程待验

本机/在线切换和房间状态筛选已具备；在线模式对游客给出登录入口。大题图与第二块行动卡重复占据首屏，继续进行中的房间需要下滑查找。这里只验证到游客登录门槛，未验证线上列表、新建活动、加入、提交评分和双账号隔离。

![步骤5：本机入口](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/16-gather.png)

![步骤5：在线游客状态](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/17-online.png)

### 6. 酒样设置、盲猜和房间 — 页面可打开，邀请有断点

从已有示例只读打开配置、盲猜、评分与房间。拍照和相册入口完整，照片“揭晓后展示”的提示有助于避免提前泄题；源码当前把照片保存到本机文件，并非上传服务器。十星触控和酒样按钮布局问题见 P2-05/06，跨设备邀请问题见 P1-01。本轮未使用相机/相册、未改示例酒款或评分。

![步骤6：拍照与相册入口](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/29-setup.png)

![步骤6：酒样被压成窄列](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/21-room.png)

![步骤6：十星选择](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/31-tasting-stars.png)

### 7. 揭晓、排行和战报 — 示例浏览可用，需区分示例与真实

揭晓页把分数、估价和品牌关联知识放在一起，排名与战报视觉一致，主按钮 48 px。这里浏览的是已存在的示例，不是本轮完整提交形成的新结果。示例标识与累计统计问题见 P2-08。实际提交、计分与战报生成全链路，以及海报导出保存尚待真机验证。

![步骤7：揭晓](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/25-reveal.png)

![步骤7：排行榜](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/27-rank.png)

![步骤7：战报](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/26-report.png)

### 8. 酒识、文章和出处 — 读取可用，列表效率与来源待完善

当前公开接口正常，能打开在线文章正文和出处区域。正文、杯中练习和关联阅读衔接合理。分类和搜索应更快把结果露出；详情返回列表未保存滚动位置，建议恢复原位置。分享定位和新增内容来源见 P2-04/07。出处按钮实际为复制链接，本轮未验证所有外链内容。

![步骤8：文章列表](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/14-articles.png)

![步骤8：在线文章详情](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/15-article-detail.png)

### 9. 关于、隐私与联系 — 展示可用，需和实际行为保持一致

关于页延续票签设计，已明确本地存储、主动授权与在线品鉴边界；复制邮箱按钮 44 px。建议把关键本地存储说明连到备份操作，便于用户采取行动。本轮只检查页面展示，未验证联系邮箱可收件、隐私平台申报或审核材料。

![步骤9：关于与隐私](/Users/joozo/Github/Codex/mangzhuo/docs/design/2026-11-11-audit/28-about.png)

## 发布测试前仍需完成的验收

1. 在体验版/真机开启正常域名校验后，确认公开请求、登录、头像上传、图片下载和相册保存。当前开发配置 `urlCheck: false`，模拟器成功不等于后台域名已配置。
2. 真实微信登录后等待会话过期，再读用户资料、改昵称和上传头像；重开小程序继续检查状态。源码已有会话刷新，本轮未验证实际刷新周期，不能沿用旧检查里的过期时间推断当前结果。
3. 两个真实账号完成在线发起→邀请→加入→评分→结果，并验证账号隔离与网络失败反馈。对不确定结果的写请求不要盲目重试。
4. 在 iOS/Android 小屏真机测试长酒名、键盘遮挡、滚动、半星选择、相机/相册取消与拒绝权限，以及读屏标签和焦点顺序。
5. 区分预置示例、真实本机记录与在线活动；新用户的个人累计不应被示例撑高。

本轮截图无法证明完整无障碍合规、服务器持久化、真实跨设备分享或审核通过。

## 推荐执行顺序

先修正本机邀请与成功码判定，避免错误承诺和错误成功反馈；再补草稿、编辑删除和分享定位；随后集中修复窄列酒样、题图密度和触控；最后补知识来源与真机双账号验收。现有品牌方向可继续沿用。
