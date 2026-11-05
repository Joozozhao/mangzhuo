const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('onlinePages test suite - Page/wx lifecycle and edge-case contracts', async (t) => {
  // Shared mock storage and network handler
  const storageMap = {};
  let mockNetworkHandler = null;
  let mockCloudFunctionHandler = null;

  const mockApp = {
    globalData: { userInfo: null }
  };

  const toasts = [];
  const modals = [];
  const navigations = [];

  const baseWx = {
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
      setTimeout(() => success({ code: 'mock_code_online_pages' }), 10);
    },
    request(opts) {
      if (mockNetworkHandler) {
        mockNetworkHandler(opts);
      } else {
        setTimeout(() => {
          if (opts.fail) opts.fail(new Error('no network handler defined'));
        }, 5);
      }
    },
    cloud: {
      callFunction(opts) {
        if (mockCloudFunctionHandler) return mockCloudFunctionHandler(opts);
        return Promise.resolve({ result: {} });
      }
    },
    showToast(opts) {
      toasts.push(opts);
    },
    showModal(opts) {
      modals.push(opts);
      if (opts.success) {
        setTimeout(() => {
          opts.success({ confirm: true, cancel: false });
        }, 5);
      }
    },
    navigateTo(opts) {
      navigations.push({ type: 'navigateTo', ...opts });
    },
    redirectTo(opts) {
      navigations.push({ type: 'redirectTo', ...opts });
    },
    navigateBack(opts) {
      navigations.push({ type: 'navigateBack', ...opts });
    },
    switchTab(opts) {
      navigations.push({ type: 'switchTab', ...opts });
    },
    stopPullDownRefresh() {}
  };

  global.wx = baseWx;
  global.getApp = () => mockApp;

  const config = require('../miniprogram/config');
  const storage = require('../miniprogram/services/storage');
  const welinkClient = require('../miniprogram/services/welinkClient');
  const identity = require('../miniprogram/services/identity');

  function clearHistory() {
    toasts.length = 0;
    modals.length = 0;
    navigations.length = 0;
  }

  function setupLoggedUser(openid = 'user_online_tester') {
    config.IDENTITY_PROVIDER = 'welink';
    welinkClient.clearSession();
    storage.setCurrentUser({
      userId: 'user_local_001',
      nickname: '在线盲品官',
      avatar: '🍶',
      avatarBg: '#d6b06a',
      welinkOpenid: openid,
      loginState: 'wechat'
    });
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        header: { 'Set-Cookie': 'JSESSIONID=SESSION_TEST_' + openid },
        data: {
          code: 0,
          msg: 'ok',
          data: { openid, nickname: '在线盲品官' }
        }
      });
    };
    return identity.loginWithWeChat();
  }

  function setupGuestUser() {
    config.IDENTITY_PROVIDER = 'welink';
    welinkClient.clearSession();
    storage.setCurrentUser({
      userId: 'user_guest_001',
      nickname: '游客品鉴官',
      avatar: '🍶',
      avatarBg: '#d6b06a',
      welinkOpenid: '',
      loginState: 'guest'
    });
  }

  function createPageInstance(pageRelPath, customPages = null) {
    let pageOptions = null;
    const mockPage = (opts) => { pageOptions = opts; };

    const fullPath = path.resolve(__dirname, '../miniprogram', pageRelPath);
    const code = fs.readFileSync(fullPath, 'utf-8');

    const customRequire = (id) => {
      const dir = path.dirname(fullPath);
      const resolved = path.resolve(dir, id);
      return require(resolved);
    };

    const ctx = {
      Page: mockPage,
      wx: baseWx,
      getApp: () => mockApp,
      getCurrentPages: () => (customPages || [{ route: pageRelPath }]),
      require: customRequire,
      console,
      Date,
      String,
      Number,
      Boolean,
      Array,
      Object,
      Set,
      Map,
      parseInt,
      parseFloat,
      isNaN,
      setTimeout,
      clearTimeout
    };

    vm.createContext(ctx);
    vm.runInContext(code, ctx);

    const instance = Object.assign({}, pageOptions);
    instance.data = JSON.parse(JSON.stringify(pageOptions.data || {}));
    instance.setData = function(patch, cb) {
      Object.assign(this.data, patch);
      if (cb) cb();
    };
    return instance;
  }

  // Case 1: create 失败 finally 口令清空，create 成功口令也清空
  await t.test('Case 1: packages/online/create - password is cleared in finally on failure, and on success', async () => {
    await setupLoggedUser('host_openid_1');
    clearHistory();

    const page = createPageInstance('packages/online/pages/create/create.js');
    page.onLoad();

    page.onTitleInput({ detail: { value: '酱香盲品专场' } });
    page.onAuthInput({ detail: { value: 'SecretKey2026' } });
    page.onNameInput({ currentTarget: { dataset: { index: 0 } }, detail: { value: '茅台飞天' } });
    page.onNameInput({ currentTarget: { dataset: { index: 1 } }, detail: { value: '国窖1573' } });

    assert.equal(page.data.authentication, 'SecretKey2026');

    // Simulate backend rejection / failure
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 500,
        data: { code: 500, msg: '服务器创建活动异常' }
      });
    };

    await page.onSubmit();

    // Password must be cleared in memory even on failure (finally block)
    assert.equal(page.data.authentication, '', 'Password must be cleared in memory on failure');
    assert.equal(page.data.submitting, false);
    assert.equal(modals.length, 1);
    assert.equal(modals[0].title, '发起失败');

    // Now test success case
    page.onAuthInput({ detail: { value: 'SecretKey2026Success' } });
    assert.equal(page.data.authentication, 'SecretKey2026Success');

    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        data: { code: 0, msg: 'ok', data: { id: 101 } }
      });
    };

    await page.onSubmit();
    assert.equal(page.data.authentication, '', 'Password must be cleared in memory on success');
    assert.equal(page.data.created, true);
    assert.equal(navigations.some(n => n.type === 'redirectTo' && n.url.includes('id=101')), true);
  });

  // Case 2: create guest 不请求网络
  await t.test('Case 2: packages/online/create - guest does not send network request on submit', async () => {
    setupGuestUser();
    clearHistory();

    let networkCalled = false;
    mockNetworkHandler = () => {
      networkCalled = true;
    };

    const page = createPageInstance('packages/online/pages/create/create.js');
    page.onLoad();

    page.onTitleInput({ detail: { value: '游客的酒局' } });
    page.onAuthInput({ detail: { value: 'GuestPass' } });
    page.onNameInput({ currentTarget: { dataset: { index: 0 } }, detail: { value: '酒样A' } });
    page.onNameInput({ currentTarget: { dataset: { index: 1 } }, detail: { value: '酒样B' } });

    await page.onSubmit();

    assert.equal(networkCalled, false, 'Network request must NOT be sent for guest user');
    assert.equal(page.data.authentication, '', 'Password must be cleared when guest submit is intercepted');
    assert.equal(toasts.some(t => t.title && t.title.includes('请先登录')), true);
  });

  // Case 3: detail 401 清 detail/results 并 needLogin，返回登录 onShow 续加载
  await t.test('Case 3: packages/online/detail - 401 clears detail and results with needLogin, then onShow resumes loadData', async () => {
    await setupLoggedUser('tester_openid_detail_401');
    clearHistory();

    const page = createPageInstance('packages/online/pages/detail/detail.js');

    // First load succeeds
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        data: {
          code: 0,
          msg: 'ok',
          data: {
            id: 201,
            title: '401清空测试局',
            status: 0,
            samples: [{ sampleId: 1, number: '1号' }],
            choices: ['茅台', '五粮液'],
            answers: []
          }
        }
      });
    };

    page.onLoad({ id: '201' });
    await page.loadData();

    assert.equal(page.data.detail !== null, true);
    assert.equal(page.data.detail.id, 201);
    assert.equal(page.data.needLogin, false);

    // Now trigger 401 on refresh or next loadData
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 401,
        data: { code: 401, msg: '会话已过期' }
      });
    };

    await page.loadData();

    // Must clear detail and results, and set needLogin: true
    assert.equal(page.data.detail, null, 'detail must be cleared on 401');
    assert.equal(page.data.results, null, 'results must be cleared on 401');
    assert.equal(page.data.needLogin, true, 'needLogin must be true on 401');

    // Now simulate user navigated to profile, completed login, and came back (onShow)
    await setupLoggedUser('tester_openid_detail_401');
    let resumeNetworkCalled = false;
    mockNetworkHandler = (opts) => {
      resumeNetworkCalled = true;
      opts.success({
        statusCode: 200,
        data: {
          code: 0,
          msg: 'ok',
          data: {
            id: 201,
            title: '401续加载成功局',
            status: 0,
            samples: [{ sampleId: 1, number: '1号' }],
            choices: ['茅台', '五粮液'],
            answers: []
          }
        }
      });
    };

    page.onShow();
    await page.loadData();

    assert.equal(resumeNetworkCalled, true, 'loadData must be resumed on onShow after re-login');
    assert.equal(page.data.detail !== null, true);
    assert.equal(page.data.detail.title, '401续加载成功局');
    assert.equal(page.data.needLogin, false);
  });

  // Case 4: 账号变化不可读旧 answers
  await t.test('Case 4: packages/online/detail - switching account prevents reading old answers', async () => {
    await setupLoggedUser('user_alice');
    clearHistory();

    const page = createPageInstance('packages/online/pages/detail/detail.js');

    // Alice loads data with Alice's submitted answers
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        data: {
          code: 0,
          msg: 'ok',
          data: {
            id: 301,
            title: '多账号隔离局',
            status: 0,
            samples: [{ sampleId: 10, number: '1号' }],
            choices: ['国窖', '剑南春'],
            answers: [{ sampleId: 10, guessedName: '国窖', score: 88 }]
          }
        }
      });
    };

    page.onLoad({ id: '301' });
    await page.loadData();

    assert.equal(page.data.hasSubmitted, true);
    assert.equal(page.data.userAnswersMap[10].guessedName, '国窖');
    assert.equal(page.data.formMap[10].guessedName, '国窖');
    assert.equal(page.data.formMap[10].score, '88');

    // Now account switches to Bob
    await setupLoggedUser('user_bob');

    // Calling onShow or loadData must clean out Alice's answers
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        data: {
          code: 0,
          msg: 'ok',
          data: {
            id: 301,
            title: '多账号隔离局',
            status: 0,
            samples: [{ sampleId: 10, number: '1号' }],
            choices: ['国窖', '剑南春'],
            answers: [] // Bob has not answered
          }
        }
      });
    };

    page.onShow();
    await page.loadData();

    assert.equal(page.data.hasSubmitted, false, "Bob must not inherit Alice's hasSubmitted");
    assert.equal(page.data.userAnswersMap[10], undefined, "Bob must not inherit Alice's userAnswersMap");
    assert.equal(page.data.formMap[10].guessedName, '', "Bob's guessedName must be empty");
    assert.equal(page.data.formMap[10].score, '', "Bob's score must be empty");
  });

  // Case 5: 0 和 100 正确提交，非法小数不截断
  await t.test('Case 5: packages/online/detail - 0 and 100 are submitted correctly; illegal decimals are rejected and not truncated', async () => {
    await setupLoggedUser('tester_score_boundary');
    clearHistory();

    const page = createPageInstance('packages/online/pages/detail/detail.js');

    let currentBackendAnswers = [];
    mockNetworkHandler = (opts) => {
      if (opts.method === 'POST' && opts.url.includes('/scores')) {
        currentBackendAnswers = opts.data && opts.data.answers;
        opts.success({
          statusCode: 200,
          data: { code: 0, msg: 'ok', data: { submitted: true } }
        });
        return;
      }
      // GET detail
      opts.success({
        statusCode: 200,
        data: {
          code: 0,
          msg: 'ok',
          data: {
            id: 401,
            title: '打分边界测试局',
            status: 0,
            samples: [
              { sampleId: 1, number: '1号' },
              { sampleId: 2, number: '2号' }
            ],
            choices: ['茅台', '汾酒'],
            answers: currentBackendAnswers
          }
        }
      });
    };

    page.onLoad({ id: '401' });
    await page.loadData();

    // 1. Test 0 and 100 submission
    page.onChoiceChange({ currentTarget: { dataset: { sampleId: 1 } }, detail: { value: 0 } }); // '茅台'
    page.onChoiceChange({ currentTarget: { dataset: { sampleId: 2 } }, detail: { value: 1 } }); // '汾酒'
    page.onScoreInput({ currentTarget: { dataset: { sampleId: 1 } }, detail: { value: '0' } });
    page.onScoreInput({ currentTarget: { dataset: { sampleId: 2 } }, detail: { value: '100' } });

    assert.equal(page.data.formMap[1].score, '0');
    assert.equal(page.data.formMap[2].score, '100');

    let postSubmittedData = null;
    const origHandler = mockNetworkHandler;
    mockNetworkHandler = (opts) => {
      if (opts.method === 'POST' && opts.url.includes('/scores')) {
        postSubmittedData = opts.data;
      }
      origHandler(opts);
    };

    await page.onSubmitScores();

    assert.equal(toasts.some(t => t.title && t.title.includes('提交成功')), true);
    assert.equal(postSubmittedData !== null, true);
    assert.deepEqual(postSubmittedData.answers, [
      { sampleId: 1, guessedName: '茅台', score: 0 },
      { sampleId: 2, guessedName: '汾酒', score: 100 }
    ]);
    assert.equal(page.data.hasSubmitted, true);

    // 2. Test illegal decimals like '88.5' or '99.9': must NOT be truncated to 88 or 99 and must be rejected
    clearHistory();
    page.onScoreInput({ currentTarget: { dataset: { sampleId: 1 } }, detail: { value: '88.5' } });
    assert.equal(page.data.formMap[1].score, '88.5', 'onScoreInput must preserve raw text without truncating decimal');

    let decimalSent = false;
    mockNetworkHandler = (opts) => {
      if (opts.method === 'POST') decimalSent = true;
      origHandler(opts);
    };

    await page.onSubmitScores();

    assert.equal(decimalSent, false, 'Decimal score must NOT be sent to network');
    assert.equal(toasts.some(t => t.title && t.title.includes('评分需为 0 至 100 的整数')), true, 'Must show toast rejecting decimal score');
  });

  // Case 6: 忙碌阻止提交/close重复
  await t.test('Case 6: packages/online/detail - busy state blocks duplicate submitScores and closeTaste', async () => {
    await setupLoggedUser('host_busy_tester');
    clearHistory();

    const page = createPageInstance('packages/online/pages/detail/detail.js');

    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        data: {
          code: 0,
          msg: 'ok',
          data: {
            id: 501,
            title: '忙碌防重测试局',
            status: 0,
            isOwner: true,
            samples: [{ sampleId: 1, number: '1号' }],
            choices: ['西凤'],
            answers: []
          }
        }
      });
    };

    page.onLoad({ id: '501' });
    await page.loadData();

    page.onChoiceChange({ currentTarget: { dataset: { sampleId: 1 } }, detail: { value: 0 } });
    page.onScoreInput({ currentTarget: { dataset: { sampleId: 1 } }, detail: { value: '90' } });

    // Simulate in-flight submitScores: capture opts and defer success
    let pendingSubmitOpts = null;
    let submitCallCount = 0;
    mockNetworkHandler = (opts) => {
      if (opts.method === 'POST' && opts.url.includes('/scores')) {
        submitCallCount++;
        pendingSubmitOpts = opts;
      } else {
        // GET detail
        opts.success({
          statusCode: 200,
          data: {
            code: 0,
            msg: 'ok',
            data: {
              id: 501,
              title: '忙碌防重测试局',
              status: 0,
              isOwner: true,
              samples: [{ sampleId: 1, number: '1号' }],
              choices: ['西凤'],
              answers: [{ sampleId: 1, guessedName: '西凤', score: 90 }]
            }
          }
        });
      }
    };

    const firstSubmitPromise = page.onSubmitScores();
    assert.equal(page.data.submitting, true);

    // Call submitScores again while busy
    const secondSubmitPromise = page.onSubmitScores();
    await secondSubmitPromise;
    assert.equal(submitCallCount, 1, 'Duplicate submitScores call while submitting must be blocked immediately');

    // Now resolve the in-flight firstSubmit
    assert.equal(pendingSubmitOpts !== null, true);
    pendingSubmitOpts.success({
      statusCode: 200,
      data: { code: 0, msg: 'ok', data: { submitted: true } }
    });
    await firstSubmitPromise;

    assert.equal(page.data.submitting, false);
    assert.equal(page.data.hasSubmitted, true);

    // Test closeTaste duplicate click prevention
    let closeCallCount = 0;
    mockNetworkHandler = (opts) => {
      if (opts.method === 'POST' && opts.url.includes('/close')) {
        closeCallCount++;
      }
    };

    page.setData({ closing: true });
    page.onCloseTaste();
    assert.equal(closeCallCount, 0, 'onCloseTaste while closing must be blocked immediately');
  });

  // Case 7: gather retry 绑定 event 不当页数、返回游客清在线 list
  await t.test('Case 7: pages/gather - loadOnlineTastes treats event object as page 1, and returning as guest clears onlineList', async () => {
    await setupLoggedUser('gather_user_1');
    clearHistory();

    const page = createPageInstance('pages/gather/gather.js');
    page.onLoad();

    let capturedUrl = null;
    mockNetworkHandler = (opts) => {
      capturedUrl = opts.url;
      // List contract: envelope has data: [...] and count: number at top level
      opts.success({
        statusCode: 200,
        data: {
          code: 0,
          msg: 'ok',
          data: [{ id: 10, title: '在线活动1', createdAt: 1761000000 }],
          count: 1
        }
      });
    };

    // User is logged in, switch to online tab and load
    page.switchTabMode({ currentTarget: { dataset: { tab: 'online' } } });
    await page.loadOnlineTastes(1);

    assert.equal(capturedUrl.includes('page=1'), true, 'Initial load must request page=1 in URL');
    assert.equal(page.data.onlineList.length, 1);
    assert.equal(page.data.onlineCount, 1);

    // Simulate bindtap retry: tap event object passed as argument instead of integer page number
    const mockTapEvent = { type: 'tap', timeStamp: 12345, target: {}, currentTarget: {} };
    await page.loadOnlineTastes(mockTapEvent);

    assert.equal(capturedUrl.includes('page=1'), true, 'Passing event object to loadOnlineTastes must fallback to page=1');

    // Now user logs out / becomes guest
    setupGuestUser();

    // Call onShow as guest
    page.onShow();

    assert.equal(page.data.isLoggedIn, false);
    assert.equal(page.data.onlineList.length, 0, 'Returning as guest must clear onlineList');
    assert.equal(page.data.onlineCount, 0, 'Returning as guest must reset onlineCount');
  });

  // Case 8: profileWelink 保存仅昵称同步时不误提示重传头像
  await t.test('Case 8: pages/profile - saving nickname only does not prompt user to re-upload avatar', async () => {
    await setupLoggedUser('profile_tester_user');
    clearHistory();

    const existingUser = storage.getCurrentUser();
    storage.setCurrentUser(Object.assign({}, existingUser, { avatar: 'wxfile://existing_avatar.png' }));
    const page = createPageInstance('pages/profile/profile.js');
    page.onLoad();

    // User edits nickname only, does NOT touch avatar (no pendingAvatar)
    page.onNicknameInput({ detail: { value: '大师品酒人' } });

    // Mock the new nickname endpoint; saving a nickname must not log in again.
    mockNetworkHandler = (opts) => {
      assert.match(opts.url, /\/taste\/userInfo\/updateNick/);
      assert.equal(opts.data.nickname, '大师品酒人');
      assert.equal(opts.data.openid, 'profile_tester_user');
      opts.success({
        statusCode: 200,
        data: {
          code: '00000', msg: '成功', data: '成功'
        }
      });
    };

    await page.onSave();

    // Modal check: when avatar is local and nickname synced, content must accurately state:
    // '昵称已同步，当前头像仅保存在本机。' and NOT mislead user with '头像未能保存，请重新选择头像' or asking to re-upload
    assert.equal(modals.length, 1);
    assert.equal(modals[0].title, '资料已保存');
    assert.equal(modals[0].content, '昵称已同步，当前头像仅保存在本机。');
    assert.equal(modals[0].content.includes('未能保存，请重新选择头像'), false, 'Must not prompt to re-upload avatar');
  });

  // Case 9: profile 页面通过 wx.getUserProfile 授权并成功登录
  await t.test('Case 9: pages/profile - onLogin with wx.getUserProfile successfully authorizes and updates UI', async () => {
    setupGuestUser();
    clearHistory();

    const originalGetUserProfile = global.wx.getUserProfile;
    global.wx.getUserProfile = (opts) => {
      assert.equal(opts.desc, '用于完善个人信息');
      opts.success({
        userInfo: {
          avatarUrl: 'https://wx.qlogo.cn/user_avatar_101.jpg',
          nickName: '品鉴大咖',
          sex: 1
        }
      });
    };

    let loginApiCalled = false;
    let loginDataSent = null;
    mockNetworkHandler = (opts) => {
      loginApiCalled = true;
      loginDataSent = opts.data;
      opts.success({
        statusCode: 200,
        header: { 'Set-Cookie': 'JSESSIONID=PROFILE_LOGIN_COOKIE' },
        data: {
          code: 0,
          msg: 'ok',
          data: {
            openid: 'openid_userprofile_101',
            nickname: '品鉴大咖'
          }
        }
      });
    };

    const page = createPageInstance('pages/profile/profile.js');
    page.onLoad();
    assert.equal(page.data.loginState, 'guest');

    page.onLogin();
    await new Promise(r => setTimeout(r, 20));

    assert.equal(loginApiCalled, true);
    assert.equal(loginDataSent.avatarUrl, 'https://wx.qlogo.cn/user_avatar_101.jpg');
    assert.equal(loginDataSent.nickName, '品鉴大咖');
    assert.equal(page.data.loginState, 'wechat');
    assert.equal(page.data.nickname, '品鉴大咖');
    assert.equal(page.data.avatar, 'https://wx.qlogo.cn/user_avatar_101.jpg');

    global.wx.getUserProfile = originalGetUserProfile;
  });

  // Case 10: profile 页面 wx.getUserProfile 用户拒绝授权
  await t.test('Case 10: pages/profile - onLogin when user denies wx.getUserProfile shows toast and remains guest', async () => {
    setupGuestUser();
    clearHistory();

    const originalGetUserProfile = global.wx.getUserProfile;
    global.wx.getUserProfile = (opts) => {
      opts.fail({ errMsg: 'getUserProfile:fail auth deny' });
    };

    let loginApiCalled = false;
    mockNetworkHandler = () => { loginApiCalled = true; };

    const page = createPageInstance('pages/profile/profile.js');
    page.onLoad();

    page.onLogin();
    await new Promise(r => setTimeout(r, 20));

    assert.equal(loginApiCalled, false, 'Should not proceed to login network request on auth deny');
    assert.equal(page.data.loginState, 'guest');
    assert.equal(toasts.some(t => t.title && t.title.includes('已取消授权')), true);

    global.wx.getUserProfile = originalGetUserProfile;
  });

  // Case 11: profile 页面遇到 privacy agreement 未声明时自动兜底降级登录
  await t.test('Case 11: pages/profile - onLogin when wx.getUserProfile reports privacy agreement error falls back and succeeds', async () => {
    setupGuestUser();
    clearHistory();

    const originalGetUserProfile = global.wx.getUserProfile;
    global.wx.getUserProfile = (opts) => {
      opts.fail({ errMsg: 'getUserProfile:fail api scope is not declared in the privacy agreement' });
    };

    let loginApiCalled = false;
    let loginDataSent = null;
    mockNetworkHandler = (opts) => {
      loginApiCalled = true;
      loginDataSent = opts.data;
      opts.success({
        statusCode: 200,
        header: { 'Set-Cookie': 'JSESSIONID=PRIVACY_FALLBACK_COOKIE' },
        data: {
          code: 0,
          msg: 'ok',
          data: {
            openid: 'openid_privacy_fallback_user',
            nickname: '自填品鉴师'
          }
        }
      });
    };

    const page = createPageInstance('pages/profile/profile.js');
    page.onLoad();
    page.onNicknameInput({ detail: { value: '自填品鉴师' } });

    page.onLogin();
    await new Promise(r => setTimeout(r, 20));

    assert.equal(loginApiCalled, true, 'Login API must still be called via fallback');
    assert.equal(loginDataSent.nickName, '自填品鉴师');
    assert.equal(page.data.loginState, 'wechat');
    assert.equal(toasts.some(t => t.title && t.title.includes('注册登录成功')), true);

    global.wx.getUserProfile = originalGetUserProfile;
  });
});

