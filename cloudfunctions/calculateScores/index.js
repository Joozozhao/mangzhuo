// 云函数 calculateScores/index.js (开奖全场自动计分与榜单计算引擎)
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function cleanStr(str) {
  if (!str) return '';
  return String(str).trim().toLowerCase().replace(/\s+/g, '');
}

function calcSingleScore(real, guess) {
  if (!guess) return 0;
  let s = 0;
  const rb = cleanStr(real.brand), gb = cleanStr(guess.brand);
  if (rb && gb && (rb === gb || rb.includes(gb) || gb.includes(rb))) s += 25;
  const rp = cleanStr(real.product), gp = cleanStr(guess.product);
  if (rp && gp && (rp === gp || rp.includes(gp) || gp.includes(rp))) s += 25;
  if (cleanStr(real.aromaType) === cleanStr(guess.aromaType)) s += 10;
  const rd = parseFloat(String(real.alcoholDegree).replace(/[^0-9.]/g, ''));
  const gd = parseFloat(String(guess.alcoholDegree).replace(/[^0-9.]/g, ''));
  if (!isNaN(rd) && !isNaN(gd) && Math.abs(rd - gd) <= 1) s += 10;
  const ry = parseInt(real.year, 10), gy = parseInt(guess.year, 10);
  if (!isNaN(ry) && !isNaN(gy) && Math.abs(ry - gy) <= 1) s += 15;
  const rPrice = parseFloat(real.marketPrice) || 0, gPrice = parseFloat(guess.estimatedPrice) || 0;
  if (rPrice > 0 && gPrice > 0 && Math.abs(rPrice - gPrice) / rPrice <= 0.25) s += 15;
  return s;
}

exports.main = async (event, context) => {
  const { roomId } = event;
  const roomRes = await db.collection('rooms').where({ roomId }).get();
  const samplesRes = await db.collection('samples').where({ roomId }).get();
  const membersRes = await db.collection('members').where({ roomId }).get();
  const guessesRes = await db.collection('guesses').where({ roomId }).get();
  const ratingsRes = await db.collection('ratings').where({ roomId }).get();

  const samples = samplesRes.data;
  const members = membersRes.data;
  const guesses = guessesRes.data;
  const ratings = ratingsRes.data;

  // 1. 计算高手榜
  const guessRanking = members.map(m => {
    let totalScore = 0;
    samples.forEach(s => {
      const g = guesses.find(item => item.userId === m.userId && item.sampleId === s.sampleId);
      totalScore += calcSingleScore(s, g);
    });
    return { userId: m.userId, nickname: m.nickname, avatar: m.avatar, totalScore };
  }).sort((a, b) => b.totalScore - a.totalScore);

  // 2. 更新房间状态为 revealed
  await db.collection('rooms').where({ roomId }).update({
    data: { status: 'revealed', statusText: '已开奖', revealAt: db.serverDate() }
  });

  return { code: 0, guessRanking };
};
