const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pagePath = path.join(__dirname, '../miniprogram/pages/mine/mine.js');
const pageSource = fs.readFileSync(pagePath, 'utf8');
const plain = value => structuredClone(value);
const makeUser = (patch = {}) => ({
  userId: 'local-mine-user', nickname: '本机品鉴人', avatar: '🍶', avatarBg: '#d6b06a',
  loginState: 'guest', profileCompleted: false, ...patch
});
const signedInUser = (patch = {}) => makeUser({
  loginState: 'wechat', welinkOpenid: 'remote-openid', welinkUserId: 37, ...patch
});

function makePage({
  user = makeUser(), notes = [], members = [], sessionValid = true, hasTabBar = true,
  login = async () => ({ ok: false }), logout = async () => ({ ok: true })
} = {}) {
  let page;
  const values = { mz_current_user: user, mz_tasting_journal_v1: notes, mz_members: members };
  const writes = [], navigations = [], toasts = [], loadings = [], modals = [], tabSelections = [];
  const calls = { login: 0, logout: 0, hideLoading: 0 };
  const session = { valid: sessionValid };
  const wx = {
    getStorageSync: key => values[key],
    setStorageSync(key, value) { writes.push({ key, value }); values[key] = value; },
    navigateTo({ url }) { navigations.push({ type: 'navigateTo', url }); },
    switchTab({ url }) { navigations.push({ type: 'switchTab', url }); },
    showToast(options) { toasts.push(plain(options)); },
    showLoading(options) { loadings.push(plain(options)); },
    hideLoading() { calls.hideLoading++; },
    showModal(options) { modals.push(options); },
    request() { throw new Error('No network is allowed in Mine tests'); },
    login() { throw new Error('No real authentication is allowed in Mine tests'); }
  };
  function loadService(name, dependencies = {}) {
    const filename = path.join(__dirname, '../miniprogram/services', name + '.js');
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
      module, wx, console,
      require(name) {
        if (Object.hasOwn(dependencies, name)) return dependencies[name];
        throw new Error('Unexpected dependency: ' + name);
      }
    }, { filename });
    return module.exports;
  }
  // Real readers and identity predicates, isolated from device storage and authentication.
  const storage = loadService('storage');
  const journal = loadService('journal');
  const identity = loadService('identity', {
    './storage': storage,
    './cloudDb': { initCloud: () => false },
    './welinkClient': { addSessionListener() {}, hasValidSession: () => session.valid },
    '../config': { IDENTITY_PROVIDER: 'welink' }
  });
  identity.loginWithWeChat = () => { calls.login++; return login({ values, session }); };
  identity.logoutWithWeChat = () => { calls.logout++; return logout({ values, session }); };
  identity.saveProfile = async (opts) => {
    calls.saveProfile = (calls.saveProfile || 0) + 1;
    const cur = values.mz_current_user || makeUser();
    const next = {
      ...cur,
      nickname: opts.nickname || cur.nickname,
      avatar: opts.avatarTempPath || cur.avatar,
      profileCompleted: true
    };
    values.mz_current_user = next;
    return { ok: true, user: next, cloudSynced: true };
  };
  vm.runInNewContext(pageSource, {
    Page(definition) { page = definition; }, wx,
    require(name) {
      const dependencies = {
        '../../services/storage': storage,
        '../../services/journal': journal,
        '../../services/identity': identity
      };
      if (Object.hasOwn(dependencies, name)) return dependencies[name];
      throw new Error('Unexpected dependency: ' + name);
    }
  }, { filename: pagePath });
  page.data = plain(page.data);
  page.setData = function (patch) { Object.assign(this.data, patch); };
  if (hasTabBar) page.getTabBar = () => ({ setData: patch => tabSelections.push(plain(patch)) });
  return { page, values, writes, navigations, toasts, loadings, modals, tabSelections, calls, session };
}

test('Mine starts idle and loads an empty local archive without authentication', () => {
  const { page, tabSelections, writes, calls } = makePage();
  assert.equal(page.data.registering, false);
  assert.equal(page.data.user, null);
  assert.deepEqual(page.data.notes, []);
  page.onShow();
  assert.equal(page.data.count, 0);
  assert.equal(page.data.roomCount, 0);
  assert.equal(page.data.aromaCount, 0);
  assert.equal(page.data.notes.length, 0);
  assert.deepEqual(tabSelections, [{ selected: 3 }]);
  assert.equal(calls.login, 0);
  assert.deepEqual(writes, []);
});

