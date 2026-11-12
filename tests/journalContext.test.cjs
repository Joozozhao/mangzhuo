const test = require('node:test');
const assert = require('node:assert/strict');
const context = require('../miniprogram/services/journalContext');

function withData(t, data) {
  const originalWx = global.wx;
  global.wx = { getStorageSync: key => data[key] || [] };
  t.after(() => { global.wx = originalWx; });
}

const room = { roomId: 'room_real', name: '春夜品鉴（进行中）', ownerId: 'me', status: 'playing' };
const data = {
  mz_rooms: [room, { roomId: 'room_demo_03', name: '示例', ownerId: 'me' }, { roomId: 'other', ownerId: 'other' }],
  mz_members: [{ roomId: 'room_real', userId: 'me' }, { roomId: 'room_real', userId: 'friend' }, { roomId: 'room_real', userId: 'friend' }, { roomId: 'other', userId: 'other' }],
  mz_samples: [{ roomId: 'room_real', sampleId: 's1', bottleTag: '01号盲样', product: '答案酒', aromaType: '酱香型' }, { roomId: 'room_real', sampleId: 's2', number: 2 }]
};

test('only the current user real rooms appear and use actual deduplicated room facts', t => {
  withData(t, data);
  const rooms = context.getRoomOptions('me');
  assert.equal(rooms.length, 1);
  assert.equal(rooms[0].name, '春夜品鉴');
  assert.equal(rooms[0].sampleCount, 2);
  assert.equal(rooms[0].memberCount, 2);
  assert.equal(rooms[0].samples[0].label, '01号盲样');
  assert.equal(rooms[0].samples[0].product, '', 'An unrevealed room must not leak the answer');
  assert.equal(context.getMyRooms('').length, 0);
});

test('legacy notes stay personal and associated notes expose room facts on every consumer', t => {
  withData(t, data);
  const personal = context.presentNote({ id: 'old', title: '随手记' });
  assert.equal(personal.hasRoom, false);
  assert.equal(personal.roomName, '个人手记');
  const associated = context.presentNote({ id: 'new', title: '一杯', roomId: 'room_real', sampleId: 's1' });
  assert.equal(associated.hasRoom, true);
  assert.equal(associated.roomName, '春夜品鉴');
  assert.equal(associated.roomFacts, '2 款酒样 · 2 人同席');
  assert.equal(associated.sampleLabel, '01号盲样');
  assert.match(associated.roomUrl, /room_real$/);
});

test('a removed room can still use its saved snapshot without fabricating new facts', t => {
  withData(t, { mz_rooms: [], mz_samples: [], mz_members: [] });
  const saved = context.presentNote({ roomId: 'archived', roomSnapshot: { roomId: 'archived', name: '老友局', sampleCount: 3, memberCount: 5 }, sampleLabel: '03号酒' });
  assert.equal(saved.roomName, '老友局');
  assert.equal(saved.roomFacts, '3 款酒样 · 5 人同席 · 本机存档');
  assert.equal(saved.roomUrl, '');
  const missing = context.presentNote({ roomId: 'missing' });
  assert.equal(missing.hasRoom, false);
  assert.equal(missing.roomName, '酒局记录已不在本机');
});
