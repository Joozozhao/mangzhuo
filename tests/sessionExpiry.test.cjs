const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');

function jwt(exp) {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  return encode({ alg: 'none' }) + '.' + encode({ exp, name: '品鉴客' }) + '.test';
}

function fixture() {
  const values = {
    mz_current_user: {
      userId: 'stable_local_user', nickname: '原昵称', avatar: '🍶', profileCompleted: true,
      loginState: 'wechat', welinkOpenid: 'remembered_user', welinkBaseUrl: 'https://applet.51welink.com'
    },
    mz_welink_session: {
      baseUrl: 'https://applet.51welink.com', openid: 'remembered_user',
      accessToken: jwt(Math.floor(Date.now() / 1000) - 30)
    }
  };
  const requests = [];
  let loginCalls = 0;
  let profileCalls = 0;
  const freshToken = jwt(Math.floor(Date.now() / 1000) + 3600);
  global.getApp = () => ({ globalData: {} });
  global.wx = {
    getStorageSync: key => values[key],
    setStorageSync: (key, value) => { values[key] = value; },
    removeStorageSync: key => { delete values[key]; },
    getUserProfile() { profileCalls++; throw new Error('续期不能再次索取微信头像昵称授权'); },
    login({ success }) { loginCalls++; success({ code: 'fresh_code' }); },
    request(options) {
      requests.push(options);
      if (options.url.endsWith('/wxLogin')) {
        options.success({ statusCode: 200, data: { code: '00000', data: {
          openId: 'remembered_user', accessToken: freshToken
        } } });
      } else {
        options.success({ statusCode: 200, data: { code: '00000', data: [], count: 0 } });
      }
    }
  };
  for (const file of ['welinkClient', 'identity']) {
    delete require.cache[require.resolve('../miniprogram/services/' + file)];
  }
  const config = require('../miniprogram/config');
  config.IDENTITY_PROVIDER = 'welink';
  const client = require('../miniprogram/services/welinkClient');
  const identity = require('../miniprogram/services/identity');
  identity.bootstrap();
  return { values, requests, client, identity, freshToken, loginCalls: () => loginCalls, profileCalls: () => profileCalls };
}

test('expired token clears only credentials; identity and profile survive save and module reload', async () => {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const expiredToken = encode({ alg: 'none' }) + '.' + encode({ exp: Math.floor(Date.now() / 1000) - 30 }) + '.test';
  const values = {
    mz_welink_session: {
      baseUrl: 'https://applet.51welink.com',
      openid: 'persisted_user',
      accessToken: expiredToken,
      cookie: 'token=' + expiredToken
    }
  };
  let requests = 0;
  global.wx = {
    getStorageSync: key => values[key],
    setStorageSync: (key, value) => { values[key] = value; },
    removeStorageSync: key => { delete values[key]; },
    login({ fail }) { fail({ errMsg: 'network offline' }); },
    request() { requests++; }
  };
  global.getApp = () => ({ globalData: {} });

  const config = require('../miniprogram/config');
  config.IDENTITY_PROVIDER = 'welink';
  const storage = require('../miniprogram/services/storage');
  const client = require('../miniprogram/services/welinkClient');
  const identity = require('../miniprogram/services/identity');
  storage.setCurrentUser({
    userId: 'local_user',
    nickname: '本机昵称',
    avatar: '🍶',
    loginState: 'wechat',
    welinkOpenid: 'persisted_user'
  });

  // Reading login state must not validate or discard the persisted identity.
  assert.equal(identity.isLoggedIn(), true);
  assert.equal(storage.getCurrentUser().loginState, 'wechat');
  assert.equal(values.mz_welink_session.accessToken, expiredToken);

  // Credential expiry clears only mz_welink_session, not mz_current_user.
  assert.equal(client.hasValidSession(), false);
  assert.equal(values.mz_welink_session, undefined);
  assert.equal(storage.getCurrentUser().loginState, 'wechat');
  assert.equal(storage.getCurrentUser().welinkOpenid, 'persisted_user');
  assert.equal(identity.isLoggedIn(), true);

  // When renewal is offline, local save and the remembered identity remain available.
  const saved = await identity.saveProfile({ nickname: '本机新昵称' });
  assert.equal(saved.cloudSynced, false);
  assert.equal(requests, 0);
  assert.equal(storage.getCurrentUser().nickname, '本机新昵称');
  assert.equal(storage.getCurrentUser().loginState, 'wechat');

  // Simulate an application restart with an expired saved session, not a fresh token.
  values.mz_welink_session = {
    baseUrl: 'https://applet.51welink.com',
    openid: 'persisted_user',
    accessToken: expiredToken,
    cookie: 'token=' + expiredToken
  };
  delete require.cache[require.resolve('../miniprogram/services/welinkClient')];
  delete require.cache[require.resolve('../miniprogram/services/identity')];
  const reloadedClient = require('../miniprogram/services/welinkClient');
  const reloadedIdentity = require('../miniprogram/services/identity');
  assert.equal(reloadedClient.getSession().openid, 'persisted_user');
  assert.equal(reloadedClient.hasValidSession(), false);
  assert.equal(reloadedIdentity.isLoggedIn(), true);
  assert.equal(storage.getCurrentUser().nickname, '本机新昵称');
});

