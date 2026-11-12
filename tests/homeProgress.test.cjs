const test = require('node:test');
const assert = require('node:assert/strict');

const USER = 'home-user';

function sample(roomId, sampleId, overrides = {}) {
  return {
    roomId,
    sampleId,
    brand: '品牌-' + sampleId,
    product: '产品-' + sampleId,
    aromaType: '酱香型',
    alcoholDegree: 53,
    year: 2021,
    marketPrice: 100,
    ...overrides
  };
}

function exactGuess(roomId, userId, sampleId) {
  return {
    roomId,
    userId,
    sampleId,
    brand: '品牌-' + sampleId,
    product: '产品-' + sampleId,
    aromaType: '酱香型',
    alcoholDegree: 53,
    year: 2021,
    estimatedPrice: 100
  };
}

function assertFiniteNumbers(value) {
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), 'numeric output must be finite');
    return;
  }
  if (!value || typeof value !== 'object') return;
  Object.values(value).forEach(assertFiniteNumbers);
}

test('homeProgress overview', async t => {
  const originalWx = global.wx;
  let values = {};
  let writes = [];
  global.wx = {
    getStorageSync(key) { return values[key]; },
    setStorageSync(key, value) {
      writes.push({ key, value });
      values[key] = value;
    }
  };

  const memberLevel = require('../miniprogram/services/memberLevel');
  const originalGetUserMemberLevel = memberLevel.getUserMemberLevel;
  let membershipCalls = [];
  memberLevel.getUserMemberLevel = function (userId) {
    membershipCalls.push(userId);
    return originalGetUserMemberLevel(userId);
  };
  const { getHomeOverview } = require('../miniprogram/services/homeProgress');

  t.after(() => {
    memberLevel.getUserMemberLevel = originalGetUserMemberLevel;
    if (originalWx === undefined) delete global.wx;
    else global.wx = originalWx;
  });

  function overview({ rooms = [], samples = [], members = [], guesses = [], ratings = [] } = {}, userId = USER) {
    values = {
      mz_rooms: rooms,
      mz_samples: samples,
      mz_members: members,
      mz_guesses: guesses,
      mz_ratings: ratings
    };
    writes = [];
    membershipCalls = [];
    const result = getHomeOverview(userId);
    assert.deepEqual(membershipCalls, [userId], 'membership is read exactly once');
    assert.deepEqual(writes, [], 'overview must not write local storage');
    return result;
  }

  await t.test('空数据返回空进行中、空结果和初始会员阶位', () => {
    const result = overview();
    assert.deepEqual(result.activeRooms, []);
    assert.equal(result.active, null);
    assert.equal(result.latestResult, null);
    assert.equal(result.membership.current.level, 1);
    assert.equal(result.membership.stats.roomCount, 0);
  });

  await t.test('过滤演示局、非本人酒局和非精确进行中状态', () => {
    const result = overview({
      rooms: [
        { roomId: 'room_demo_active', ownerId: USER, status: 'playing' },
        { roomId: 'other-active', ownerId: 'other', status: 'playing' },
        { roomId: 'uppercase', ownerId: USER, status: 'PLAYING' },
        { roomId: 'finished', ownerId: USER, status: 'finished' },
        { roomId: 'room_demo_result', ownerId: USER, status: 'revealed', revealAt: 999 },
        { roomId: 'other-result', ownerId: 'other', status: 'revealed', revealAt: 1000 }
      ],
      members: [
        { roomId: 'other-active', userId: 'other' },
        { roomId: 'other-result', userId: 'other' }
      ]
    });
    assert.deepEqual(result.activeRooms, []);
    assert.equal(result.active, null);
    assert.equal(result.latestResult, null);
  });

  await t.test('唯一未布置候选清理状态后缀并按去重成员计数', () => {
    const result = overview({
      rooms: [{ roomId: 'setup-room', name: '周末盲品 （进行中）', ownerId: USER, status: 'playing', sampleCount: 99 }],
      members: [
        { roomId: 'setup-room', userId: USER, role: 'owner' },
        { roomId: 'setup-room', userId: 'friend', role: 'member' },
        { roomId: 'setup-room', userId: 'friend', role: 'member' },
        { roomId: 'setup-room', userId: USER, role: 'owner' }
      ]
    });
    assert.deepEqual(result.activeRooms, [{
      roomId: 'setup-room',
      title: '周末盲品',
      sampleCount: 0,
      memberCount: 2,
      answeredCount: 0,
      stage: 'noSamples',
      actionLabel: '继续布置酒样',
      url: '/packages/blind/pages/setup/setup?roomId=setup-room'
    }]);
    assert.deepEqual(result.active, { kind: 'single', room: result.activeRooms[0] });
  });

  await t.test('部分作答只计算本人评分实际匹配的酒样', () => {
    const samples = [
      sample('tasting-room', 's1'),
      sample('tasting-room', 's2'),
      sample('tasting-room', 's3')
    ];
    const result = overview({
      rooms: [{ roomId: 'tasting-room', name: '三人局', ownerId: 'owner', status: 'playing', sampleCount: 1 }],
      samples,
      members: [
        { roomId: 'tasting-room', userId: 'owner', role: 'owner' },
        { roomId: 'tasting-room', userId: USER, role: 'member' }
      ],
      ratings: [
        { roomId: 'tasting-room', userId: USER, sampleId: 's1', overall: 8 },
        { roomId: 'tasting-room', userId: USER, sampleId: 's1', overall: 9 },
        { roomId: 'tasting-room', userId: USER, sampleId: 'not-in-room', overall: 10 },
        { roomId: 'tasting-room', userId: 'other', sampleId: 's2', overall: 10 },
        { roomId: 'other-room', userId: USER, sampleId: 's3', overall: 10 }
      ]
    });
    assert.equal(result.activeRooms[0].sampleCount, 3);
    assert.equal(result.activeRooms[0].answeredCount, 1);
    assert.equal(result.activeRooms[0].stage, 'tasting');
    assert.equal(result.activeRooms[0].actionLabel, '继续品鉴');
    assert.equal(result.activeRooms[0].url, '/packages/blind/pages/room/room?roomId=tasting-room');
    assert.deepEqual(result.active, { kind: 'single', room: result.activeRooms[0] });
  });

  await t.test('全部酒样已评分后进入等待揭晓阶段', () => {
    const result = overview({
      rooms: [{ roomId: 'waiting-room', title: '等待局', ownerId: USER, status: 'playing' }],
      samples: [sample('waiting-room', 's1'), sample('waiting-room', 's2')],
      ratings: [
        { roomId: 'waiting-room', userId: USER, sampleId: 's1' },
        { roomId: 'waiting-room', userId: USER, sampleId: 's2' },
        { roomId: 'waiting-room', userId: USER, sampleId: 'extra' }
      ]
    });
    assert.equal(result.activeRooms[0].answeredCount, 2);
    assert.equal(result.activeRooms[0].stage, 'waiting');
    assert.equal(result.activeRooms[0].actionLabel, '回酒局等揭晓');
    assert.equal(result.activeRooms[0].url, '/packages/blind/pages/room/room?roomId=waiting-room');
  });

  await t.test('多个候选只返回数量且评分和收藏不改变存储顺序', () => {
    const result = overview({
      rooms: [
        { roomId: 'first', name: '第一场', ownerId: USER, status: 'playing', score: 1, favorite: false },
        { roomId: 'second', name: '第二场', ownerId: USER, status: 'playing', score: 999, favorite: true },
        { roomId: 'third', name: '第三场', ownerId: USER, status: 'playing', rating: 100 }
      ]
    });
    assert.deepEqual(result.activeRooms.map(room => room.roomId), ['first', 'second', 'third']);
    assert.deepEqual(result.active, { kind: 'multiple', count: 3 });
    assert.equal(Object.hasOwn(result.active, 'room'), false);
  });

  await t.test('最近真实揭晓局按揭晓时间优先并汇总本人猜酒得分', () => {
    const latestSamples = [sample('latest', 'a'), sample('latest', 'b')];
    const partialGuess = {
      ...exactGuess('latest', USER, 'b'),
      product: '完全不同',
      aromaType: '清香型',
      alcoholDegree: 30,
      year: 1990,
      estimatedPrice: 1000
    };
    const result = overview({
      rooms: [
        { roomId: 'older', name: '旧局', ownerId: USER, status: 'revealed', revealAt: 400, createdAt: 9999, favorite: true },
        { roomId: 'latest', name: '新局（已揭晓）', ownerId: 'owner', status: 'revealed', revealAt: 'invalid', createdAt: 500 },
        { roomId: 'playing', name: '未揭晓', ownerId: USER, status: 'playing', revealAt: 2000 },
        { roomId: 'room_demo_latest', name: '演示局', ownerId: USER, status: 'revealed', revealAt: 3000 },
        { roomId: 'not-mine', name: '别人局', ownerId: 'other', status: 'revealed', revealAt: 4000 }
      ],
      samples: [sample('older', 'old'), ...latestSamples],
      members: [
        { roomId: 'older', userId: USER },
        { roomId: 'latest', userId: USER, role: 'member' },
        { roomId: 'latest', userId: USER, role: 'member' },
        { roomId: 'latest', userId: 'owner', role: 'owner' }
      ],
      guesses: [
        exactGuess('older', USER, 'old'),
        exactGuess('latest', USER, 'a'),
        partialGuess,
        exactGuess('latest', 'other', 'a'),
        exactGuess('latest', 'other', 'b')
      ]
    });
    assert.deepEqual(result.latestResult, {
      roomId: 'latest',
      title: '新局',
      score: 125,
      sampleCount: 2,
      memberCount: 2,
      url: '/packages/blind/pages/reveal/reveal?roomId=latest'
    });
    assert.deepEqual(result.activeRooms.map(room => room.roomId), ['playing']);
  });

  await t.test('非法数字和日期不会产出NaN', () => {
    const invalidSample = sample('invalid-numbers', 'bad', {
      alcoholDegree: 'not-a-degree',
      year: 'not-a-year',
      marketPrice: NaN
    });
    const invalidGuess = {
      ...exactGuess('invalid-numbers', USER, 'bad'),
      alcoholDegree: 'still-not-a-degree',
      year: 'not-a-year',
      estimatedPrice: Infinity
    };
    const result = overview({
      rooms: [{
        roomId: 'invalid-numbers',
        name: '异常数据局(已开奖)',
        ownerId: USER,
        status: 'revealed',
        revealAt: 'invalid-date',
        createdAt: NaN,
        sampleCount: NaN
      }],
      samples: [invalidSample],
      members: [{ roomId: 'invalid-numbers', userId: USER }],
      guesses: [invalidGuess]
    });
    assert.equal(result.latestResult.score, 60);
    assert.equal(result.latestResult.sampleCount, 1);
    assert.equal(result.latestResult.title, '异常数据局');
    assertFiniteNumbers(result);
  });
});
