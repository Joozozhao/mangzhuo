const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pagePath = path.join(__dirname, '../miniprogram/pages/gather/gather.js');
const storagePath = path.join(__dirname, '../miniprogram/services/storage.js');
const pageSource = fs.readFileSync(pagePath, 'utf8');
const storageSource = fs.readFileSync(storagePath, 'utf8');
const plain = value => JSON.parse(JSON.stringify(value));
const roomIds = rooms => Array.from(rooms, room => room.roomId);
const filterEvent = filter => ({ currentTarget: { dataset: { filter } } });
const flush = () => new Promise(resolve => setImmediate(resolve));

function makePage({ rooms = [], members = [], loggedIn = false, getTasteList = async () => ({ list: [], count: 0 }) } = {}) {
  let page;
  const values = { mz_rooms: rooms, mz_members: members };
  const writes = [], memberReads = [], requests = [], navigations = [], refreshes = [], toasts = [];
  const session = { loggedIn, owner: 'gather-test-user' };
  const wx = {
    getStorageSync(key) { return values[key]; },
    setStorageSync(key, value) { writes.push({ key, value }); values[key] = value; },
    navigateTo({ url }) { navigations.push({ type: 'navigateTo', url }); },
    switchTab({ url }) { navigations.push({ type: 'switchTab', url }); },
    stopPullDownRefresh() { refreshes.push(true); },
    showToast(options) { toasts.push(options); }
  };
  // Use the real storage reader with an isolated in-memory wx store.
  const storageModule = { exports: {} };
  vm.runInNewContext(storageSource, { module: storageModule, wx, console }, { filename: storagePath });
  const storage = storageModule.exports;
  const getMembers = storage.getMembers;
  storage.getMembers = function (roomId) {
    memberReads.push(roomId);
    return getMembers.call(this, roomId);
  };
  vm.runInNewContext(pageSource, {
    Page(definition) { page = definition; }, wx, console,
    require(name) {
      if (name === '../../services/storage') return storage;
      if (name === '../../services/identity') return {
        isLoggedIn: () => session.loggedIn,
        getActiveOpenid: () => session.owner
      };
      if (name === '../../services/welinkClient') return {
        getTasteList(page, limit) { requests.push({ page, limit }); return getTasteList(page, limit); }
      };
      throw new Error('Unexpected dependency: ' + name);
    }
  }, { filename: pagePath });
  page.data = plain(page.data);
  page.setData = function (patch) { Object.assign(this.data, patch); };
  return { page, values, writes, memberReads, requests, navigations, refreshes, toasts, session };
}

function mixedRooms() {
  return [
    { roomId: 'playing-1', roomCode: '0042', name: '盲酌酒局 0042', status: 'playing', memberCount: 99 },
    { roomId: 'finished', roomCode: '0100', name: '周五小聚（品评结束）', status: 'finished', statusText: '进行中' },
    { roomId: 'revealed', roomCode: '0200', name: '酱香专场(已揭晓)', status: 'revealed' },
    { roomId: 'playing-2', roomCode: '0300', name: '朋友小聚', status: 'playing' },
    { roomId: 'unknown', roomCode: '0400', name: '历史酒局', status: 'pending', statusText: '进行中' }
  ];
}

test('gather exposes empty local ticket state before rooms load', () => {
  const { page } = makePage();
  assert.equal(page.data.roomFilter, 'all');
  assert.deepEqual(page.data.rooms, []);
  assert.deepEqual(page.data.filteredRooms, []);
  assert.deepEqual(page.data.roomCounts, { all: 0, playing: 0, finished: 0, revealed: 0 });
});

test('local tickets enrich real rooms and member counts with distinct exact statuses', () => {
  const rooms = mixedRooms();
  const members = [
    { roomId: 'playing-1', userId: 'a' }, { roomId: 'playing-1', userId: 'b' },
    { roomId: 'finished', userId: 'a' }, { roomId: 'playing-2', userId: 'c' },
    { roomId: 'other-room', userId: 'd' }
  ];
  const before = plain({ rooms, members });
  const { page, memberReads, writes } = makePage({ rooms, members });
  page.onLoad();
  assert.deepEqual(plain(page.data.roomCounts), { all: 5, playing: 2, finished: 1, revealed: 1 });
  assert.deepEqual(roomIds(page.data.filteredRooms), roomIds(rooms));
  assert.deepEqual(memberReads, roomIds(rooms));
  assert.deepEqual(Array.from(page.data.rooms, room => [room.statusLabel, room.statusClass, room.actionLabel, room.memberCount]), [
    ['进行中', 'is-playing', '进入酒局', 2],
    ['品评结束', 'is-finished', '查看酒局', 1],
    ['已揭晓', 'is-revealed', '查看结果', 0],
    ['进行中', 'is-playing', '进入酒局', 1],
    ['待确认', 'is-unknown', '查看酒局', 0]
  ]);
  assert.deepEqual({ rooms, members }, before);
  assert.deepEqual(writes, []);
});