test('expired credentials renew once for concurrent requests, and each business request sends once', async () => {
  const f = fixture();
  const request = global.wx.request;
  global.wx.request = options => {
    if (options.url.endsWith('/wxLogin')) queueMicrotask(() => request(options));
    else request(options);
  };
  const list = f.client.getTasteList();
  const write = f.client.closeTaste(12);
  await Promise.all([list, write]);
  assert.equal(f.loginCalls(), 1);
  assert.equal(f.profileCalls(), 0);
  assert.equal(f.requests.filter(r => r.url.endsWith('/wxLogin')).length, 1);
  assert.equal(f.requests.filter(r => r.url.includes('/tastes?')).length, 1);
  assert.equal(f.requests.filter(r => r.url.endsWith('/12/close')).length, 1);
  for (const request of f.requests.filter(r => !r.url.endsWith('/wxLogin'))) {
    assert.equal(request.header.Authorization, 'Bearer ' + f.freshToken);
  }
  assert.equal(f.identity.isLoggedIn(), true);
  assert.equal(f.values.mz_current_user.userId, 'stable_local_user');
  assert.equal(f.values.mz_current_user.nickname, '原昵称');
});

test('saving a nickname after expiry renews credentials and synchronizes once', async () => {
  const f = fixture();
  const saved = await f.identity.saveProfile({ nickname: '新昵称' });
  assert.equal(saved.ok, true);
  assert.equal(saved.cloudSynced, true);
  assert.equal(f.loginCalls(), 1);
  const updates = f.requests.filter(r => r.url.endsWith('/updateNick'));
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0].data, { openid: 'remembered_user', nickname: '新昵称' });
  assert.equal(f.values.mz_current_user.nickname, '新昵称');
});

test('failed renewal preserves the identity and never sends the pending write', async () => {
  for (const failure of ['wx-login', 'network', 'server']) {
    const f = fixture();
    const login = global.wx.login;
    const request = global.wx.request;
    if (failure === 'wx-login') global.wx.login = ({ fail }) => fail({ errMsg: 'login:fail network' });
    else global.wx.request = options => {
      f.requests.push(options);
      if (failure === 'network') options.fail({ errMsg: 'request:fail timeout' });
      else options.success({ statusCode: 503, data: { msg: 'temporarily unavailable' } });
    };
    await assert.rejects(f.client.closeTaste(12));
    assert.equal(f.requests.filter(r => r.url.endsWith('/12/close')).length, 0);
    assert.equal(f.identity.isLoggedIn(), true);
    assert.equal(f.values.mz_current_user.nickname, '原昵称');
    assert.equal(f.client.hasValidSession(), false);
    global.wx.login = login;
    global.wx.request = request;
    await f.client.closeTaste(12);
    assert.equal(f.requests.filter(r => r.url.endsWith('/12/close')).length, 1);
    assert.equal(f.profileCalls(), 0);
  }
});

