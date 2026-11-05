const test = require('node:test');
const assert = require('node:assert/strict');

test('expired Bearer token returns to re-login state and never replays a profile write', async () => {
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const token = encode({ alg: 'none' }) + '.' + encode({ exp: Math.floor(Date.now() / 1000) - 30 }) + '.test';
  const values = {
    mz_welink_session: { baseUrl: 'https://applet.51welink.com', openid: 'expired_test_user', accessToken: token, cookie: 'token=' + token }
  };
  let requests = 0;
  global.wx = {
    getStorageSync: key => values[key], setStorageSync: (key, value) => { values[key] = value; },
    removeStorageSync: key => { delete values[key]; }, request() { requests++; }
  };
  global.getApp = () => ({ globalData: {} });
  const config = require('../miniprogram/config');
  config.IDENTITY_PROVIDER = 'welink';
  const storage = require('../miniprogram/services/storage');
  const identity = require('../miniprogram/services/identity');
  storage.setCurrentUser({ userId: 'local_user', nickname: '本机昵称', avatar: '🍶', loginState: 'wechat', welinkOpenid: 'expired_test_user' });
  assert.equal(identity.isLoggedIn(), false);
  assert.equal(storage.getCurrentUser().loginState, 'guest');
  const saved = await identity.saveProfile({ nickname: '本机新昵称' });
  assert.equal(saved.cloudSynced, false);
  assert.equal(requests, 0);
});