test('local status filters separate finished from revealed and reject unsupported filters', () => {
  const { page, memberReads } = makePage({ rooms: mixedRooms() });
  page.onLoad();
  const counts = plain(page.data.roomCounts);
  for (const [filter, expected] of [
    ['playing', ['playing-1', 'playing-2']], ['finished', ['finished']],
    ['revealed', ['revealed']], ['all', ['playing-1', 'finished', 'revealed', 'playing-2', 'unknown']]
  ]) {
    page.selectRoomFilter({ ...filterEvent(filter), target: { dataset: { filter: 'wrong-target' } } });
    assert.equal(page.data.roomFilter, filter);
    assert.deepEqual(roomIds(page.data.filteredRooms), expected);
    assert.equal(page.data.rooms.length, 5);
    assert.deepEqual(plain(page.data.roomCounts), counts);
  }
  page.selectRoomFilter(filterEvent('finished'));
  for (const filter of ['unknown', 'pending', 'toString', '__proto__', '', undefined, null]) {
    page.selectRoomFilter(filterEvent(filter));
    assert.equal(page.data.roomFilter, 'finished');
    assert.deepEqual(roomIds(page.data.filteredRooms), ['finished']);
  }
  assert.equal(memberReads.length, 5, 'filter selection uses the loaded local rows');
});

test('unknown or missing statuses remain unconfirmed and never count as playing', () => {
  const rooms = ['pending', 'PLAYING', 'all', 'toString', '__proto__', undefined, null, ['playing'], ['revealed']].map((status, index) => ({
    roomId: 'unknown-' + index, name: '历史酒局', status, statusText: '进行中'
  }));
  const { page } = makePage({ rooms });
  page.onLoad();
  assert.deepEqual(plain(page.data.roomCounts), { all: rooms.length, playing: 0, finished: 0, revealed: 0 });
  for (const room of page.data.filteredRooms) {
    assert.equal(room.statusLabel, '待确认');
    assert.equal(room.statusClass, 'is-unknown');
    assert.equal(room.actionLabel, '查看酒局');
  }
  page.selectRoomFilter(filterEvent('playing'));
  assert.equal(page.data.filteredRooms.length, 0);
});

test('local reloads retain the selected filter while refreshing statuses, counts and members', () => {
  const { page, values, refreshes, writes } = makePage({ rooms: mixedRooms() });
  page.onLoad();
  page.selectRoomFilter(filterEvent('finished'));
  values.mz_rooms = [
    { roomId: 'playing-1', name: '转为结束', status: 'finished' },
    { roomId: 'finished', name: '转为揭晓', status: 'revealed' },
    { roomId: 'new', name: '新酒局', status: 'playing' }
  ];
  values.mz_members = [{ roomId: 'playing-1', userId: 'new-member' }];
  page.onShow();
  assert.equal(page.data.roomFilter, 'finished');
  assert.deepEqual(roomIds(page.data.filteredRooms), ['playing-1']);
  assert.equal(page.data.filteredRooms[0].memberCount, 1);
  assert.deepEqual(plain(page.data.roomCounts), { all: 3, playing: 1, finished: 1, revealed: 1 });

  values.mz_rooms = [{ roomId: 'finished', name: '揭晓酒局', status: 'revealed' }];
  page.onPullDownRefresh();
  assert.equal(page.data.roomFilter, 'finished');
  assert.equal(page.data.filteredRooms.length, 0);
  assert.equal(page.data.rooms.length, 1);
  assert.deepEqual(plain(page.data.roomCounts), { all: 1, playing: 0, finished: 0, revealed: 1 });
  assert.equal(refreshes.length, 1);
  assert.deepEqual(writes, []);
});