test('logout during renewal discards the response without restoring the user or sending a write', async () => {
  const f = fixture();
  let reply;
  global.wx.request = options => { reply = options.success; f.requests.push(options); };
  const pending = f.client.closeTaste(12);
  await f.identity.logoutWithWeChat();
  reply({ statusCode: 200, data: { code: '00000', data: { openId: 'remembered_user', accessToken: f.freshToken } } });
  await assert.rejects(pending, error => error.code === 'STALE_SESSION');
  assert.equal(f.identity.isLoggedIn(), false);
  assert.equal(f.client.hasValidSession(), false);
  assert.equal(f.requests.length, 1);
});

test('renewal cannot silently switch WeChat accounts or replay a rejected write', async () => {
  let f = fixture();
  global.wx.request = options => {
    f.requests.push(options);
    options.success({ statusCode: 200, data: { code: '00000', data: { openId: 'another_user', accessToken: f.freshToken } } });
  };
  await assert.rejects(f.client.closeTaste(12), /微信账号已变化/);
  assert.equal(f.requests.length, 1);
  assert.equal(f.identity.isLoggedIn(), false);

  f = fixture();
  const request = global.wx.request;
  global.wx.request = options => {
    if (options.url.endsWith('/wxLogin')) return request(options);
    f.requests.push(options);
    options.success({ statusCode: 401, data: { code: 401, msg: 'revoked' } });
  };
  await assert.rejects(f.client.closeTaste(12), error => error.statusCode === 401);
  assert.equal(f.loginCalls(), 1);
  assert.equal(f.requests.filter(r => r.url.endsWith('/12/close')).length, 1);
  assert.equal(f.client.hasValidSession(), false);
});

test('guests and identities bound to another backend never renew automatically', async () => {
  for (const patch of [{ loginState: 'guest', welinkOpenid: '' }, { welinkBaseUrl: 'https://another.example.test' }]) {
    const f = fixture();
    Object.assign(f.values.mz_current_user, patch);
    await assert.rejects(f.client.closeTaste(12), error => error.code === 401);
    assert.equal(f.loginCalls(), 0);
    assert.equal(f.requests.length, 0);
  }
});

test('mini program JWT expiry parsing works without Node Buffer or TextDecoder', () => {
  const f = fixture();
  const file = require.resolve('../miniprogram/services/welinkClient');
  const wxStub = Object.assign({}, global.wx, {
    base64ToArrayBuffer: value => Uint8Array.from(Buffer.from(value, 'base64')).buffer
  });
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { module, exports: module.exports, require: createRequire(file), wx: wxStub, console });
  assert.equal(module.exports.hasValidSession(), false);
  assert.equal(f.values.mz_welink_session, undefined);
  assert.equal(f.identity.isLoggedIn(), true);
});

test('a restored accessToken without a legacy cookie still sends the Bearer header', async () => {
  const f = fixture();
  f.values.mz_welink_session.accessToken = f.freshToken;
  await f.client.getTasteList();
  assert.equal(f.loginCalls(), 0);
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].header.Authorization, 'Bearer ' + f.freshToken);
  assert.equal(f.requests[0].header.Cookie, undefined);
});

test('a forbidden online feature reports its error without logging out the remembered identity', async () => {
  const f = fixture();
  f.values.mz_welink_session.accessToken = f.freshToken;
  global.wx.request = options => {
    f.requests.push(options);
    options.success({ statusCode: 403, data: '<html>Forbidden</html>' });
  };
  await assert.rejects(f.client.getTasteList(), error => error.statusCode === 403 && /暂时无法访问/.test(error.message));
  assert.equal(f.identity.isLoggedIn(), true);
  assert.equal(f.client.hasValidSession(), true);
  assert.equal(f.values.mz_current_user.welinkOpenid, 'remembered_user');
  assert.equal(f.loginCalls(), 0);
  assert.equal(f.requests.length, 1);
});
