const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const memberLevel = require('../miniprogram/services/memberLevel');

const source = fs.readFileSync(path.join(__dirname, '../miniprogram/pages/member-level/member-level.js'), 'utf8');

function loadPage(initialStats = { roomCount: 0, totalScore: 0 }) {
  let page;
  let stats = initialStats;
  const calls = { scrolls: [], tabs: [], users: [] };
  const wx = {
    pageScrollTo(options) { calls.scrolls.push(structuredClone(options)); },
    switchTab(options) { calls.tabs.push(structuredClone(options)); },
    request() { throw new Error('No network requests are allowed in this guide'); },
    login() { throw new Error('Viewing the guide must not require login'); },
    setStorageSync() { throw new Error('The guide must not write tasting records'); }
  };
  vm.runInNewContext(source, {
    Page(definition) { page = definition; }, wx,
    require(name) {
      if (name === '../../services/storage') return { getCurrentUser: () => ({ userId: 'local-user' }) };
      if (name === '../../services/memberLevel') return {
        LEVELS: memberLevel.LEVELS,
        getUserMemberLevel(userId) {
          calls.users.push(userId);
          return memberLevel.calculateMemberLevel(stats);
        }
      };
      throw new Error('Unexpected dependency: ' + name);
    }
  });
  page.setData = function (patch, callback) {
    Object.assign(this.data, patch);
    if (callback) callback();
  };
  return { page, calls, setStats(value) { stats = value; } };
}

test('the guide starts at the first tier and presents nine canonical thresholds in three chapters', () => {
  const { page, calls } = loadPage();
  page.onShow();
  assert.equal(page.data.current.title, '问泉客');
  assert.equal(page.data.next.title, '寻芳友');
  assert.equal(page.data.roomProgress, 0);
  assert.equal(page.data.scoreProgress, 0);
  assert.equal(page.data.levels.length, 9);
  assert.equal(page.data.chapters.length, 3);
  const inChapters = page.data.chapters.flatMap(chapter => chapter.levels);
  for (const [index, row] of page.data.levels.entries()) {
    const canonical = memberLevel.LEVELS[index];
    assert.equal(row.title, canonical.title);
    assert.equal(row.minRooms, canonical.minRooms);
    assert.equal(row.minScore, canonical.minScore);
    assert.equal(row.poem, canonical.poem);
    assert.ok(row.story.length > 15);
    assert.equal(inChapters[index], row);
    assert.equal(row.state, index === 0 ? 'current' : 'future');
  }
  assert.deepEqual(calls.users, ['local-user']);
});

test('the two progress conditions stay distinct even when one is met and the other is one point short', () => {
  const { page } = loadPage({ roomCount: 5, totalScore: 999 });
  page.onShow();
  assert.equal(page.data.current.title, '寻芳友');
  assert.equal(page.data.next.title, '识味生');
  assert.equal(page.data.membership.needRooms, 0);
  assert.equal(page.data.membership.needScore, 1);
  assert.equal(page.data.roomProgress, 100);
  assert.equal(page.data.scoreProgress, 99);
  assert.equal(page.data.levels.filter(row => row.state === 'current').length, 1);
});

test('reopening refreshes personal progress and the highest tier has no fabricated next target', () => {
  const { page, setStats } = loadPage({ roomCount: 20, totalScore: 5500 });
  page.onShow();
  assert.equal(page.data.current.title, '鉴真士');
  assert.equal(page.data.scoreLabel, '5,500');
  setStats({ roomCount: 120, totalScore: 50000 });
  page.onShow();
  assert.equal(page.data.current.title, '太白真');
  assert.equal(page.data.next, null);
  assert.equal(page.data.scoreLabel, '50,000');
  assert.equal(page.data.roomProgress, 100);
  assert.equal(page.data.scoreProgress, 100);
  assert.equal(page.data.levels.filter(row => row.state === 'reached').length, 8);
});

test('overview switching, current-tier location and section links scroll to their real content', () => {
  const { page, calls } = loadPage({ roomCount: 20, totalScore: 5500 });
  page.onShow();
  page.switchView({ currentTarget: { dataset: { mode: 'overview' } } });
  assert.equal(page.data.viewMode, 'overview');
  assert.equal(calls.scrolls.at(-1).selector, '#levels');
  const count = calls.scrolls.length;
  page.switchView({ currentTarget: { dataset: { mode: 'overview' } } });
  page.switchView({ currentTarget: { dataset: { mode: 'invalid' } } });
  assert.equal(calls.scrolls.length, count);
  page.locateCurrent();
  assert.equal(page.data.viewMode, 'story');
  assert.equal(calls.scrolls.at(-1).selector, '#level-5');
  for (const section of ['journey', 'levels', 'rules']) {
    page.scrollToSection({ currentTarget: { dataset: { section } } });
    assert.equal(calls.scrolls.at(-1).selector, '#' + section);
  }
  const beforeInvalid = calls.scrolls.length;
  page.scrollToSection({ currentTarget: { dataset: { section: 'not-a-section' } } });
  assert.equal(calls.scrolls.length, beforeInvalid);
});

test('return and share open the intended routes while sharing only the public guide', () => {
  const { page, calls } = loadPage({ roomCount: 35, totalScore: 11000 });
  page.onShow();
  page.goMine();
  assert.deepEqual(calls.tabs, [{ url: '/pages/mine/mine' }]);
  const shared = page.onShareAppMessage();
  assert.equal(shared.path, '/pages/member-level/member-level');
  assert.equal(shared.path.includes('user'), false);
  assert.equal(shared.path.includes('11000'), false);
});

test('bundled calligraphy contains readable canonical titles as real SVG outlines', () => {
  const { page } = loadPage();
  page.onShow();
  const labels = [{ title: '知味九阶', titleSvg: '/assets/member-level/calligraphy/heading.svg' }]
    .concat(page.data.chapters, page.data.levels);
  assert.equal(labels.length, 13);
  for (const label of labels) {
    const svg = fs.readFileSync(path.join(__dirname, '../miniprogram', label.titleSvg), 'utf8');
    assert.match(svg, new RegExp('<title(?:\\s[^>]*)?>' + label.title + '</title>'), label.title + ' must retain its accessible name');
    assert.match(svg, /<path\s[^>]*d="[^"]+"/);
    assert.doesNotMatch(svg, /<(?:text|image|foreignObject)\b/i);
    assert.match(svg, /viewBox="[^"]+"/);
  }
});

test('a calligraphy load failure preserves the original title without changing tier progress', () => {
  const { page } = loadPage({ roomCount: 5, totalScore: 999 });
  page.onShow();
  const original = JSON.stringify(page.data.membership);
  for (const key of ['heading', 'chapter-2', 'level-2']) {
    page.onCalligraphyError({ currentTarget: { dataset: { calligraphy: key } } });
    assert.equal(page.data.calligraphyErrors[key], true);
  }
  assert.equal(Object.keys(page.data.calligraphyErrors).length, 3);
  for (const key of ['__proto__', 'level-10', 'chapter-4', '']) {
    page.onCalligraphyError({ currentTarget: { dataset: { calligraphy: key } } });
  }
  page.onCalligraphyError();
  assert.equal(Object.keys(page.data.calligraphyErrors).length, 3);
  assert.equal(page.data.current.title, '寻芳友');
  assert.equal(JSON.stringify(page.data.membership), original);
});