test('counts include every local note, distinct current-user rooms and only judged aroma exclusions', () => {
  const user = signedInUser({ nickname: '保存的昵称', avatar: 'wxfile://saved.jpg', profileCompleted: true });
  const notes = ['酱香型', '酱香型', '浓香型', undefined, null, '', '暂不判断', '其他', '其它', '自定义香型', '暂不判断 ']
    .map((aromaType, index) => ({ id: index < 2 ? 'duplicate-id' : 'note-' + index, userId: 'another-user', aromaType }));
  const members = [
    { userId: user.userId, roomId: 'room-a' }, { userId: user.userId, roomId: 'room-a' },
    { userId: user.userId, roomId: 'room-b' }, { userId: 'another-user', roomId: 'room-c' },
    { userId: user.welinkUserId, roomId: 'remote-id-room' }, { userId: 'user_master', roomId: 'demo-room' }
  ];
  const { page, values, writes } = makePage({ user, notes, members });
  page.onShow();
  assert.equal(page.data.user, user);
  assert.equal(page.data.user.nickname, '保存的昵称');
  assert.equal(page.data.user.welinkUserId, 37);
  assert.equal(page.data.count, 11);
  assert.equal(page.data.notes.length, 11);
  assert.equal(page.data.roomCount, 2);
  assert.equal(page.data.aromaCount, 5);
  assert.equal(values.mz_tasting_journal_v1, notes);
  assert.deepEqual(writes, []);
});

test('presentation copies preserve all original note data and never mutate the journal on repeated shows', () => {
  const notes = Object.freeze([
    Object.freeze({ id: 'kept', date: '2026.11.09', title: '原始酒名', aromaType: '清香型', score: 8.5,
      tasting: Object.freeze({ comment: '保留手记', tags: Object.freeze(['净爽']) }) }),
    Object.freeze({ id: 'unknown', date: '日期待考', title: '旧手记', customField: '保留附加信息' })
  ]);
  const before = plain(notes);
  const { page, values, writes } = makePage({ notes });
  page.onShow();
  const firstView = page.data.notes;
  page.onShow();
  assert.notEqual(page.data.notes, notes);
  assert.notEqual(page.data.notes, firstView);
  for (const [index, raw] of notes.entries()) {
    const displayed = page.data.notes[index];
    assert.notEqual(displayed, raw);
    for (const key of Object.keys(raw)) assert.deepEqual(plain(displayed[key]), plain(raw[key]), key);
    assert.equal(typeof displayed.dateMonthDay, 'string');
    assert.equal(typeof displayed.dateYear, 'string');
    assert.equal(displayed.dateLabel, raw.date);
  }
  assert.equal(page.data.notes[0].dateMonthDay, '11.09');
  assert.equal(page.data.notes[0].dateYear, '2026');
  assert.equal(values.mz_tasting_journal_v1, notes);
  assert.deepEqual(plain(notes), before);
  assert.deepEqual(writes, []);
});

test('calendar dates retain their actual label and split valid years, leap days and consistent separators', () => {
  const cases = [
    ['2026.11.09', '11.09', '2026'], ['2024.02.29', '02.29', '2024'],
    ['2000.02.29', '02.29', '2000'], ['2400.02.29', '02.29', '2400'],
    ['0096.02.29', '02.29', '0096'], ['1900.02.28', '02.28', '1900'],
    ['0001.01.01', '01.01', '0001'], ['9999.12.31', '12.31', '9999'],
    ['2026-01-02', '01.02', '2026'], ['2024/02/29', '02.29', '2024'],
    ['2026.04.30', '04.30', '2026']
  ];
  const { page } = makePage({ notes: cases.map(([date], id) => ({ id, date })) });
  page.onShow();
  for (const [index, [date, monthDay, year]] of cases.entries()) {
    const note = page.data.notes[index];
    assert.equal(note.date, date);
    assert.equal(note.dateLabel, date);
    assert.equal(note.dateMonthDay, monthDay, date);
    assert.equal(note.dateYear, year, date);
  }
});

