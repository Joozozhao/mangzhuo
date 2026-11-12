/**
 * memberLevel.js - 盲酌会员品鉴阶位系统（知味九阶）
 *
 * 根据参与酒局次数、盲品得分情况评定文雅品阶，
 * 融合盛唐风雅、文人墨客鉴醇雅称与竹影手札视觉体系。
 */

const storage = require('./storage');
const scoring = require('../utils/scoring');

const LEVELS = [
  {
    level: 1,
    rank: '一阶',
    title: '问泉客',
    badge: '问泉',
    seal: '问泉客印',
    poem: '问泉何处冽，初识玉醅香',
    desc: '初入盲品，不猜对错，真实感受即是好记录。',
    minRooms: 0,
    minScore: 0,
    theme: {
      color: '#3d614e',
      bg: '#eef4f0',
      border: '#c3d8cb',
      tagBg: '#274d3b',
      tagColor: '#ffffff'
    }
  },
  {
    level: 2,
    rank: '二阶',
    title: '寻芳友',
    badge: '寻芳',
    seal: '寻芳友印',
    poem: '竹林寻芳径，未饮意先微',
    desc: '初辨香型，能敏锐觉察香气浓淡与酒体轮廓。',
    minRooms: 2,
    minScore: 300,
    theme: {
      color: '#2f5d47',
      bg: '#e8f1eb',
      border: '#a9c7b5',
      tagBg: '#274d3b',
      tagColor: '#ffffff'
    }
  },
  {
    level: 3,
    rank: '三阶',
    title: '识味生',
    badge: '识味',
    seal: '识味生印',
    poem: '浓淡甘辛里，了然百味真',
    desc: '能较稳断出核心香型，知晓酒体厚薄与落口回甘。',
    minRooms: 5,
    minScore: 1000,
    theme: {
      color: '#274d3b',
      bg: '#e4eee7',
      border: '#95b7a3',
      tagBg: '#274d3b',
      tagColor: '#ffffff'
    }
  },
  {
    level: 4,
    rank: '四阶',
    title: '酌醇人',
    badge: '酌醇',
    seal: '酌醇人印',
    poem: '慢酌见骨力，舌底起生津',
    desc: '对度数、年份和发酵香气感知精准，品位渐入佳境。',
    minRooms: 10,
    minScore: 2400,
    theme: {
      color: '#8c5e24',
      bg: '#fbf4ea',
      border: '#dfc39a',
      tagBg: '#8c5e24',
      tagColor: '#ffffff'
    }
  },
  {
    level: 5,
    rank: '五阶',
    title: '鉴真士',
    badge: '鉴真',
    seal: '鉴真士印',
    poem: '去尽世间标，杯中见本真',
    desc: '能撕破包装假象，仅凭嗅觉与触觉准确判定品牌产地。',
    minRooms: 20,
    minScore: 5500,
    theme: {
      color: '#7a4e17',
      bg: '#f9f0e3',
      border: '#cfab79',
      tagBg: '#7a4e17',
      tagColor: '#ffffff'
    }
  },
  {
    level: 6,
    rank: '六阶',
    title: '辨香客',
    badge: '辨香',
    seal: '辨香客印',
    poem: '空杯犹有韵，滴酒已知源',
    desc: '盲品中坚力量，香气记忆深厚，盲猜准确率出众。',
    minRooms: 35,
    minScore: 11000,
    theme: {
      color: '#1e4854',
      bg: '#e8f1f4',
      border: '#96bec8',
      tagBg: '#1e4854',
      tagColor: '#ffffff'
    }
  },
  {
    level: 7,
    rank: '七阶',
    title: '知味宗',
    badge: '知味宗',
    seal: '知味宗印',
    poem: '阅尽千盅水，独留一鉴明',
    desc: '通晓各大名庄古法风土，盲品战绩斐然，受众所景仰。',
    minRooms: 50,
    minScore: 18000,
    theme: {
      color: '#5b3260',
      bg: '#f3ebf5',
      border: '#c4a6ca',
      tagBg: '#5b3260',
      tagColor: '#ffffff'
    }
  },
  {
    level: 8,
    rank: '八阶',
    title: '壶天仙',
    badge: '壶天仙',
    seal: '壶天仙印',
    poem: '壶中容日月，醉里见乾坤',
    desc: '百战百胜的盲品巨擘，微醺之间洞若观火，几无走眼。',
    minRooms: 80,
    minScore: 32000,
    theme: {
      color: '#8c2d2d',
      bg: '#fbeeee',
      border: '#e2a7a7',
      tagBg: '#8c2d2d',
      tagColor: '#ffffff'
    }
  },
  {
    level: 9,
    rank: '九阶',
    title: '太白真',
    badge: '太白真',
    seal: '太白真印',
    poem: '竹影入笺留本味，清风过案见初心',
    desc: '品鉴之道至臻化境，胜负无碍，不滞于物，返璞归真。',
    minRooms: 120,
    minScore: 50000,
    theme: {
      color: '#9e382b',
      bg: '#fcf0ed',
      border: '#e6988f',
      tagBg: '#9e382b',
      tagColor: '#ffffff'
    }
  }
];

