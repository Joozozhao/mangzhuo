const test = require('node:test');
const assert = require('node:assert/strict');

test('WeLink identity restores remote profile and saves avatar/nickname without replacing local tasting userId', async () => {
  const local = {};
  const calls = [];
  global.getApp = () => ({ globalData: {} });
  global.wx = {
    getStorageSync: key => local[key],
    setStorageSync: (key, value) => { local[key] = value; },
    removeStorageSync: key => { delete local[key]; },
    login({ success }) { success({ code: 'isolated_wx_code' }); },
    request(options) {
      calls.push(options);
      if (options.url.endsWith('/wxLogin')) return options.success({ statusCode: 200, data: {
        code: '00000', data: { accessToken: 'isolated_token', openId: 'isolated_openid', userId: 37 }
      } });
      if (options.url.endsWith('/isolated_openid/get')) return options.success({ statusCode: 200, data: {
        code: '00000', data: { id: 37, openId: 'isolated_openid', nickName: '服务端昵称', headerUrl: 'https://cdn.example.test/original.png', sex: 0 }
      } });
      if (options.url.endsWith('/updateNick')) return options.success({ statusCode: 200, data: { code: '00000', data: '成功' } });
      throw new Error('Unexpected isolated request: ' + options.url);
    },
    uploadFile(options) {
      calls.push(options);
      options.success({ statusCode: 200, data: JSON.stringify({ code: '00000', data: 'https://cdn.example.test/uploaded.png' }) });
    }
  };
  const config = require('../miniprogram/config');
  config.IDENTITY_PROVIDER = 'welink';
  const storage = require('../miniprogram/services/storage');
  const identity = require('../miniprogram/services/identity');
  const client = require('../miniprogram/services/welinkClient');
  client.clearSession();
  storage.setCurrentUser({ userId: 'local_stable_user', nickname: '本机旧名', avatar: '🍶', loginState: 'guest' });

  const login = await identity.loginWithWeChat();
  assert.equal(login.ok, true);
  assert.equal(login.profileSynced, true);
  assert.equal(login.user.userId, 'local_stable_user');
  assert.equal(login.user.welinkUserId, 37);
  assert.equal(login.user.nickname, '服务端昵称');
  assert.equal(login.user.avatar, 'https://cdn.example.test/original.png');

  const saved = await identity.saveProfile({ nickname: '主动修改的昵称', avatarTempPath: 'wxfile://chosen.png' });
  assert.equal(saved.ok, true);
  assert.equal(saved.cloudSynced, true);
  assert.equal(saved.avatarCloudSynced, true);
  assert.equal(saved.avatarLocalOnly, false);
  assert.equal(saved.user.userId, 'local_stable_user');
  assert.equal(saved.user.avatar, 'https://cdn.example.test/uploaded.png');
  assert(calls.some(c => c.url && c.url.endsWith('/uploadWxUrl') && c.formData.openid === 'isolated_openid'));
  assert(calls.some(c => c.url && c.url.endsWith('/updateNick') && c.data.nickname === '主动修改的昵称'));
});
