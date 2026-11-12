const test = require('node:test');
const assert = require('node:assert/strict');

test('memberLevel module test suite', async (t) => {
  const originalWx = global.wx;
  t.after(() => {
    global.wx = originalWx;
  });

  const memberLevel = require('../miniprogram/services/memberLevel');
  const { LEVELS, calculateMemberLevel, getUserTastingStats, getUserMemberLevel } = memberLevel;

  await t.test('1. LEVELS structure and configuration sanity', () => {
    assert.equal(LEVELS.length, 9);
    assert.equal(LEVELS[0].title, '问泉客');
    assert.equal(LEVELS[8].title, '太白真');
    for (let i = 0; i < LEVELS.length; i++) {
      const lvl = LEVELS[i];
      assert.equal(lvl.level, i + 1);
      assert.ok(lvl.title);
      assert.ok(lvl.badge);
      assert.ok(lvl.seal);
      assert.ok(lvl.poem);
      assert.ok(lvl.theme && lvl.theme.color);
      if (i > 0) {
        assert.ok(lvl.minRooms >= LEVELS[i - 1].minRooms, 'minRooms must be monotonic');
        assert.ok(lvl.minScore >= LEVELS[i - 1].minScore, 'minScore must be monotonic');
      }
    }
  });

  await t.test('2. calculateMemberLevel baseline and dual-threshold progression', () => {
    // 0局 0分
    const l1 = calculateMemberLevel({ roomCount: 0, totalScore: 0 });
    assert.equal(l1.current.level, 1);
    assert.equal(l1.current.title, '问泉客');
    assert.equal(l1.next.title, '寻芳友');
    assert.equal(l1.needRooms, 2);
    assert.equal(l1.needScore, 300);

    // 仅局数达标，分数未达标，不能晋级
    const stuckByScore = calculateMemberLevel({ roomCount: 5, totalScore: 250 });
    assert.equal(stuckByScore.current.level, 1, 'Should stay level 1 when score is below 300');
    assert.equal(stuckByScore.needScore, 50);
    assert.equal(stuckByScore.needRooms, 0);

    // 仅分数达标，局数未达标，不能晋级
    const stuckByRooms = calculateMemberLevel({ roomCount: 1, totalScore: 5000 });
    assert.equal(stuckByRooms.current.level, 1, 'Should stay level 1 when roomCount is 1');
    assert.equal(stuckByRooms.needRooms, 1);
    assert.equal(stuckByRooms.needScore, 0);

    // 同时达标二阶 (2局, 300分)
    const l2 = calculateMemberLevel({ roomCount: 2, totalScore: 300 });
    assert.equal(l2.current.level, 2);
    assert.equal(l2.current.title, '寻芳友');
    assert.equal(l2.next.title, '识味生');

    // 五阶 (20局, 5500分)
    const l5 = calculateMemberLevel({ roomCount: 20, totalScore: 5500 });
    assert.equal(l5.current.level, 5);
    assert.equal(l5.current.title, '鉴真士');
    assert.equal(l5.next.title, '辨香客');

    // 满级九阶 (120局, 50000分)
    const l9 = calculateMemberLevel({ roomCount: 130, totalScore: 52000 });
    assert.equal(l9.current.level, 9);
    assert.equal(l9.current.title, '太白真');
    assert.equal(l9.next, null);
    assert.equal(l9.needRooms, 0);
    assert.equal(l9.needScore, 0);
    assert.equal(l9.progressPercent, 100);
  });

  await t.test('3. getUserTastingStats computes real scores across storage rooms', () => {
    const storage = {};
    global.wx = {
      getStorageSync: key => storage[key] || [],
      setStorageSync: (key, val) => { storage[key] = val; }
    };

    const testUser = 'user_test_99';
    storage.mz_members = [
      { roomId: 'room_1', userId: testUser },
      { roomId: 'room_2', userId: testUser },
      { roomId: 'room_2', userId: testUser } // duplicate membership entry in same room
    ];

    storage.mz_samples = [
      { roomId: 'room_1', sampleId: 's1', brand: '贵州茅台', product: '飞天', aromaType: '酱香型', alcoholDegree: 53, year: 2021, marketPrice: 2800 },
      { roomId: 'room_2', sampleId: 's2', brand: '五粮液', product: '普五', aromaType: '浓香型', alcoholDegree: 52, year: 2022, marketPrice: 1100 }
    ];

    // 猜对茅台全部字段 -> 100分
    // 猜中五粮液品牌+香型 -> 25 + 10 = 35分
    storage.mz_guesses = [
      { roomId: 'room_1', userId: testUser, sampleId: 's1', brand: '贵州茅台', product: '飞天', aromaType: '酱香型', alcoholDegree: 53, year: 2021, estimatedPrice: 2800 },
      { roomId: 'room_2', userId: testUser, sampleId: 's2', brand: '五粮液', product: '未知产品', aromaType: '浓香型', alcoholDegree: 42, year: 2010, estimatedPrice: 200 }
    ];

    const stats = getUserTastingStats(testUser);
    assert.equal(stats.roomCount, 2, 'Distinct room count should be 2');
    assert.equal(stats.totalScore, 135, 'Total score should be 100 + 35 = 135');
    assert.equal(stats.maxRoomScore, 100, 'Max room score should be 100');
    assert.equal(stats.avgScore, 68, 'Avg score should be round(135 / 2) = 68');

    const levelInfo = getUserMemberLevel(testUser);
    assert.equal(levelInfo.current.title, '问泉客');
    assert.equal(levelInfo.next.title, '寻芳友');
    assert.equal(levelInfo.needRooms, 0, 'Already has 2 rooms, need 0 rooms for level 2');
    assert.equal(levelInfo.needScore, 165, 'Need 300 - 135 = 165 score for level 2');
  });
});
