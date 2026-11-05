const test = require('node:test');
const assert = require('node:assert/strict');

test('identity and session bridge test suite', async (t) => {
  const storageMap = {};
  let mockNetworkHandler = null;
  let mockCloudFunctionHandler = null;

  global.getApp = () => ({
    globalData: { userInfo: null }
  });

  global.wx = {
    getStorageSync(key) {
      return storageMap[key];
    },
    setStorageSync(key, value) {
      storageMap[key] = value;
    },
    removeStorageSync(key) {
      delete storageMap[key];
    },
    getAccountInfoSync() {
      return { miniProgram: { envVersion: 'develop' } };
    },
    login({ success }) {
      setTimeout(() => success({ code: 'mock_code' }), 10);
    },
    request(opts) {
      if (mockNetworkHandler) mockNetworkHandler(opts);
    },
    cloud: {
      callFunction(opts) {
        if (mockCloudFunctionHandler) return mockCloudFunctionHandler(opts);
        return Promise.resolve({ result: {} });
      }
    }
  };

  const config = require('../miniprogram/config');
  const storage = require('../miniprogram/services/storage');
  const welinkClient = require('../miniprogram/services/welinkClient');
  const identity = require('../miniprogram/services/identity');

  // Reset to initial clean state
  welinkClient.clearSession();
  const baseUser = {
    userId: 'user_master',
    nickname: '品鉴客 Joozo',
    avatar: '🍶',
    avatarBg: '#d6b06a'
  };
  storage.setCurrentUser(baseUser);

  await t.test('1. WeLink provider: does not use cloud identity, preserves userId & rooms/owner relationship', async () => {
    config.IDENTITY_PROVIDER = 'welink';
    welinkClient.clearSession();

    // Before login
    assert.equal(identity.isLoggedIn(), false);
    assert.equal(identity.getActiveOpenid(), '');
    assert.equal(identity.getUser().userId, 'user_master');

    // Simulate login
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        header: { 'Set-Cookie': 'JSESSIONID=WELINK_IDENT_COOKIE' },
        data: {
          code: 0,
          msg: 'ok',
          data: {
            openid: 'welink_openid_abc',
            nickname: '远程品鉴官'
          }
        }
      });
    };

    const loginRes = await identity.loginWithWeChat();
    assert.equal(loginRes.ok, true);
    assert.equal(loginRes.openid, 'welink_openid_abc');

    const currentUser = storage.getCurrentUser();
    // 关键校验：保留本地 userId，不把 welinkOpenid 覆盖进原有 openid 字段，welinkOpenid 独立存储
    assert.equal(currentUser.userId, 'user_master');
    assert.equal(currentUser.welinkOpenid, 'welink_openid_abc');
    assert.equal(currentUser.openid, undefined);
    assert.equal(currentUser.loginState, 'wechat');
    assert.equal(identity.isLoggedIn(), true);
    assert.equal(identity.getActiveOpenid(), 'welink_openid_abc');
  });

  await t.test('2. 401 Session clear event notifies identity to update loginState to guest', async () => {
    config.IDENTITY_PROVIDER = 'welink';
    assert.equal(identity.isLoggedIn(), true);

    // Trigger 401
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 401,
        data: { code: 401, msg: '会话已过期', data: null }
      });
    };

    await assert.rejects(async () => {
      await welinkClient.getTasteDetail(1);
    }, (err) => {
      assert.equal(err.statusCode, 401);
      return true;
    });

    // Session is cleared, identity listener must have reacted
    assert.equal(identity.isLoggedIn(), false);
    const currentUser = storage.getCurrentUser();
    assert.equal(currentUser.loginState, 'guest');
    assert.equal(currentUser.welinkOpenid, '');
  });

  await t.test('3. Nickname saving uses updateNick; local avatar is NOT sent to backend', async () => {
    config.IDENTITY_PROVIDER = 'welink';
    welinkClient.clearSession();

    // Re-login
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        header: { 'Set-Cookie': 'JSESSIONID=PROFILE_TEST_COOKIE' },
        data: {
          code: 0,
          msg: 'ok',
          data: { openid: 'welink_openid_xyz', nickname: '初始名' }
        }
      });
    };
    await identity.loginWithWeChat();

    let backendReceivedData = null;
    mockNetworkHandler = (opts) => {
      backendReceivedData = opts.data;
      opts.success({
        statusCode: 200,
        header: { 'Set-Cookie': 'JSESSIONID=PROFILE_UPDATED_COOKIE' },
        data: {
          code: 0,
          msg: 'ok',
          data: {
            openid: 'welink_openid_xyz',
            nickname: '前端输入昵称'
          }
        }
      });
    };

    // User has a local wxfile avatar
    const u = storage.getCurrentUser();
    u.avatar = 'wxfile://tmp_avatar_123.png';
    storage.setCurrentUser(u);

    const saveRes = await identity.saveProfile({
      nickname: '  前端输入昵称  '
    });

    assert.equal(saveRes.ok, true);
    assert.equal(saveRes.cloudSynced, true);
    assert.equal(saveRes.avatarLocalOnly, true);
    assert.equal(saveRes.avatarCloudSynced, false);

    // updateNick 提交昵称；本机 wxfile 头像路径不能发送给后台。
    assert.equal(backendReceivedData.nickname, '前端输入昵称');
    assert.equal(backendReceivedData.openid, 'welink_openid_xyz');
    assert.equal(backendReceivedData.avatarUrl, undefined);

    // Verify currentUser is updated with remote authoritative nickname
    const updatedUser = storage.getCurrentUser();
    assert.equal(updatedUser.nickname, '前端输入昵称');
  });

  await t.test('4. Cloud provider branch remains intact when IDENTITY_PROVIDER is cloud', async () => {
    config.IDENTITY_PROVIDER = 'cloud';
    welinkClient.clearSession();

    let user = storage.getCurrentUser();
    user = Object.assign({}, user, {
      openid: '',
      welinkOpenid: '',
      loginState: 'guest'
    });
    storage.setCurrentUser(user);

    assert.equal(identity.isLoggedIn(), false);
    assert.equal(identity.getIdentityProvider(), 'cloud');

    // Cloud function returns openid
    mockCloudFunctionHandler = (opts) => {
      assert.equal(opts.name, 'login');
      return Promise.resolve({
        result: {
          openid: 'wx_cloud_openid_123',
          profile: {
            nickname: '云端用户',
            avatar: 'cloud://env-id/avatar.png',
            profileUpdatedAt: Date.now()
          }
        }
      });
    };

    // Mock cloudReady = true
    global.wx.cloud.init = () => {};
    global.wx.cloud.database = () => ({});
    identity.bootstrap();
    assert.equal(identity.isCloudReady(), true);

    const res = await identity.loginWithWeChat();
    assert.equal(res.ok, true);
    assert.equal(res.openid, 'wx_cloud_openid_123');

    const cloudUser = storage.getCurrentUser();
    assert.equal(cloudUser.openid, 'wx_cloud_openid_123');
    assert.equal(Boolean(cloudUser.welinkOpenid), false);
    assert.equal(cloudUser.loginState, 'wechat');
    assert.equal(identity.isLoggedIn(), true);
    assert.equal(identity.getActiveOpenid(), 'wx_cloud_openid_123');
  });

  await t.test('5. WeLink loginWithWeChat with userProfile updates user avatar and nickname', async () => {
    config.IDENTITY_PROVIDER = 'welink';
    storage.setCurrentUser({
      userId: 'user_master',
      avatar: '🍶',
      nickname: '',
      profileCompleted: false,
      loginState: 'guest'
    });

    let sentRequest = null;
    mockNetworkHandler = (opts) => {
      sentRequest = opts;
      opts.success({
        statusCode: 200,
        header: { 'Set-Cookie': 'JSESSIONID=WELINK_UPROFILE_COOKIE' },
        data: {
          code: 0,
          msg: 'ok',
          data: {
            openid: 'welink_openid_profile_test',
            nickname: '微信资料官'
          }
        }
      });
    };

    const profileData = {
      avatarUrl: 'https://wx.qlogo.cn/avatar123.jpg',
      nickName: '微信资料官',
      sex: 2
    };

    const res = await identity.loginWithWeChat(profileData);
    assert.equal(res.ok, true);
    assert.equal(res.openid, 'welink_openid_profile_test');
    assert.equal(sentRequest.url, 'https://applet.51welink.com/taste/userInfo/wxLogin');

    const currentUser = storage.getCurrentUser();
    assert.equal(currentUser.avatar, 'https://wx.qlogo.cn/avatar123.jpg');
    assert.equal(currentUser.nickname, '微信资料官');
    assert.equal(currentUser.loginState, 'wechat');
    assert.equal(currentUser.welinkOpenid, 'welink_openid_profile_test');
  });
});