test('impossible dates, malformed years and mixed separators stay undated without losing the raw label', () => {
  const dates = [
    '2025.02.29', '1900.02.29', '2100.02.29', '2026.02.30', '2026.04.31',
    '2026.00.12', '2026.13.01', '2026.11.00', '2026.11.32', '0000.01.01',
    '20261.11.09', '026.11.09', '26.11.09', '-2026.11.09', '2026.1.09', '2026.11.9',
    '2026.11-09', '2026-11/09', '2026/11.09', '2026/11-09',
    '', ' ', '日期未知', '未记日期', '今天', '2026年11月09日',
    ' 2026.11.09', '2026.11.09 ', '2026.11.09\n', '2026-11-09T12:00:00Z'
  ];
  const { page } = makePage({ notes: dates.map((date, id) => ({ id, date, createdAt: 1794182400000 })) });
  page.onShow();
  for (const [index, date] of dates.entries()) {
    const note = page.data.notes[index];
    assert.equal(note.dateMonthDay, '未记日期', JSON.stringify(date));
    assert.equal(note.dateYear, '', date);
    assert.equal(note.dateLabel, date);
    assert.equal(note.date, date);
  }
  assert.equal(page.data.count, dates.length);
});

test('missing and non-string dates never infer today or a date from createdAt', () => {
  const notes = [
    { id: 'absent' },
    ...[undefined, null, 0, 20261109, false, {}, ['2026.11.09']].map((date, id) => ({ id, date }))
  ].map(note => ({ ...note, createdAt: 1794182400000 }));
  const before = plain(notes);
  const { page, writes } = makePage({ notes });
  page.onShow();
  for (const [index, raw] of notes.entries()) {
    const note = page.data.notes[index];
    assert.equal(note.dateMonthDay, '未记日期');
    assert.equal(note.dateYear, '');
    assert.equal(note.dateLabel, '');
    assert.deepEqual(note.date, raw.date);
    assert.equal(Object.hasOwn(note, 'date'), Object.hasOwn(raw, 'date'));
  }
  assert.deepEqual(notes, before);
  assert.equal(page.data.count, notes.length);
  assert.deepEqual(writes, []);
});

test('the real journal reader treats missing or invalid stored collections as an empty archive', () => {
  for (const notes of [undefined, null, {}, 'not-an-array']) {
    const { page, values, writes } = makePage({ hasTabBar: false });
    values.mz_tasting_journal_v1 = notes;
    page.onShow();
    assert.equal(page.data.notes.length, 0);
    assert.equal(page.data.count, 0);
    assert.equal(page.data.aromaCount, 0);
    assert.deepEqual(writes, []);
  }
});

test('guest, signed-in and completed-profile states stay independent and refresh from the current user', () => {
  const { page, values, session, calls } = makePage();
  for (const loggedIn of [false, true]) {
    for (const profileCompleted of [false, true]) {
      const user = loggedIn ? signedInUser({ profileCompleted }) : makeUser({ profileCompleted });
      values.mz_current_user = user;
      values.mz_members = [{ userId: user.userId, roomId: 'current-room' }];
      values.mz_tasting_journal_v1 = [{ id: 'current-note', date: '2026.11.09' }];
      page.onShow();
      assert.equal(page.data.user, user);
      assert.equal(page.data.isWechat, loggedIn);
      assert.equal(page.data.profileCompleted, profileCompleted);
      assert.equal(page.data.count, 1);
      assert.equal(page.data.roomCount, 1);
    }
  }
  session.valid = false;
  values.mz_current_user = signedInUser({ userId: 'switched-local-user', profileCompleted: true });
  values.mz_tasting_journal_v1 = [];
  page.onShow();
  assert.equal(page.data.isWechat, false);
  assert.equal(page.data.profileCompleted, true);
  assert.equal(page.data.user.userId, 'switched-local-user');
  assert.equal(page.data.roomCount, 0);
  assert.equal(page.data.count, 0);
  assert.equal(calls.login, 0);
});

test('avatar failures keep the saved identity and reset only the preview error on show', () => {
  const user = signedInUser({ avatar: 'wxfile://missing-avatar.jpg', profileCompleted: true });
  const { page, values, writes } = makePage({ user });
  page.onShow();
  assert.equal(page.data.avatarImg, true);
  page.onAvatarError();
  assert.equal(page.data.avatarLoadError, true);
  assert.equal(page.data.avatarImg, true);
  assert.equal(page.data.user, user);
  assert.equal(page.data.user.avatar, 'wxfile://missing-avatar.jpg');
  assert.equal(page.data.user.nickname, '本机品鉴人');
  page.onShow();
  assert.equal(page.data.avatarLoadError, false);
  values.mz_current_user = { ...user, avatar: '🍶' };
  page.onShow();
  assert.equal(page.data.avatarImg, false);
  assert.equal(page.data.profileCompleted, true);
  assert.deepEqual(writes, []);
});

