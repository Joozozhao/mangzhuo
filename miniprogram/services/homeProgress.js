const storage = require('./storage');
const scoring = require('../utils/scoring');
const memberLevel = require('./memberLevel');

const SETUP_URL = '/packages/blind/pages/setup/setup?roomId=';
const ROOM_URL = '/packages/blind/pages/room/room?roomId=';
const REVEAL_URL = '/packages/blind/pages/reveal/reveal?roomId=';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function hasId(value) {
  return value !== undefined && value !== null && value !== '';
}

function cleanRoomTitle(room) {
  const name = typeof room.name === 'string' && room.name.trim()
    ? room.name
    : (typeof room.title === 'string' ? room.title : '');
  const cleaned = name.replace(
    /\s*(?:\((?:进行中|已揭晓|已开奖|品评结束)\)|（(?:进行中|已揭晓|已开奖|品评结束)）)\s*$/,
    ''
  ).trim();
  return cleaned || name.trim() || '未命名酒局';
}

function countDistinctMembers(members) {
  const userIds = new Set();
  members.forEach(member => {
    if (member && hasId(member.userId)) userIds.add(member.userId);
  });
  return userIds.size;
}

function toTimestamp(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value !== 'string' || !value.trim()) return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resultSortTime(room) {
  const revealTime = toTimestamp(room.revealAt);
  const time = revealTime === null ? toTimestamp(room.createdAt) : revealTime;
  return time === null ? 0 : time;
}

function buildActiveRoom(context, userId) {
  const { room, samples, members } = context;
  const ratings = samples.length
    ? asArray(storage.getRatings(room.roomId, userId))
    : [];
  const ratedSampleIds = new Set(ratings.map(rating => rating && rating.sampleId));
  const answeredCount = samples.reduce((count, sample) => {
    return count + (sample && hasId(sample.sampleId) && ratedSampleIds.has(sample.sampleId) ? 1 : 0);
  }, 0);

  let stage = 'waiting';
  let actionLabel = '回酒局等揭晓';
  if (samples.length === 0) {
    stage = 'noSamples';
    actionLabel = '继续布置酒样';
  } else if (answeredCount < samples.length) {
    stage = 'tasting';
    actionLabel = '继续品鉴';
  }

  return {
    roomId: room.roomId,
    title: cleanRoomTitle(room),
    sampleCount: samples.length,
    memberCount: countDistinctMembers(members),
    answeredCount,
    stage,
    actionLabel,
    url: (samples.length === 0 ? SETUP_URL : ROOM_URL) + room.roomId
  };
}

function buildLatestResult(context, userId) {
  const { room, samples, members } = context;
  const guesses = asArray(storage.getGuesses(room.roomId, userId));
  const score = samples.reduce((total, sample) => {
    if (!sample || !hasId(sample.sampleId)) return total;
    const guess = guesses.find(item => item && item.sampleId === sample.sampleId);
    if (!guess) return total;
    const result = scoring.calculateGuessScore(sample, guess);
    return result && Number.isFinite(result.totalScore) ? total + result.totalScore : total;
  }, 0);

  return {
    roomId: room.roomId,
    title: cleanRoomTitle(room),
    score,
    sampleCount: samples.length,
    memberCount: countDistinctMembers(members),
    url: REVEAL_URL + room.roomId
  };
}

function getHomeOverview(userId) {
  const membership = memberLevel.getUserMemberLevel(userId);
  const contexts = [];

  if (hasId(userId)) {
    asArray(storage.getRooms()).forEach(room => {
      if (!room || !hasId(room.roomId) || /^room_demo_/.test(room.roomId)) return;
      const members = asArray(storage.getMembers(room.roomId));
      const isParticipant = room.ownerId === userId ||
        members.some(member => member && member.userId === userId);
      if (!isParticipant) return;
      contexts.push({
        room,
        members,
        samples: asArray(storage.getSamples(room.roomId))
      });
    });
  }

  const activeRooms = contexts
    .filter(context => context.room.status === 'playing')
    .map(context => buildActiveRoom(context, userId));
  const active = activeRooms.length === 0
    ? null
    : (activeRooms.length === 1
      ? { kind: 'single', room: activeRooms[0] }
      : { kind: 'multiple', count: activeRooms.length });

  const revealed = contexts
    .filter(context => context.room.status === 'revealed')
    .sort((a, b) => {
      const aTime = resultSortTime(a.room);
      const bTime = resultSortTime(b.room);
      if (aTime === bTime) return 0;
      return aTime > bTime ? -1 : 1;
    });
  const latestResult = revealed.length ? buildLatestResult(revealed[0], userId) : null;

  return { activeRooms, active, latestResult, membership };
}

module.exports = { getHomeOverview };
