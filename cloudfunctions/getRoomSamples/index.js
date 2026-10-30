// 云函数 getRoomSamples/index.js (防作弊脱敏安全函数)
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { roomId } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!roomId) {
    return { code: -1, msg: '缺少 roomId' };
  }

  // 1. 获取房间信息
  const roomRes = await db.collection('rooms').where({ roomId }).get();
  if (!roomRes.data || roomRes.data.length === 0) {
    return { code: -2, msg: '酒局不存在' };
  }
  const room = roomRes.data[0];
  const isOwner = (room.ownerId === openid || room._openid === openid);
  const isRevealed = (room.status === 'revealed');

  // 2. 获取全部酒样
  const sampleRes = await db.collection('samples').where({ roomId }).orderBy('number', 'asc').get();
  let samples = sampleRes.data || [];

  // 3. 安全防作弊：若未开奖且非房主本人，强制抹除真实品牌、产品名与价格等敏感字段
  if (!isRevealed && !isOwner) {
    samples = samples.map(s => ({
      _id: s._id,
      sampleId: s.sampleId,
      roomId: s.roomId,
      number: s.number,
      bottleTag: s.bottleTag || (s.number + '号酒'),
      brand: '??? (未开奖)',
      product: '??? (未开奖)',
      aromaType: '待盲猜',
      alcoholDegree: '待盲猜',
      year: '????',
      marketPrice: 0,
      notes: ''
    }));
  }

  return {
    code: 0,
    isOwner,
    isRevealed,
    data: samples
  };
};