test('archive actions and sharing keep their original destinations and payloads', () => {
  const { page, navigations } = makePage();
  page.openNote({ currentTarget: { dataset: { id: 'note_123' } }, target: { dataset: { id: 'wrong' } } });
  page.checkin();
  page.rooms();
  page.goAbout();
  page.editProfile();
  assert.deepEqual(navigations, [
    { type: 'navigateTo', url: '/pages/card/card?id=note_123' },
    { type: 'navigateTo', url: '/pages/checkin/checkin' },
    { type: 'switchTab', url: '/pages/gather/gather' },
    { type: 'navigateTo', url: '/pages/about/about' },
    { type: 'navigateTo', url: '/pages/profile/profile' }
  ]);
  assert.deepEqual(plain(page.onShareAppMessage()), {
    title: '盲酌 · 去掉酒标，只凭味道', path: '/pages/index/index', imageUrl: '/assets/brand/libai-home.png'
  });
});

test('registration stays busy across shows and double clicks, then refreshes identity and notes on success', async () => {
  let resolveLogin;
  const pending = new Promise(resolve => { resolveLogin = resolve; });
  const { page, values, calls, loadings, toasts, navigations } = makePage({ login: () => pending });
  page.onShow();
  const firstClick = page.register();
  assert.equal(page.data.registering, true);
  assert.equal(calls.login, 1);
  page.onShow();
  assert.equal(page.data.registering, true);
  const secondClick = page.register();
  assert.equal(calls.login, 1);
  await secondClick;
  assert.deepEqual(loadings, [{ title: '正在注册登录…', mask: true }]);
  assert.equal(calls.hideLoading, 0);
  assert.deepEqual(toasts, []);
  assert.deepEqual(navigations, []);
  const user = signedInUser({ nickname: '登录后昵称', avatar: 'wxfile://login.jpg', profileCompleted: true });
  values.mz_current_user = user;
  values.mz_tasting_journal_v1 = [{ id: 'new-note', date: '2024.02.29' }];
  resolveLogin({ ok: true });
  await firstClick;
  assert.equal(page.data.registering, false);
  assert.equal(calls.hideLoading, 1);
  assert.equal(page.data.user, user);
  assert.equal(page.data.isWechat, true);
  assert.equal(page.data.profileCompleted, true);
  assert.equal(page.data.avatarImg, true);
  assert.equal(page.data.count, 1);
  assert.equal(page.data.notes[0].dateMonthDay, '02.29');
  assert.deepEqual(toasts, [{ title: '注册登录成功', icon: 'success' }]);
  assert.deepEqual(navigations, []);
});

test('unsuccessful, rejected and thrown registrations reset busy state, fall back to profile and allow retry', async () => {
  const failures = [
    () => Promise.resolve({ ok: false }),
    () => Promise.reject(new Error('stubbed login failure')),
    () => { throw new Error('stubbed synchronous failure'); }
  ];
  for (const fail of failures) {
    let shouldFail = true;
    const user = makeUser({ profileCompleted: true });
    const { page, values, calls, toasts, navigations, loadings, writes } = makePage({
      user,
      login({ values }) {
        if (shouldFail) return fail();
        values.mz_current_user = signedInUser({ profileCompleted: true });
        return Promise.resolve({ ok: true });
      }
    });
    page.onShow();
    await page.register();
    assert.equal(page.data.registering, false);
    assert.equal(calls.login, 1);
    assert.equal(calls.hideLoading, 1);
    assert.equal(page.data.isWechat, false);
    assert.equal(page.data.profileCompleted, true);
    assert.equal(values.mz_current_user, user);
    assert.deepEqual(navigations, [{ type: 'navigateTo', url: '/pages/profile/profile' }]);
    assert.deepEqual(toasts, []);
    assert.deepEqual(writes, []);
    shouldFail = false;
    await page.register();
    assert.equal(calls.login, 2);
    assert.equal(calls.hideLoading, 2);
    assert.equal(loadings.length, 2);
    assert.equal(page.data.registering, false);
    assert.equal(page.data.isWechat, true);
    assert.deepEqual(toasts, [{ title: '注册登录成功', icon: 'success' }]);
  }
});

