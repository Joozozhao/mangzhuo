# 盲酌 (MangZhuo) - 微信云开发 Collections 设计

盲酌小程序在 V1 阶段提供完整的本地存储 Mock 层（基于 wx.getStorageSync / wx.setStorageSync），同时为第二阶段平滑无缝迁移到微信云开发（Tencent Cloud Base）设计了结构 1:1 对齐的数据模型。

---

## 1. 集合清单 (Collections)

| 集合名称 (Collection) | 权限建议 | 描述 |
|---|---|---|
| `rooms` | 所有人可读，仅创建者可写 | 酒局房间主表，存储房号、状态、当前进度 |
| `samples` | 所有人可读（开奖前隐藏敏感字段），仅房主可写 | 酒样标准答案表（品牌、香型、度数、年份、真实价格） |
| `members` | 所有人可读，仅成员本人/房主可写 | 房间成员关系表、头像、昵称、角色、交卷状态 |
| `guesses` | 仅自己可读写（开奖后全员可见） | 玩家盲猜推断结果表（猜品牌、产品、香型、度数、价格） |
| `ratings` | 仅自己可读写（开奖后全员可见） | 玩家主观感官打分表（香气、顺滑、醇厚、协调、回味、评价） |
| `reports` | 所有人可读，云函数计算生成 | 结算生成的酒局总结报告与统计缓存 |

---

## 2. 详细字段定义

### 2.1 rooms (酒局房间)
```json
{
  "_id": "room_xxx",
  "_openid": "user_openid_xxx",
  "roomId": "room_1725800000",
  "roomCode": "6888",
  "name": "周末酱香盲品争霸赛",
  "description": "撕掉酒标，只凭味道",
  "ownerId": "user_master",
  "sampleCount": 4,
  "maxMembers": 8,
  "status": "playing", // playing: 盲品中 | finished: 全员已交卷 | revealed: 已开奖揭晓
  "statusText": "进行中",
  "scoringRule": {
    "brand": 25,
    "product": 25,
    "aromaType": 10,
    "alcoholDegree": 10,
    "year": 15,
    "price": 15
  },
  "createdAt": 1725800000000,
  "revealAt": null
}
```

### 2.2 samples (酒样标准答案)
```json
{
  "_id": "sample_xxx",
  "sampleId": "s_01",
  "roomId": "room_1725800000",
  "number": 1,
  "bottleTag": "1号酒",
  "brand": "贵州茅台",
  "product": "飞天茅台53度",
  "aromaType": "酱香型",
  "alcoholDegree": "53°",
  "year": "2021",
  "marketPrice": 2800,
  "notes": "经典幽雅酱香，空杯留香持久"
}
```
> **安全设计提示**：云端可配置云函数 `getRoomSamples`，当 `rooms.status !== 'revealed'` 时，屏蔽返回字段中的 `brand`, `product`, `marketPrice`, `notes`，仅向普通玩家返回 `number` 与 `bottleTag`，确保开奖前物理防作弊。

### 2.3 members (参会成员)
```json
{
  "_id": "member_xxx",
  "_openid": "user_openid_xxx",
  "roomId": "room_1725800000",
  "userId": "user_master",
  "nickname": "品鉴客 Joozo",
  "avatar": "🍶",
  "role": "owner", // owner: 房主 | member: 普通品鉴官
  "isSubmitted": true,
  "joinedAt": 1725800050000
}
```

### 2.4 guesses (盲猜推测)
```json
{
  "_id": "guess_xxx",
  "_openid": "user_openid_xxx",
  "roomId": "room_1725800000",
  "userId": "user_master",
  "sampleId": "s_01",
  "brand": "茅台",
  "product": "飞天茅台",
  "aromaType": "酱香型",
  "alcoholDegree": "53°",
  "year": "2021",
  "estimatedPrice": 2600,
  "submittedAt": 1725800100000
}
```

### 2.5 ratings (主观感官评分)
```json
{
  "_id": "rating_xxx",
  "_openid": "user_openid_xxx",
  "roomId": "room_1725800000",
  "userId": "user_master",
  "sampleId": "s_01",
  "aroma": 9.2,       // 香气幽雅度 (5.0~10.0)
  "entrance": 9.0,    // 入口顺滑度
  "richness": 9.3,    // 酒体醇厚度
  "balance": 9.0,     // 诸味协调度
  "finish": 9.0,      // 回味与余香
  "overall": 9.1,     // 综合评分 (5项均值)
  "comment": "酱香纯正，回甘突出，非常细腻",
  "submittedAt": 1725800120000
}
```

---

## 3. 云函数设计建议 (Cloud Functions)

1. `roomManager`: 处理房间创建、安全加房、房主开奖触发。
2. `calculateScores`: 房主点击开奖时在云端自动运行打分与对比引擎，将计算结果写入 `reports` 集合。
3. `exportReportPoster`: 生成带盲品结果、最受欢迎酒款、最大黑马的高清朋友圈分享海报。
