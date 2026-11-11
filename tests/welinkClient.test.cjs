const test = require('node:test');
const assert = require('node:assert/strict');
const config = require('../miniprogram/config');

test('welinkClient test suite', async (t) => {
  const storage = {};
  let mockNetworkHandler = null;
  let loginCallCount = 0;

  global.wx = {
    getStorageSync(key) {
      return storage[key];
    },
    setStorageSync(key, value) {
      storage[key] = value;
    },
    removeStorageSync(key) {
      delete storage[key];
    },
    getAccountInfoSync() {
      return { miniProgram: { envVersion: 'develop' } };
    },
    login({ success, fail }) {
      loginCallCount++;
      setTimeout(() => {
        success({ code: 'mock_wx_code_' + loginCallCount });
      }, 10);
    },
    request(opts) {
      if (mockNetworkHandler) {
        mockNetworkHandler(opts);
      }
    }
  };

  const welinkClient = require('../miniprogram/services/welinkClient');
  welinkClient.clearSession();

  await t.test('1. Session isolation and Set-Cookie JSESSIONID persistence', async () => {
    mockNetworkHandler = (opts) => {
      assert.equal(opts.method, 'POST');
      assert.match(opts.url, /\/taste\/userInfo\/wxLogin/);
      opts.success({
        statusCode: 200,
        header: {
          'Set-Cookie': 'JSESSIONID=TEST_SESSION_12345; Path=/; HttpOnly'
        },
        data: {
          code: 0,
          msg: '接口调用成功',
          data: {
            openid: 'ox123456789',
            nickname: '品鉴客'
          }
        }
      });
    };

    const session = await welinkClient.login();
    assert.equal(session.openid, 'ox123456789');
    assert.equal(session.cookie, 'JSESSIONID=TEST_SESSION_12345');
    assert.equal(welinkClient.hasValidSession(), true);

    let cookieSent = '';
    mockNetworkHandler = (opts) => {
      cookieSent = opts.header['Cookie'];
      opts.success({
        statusCode: 200,
        data: { code: 0, data: [], count: 0, msg: 'ok' }
      });
    };

    await welinkClient.getTasteList(1, 10);
    assert.equal(cookieSent, 'JSESSIONID=TEST_SESSION_12345');
  });

  await t.test('7. Path traversal, external URL rejection, and header Cookie override prevention', async () => {
    welinkClient.clearSession();
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        header: { 'Set-Cookie': 'JSESSIONID=SECURE_LEAK_TEST' },
        data: { code: 0, data: { openid: 'test_openid' }, msg: 'ok' }
      });
    };
    await welinkClient.login();

    // External URL rejection
    await assert.rejects(async () => {
      await welinkClient.request({ url: 'https://applet.51welink.com.evil.com/taste/applet/tastes' });
    }, /(必须以 \/taste\/applet\/ 开头|禁止跨域或协议相对路径)/);

    // Protocol-relative rejection
    await assert.rejects(async () => {
      await welinkClient.request({ url: '//evil.com/taste/applet/tastes' });
    }, /禁止跨域或协议相对路径/);

    // Directory traversal rejection
    await assert.rejects(async () => {
      await welinkClient.request({ url: '/taste/applet/../admin' });
    }, /路径包含非法相对段/);

    // Non /taste/applet/ path rejection
    await assert.rejects(async () => {
      await welinkClient.request({ url: '/api/v1/user' });
    }, /不在已允许的品鉴接口范围内/);

    // Header Cookie override prevention: caller passed fake Cookie in headers, must be wiped
    let sentHeader = null;
    mockNetworkHandler = (opts) => {
      sentHeader = opts.header;
      opts.success({
        statusCode: 200,
        data: { code: 0, data: { ok: true }, msg: 'ok' }
      });
    };

    await welinkClient.request({
      url: '/taste/applet/tastes/1',
      headers: { Cookie: 'JSESSIONID=ATTACKER_INJECTED_COOKIE' }
    });

    assert.equal(sentHeader['Cookie'], 'JSESSIONID=SECURE_LEAK_TEST');
  });

  await t.test('8. Base URL switch drops old session and openid', async () => {
    assert.equal(welinkClient.hasValidSession(), true);
    const prevConfig = config.DEV_HTTP_OVERRIDE_URL;
    const prevAllow = config.ALLOW_INSECURE_DEV_HTTP;

    try {
      config.ALLOW_INSECURE_DEV_HTTP = true;
      config.DEV_HTTP_OVERRIDE_URL = 'http://127.0.0.1:9090';
      global.wx.getAccountInfoSync = () => ({ miniProgram: { envVersion: 'develop' } });

      const session = welinkClient.getSession();
      assert.equal(session.cookie, '');
      assert.equal(session.openid, '');
      assert.equal(welinkClient.hasValidSession(), false);
    } finally {
      config.DEV_HTTP_OVERRIDE_URL = prevConfig;
      config.ALLOW_INSECURE_DEV_HTTP = prevAllow;
      global.wx.getAccountInfoSync = () => ({ miniProgram: { envVersion: 'develop' } });
    }
  });

  await t.test('9. Envelope validation: HTML response, missing data, missing code', async () => {
    // 1. HTML string response (e.g. gateway 502/200 HTML page)
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        data: '<html><body>Error 502 Bad Gateway</body></html>'
      });
    };
    await assert.rejects(async () => {
      await welinkClient.request({ url: '/taste/applet/tastes/1' });
    }, /非标准响应格式/);

    // 2. Missing data field
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        data: { code: 0, msg: 'ok' } // missing data
      });
    };
    await assert.rejects(async () => {
      await welinkClient.request({ url: '/taste/applet/tastes/1' });
    }, /响应缺少业务数据 data/);

    // 3. raw=true still strictly requires code===0 and data existence
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        data: { code: 500, msg: '业务异常', data: null }
      });
    };
    await assert.rejects(async () => {
      await welinkClient.request({ url: '/taste/applet/tastes?page=1&limit=10', raw: true });
    }, /业务异常/);
  });

  await t.test('10. Login requires fresh JSESSIONID, multiple cookies parsing, no half session on fail', async () => {
    welinkClient.clearSession();

    // 1. Set-Cookie from res.cookies array
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        cookies: [
          'other_cookie=value1; Path=/',
          'JSESSIONID=ARRAY_COOKIE_777; Path=/; HttpOnly'
        ],
        data: { code: 0, data: { openid: 'user_cookies_arr' }, msg: 'ok' }
      });
    };
    const s1 = await welinkClient.login();
    assert.equal(s1.cookie, 'JSESSIONID=ARRAY_COOKIE_777');
    assert.equal(s1.openid, 'user_cookies_arr');

    // 2. Set-Cookie header contains multiple cookies separated
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        header: {
          'Set-Cookie': ['route=xyz; Path=/', 'JSESSIONID=HEADER_ARR_888; Path=/; HttpOnly']
        },
        data: { code: 0, data: { openid: 'user_header_arr' }, msg: 'ok' }
      });
    };
    const s2 = await welinkClient.login();
    assert.equal(s2.cookie, 'JSESSIONID=HEADER_ARR_888');

    // 3. Login returns 200 code 0 but missing Set-Cookie: must fail and leave NO half session
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        header: {},
        data: { code: 0, data: { openid: 'user_no_cookie' }, msg: 'ok' }
      });
    };
    await assert.rejects(async () => {
      await welinkClient.login();
    }, /未收到有效服务端会话凭证/);
    assert.equal(welinkClient.hasValidSession(), false);
    assert.equal(welinkClient.getSession().openid, '');
  });

  await t.test('11. No auto retry for POST/write operations; immediate 401 fail', async () => {
    // Prepare logged in session
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        header: { 'Set-Cookie': 'JSESSIONID=POST_SESSION' },
        data: { code: 0, data: { openid: 'user_post' }, msg: 'ok' }
      });
    };
    await welinkClient.login();

    let requestCount = 0;
    mockNetworkHandler = (opts) => {
      requestCount++;
      opts.success({
        statusCode: 401,
        data: { code: 401, msg: '未授权' }
      });
    };

    // Calling createTaste (POST) should NOT retry or auto login
    await assert.rejects(async () => {
      await welinkClient.createTaste({ title: '测试局', names: ['酒1', '酒2'], authentication: '123' });
    }, (err) => {
      assert.equal(err.statusCode, 401);
      return true;
    });

    assert.equal(requestCount, 1, 'POST write requests must NEVER be replayed or retried');
    assert.equal(welinkClient.hasValidSession(), false);
  });

  await t.test('12. Strict validators: ID, scores, duplicate samples, lengths', async () => {
    // ID tests: invalid IDs
    await assert.rejects(async () => {
      await welinkClient.getTasteDetail('1x');
    }, /酒局编号无效/);
    await assert.rejects(async () => {
      await welinkClient.getTasteDetail('0');
    }, /酒局编号无效/);
    await assert.rejects(async () => {
      await welinkClient.getTasteDetail(-1);
    }, /酒局编号无效/);
    await assert.rejects(async () => {
      await welinkClient.getTasteDetail(null);
    }, /酒局编号无效/);
    await assert.rejects(async () => {
      await welinkClient.getTasteDetail('  ');
    }, /酒局编号无效/);

    // Score tests: null, false, empty string, boundary 0 and 100
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        header: { 'Set-Cookie': 'JSESSIONID=SCORE_VALID_COOKIE' },
        data: { code: 0, data: { openid: 'user_score' }, msg: 'ok' }
      });
    };
    await welinkClient.login();

    await assert.rejects(async () => {
      await welinkClient.submitScores(1, [{ sampleId: 10, guessedName: '酒A', score: '' }]);
    }, /评分为 0 至 100 的整数/);
    await assert.rejects(async () => {
      await welinkClient.submitScores(1, [{ sampleId: 10, guessedName: '酒A', score: null }]);
    }, /评分为 0 至 100 的整数/);
    await assert.rejects(async () => {
      await welinkClient.submitScores(1, [{ sampleId: 10, guessedName: '酒A', score: false }]);
    }, /评分为 0 至 100 的整数/);

    // Duplicate sampleId rejection
    await assert.rejects(async () => {
      await welinkClient.submitScores(1, [
        { sampleId: 10, guessedName: '酒A', score: 50 },
        { sampleId: 10, guessedName: '酒B', score: 60 }
      ]);
    }, /存在重复的酒样评分项/);

    // Duplicate sampleId with string id ('10' and 10)
    await assert.rejects(async () => {
      await welinkClient.submitScores(1, [
        { sampleId: 10, guessedName: '酒A', score: 50 },
        { sampleId: '10', guessedName: '酒B', score: 60 }
      ]);
    }, /存在重复的酒样评分项/);

    // Sample name length limit
    await assert.rejects(async () => {
      await welinkClient.submitScores(1, [
        { sampleId: 10, guessedName: 'A'.repeat(101), score: 50 }
      ]);
    }, /不能超过 100 个字符/);
  });
  await t.test('2. Single-flight concurrent login', async () => {
    loginCallCount = 0;
    mockNetworkHandler = (opts) => {
      setTimeout(() => {
        opts.success({
          statusCode: 200,
          header: { 'Set-Cookie': 'JSESSIONID=FLIGHT_COOKIE' },
          data: { code: 0, data: { openid: 'fly_openid', nickname: 'Flyer' } }
        });
      }, 20);
    };

    const [res1, res2, res3] = await Promise.all([
      welinkClient.login(),
      welinkClient.login(),
      welinkClient.login()
    ]);

    assert.equal(loginCallCount, 1, 'wx.login should only be called once during concurrent in-flight');
    assert.equal(res1.openid, 'fly_openid');
    assert.equal(res2.openid, 'fly_openid');
    assert.equal(res3.openid, 'fly_openid');
  });

  await t.test('3. 401 Unauthorized clears session immediately', async () => {
    assert.equal(welinkClient.hasValidSession(), true);

    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 401,
        data: { code: 401, msg: '请先微信登录' }
      });
    };

    await assert.rejects(
      async () => {
        await welinkClient.getTasteDetail(1);
      },
      (err) => {
        assert.equal(err.statusCode, 401);
        return true;
      }
    );

    assert.equal(welinkClient.hasValidSession(), false, 'Session must be cleared on 401');
  });

  await t.test('4. Score validation: integer 0..100, requires valid sampleId and guessedName', async () => {
    welinkClient.clearSession();
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        header: { 'Set-Cookie': 'JSESSIONID=VALID_COOKIE' },
        data: { code: 0, data: { openid: 'user_1', nickname: 'Tester' }, msg: 'ok' }
      });
    };
    await welinkClient.login();

    await assert.rejects(async () => {
      await welinkClient.submitScores(1, []);
    }, /请完成全部酒样的判断和评分/);

    await assert.rejects(async () => {
      await welinkClient.submitScores(1, [{ sampleId: 10, guessedName: '', score: 80 }]);
    }, /请为每款酒样选择竞猜酒名/);

    await assert.rejects(async () => {
      await welinkClient.submitScores(1, [{ sampleId: 10, guessedName: '茅台', score: -5 }]);
    }, /评分为 0 至 100 的整数/);

    await assert.rejects(async () => {
      await welinkClient.submitScores(1, [{ sampleId: 10, guessedName: '茅台', score: 105 }]);
    }, /评分为 0 至 100 的整数/);

    await assert.rejects(async () => {
      await welinkClient.submitScores(1, [{ sampleId: 10, guessedName: '茅台', score: 88.5 }]);
    }, /评分为 0 至 100 的整数/);

    let postedData = null;
    mockNetworkHandler = (opts) => {
      postedData = opts.data;
      opts.success({
        statusCode: 200,
        data: { code: 0, data: { submitted: true }, msg: 'ok' }
      });
    };

    const okRes = await welinkClient.submitScores(1, [
      { sampleId: 10, guessedName: '茅台', score: 0 },
      { sampleId: 11, guessedName: '五粮液', score: 100 }
    ]);

    assert.equal(okRes.submitted, true);
    assert.equal(postedData.answers[0].score, 0);
    assert.equal(postedData.answers[1].score, 100);
  });

  await t.test('5. Non-2xx or non-zero code does not return false success', async () => {
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 500,
        data: { code: 500, msg: '内部服务器错误', data: null }
      });
    };

    await assert.rejects(async () => {
      await welinkClient.getTasteDetail(1);
    }, (err) => {
      assert.equal(err.statusCode, 500);
      assert.equal(err.message, '内部服务器错误');
      return true;
    });

    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        data: { code: 400, msg: '酒局名称长度无效', data: null }
      });
    };

    await assert.rejects(async () => {
      await welinkClient.createTaste({ title: 'A', names: ['A', 'B'], authentication: '123' });
    }, (err) => {
      assert.equal(err.code, 400);
      assert.equal(err.message, '酒局名称长度无效');
      return true;
    });
  });

  await t.test('6. Base URL resolution security: regex anchor, trial disallowed, port/userinfo checks', async () => {
    const origConfig = {
      WELINK_BASE_URL: config.WELINK_BASE_URL,
      ALLOW_INSECURE_DEV_HTTP: config.ALLOW_INSECURE_DEV_HTTP,
      DEV_HTTP_OVERRIDE_URL: config.DEV_HTTP_OVERRIDE_URL
    };

    try {
      // Default must be https
      config.WELINK_BASE_URL = 'http://insecure.default.com';
      config.ALLOW_INSECURE_DEV_HTTP = false;
      assert.equal(welinkClient.resolveBaseUrl(), 'https://applet.51welink.com');

      // Attacker subdomain bypass check (127.0.0.1.attacker.com)
      config.ALLOW_INSECURE_DEV_HTTP = true;
      config.DEV_HTTP_OVERRIDE_URL = 'http://127.0.0.1.attacker.com:8080';
      assert.equal(welinkClient.resolveBaseUrl(), 'https://applet.51welink.com');

      // LAN unanchored regex bypass (192.168.1.1.evil.com)
      config.DEV_HTTP_OVERRIDE_URL = 'http://192.168.1.1.evil.com';
      assert.equal(welinkClient.resolveBaseUrl(), 'https://applet.51welink.com');

      // Userinfo attack (http://user:pass@127.0.0.1:8080)
      config.DEV_HTTP_OVERRIDE_URL = 'http://attacker@127.0.0.1:8080';
      assert.equal(welinkClient.resolveBaseUrl(), 'https://applet.51welink.com');

      // Hash or query attack
      config.DEV_HTTP_OVERRIDE_URL = 'http://127.0.0.1:8080#danger';
      assert.equal(welinkClient.resolveBaseUrl(), 'https://applet.51welink.com');

      config.DEV_HTTP_OVERRIDE_URL = 'http://127.0.0.1:8080?danger=1';
      assert.equal(welinkClient.resolveBaseUrl(), 'https://applet.51welink.com');

      // Trial environment must NOT allow insecure HTTP override
      global.wx.getAccountInfoSync = () => ({ miniProgram: { envVersion: 'trial' } });
      config.DEV_HTTP_OVERRIDE_URL = 'http://127.0.0.1:8080';
      assert.equal(welinkClient.resolveBaseUrl(), 'https://applet.51welink.com');

      // Release environment must NOT allow insecure HTTP override
      global.wx.getAccountInfoSync = () => ({ miniProgram: { envVersion: 'release' } });
      assert.equal(welinkClient.resolveBaseUrl(), 'https://applet.51welink.com');

      // Develop / devtools environment allows strict valid private host
      global.wx.getAccountInfoSync = () => ({ miniProgram: { envVersion: 'develop' } });
      config.DEV_HTTP_OVERRIDE_URL = 'http://127.0.0.1:8080';
      assert.equal(welinkClient.resolveBaseUrl(), 'http://127.0.0.1:8080');

      config.DEV_HTTP_OVERRIDE_URL = 'http://localhost:3000';
      assert.equal(welinkClient.resolveBaseUrl(), 'http://localhost:3000');

      config.DEV_HTTP_OVERRIDE_URL = 'http://192.168.1.100:8080';
      assert.equal(welinkClient.resolveBaseUrl(), 'http://192.168.1.100:8080');
    } finally {
      Object.assign(config, origConfig);
      global.wx.getAccountInfoSync = () => ({ miniProgram: { envVersion: 'develop' } });
    }
  });

  await t.test('13. Create contract accepts title 32, sample names 100 and passphrase 64 after trimming', async () => {
    const title = '题'.repeat(32);
    const names = ['甲'.repeat(100), '乙'.repeat(100)];
    const authentication = '密'.repeat(64);
    let sent = null;
    mockNetworkHandler = (opts) => {
      sent = opts;
      opts.success({ statusCode: 200, data: { code: 0, data: { id: 7 } } });
    };
    const result = await welinkClient.createTaste({
      title: ' ' + title + ' ',
      names: names.map(name => ' ' + name + ' '),
      authentication: ' ' + authentication + ' '
    });
    assert.deepEqual(result, { id: 7 });
    assert.equal(sent.method, 'POST');
    assert.equal(sent.url, 'https://applet.51welink.com/taste/applet/tastes');
    assert.deepEqual(sent.data, { title, names, authentication });
  });

  await t.test('14. Create rejects title 33, sample name 101 and passphrase 65 before network', async () => {
    let calls = 0;
    mockNetworkHandler = (opts) => {
      calls++;
      opts.success({ statusCode: 200, data: { code: 0, data: { id: 7 } } });
    };
    const valid = { title: '品鉴', names: ['酒甲', '酒乙'], authentication: '口令' };
    await assert.rejects(welinkClient.createTaste({ ...valid, title: '题'.repeat(33) }), /32/);
    await assert.rejects(welinkClient.createTaste({ ...valid, names: ['酒甲', '乙'.repeat(101)] }), /100/);
    await assert.rejects(welinkClient.createTaste({ ...valid, authentication: '密'.repeat(65) }), /64/);
    assert.equal(calls, 0, 'Invalid payloads must not reach the backend');
  });

  await t.test('15. Create rejects duplicate names including whitespace variants before network', async () => {
    let calls = 0;
    mockNetworkHandler = (opts) => {
      calls++;
      opts.success({ statusCode: 200, data: { code: 0, data: { id: 7 } } });
    };
    for (const names of [['酒甲', '酒甲'], [' 酒甲 ', '酒甲'], ['酒甲', '酒乙', ' 酒甲']]) {
      await assert.rejects(welinkClient.createTaste({
        title: '品鉴', names, authentication: '口令'
      }), /重复/);
    }
    assert.equal(calls, 0);
  });

  await t.test('16. Score contract accepts guessed names of 51 and 100 characters without truncation', async () => {
    const answers = [
      { sampleId: 1, guessedName: '甲'.repeat(51), score: 0 },
      { sampleId: 2, guessedName: '乙'.repeat(100), score: 100 }
    ];
    let sent = null;
    mockNetworkHandler = (opts) => {
      sent = opts;
      opts.success({ statusCode: 200, data: { code: 0, data: { submitted: true } } });
    };
    assert.deepEqual(await welinkClient.submitScores(7, answers), { submitted: true });
    assert.equal(sent.method, 'POST');
    assert.deepEqual(sent.data, { answers });
  });

  async function loginAs(cookie, openid) {
    mockNetworkHandler = (opts) => {
      opts.success({
        statusCode: 200,
        header: { 'Set-Cookie': 'JSESSIONID=' + cookie + '; Path=/; HttpOnly' },
        data: { code: 0, data: { openid, nickname: openid } }
      });
    };
    return welinkClient.login();
  }

  await t.test('17. Late old 401 after explicit clear and new login cannot clear the new session', async () => {
    await loginAs('OLD_SESSION', 'old-user');
    let delayed = null;
    mockNetworkHandler = (opts) => { delayed = opts; };
    const pending = welinkClient.getTasteDetail(1);
    const rejected = assert.rejects(pending, { code: 'STALE_SESSION' });
    welinkClient.clearSession();
    await loginAs('NEW_SESSION', 'new-user');
    const expected = { ...welinkClient.getSession() };
    const events = [];
    const unsubscribe = welinkClient.addSessionListener(event => events.push(event));
    try {
      delayed.success({
        statusCode: 401,
        header: { 'Set-Cookie': 'JSESSIONID=OLD_RESPONSE_COOKIE' },
        data: { code: 401, msg: 'expired' }
      });
      await rejected;
      assert.deepEqual(welinkClient.getSession(), expected);
      assert.deepEqual(storage.mz_welink_session, expected);
      assert.deepEqual(events, [], 'A stale response must not emit session_cleared');
      assert.equal(welinkClient.hasValidSession(), true);
    } finally {
      unsubscribe();
    }
  });

  await t.test('18. Direct re-login supersedes pending requests even without clearSession', async () => {
    await loginAs('BEFORE_RELOGIN', 'before-user');
    let delayed = null;
    mockNetworkHandler = (opts) => { delayed = opts; };
    const pending = welinkClient.getTasteDetail(1);
    const rejected = assert.rejects(pending, { code: 'STALE_SESSION' });
    await loginAs('AFTER_RELOGIN', 'after-user');
    const expected = { ...welinkClient.getSession() };
    delayed.success({ statusCode: 401, data: { code: 401, msg: 'expired' } });
    await rejected;
    assert.deepEqual(welinkClient.getSession(), expected);
    assert.deepEqual(storage.mz_welink_session, expected);
    let cookieSent = '';
    mockNetworkHandler = (opts) => {
      cookieSent = opts.header.Cookie;
      opts.success({ statusCode: 200, data: { code: 0, data: { id: 2 } } });
    };
    assert.deepEqual(await welinkClient.getTasteDetail(2), { id: 2 });
    assert.equal(cookieSent, 'JSESSIONID=AFTER_RELOGIN');
  });

  await t.test('19. Stale success and malformed envelopes reject before processing and cannot overwrite the new session', async () => {
    await loginAs('RESPONSE_GUARD_OLD', 'old-user');
    const delayed = [];
    mockNetworkHandler = (opts) => { delayed.push(opts); };
    const replies = [
      { statusCode: 200, data: { code: 0, data: { id: 1 } } },
      { statusCode: 200, data: { code: 401, msg: 'old business error' } },
      { statusCode: 200, data: '<html>old gateway page</html>' }
    ];
    const rejections = replies.map(() =>
      assert.rejects(welinkClient.getTasteDetail(1), { code: 'STALE_SESSION' }));
    welinkClient.clearSession();
    await loginAs('RESPONSE_GUARD_NEW', 'new-user');
    const expected = { ...welinkClient.getSession() };
    replies.forEach((reply, i) => delayed[i].success({
      ...reply, header: { 'Set-Cookie': 'JSESSIONID=STALE_COOKIE' }
    }));
    await Promise.all(rejections);
    assert.deepEqual(welinkClient.getSession(), expected);
    assert.deepEqual(storage.mz_welink_session, expected);
  });

  await t.test('20. A base-only change rejects old 401 before clearing session or emitting an event', async () => {
    await loginAs('BASE_GUARD', 'base-user');
    const expected = { ...welinkClient.getSession() };
    const previousBase = config.WELINK_BASE_URL;
    let delayed = null;
    mockNetworkHandler = (opts) => { delayed = opts; };
    const pending = welinkClient.getTasteDetail(1);
    const rejected = assert.rejects(pending, { code: 'STALE_SESSION' });
    const events = [];
    const unsubscribe = welinkClient.addSessionListener(event => events.push(event));
    try {
      // Do not call getSession here: this exercises the response's base guard alone.
      config.WELINK_BASE_URL = 'https://other.example.com';
      delayed.success({ statusCode: 401, data: { code: 401, msg: 'old host' } });
      await rejected;
      assert.deepEqual(events, []);
      assert.deepEqual(storage.mz_welink_session, expected);
    } finally {
      config.WELINK_BASE_URL = previousBase;
      unsubscribe();
    }
    assert.deepEqual(welinkClient.getSession(), expected);
  });

  await t.test('21. The first request after a base switch captures generation after session isolation', async () => {
    await loginAs('FIRST_REQUEST_OLD_BASE', 'old-base-user');
    const previousBase = config.WELINK_BASE_URL;
    let sent = null;
    try {
      config.WELINK_BASE_URL = 'https://other.example.com';
      mockNetworkHandler = (opts) => {
        sent = opts;
        opts.success({ statusCode: 200, data: { code: 0, data: { id: 1 } } });
      };
      assert.deepEqual(await welinkClient.request({ url: '/taste/applet/tastes/1' }), { id: 1 });
      assert.equal(sent.url, 'https://other.example.com/taste/applet/tastes/1');
      assert.equal(sent.header.Cookie, undefined);
      sent = null;
      await assert.rejects(welinkClient.getTasteDetail(1), error => error.code === 401);
      assert.equal(sent, null, 'Private API wrappers must not send an anonymous request after switching backends');
    } finally {
      config.WELINK_BASE_URL = previousBase;
      welinkClient.clearSession();
    }
  });

  await t.test('22. Login with wx.getUserProfile routes to /taste/userInfo/wxLogin with avatarUrl, nickName, sex', async () => {
    welinkClient.clearSession();
    let capturedRequest = null;
    mockNetworkHandler = (opts) => {
      capturedRequest = opts;
      opts.success({
        statusCode: 200,
        header: { 'Set-Cookie': 'JSESSIONID=WX_LOGIN_USER_INFO_COOKIE; Path=/; HttpOnly' },
        data: {
          code: 0,
          msg: 'ok',
          data: {
            openid: 'wx_user_openid_999',
            nickname: '微信品酒师'
          }
        }
      });
    };

    const originalGetUserProfile = global.wx.getUserProfile;
    global.wx.getUserProfile = ({ desc, success }) => {
      assert.equal(desc, '用于完善个人信息');
      success({
        userInfo: {
          avatarUrl: 'https://wx.qlogo.cn/mock/avatar.jpg',
          nickname: '微信品酒师',
          sex: 1
        }
      });
    };

    const session = await welinkClient.login();
    assert.equal(capturedRequest.url, 'https://applet.51welink.com/taste/userInfo/wxLogin');
    assert.equal(capturedRequest.method, 'POST');
    assert.deepEqual(capturedRequest.data, {
      code: capturedRequest.data.code,
      avatarUrl: 'https://wx.qlogo.cn/mock/avatar.jpg',
      nickName: '微信品酒师',
      sex: 1
    });
    assert.equal(session.openid, 'wx_user_openid_999');
    assert.equal(session.nickname, '微信品酒师');
    assert.equal(session.cookie, 'JSESSIONID=WX_LOGIN_USER_INFO_COOKIE');
    global.wx.getUserProfile = originalGetUserProfile;
    welinkClient.clearSession();
  });
});
