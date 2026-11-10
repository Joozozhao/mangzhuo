# 酒局记录区设计稿 · 2026-11-09

用户目标：酒局的状态与房间数据呈现过散，重新组织为边界清楚、易扫描的块。参考用户当次上传截图与现有原生小程序代码。

三张初始设计稿使用内置 ImageGen 生成，均实际附上用户截图。用户随后选择本次聊天第三张“数据票签”，现已落到原生小程序桌上品鉴的酒局记录区。原始稿中“设计示例”及数量为布局演示；实际页面读取本机记录，未重写用户数据。

## 方案索引

编号严格按本次聊天中生成图片的显示顺序：

1. [独立酒局卡](01-room-cards.png)：独立对象边界，状态、三列数据和底部操作归在同一张卡内。
2. [按状态分组](02-status-groups.png)：进行中与已揭晓形成两个栏目块，各自组织酒局和操作。
3. [数据票签](03-room-tickets.png)：房间号作为左侧索引，右侧集中状态、名称、款数、人数和操作。

用户已选择第三张图。实现文件为 `miniprogram/pages/gather/gather.wxml`、`gather.wxss`、`gather.js`，增加状态筛选、展示层状态与标题整理；上方发起/加入区、原生导航及在线接口流程沿用现有实现。

## 选定方案的实际交付

