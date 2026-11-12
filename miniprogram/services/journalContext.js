const storage = require('./storage');

function cleanRoomName(room) {
  const name = room && typeof room.name === 'string' ? room.name.trim() : '';
  return name.replace(/\s*[（(](?:进行中|已揭晓|已开奖|品评结束)[）)]$/, '').trim() || '未命名酒局';
}

function roomSummary(room) {
  if (!room || typeof room.roomId !== 'string' || !room.roomId) return null;
  const samples = storage.getSamples(room.roomId);
  const members = storage.getMembers(room.roomId);
  return {
    roomId: room.roomId,
    name: cleanRoomName(room),
    status: room.status,
    sampleCount: samples.length,
    memberCount: new Set(members.map(member => member.userId).filter(Boolean)).size
  };
}

function getMyRooms(userId) {
  if (!userId) return [];
  const memberships = new Set(storage.getMembers().filter(member => member.userId === userId).map(member => member.roomId));
  return storage.getRooms()
    .filter(room => room && !/^room_demo_/.test(room.roomId || '') && (room.ownerId === userId || memberships.has(room.roomId)))
    .map(roomSummary)
    .filter(Boolean);
}

function sampleLabel(sample) {
  if (!sample) return '';
  if (typeof sample.bottleTag === 'string' && sample.bottleTag.trim()) return sample.bottleTag.trim();
  const number = Number(sample.number);
  return Number.isInteger(number) && number > 0 ? number + '号酒' : '酒样';
}

function getRoomOptions(userId) {
  return getMyRooms(userId).map(room => ({
    ...room,
    displayName: room.name + ' · ' + room.sampleCount + '款 / ' + room.memberCount + '人',
    samples: storage.getSamples(room.roomId).map(sample => ({
      sampleId: sample.sampleId,
      label: sampleLabel(sample),
      // 未揭晓前只显示盲样编号，不因写手记而泄漏答案。
      product: room.status === 'revealed' ? sample.product || '' : '',
      aromaType: room.status === 'revealed' ? sample.aromaType || '' : ''
    }))
  }));
}

function presentNote(note) {
  const base = {
    ...note,
    hasRoom: false,
    roomName: '个人手记',
    roomFacts: '未关联酒局',
    sampleLabel: '',
    roomUrl: ''
  };
  if (!note || typeof note.roomId !== 'string' || !note.roomId) return base;
  const room = roomSummary(storage.getRoomById(note.roomId));
  const snapshot = note.roomSnapshot && note.roomSnapshot.roomId === note.roomId ? note.roomSnapshot : null;
  const summary = room || (snapshot && typeof snapshot.name === 'string' ? {
    roomId: note.roomId,
    name: snapshot.name,
    sampleCount: Number(snapshot.sampleCount) || 0,
    memberCount: Number(snapshot.memberCount) || 0
  } : null);
  if (!summary) return { ...base, roomName: '酒局记录已不在本机', roomFacts: '原酒局信息不可用' };
  const sample = room ? storage.getSamples(note.roomId).find(row => row.sampleId === note.sampleId) : null;
  return {
    ...base,
    hasRoom: true,
    roomName: summary.name,
    roomFacts: summary.sampleCount + ' 款酒样 · ' + summary.memberCount + ' 人同席' + (room ? '' : ' · 本机存档'),
    sampleLabel: sampleLabel(sample) || (note.sampleLabel || ''),
    roomUrl: room ? (room.status === 'revealed' ? '/packages/blind/pages/reveal/reveal?roomId=' : '/packages/blind/pages/room/room?roomId=') + room.roomId : ''
  };
}

module.exports = { cleanRoomName, getMyRooms, getRoomOptions, presentNote };