test('signed-in users skip registration even with an incomplete profile and edit it only explicitly', async () => {
  const { page, calls, loadings, navigations } = makePage({ user: signedInUser() });
  page.onShow();
  assert.equal(page.data.isWechat, true);
  assert.equal(page.data.profileCompleted, false);
  await page.register();
  assert.equal(calls.login, 0);
  assert.equal(calls.hideLoading, 0);
  assert.equal(page.data.registering, false);
  assert.deepEqual(loadings, []);
  assert.deepEqual(navigations, []);
  page.editProfile();
  assert.deepEqual(navigations, [{ type: 'navigateTo', url: '/pages/profile/profile' }]);
});

test('cancelling logout leaves identity, local records and the displayed archive untouched', async () => {
  const notes = [{ id: 'kept-note', date: '2026.11.09', title: '保留手记' }];
  const members = [{ userId: 'local-mine-user', roomId: 'kept-room' }];
  const { page, values, calls, modals, loadings, toasts, writes } = makePage({ user: signedInUser(), notes, members });
  values.mz_rooms = [{ roomId: 'kept-room', name: '保留酒局' }];
  page.onShow();
  const before = plain(values);
  const displayBefore = plain(page.data);
  page.logout();
  assert.equal(modals.length, 1);
  assert.equal(modals[0].title, '退出微信登录');
  assert.equal(modals[0].content, '退出后在线品鉴将不可用，本机手记与酒卡不受影响。');
  await modals[0].success({ confirm: false, cancel: true });
  assert.equal(calls.logout, 0);
  assert.deepEqual(values, before);
  assert.deepEqual(plain(page.data), displayBefore);
  assert.deepEqual(loadings, []);
  assert.deepEqual(toasts, []);
  assert.deepEqual(writes, []);
});

test('confirmed logout keeps the existing refresh and toast flow even when the auth stub rejects', async () => {
  for (const rejects of [false, true]) {
    const notes = [{ id: 'kept-note', date: '2026.11.09' }];
    const { page, values, calls, modals, loadings, toasts, writes } = makePage({
      user: signedInUser({ profileCompleted: true }), notes,
      logout: async ({ values }) => {
        values.mz_current_user = { ...values.mz_current_user, loginState: 'guest', welinkOpenid: '' };
        if (rejects) throw new Error('stubbed logout failure');
        return { ok: true };
      }
    });
    page.onShow();
    page.logout();
    await modals[0].success({ confirm: true });
    assert.equal(calls.logout, 1);
    assert.equal(calls.hideLoading, 1);
    assert.equal(page.data.isWechat, false);
    assert.equal(page.data.profileCompleted, true);
    assert.equal(page.data.count, 1);
    assert.equal(values.mz_tasting_journal_v1, notes);
    assert.deepEqual(loadings, [{ title: '正在退出', mask: true }]);
    assert.deepEqual(toasts, [{ title: '已退出登录', icon: 'none' }]);
    assert.deepEqual(writes, []);
  }
});

test('logged-in stub displays avatar + nickname and clicking opens the profile edit modal', async () => {
  const user = signedInUser({ nickname: '李白品酒', avatar: 'wxfile://libai.jpg', profileCompleted: true });
  const { page, calls, toasts } = makePage({ user });
  page.onShow();
  assert.equal(page.data.isWechat, true);
  assert.equal(page.data.displayNickname, '李白品酒');
  assert.equal(page.data.showProfileModal, false);

  // Click avatar on stub
  page.openAvatarModal();
  assert.equal(page.data.showProfileModal, true);
  assert.equal(page.data.modalFocusField, 'avatar');
  assert.equal(page.data.modalNickname, '李白品酒');

  // Click nickname on stub
  page.openNicknameModal();
  assert.equal(page.data.showProfileModal, true);
  assert.equal(page.data.modalFocusField, 'nickname');

  // Modify nickname and save in modal
  page.onModalNicknameInput({ detail: { value: '青莲居士' } });
  await page.saveProfileModal();
  assert.equal(calls.saveProfile, 1);
  assert.equal(page.data.showProfileModal, false);
  assert.equal(page.data.displayNickname, '青莲居士');
  assert.deepEqual(toasts, [{ title: '资料已更新', icon: 'success' }]);
});