- [实际票签区截图](implementation-records-final.png)、[微信模拟器屏幕](implementation-phone-final.png)。
- [设计与实际记录区对照](comparison-records-final.png)、[首两卡细节对照](comparison-first-two-final.png)。
- 实际检查全部/进行中/已揭晓筛选与查看结果跳转；模拟器使用现有 7 场记录。10 个新增测试与原在线、会话回归共 23 项通过。
- 主项目 [design-qa.md](../../../design-qa.md) 记录本轮验收结果及范围；旧报告保留于 [design-qa-before-ticket-redesign.md](design-qa-before-ticket-redesign.md)。
- 标准箭头来自 [Tabler](https://github.com/tabler/tabler-icons/blob/main/icons/outline/arrow-right.svg)，SVG 与 MIT 许可均已打包。
- 真机、Android 与窄屏原生渲染尚未验证。本轮没有推送或发布。

## 实施需要遵循的事实

- 当前品牌来自 `miniprogram/styles/organized.wxss`：纸白 `#f7f6ef`、竹绿 `#274d3b`，宋体标题与系统无衬线数据文字。
- 本地酒局来自 `miniprogram/services/storage.js`，记录可用 roomCode、name、description、sampleCount、status；参与人数从成员数组得出。
- 状态来自 status，不通过标题或旧 statusText 猜测；示例标题可能保留“进行中”字样而实际已经揭晓，应避免状态与标题视觉冲突。
- playing 为进行中；revealed 为已揭晓。列表中存在 finished 显示分支，需保留“品评结束”语义而非强行归类为已揭晓。
- 当前列表的 sampleCount 表示配置数量，不能改称已准备完成的酒样数；没有读取完整成员评分前，不显示猜测的完成百分比。
- 在线列表与本机列表字段不同：在线列表只有 id、title、status、isOwner、createdAt，不能照搬本机酒样数和参与人数；分页已加载条目的状态数量不能作为线上全部活动状态统计。
- 登录、加载失败与业务空列表需要保持区别；知识和酒款真名仍遵守揭晓边界。
- 原图本身包含系统状态栏和屏幕外框，设计稿只输出内容；生成稿并非经过原生设备验收的最终像素稿。预期内容视口 390×844，实际生成尺寸保留原图，不拉伸修改。

## 生成方式与提示词

使用内置 `image_gen.imagegen`，每个方向一条独立请求，非 CLI。参考图保存为 [用户原始截图](reference-current-gather.png)。三个请求使用相同参考图；下列文本为实际完整提示词。

### 聊天显示第 1 张

```text
Create realistic, production-quality UI designs with clear hierarchy, strong typography, intentional imagery, and purposeful spacing.
Use case: ui-mockup. Asset type: one high-fidelity mobile WeChat mini-program screen design. Direction name for internal design intent: 独立酒局卡. This is a redesign of the room RECORDS section in the attached existing 盲酌 screenshot, not a whole product rebrand.
Input image: attached local screenshot is the actual existing product, use it as grounding for language, data, navigation, and brand. Do not reproduce its scattered single-line list. Goal: at a glance distinguish each independent blind-tasting room and read its status, room number, sample count and participant count as a coherent object.
Target Dimensions: 390 x 844 CSS-pixel mobile content canvas, portrait. Render app content ONLY, edge-to-edge with square outer corners. No phone body, bezel, notch, Dynamic Island, OS status bar, time, signal, battery, home indicator, browser chrome or device shadow. The attached source has phone chrome; remove ALL chrome from the new composition.
Existing brand tokens: warm paper background #F7F6EF, dark bamboo green #274D3B, text #28382E, secondary #687365, subtle rules #D6DDCF. Chinese Songti/Source Han Serif for section and room titles, PingFang-style sans-serif for supporting data. Body 14-16px, labels no smaller than 12px, title around 24px. Calm contemporary Chinese editorial taste, readable contrast, no gradients, no large illustration, no invented logo, no gold ornaments. Current client date 2026-11-09 Asia/Shanghai; do not add dates to this screen.
Composition: design the scrolled records portion of the existing 酒局 page. Top small left context '桌上品鉴', right muted '本机记录'. Then prominent '酒局记录' and small '共 7 场'. Small 12px '设计示例' near context makes it clear data shown is illustrative. Beneath, a restrained three-choice filter row '全部 7' (selected green), '进行中', '已揭晓'; meaningful 44px touch height.
Main layout strategy: every room is a clearly separate flat ivory-white paper card with an unmistakable border, about 12px corner radius, 12-16px vertical gap, 16px inner padding. Each card is a standalone business object. Avoid nested cards. Header places a compact written status pill ABOVE or BESIDE the title without crowding. A tiny green dot plus '进行中'; revealed pill muted sage plus '已揭晓', never rely on color alone.
Card 1 text: '盲酌酒局 6776', optional subtle single-line description '去掉酒标，只凭味道。'. At middle, THREE aligned unboxed data columns: label '房间号' with value '6776'; '酒样' with '6 款'; '参与' with '1 人'. 18-20px figures with labels visibly subordinate. A thin horizontal rule then one clear primary solid green lower-right button '进入酒局' with small arrow, 44px high; card does not consist of multiple competing tappable controls.
Card 2: '盲酌酒局 1561', '已揭晓', same three columns '1561', '4 款', '1 人', outlined quiet button '查看结果'. Card 3 compact but fully readable '盲酌酒局 6956', '进行中', values '6956', '8 款', '1 人'. Show at most three rooms naturally without cramming. Keep all visible controls and content clear of bottom navigation.
Bottom: preserve exactly four familiar thin line-icon navigation items '首页', '酒局' selected, '酒识', '我的'. Light paper bar, green active icon/text, generous 60px content height, thin top rule. No floating plus, no social features, no ratings, no progress percentages, no avatars, no duplicate metrics dashboard, no invented data. Room name must never contain a status phrase.
Design a focused primary screen, not a feature inventory. The hero use case is finding a room and entering it. Only these actions and this content area. Differentiate grouping with intentional whitespace, typography and subtle surface before borders, shadows last. Here cards are intentional because each room is a standalone object and the user's explicit request is stronger block boundaries. No outer 'app card', no card nesting, no blurry placeholder text, no multiple concepts in a single image. The result must look professionally composed and implementable.
```

### 聊天显示第 2 张

```text
Create realistic, production-quality UI designs with clear hierarchy, strong typography, intentional imagery, and purposeful spacing.
Use case: ui-mockup. Asset type: ONE high-fidelity mobile WeChat mini-program screen. Internal direction name: 按状态分组. Redesign only the 酒局 RECORDS content area of the attached 盲酌 screenshot. This should be structurally distinct from a uniform room-card list: status is the main organizing heading, with a clear ongoing section and a separate revealed-results section below.
Input image: the attached screenshot is the existing real product and brand reference, including the four-item navigation and sample room titles. Use actual screenshot as grounding, then improve grouping.
Target Dimensions: 390 x 844 CSS-pixel mobile content portrait. Render app content only on a square-corner edge-to-edge paper canvas, no device mask or outer panel. No device bezel, phone body, notch, Dynamic Island, OS clock/status bar, signal/battery, home indicator, browser chrome, shadows outside the screen. Remove the device chrome that is present in the attached source.
Brand constraints: keep warm rice-paper #F7F6EF and bamboo green #274D3B; foreground #28382E, secondary #687365, rule #D6DDCF. Quiet Songti/Source Han Serif Chinese headings paired with clean PingFang-style data. Comfortable 14-16px body, 12px min auxiliary, 24px section title. Gentle contemporary Chinese editorial rhythm, no large illustrations, no invented mark, no blue, no bright gradients, no loud shadows. Client today is 2026-11-09 Asia/Shanghai; no date needed in UI.
Content: at top show a subdued back context row '桌上品鉴' left, '本机记录' right, tiny '设计示例'. Main heading '酒局记录' left and '共 7 场' right. Do NOT add status-filter pills; the page structure itself handles state.
Strong grouping strategy: under heading, place a clear but compact section header on flat pale sage #E9EDE3: small filled dot, label '进行中', count '4 场' aligned right, secondary small phrase '回到酒局，继续品评'. Use a 3px bamboo-green leading edge and generous distinct spacing to define this section as active work. Then two spacious aligned rows on one offwhite grouped surface. Each row contains:
first row '盲酌酒局 6776' as title; supporting line '房间 6776'; immediately below two aligned data pairs '6 款酒样' and '1 人参与', no loose bullet list. Far right a 44px-tall clear green-toned action '进入酒局 →'. Second row same structure '盲酌酒局 6956', '房间 6956', '8 款酒样', '1 人参与', same action. Subtle divider only inside section, no card-in-card. A restrained small '展开其余 2 场' row at bottom of active group as progressive disclosure.
After a substantial vertical 28px gap, a separate warmer-neutral quiet section with header '已揭晓', count '3 场', subtitle '看看答案，回味这一局'. Two result rows: '盲酌酒局 1561', '房间 1561 · 4 款酒样 · 1 人参与', right outlined '查看结果 →'; second long but naturally wrapping title '经典次高端名优盲测', '房间 9926 · 3 款酒样 · 2 人参与', right '查看结果 →'. Do NOT append '进行中' to this title; actual status is revealed. Remove repetitive boilerplate descriptions from these compact rows to reduce noise. Keep titles and data clearly aligned within their group.
Design should feel intentionally sectional, two well-defined blocks rather than a forest of badges, with status headings that immediately answer what can be continued vs reviewed. Do not invent ratings, completion percentages, cost, rank, avatars, participants' names, new product features. Counts are design examples, not real live data.
Bottom preserve same four-item icon navigation '首页', '酒局' selected, '酒识', '我的' with simple familiar thin line icons, sage inactive and dark green active, hairline top rule on paper. Enough scroll padding so no data or action is cut off or overlapped.
Design a focused primary screen, not a feature inventory. Main use is entering an ongoing room or reviewing a revealed result. Generous spacing, no hero banner, no cards inside cards, use spacing/grouping/typography first, subtle tinted section headings for strong grouping, borders only where useful, minimal elevation. Exactly one finished design image, not a comparison board or collage. Readable Chinese copy, refined and realistically implementable.
```

### 聊天显示第 3 张

```text
Create realistic, production-quality UI designs with clear hierarchy, strong typography, intentional imagery, and purposeful spacing.
Use case: ui-mockup. Asset type: ONE high-fidelity mobile WeChat mini-program primary screen redesign. Internal direction name: 数据票签. This is a focused redesign of the 酒局记录 list in attached real 盲酌 screenshot, addressing scattered status and data with clearly bounded structured room tickets.
Input image: attached screenshot is actual current product. Preserve brand language, room data and exactly four bottom tabs. Intentionally improve visual hierarchy rather than copying its scattered thin-line list. This direction uses a visually distinctive ROOM CODE rail and a content column, closer to a modern paper event ticket, not rounded dashboard cards and not separate status-group panels.
Target Dimensions: 390 x 844 CSS-pixel mobile portrait content canvas. Output app UI content only with square outer corners. No phone bezel, device body, notch, Dynamic Island, status/clock/signal/battery bars, home indicator, browser chrome, outside shadow or presentation board. Remove the phone chrome in the source image.
Brand: rice paper #F7F6EF, bamboo #274D3B, text #28382E, secondary #687365, fine borders #D6DDCF. Headers and room names Songti/Source Han Serif, supporting labels/data PingFang sans-serif. Distinct numerical code using elegant tabular sans numbers. 14-16px body, no label under 12px. Quiet, editorial, contemporary Chinese, no gradients, photographs, generic wine bottles, avatars, dramatic illustration, bright colors or invented brand. Current date 2026-11-09 Asia/Shanghai; no visible date needed.
Main composition: small upper line '桌上品鉴' left and '本机记录' right plus muted '设计示例'. Large title '酒局记录', small total '7 场'. Beneath one simple thin underlined filter line with '全部 7' active, '进行中', '已揭晓'; a visible 44px touch target height, no metric tiles.
Then three or four distinctive flat event-ticket room objects, each rectangular with 6px radius and a pale border, separated by 14px. At left of each ticket, a consistent 66px-wide vertical sage-tinted column with small label '房间号' above a large 20px high-contrast code. At right a 240px column:
top clear status line, written '进行中' in green pill with small dot or '已揭晓' in muted neutral outlined pill; next Songti title, then a simple structured pair '6 款酒样' and '1 人参与' as readable secondary data. At lower right, short clear action '进入酒局 →' or '查看结果 →' with a calm obvious touch area and internal thin divider. Avoid showing room code redundantly in title where title only repeats it; display '盲酌酒局' as the title with code in left rail, preserving the original combined identity.
Ticket one left code '6776', status '进行中', title '盲酌酒局', '6 款酒样', '1 人参与', action '进入酒局 →'. Ticket two left code '1561', status '已揭晓', title '盲酌酒局', '4 款酒样', '1 人参与', action '查看结果 →'. Ticket three left '6956', status '进行中', title '盲酌酒局', '8 款酒样', '1 人参与', action '进入酒局 →'. Ticket four left code '9926', title '经典次高端名优盲测' wrapping naturally if needed, status '已揭晓', '3 款酒样', '2 人参与', '查看结果 →'. No title saying 进行中 when status is revealed. Remove repeated vague description '去掉酒标，只凭味道。' from every card to give the data room to breathe.
One supporting muted sentence under visible list if it fits: '编号入杯，感受留在这一局。' Never squeeze to include it.
Preserve exactly four familiar line icon tabs at bottom '首页', '酒局' active bamboo green, '酒识', '我的' with thin top rule, paper background, 64px content area. Keep room content clear of navigation.
Primary goal is identifying and entering a room, secondary is viewing results. No new features, no charts, fake completion, scores, rankings or prices. No cards within cards, no outer app frame, no unnecessary nested boxes around each tiny datum, no shadows unless barely perceptible. Here the single flat ticket per room is purposeful because the user explicitly requested obvious object boundaries. Exactly one full finished design image, not multiple ideas side by side. Chinese text must be sharp and useful, very good alignment and optical balance.
```