test('an empty filter differs from having no rooms and remains selected through both states', () => {
  const { page, values } = makePage({ rooms: [{ roomId: 'a', name: '小聚', status: 'playing' }] });
  page.onLoad();
  page.selectRoomFilter(filterEvent('finished'));
  assert.equal(page.data.filteredRooms.length, 0);
  assert.equal(page.data.rooms.length, 1);
  assert.equal(page.data.roomCounts.all, 1);

  values.mz_rooms = [];
  page.loadRooms();
  assert.equal(page.data.roomFilter, 'finished');
  assert.equal(page.data.filteredRooms.length, 0);
  assert.equal(page.data.rooms.length, 0);
  assert.deepEqual(plain(page.data.roomCounts), { all: 0, playing: 0, finished: 0, revealed: 0 });

  values.mz_rooms = [{ roomId: 'b', name: '品评结束', status: 'finished' }];
  page.loadRooms();
  assert.equal(page.data.roomFilter, 'finished');
  assert.deepEqual(roomIds(page.data.filteredRooms), ['b']);
});

test('ticket titles remove only exact presentation redundancy without rewriting stored names or codes', () => {
  const cases = [
    ['盲酌酒局 0042', '0042', '盲酌酒局'],
    ['盲酌酒局\t0042', '0042', '盲酌酒局'],
    ['盲酌酒局 0042(进行中)', '0042', '盲酌酒局'],
    ['盲酌酒局 0042 （已揭晓）', '0042', '盲酌酒局'],
    ['盲酌酒局 42', '0042', '盲酌酒局 42'],
    ['盲酌酒局 00420', '0042', '盲酌酒局 00420'],
    ['盲酌酒局0042', '0042', '盲酌酒局0042'],
    ['盲酌酒局 0042', '0099', '盲酌酒局 0042'],
    ['盲酌酒局 00.2', '0012', '盲酌酒局 00.2'],
    ['盲酌酒局 0042 特别场', '0042', '盲酌酒局 0042 特别场'],
    ['周五 0042 小聚', '0042', '周五 0042 小聚'],
    ['周五(进行中) 0042', '0042', '周五(进行中) 0042'],
    ['周五（已揭晓）特别场', '0042', '周五（已揭晓）特别场'],
    ['周五(已结束)', '0042', '周五(已结束)'],
    ['周五（进行中)', '0042', '周五（进行中)'],
    ['(进行中)', '0042', '(进行中)'],
    ['  我的酒局 0042  ', '0042', '  我的酒局 0042  '],
    ['盲酌酒局 undefined', undefined, '盲酌酒局 undefined'],
    ...['(进行中)', '（进行中）', '(已揭晓)', '（已揭晓）', '(品评结束)', '（品评结束）']
      .map(suffix => ['周五 0042 小聚 ' + suffix, '0042', '周五 0042 小聚'])
  ];
  const rooms = Object.freeze(cases.map(([name, roomCode], index) => Object.freeze({
    roomId: 'title-' + index, name, roomCode, status: 'playing', statusText: '原始状态', description: '保留描述'
  })));
  const before = plain(rooms);
  const { page, values, writes } = makePage({ rooms });
  page.onLoad();
  page.loadRooms();
  for (const [index, [, , expected]] of cases.entries()) {
    const row = page.data.rooms[index];
    assert.equal(row.displayName, expected, rooms[index].name);
    assert.equal(row.name, rooms[index].name);
    assert.equal(row.roomCode, rooms[index].roomCode);
    assert.equal(row.statusText, '原始状态');
    assert.equal(row.description, '保留描述');
    assert.notEqual(row, rooms[index]);
  }
  assert.equal(page.data.rooms[0].roomCode, '0042');
  assert.equal(values.mz_rooms, rooms);
  assert.deepEqual(plain(values.mz_rooms), before);
  assert.deepEqual(writes, []);
});