/**
 * 统计指定用户的盲品战绩与酒局综合表现
 * @param {string} userId - 本机或远程用户唯一标识
 * @returns {{ roomCount: number, totalScore: number, maxRoomScore: number, avgScore: number }}
 */
function getUserTastingStats(userId) {
  if (!userId) {
    return { roomCount: 0, totalScore: 0, maxRoomScore: 0, avgScore: 0 };
  }

  const allMembers = storage.getMembers();
  const myMemberships = allMembers.filter(m => m.userId === userId);
  const roomIds = Array.from(new Set(myMemberships.map(m => m.roomId)));
  const roomCount = roomIds.length;

  let totalScore = 0;
  let maxRoomScore = 0;

  roomIds.forEach(roomId => {
    const samples = storage.getSamples(roomId);
    const guesses = storage.getGuesses(roomId, userId);
    let currentRoomScore = 0;

    samples.forEach(sample => {
      const guess = guesses.find(g => g.sampleId === sample.sampleId);
      if (guess && scoring.calculateGuessScore) {
        const res = scoring.calculateGuessScore(sample, guess);
        if (res && typeof res.totalScore === 'number') {
          currentRoomScore += res.totalScore;
        }
      }
    });

    totalScore += currentRoomScore;
    if (currentRoomScore > maxRoomScore) {
      maxRoomScore = currentRoomScore;
    }
  });

  const avgScore = roomCount > 0 ? Math.round(totalScore / roomCount) : 0;

  return {
    roomCount,
    totalScore,
    maxRoomScore,
    avgScore
  };
}

/**
 * 根据参与酒局数与累计得分，评定品阶等级
 * @param {{ roomCount: number, totalScore: number, maxRoomScore?: number, avgScore?: number }} stats
 */
function calculateMemberLevel(stats) {
  const roomCount = (stats && typeof stats.roomCount === 'number') ? stats.roomCount : 0;
  const totalScore = (stats && typeof stats.totalScore === 'number') ? stats.totalScore : 0;

  let currentLevel = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    const l = LEVELS[i];
    if (roomCount >= l.minRooms && totalScore >= l.minScore) {
      currentLevel = l;
      break;
    }
  }

  const currentIndex = currentLevel.level - 1;
  const nextLevel = currentIndex < LEVELS.length - 1 ? LEVELS[currentIndex + 1] : null;

  let needRooms = 0;
  let needScore = 0;
  let progressPercent = 100;

  if (nextLevel) {
    needRooms = Math.max(0, nextLevel.minRooms - roomCount);
    needScore = Math.max(0, nextLevel.minScore - totalScore);

    const roomRange = nextLevel.minRooms - currentLevel.minRooms;
    const scoreRange = nextLevel.minScore - currentLevel.minScore;

    const roomProg = roomRange > 0 ? Math.min(1, Math.max(0, (roomCount - currentLevel.minRooms) / roomRange)) : 1;
    const scoreProg = scoreRange > 0 ? Math.min(1, Math.max(0, (totalScore - currentLevel.minScore) / scoreRange)) : 1;

    // 双维度综合进度，各占 50%
    progressPercent = Math.min(99, Math.round(((roomProg + scoreProg) / 2) * 100));
  }

  return {
    current: currentLevel,
    next: nextLevel,
    needRooms,
    needScore,
    progressPercent,
    stats: {
      roomCount,
      totalScore,
      maxRoomScore: stats ? stats.maxRoomScore || 0 : 0,
      avgScore: stats ? stats.avgScore || 0 : 0
    }
  };
}

/**
 * 便捷获取指定用户的会员品阶详情
 * @param {string} userId
 */
function getUserMemberLevel(userId) {
  const stats = getUserTastingStats(userId);
  return calculateMemberLevel(stats);
}

module.exports = {
  LEVELS,
  getUserTastingStats,
  calculateMemberLevel,
  getUserMemberLevel
};