test('local ticket actions keep the existing routes and read current stored status', () => {
  const { page, values, navigations } = makePage({ rooms: mixedRooms() });
  page.onLoad();
  page.goToCreate();
  page.goToJoin();
  page.goToMine();
  page.openDemoRoom();
  for (const roomId of ['playing-1', 'finished', 'revealed', 'unknown', 'missing']) {
    page.onTapRoom({ currentTarget: { dataset: { roomId } } });
  }
  values.mz_rooms = [{ roomId: 'playing-1', status: 'revealed' }];
  page.onTapRoom({ currentTarget: { dataset: { roomId: 'playing-1' } } });
  assert.deepEqual(navigations, [
    { type: 'navigateTo', url: '/packages/blind/pages/create/create' },
    { type: 'navigateTo', url: '/packages/blind/pages/join/join' },
    { type: 'switchTab', url: '/pages/mine/mine' },
    { type: 'navigateTo', url: '/packages/blind/pages/reveal/reveal?roomId=room_demo_01' },
    { type: 'navigateTo', url: '/packages/blind/pages/room/room?roomId=playing-1' },
    { type: 'navigateTo', url: '/packages/blind/pages/room/room?roomId=finished' },
    { type: 'navigateTo', url: '/packages/blind/pages/reveal/reveal?roomId=revealed' },
    { type: 'navigateTo', url: '/packages/blind/pages/room/room?roomId=unknown' },
    { type: 'navigateTo', url: '/packages/blind/pages/reveal/reveal?roomId=playing-1' }
  ]);
});

test('online pagination and tap retries remain independent of the local ticket filter', async () => {
  const { page, requests } = makePage({
    rooms: mixedRooms(), loggedIn: true,
    getTasteList: async page => ({
      list: (page === 1 ? [11, 12] : [13]).map(id => ({ id, title: '在线酒局', createdAt: 1761000000 })), count: 3
    })
  });
  page.onLoad();
  page.selectRoomFilter(filterEvent('finished'));
  page.switchTabMode({ currentTarget: { dataset: { tab: 'online' } } });
  await flush();
  assert.deepEqual(requests, [{ page: 1, limit: 15 }]);
  assert.equal(page.data.hasMoreOnline, true);
  page.onReachBottom();
  await flush();
  assert.deepEqual(requests, [{ page: 1, limit: 15 }, { page: 2, limit: 15 }]);
  assert.deepEqual(Array.from(page.data.onlineList, row => row.id), [11, 12, 13]);
  assert.equal(page.data.onlineListCount, 3);
  assert.equal(page.data.onlineCount, 3);
  assert.equal(page.data.onlinePage, 2);
  assert.equal(page.data.hasMoreOnline, false);
  assert.match(page.data.onlineList[0].createdAtText, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  page.onReachBottom();
  assert.equal(requests.length, 2);

  await page.loadOnlineTastes({ type: 'tap' });
  assert.deepEqual(requests[2], { page: 1, limit: 15 });
  assert.deepEqual(Array.from(page.data.onlineList, row => row.id), [11, 12]);
  page.switchTabMode({ currentTarget: { dataset: { tab: 'local' } } });
  assert.equal(page.data.roomFilter, 'finished');
  assert.deepEqual(roomIds(page.data.filteredRooms), ['finished']);
});

test('online login gating, guest cleanup and navigation stay compatible with local tickets', async () => {
  const { page, session, requests, navigations, refreshes, toasts } = makePage({
    rooms: mixedRooms(), loggedIn: true, getTasteList: async () => ({ list: [{ id: 42 }], count: 1 })
  });
  page.onLoad();
  page.selectRoomFilter(filterEvent('revealed'));
  page.switchTabMode({ currentTarget: { dataset: { tab: 'online' } } });
  await flush();
  page.goToOnlineCreate();
  page.onTapOnlineItem({ currentTarget: { dataset: { id: 42 } } });
  page.onInputOnlineId({ detail: { value: ' 42 ' } });
  page.onJoinOnlineById();
  page.onInputOnlineId({ detail: { value: '0' } });
  page.onJoinOnlineById();
  assert.equal(toasts.length, 1);

  session.loggedIn = false;
  page.onShow();
  await page.loadOnlineTastes();
  page.onPullDownRefresh();
  page.goToOnlineCreate();
  assert.equal(page.data.isLoggedIn, false);
  assert.equal(page.data.onlineList.length, 0);
  assert.equal(page.data.onlineListCount, 0);
  assert.equal(page.data.onlineCount, 0);
  assert.equal(page.data.hasMoreOnline, false);
  assert.equal(requests.length, 1);
  assert.equal(refreshes.length, 1);
  assert.equal(page.data.roomFilter, 'revealed');
  assert.deepEqual(roomIds(page.data.filteredRooms), ['revealed']);
  assert.deepEqual(navigations, [
    { type: 'navigateTo', url: '/packages/online/pages/create/create' },
    { type: 'navigateTo', url: '/packages/online/pages/detail/detail?id=42' },
    { type: 'navigateTo', url: '/packages/online/pages/detail/detail?id=42' },
    { type: 'navigateTo', url: '/pages/profile/profile' }
  ]);
});
