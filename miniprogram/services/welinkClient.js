/**
 * welinkClient.js - 51welink 品鉴后台 (/taste/applet) HTTP 请求与会话客户端
 *
 * 核心设计：
 * 1. 会话隔离与显式 Cookie 维护：保存 Set-Cookie (JSESSIONID)，按基地址隔离。
 * 2. 来源安全：默认 HTTPS，仅在显式开发开关开启且 envVersion 为 develop 或 devtools 时，才允许本地/局域网 HTTP。
 * 3. 登录单飞 (in-flight single-flight)：并发调用 login() 时复用同一个 Promise，避免并发换 code 导致无效。
 * 4. 401 自动清理会话并触发会话失效回调。
 * 5. GET 失败不自动重试写接口；超时设置；参数与响应格式严格校验。
 */
const config = require('../config');

const DEFAULT_SAFE_BASE_URL = 'https://applet.51welink.com';

let currentSession = createEmptySession();
let activeBaseUrlCache = '';
let sessionGeneration = 1;

function getSessionGeneration() {
  return sessionGeneration;
}

function createEmptySession(baseUrl = '') {
  return {
    cookie: '',
    baseUrl: baseUrl || resolveBaseUrl(),
    openid: '',
    nickname: ''
  };
}

let inFlightLoginPromise = null;
const sessionListeners = new Set();

function addSessionListener(fn) {
  if (typeof fn === 'function') sessionListeners.add(fn);
  return () => sessionListeners.delete(fn);
}

function notifySessionListeners(event, data) {
  sessionListeners.forEach(fn => {
    try { fn(event, data); } catch (e) { console.error('Session listener error:', e); }
  });
}

function parseHttpUrl(inputUrl) {
  if (typeof inputUrl !== 'string') return null;
  const trimmed = inputUrl.trim();
  if (!trimmed) return null;
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\/([^/?#]+)(.*)$/.exec(trimmed);
  if (!m) return null;
  const scheme = m[1].toLowerCase();
  const authority = m[2];
  const rest = m[3] || '';

  if (authority.indexOf('@') !== -1) {
    return null;
  }

  let host = authority;
  let port = '';
  const colonIdx = authority.lastIndexOf(':');
  if (colonIdx !== -1) {
    host = authority.slice(0, colonIdx);
    port = authority.slice(colonIdx + 1);
    if (!/^\d+$/.test(port)) return null;
    const portNum = Number(port);
    if (portNum < 1 || portNum > 65535) return null;
  }
  if (!host) return null;

  let path = '';
  let query = '';
  let hash = '';
  const hashIdx = rest.indexOf('#');
  let pathAndQuery = rest;
  if (hashIdx !== -1) {
    hash = rest.slice(hashIdx);
    pathAndQuery = rest.slice(0, hashIdx);
  }
  const queryIdx = pathAndQuery.indexOf('?');
  if (queryIdx !== -1) {
    query = pathAndQuery.slice(queryIdx);
    path = pathAndQuery.slice(0, queryIdx);
  } else {
    path = pathAndQuery;
  }

  return {
    scheme,
    host,
    port,
    path,
    query,
    hash
  };
}

function isStrictPrivateDevHost(host) {
  if (typeof host !== 'string') return false;
  const h = host.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1') return true;
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h);
  if (!m) return false;
  const octets = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (octets.some(n => n < 0 || n > 255 || isNaN(n))) return false;

  if (octets[0] === 10) return true;
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  if (octets[0] === 192 && octets[1] === 168) return true;

  return false;
}

function sanitizeHttpsBaseUrl(inputUrl) {
  const parsed = parseHttpUrl(inputUrl);
  if (!parsed) return null;
  if (parsed.scheme !== 'https') return null;
  if (parsed.query || parsed.hash) return null;
  if (parsed.path && parsed.path !== '/') return null;
  return 'https://' + parsed.host.toLowerCase() + (parsed.port ? (':' + parsed.port) : '');
}

/**
 * 校验并获取当前生效的 Base URL
 */
function resolveBaseUrl() {
  const safeDefault = sanitizeHttpsBaseUrl(config.WELINK_BASE_URL) || DEFAULT_SAFE_BASE_URL;
  
  if (config.ALLOW_INSECURE_DEV_HTTP && config.DEV_HTTP_OVERRIDE_URL) {
    let envVersion = 'release';
    try {
      if (typeof wx !== 'undefined' && wx.getAccountInfoSync) {
        const info = wx.getAccountInfoSync();
        envVersion = (info && info.miniProgram && info.miniProgram.envVersion) || 'release';
      }
    } catch (e) {
      envVersion = 'release';
    }
    
    const isDevEnv = envVersion === 'develop' || envVersion === 'devtools';
    const parsedOverride = parseHttpUrl(config.DEV_HTTP_OVERRIDE_URL);
    if (isDevEnv && parsedOverride) {
      if (parsedOverride.scheme === 'http' &&
          !parsedOverride.query &&
          !parsedOverride.hash &&
          (!parsedOverride.path || parsedOverride.path === '/') &&
          isStrictPrivateDevHost(parsedOverride.host)) {
        return 'http://' + parsedOverride.host.toLowerCase() + (parsedOverride.port ? (':' + parsedOverride.port) : '');
      }
    }
    console.warn('【盲酌】未在受信任开发环境下或地址非法，禁止非安全 HTTP 覆盖，已强制使用安全地址');
  }

  return safeDefault;
}

/**
 * 从本地存储恢复会话
 */
function restoreSession() {
  const activeBase = resolveBaseUrl();
  if (activeBaseUrlCache && activeBaseUrlCache !== activeBase) {
    clearSession();
    activeBaseUrlCache = activeBase;
    return currentSession;
  }
  activeBaseUrlCache = activeBase;

  try {
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
      const saved = wx.getStorageSync('mz_welink_session');
      if (saved && saved.baseUrl === activeBase && saved.cookie && saved.openid) {
        currentSession = saved;
        return currentSession;
      }
    }
  } catch (e) {
    console.warn('Failed to restore session:', e);
  }
  currentSession = createEmptySession(activeBase);
  return currentSession;
}

/**
 * 保存会话到内存与存储
 */
function persistSession(session) {
  currentSession = Object.assign({}, session);
  activeBaseUrlCache = currentSession.baseUrl;
  try {
    if (typeof wx !== 'undefined' && wx.setStorageSync) {
      wx.setStorageSync('mz_welink_session', currentSession);
    }
  } catch (e) {
    console.warn('Failed to persist session:', e);
  }
}

/**
 * 清除会话（如 401 或主动登出）
 */
function clearSession() {
  sessionGeneration++;
  const activeBase = resolveBaseUrl();
  currentSession = createEmptySession(activeBase);
  activeBaseUrlCache = activeBase;
  try {
    if (typeof wx !== 'undefined' && wx.removeStorageSync) {
      wx.removeStorageSync('mz_welink_session');
    }
  } catch (e) {
    console.warn('Failed to clear session:', e);
  }
  notifySessionListeners('session_cleared', null);
}

function getSession() {
  const activeBase = resolveBaseUrl();
  if (activeBaseUrlCache && activeBaseUrlCache !== activeBase) {
    clearSession();
    return currentSession;
  }
  if (!currentSession.cookie) {
    restoreSession();
  }
  return currentSession;
}

function hasValidSession() {
  const s = getSession();
  if (!s || !s.cookie || !s.openid) return false;
  const token = getBearerToken(s);
  if (!token) return true;
  const expiresAt = getJwtExpiresAt(token);
  if (expiresAt !== null && expiresAt <= Date.now()) {
    clearSession();
    return false;
  }
  return true;
}

// wxLogin 返回 JWT accessToken，而不是服务端 Set-Cookie。
function getBearerToken(session) {
  if (!session || typeof session.cookie !== 'string') return '';
  const match = session.cookie.match(/^(?:token|accessToken)=(.+)$/i);
  return match ? match[1] : '';
}

function getJwtExpiresAt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    let decoded;
    if (typeof Buffer !== 'undefined') {
      decoded = Buffer.from(padded, 'base64').toString('utf8');
    } else if (typeof wx !== 'undefined' && wx.base64ToArrayBuffer && typeof TextDecoder !== 'undefined') {
      decoded = new TextDecoder().decode(wx.base64ToArrayBuffer(padded));
    } else {
      return null;
    }
    const payload = JSON.parse(decoded);
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch (_) {
    return null;
  }
}

/**
 * 解析并提取 Set-Cookie 中的 JSESSIONID（支持 res.cookies 与 header）
 */
function isSuccessResponse(respData) {
  if (!respData || typeof respData !== 'object' || Array.isArray(respData)) return false;
  const code = respData.code;
  const msg = typeof respData.msg === 'string' ? respData.msg.trim() : '';

  // 涵盖常见成功业务状态码（0, 200, "0", "200", "00000"）
  if (code === 0 || code === 200 || code === '0' || code === '200' || code === '00000') {
    return true;
  }
  if (respData.success === true) {
    return true;
  }
  // 服务端返回 "成功" / "操作成功" / "ok" 且无明确 4xx/5xx 错误码时视为成功
  if (msg === '成功' || msg === '操作成功' || msg.toLowerCase() === 'ok') {
    if (code !== 400 && code !== 401 && code !== 403 && code !== 500) {
      return true;
    }
  }
  return false;
}

function extractJSessionId(res) {
  if (!res) return '';

  if (Array.isArray(res.cookies)) {
    for (const item of res.cookies) {
      if (typeof item === 'string') {
        const m = item.match(/(?:^|;\s*)(JSESSIONID=[^;\s]+)/i);
        if (m) return m[1];
      } else if (item && typeof item === 'object') {
        const name = item.name || item.key;
        const value = item.value;
        if (name && String(name).toUpperCase() === 'JSESSIONID' && value) {
          return 'JSESSIONID=' + value;
        }
      }
    }
  }

  const body = res.data;
  if (body && typeof body === 'object') {
    const payload = body.data && typeof body.data === 'object' ? body.data : body;
    const token = payload.token || payload.accessToken || payload.access_token;
    if (token) return 'token=' + token;
    const sid = payload.sessionId || payload.session_id || payload.jsessionid || payload.JSESSIONID;
    if (sid) return 'JSESSIONID=' + sid;
  }

  const header = res.header || res.headers;
  if (!header) return '';

  let rawCookies = null;
  for (const k of Object.keys(header)) {
    if (k.toLowerCase() === 'set-cookie') {
      rawCookies = header[k];
      break;
    }
  }
  if (!rawCookies) return '';

  const cookieItems = Array.isArray(rawCookies) ? rawCookies : [rawCookies];
  for (const item of cookieItems) {
    const str = String(item || '');
    const m = str.match(/(?:^|;\s*)((?:JSESSIONID|SESSION|sid|token)=[^;\s]+)/i);
    if (m) return m[1];
  }
  for (const item of cookieItems) {
    const str = String(item || '').trim();
    if (str) {
      const firstPair = str.split(';')[0].trim();
      if (firstPair && firstPair.includes('=')) return firstPair;
    }
  }

  return '';
}

function validateAppletPath(path) {
  if (typeof path !== 'string') {
    throw new Error('请求路径必须是字符串');
  }
  const trimmed = path.trim();
  if (trimmed.startsWith('//') || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    throw new Error('禁止跨域或协议相对路径');
  }
  if (trimmed.indexOf('\\') !== -1) {
    throw new Error('禁止包含反斜杠路径');
  }
  if (!trimmed.startsWith('/taste/applet/') && !trimmed.startsWith('/taste/userInfo/')) {
    throw new Error('非法请求路径，必须以 /taste/applet/ 开头（或 /taste/userInfo/）');
  }
  const questionIdx = trimmed.indexOf('?');
  const purePath = questionIdx !== -1 ? trimmed.slice(0, questionIdx) : trimmed;

  let decodedPurePath = purePath;
  try {
    decodedPurePath = decodeURIComponent(purePath);
  } catch (e) {
    throw new Error('路径包含非法 URL 编码');
  }
  if (decodedPurePath.indexOf('\\') !== -1) {
    throw new Error('禁止包含反斜杠路径');
  }

  const segments = decodedPurePath.split('/');
  for (const seg of segments) {
    if (seg === '..' || seg === '.') {
      throw new Error('路径包含非法相对段');
    }
  }
  return trimmed;
}

/**
 * 通用底层 HTTP 请求包装
 */
function request(options) {
  const {
    url,
    method = 'GET',
    data = null,
    timeout = 10000,
    headers = {},
    raw = false // raw=true 时返回完整响应体（列表接口需要同级 count）
  } = options;

  const validatedPath = validateAppletPath(url);
  const baseUrl = resolveBaseUrl();
  const fullUrl = baseUrl + validatedPath;
  const s = getSession();
  // getSession 可能因基地址切换清理会话，需在隔离完成后记录代次。
  const requestGen = sessionGeneration;
  const requestBaseUrl = baseUrl;
  
  const reqHeaders = Object.assign({
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }, headers);

  // 不允许外部传入 header 覆盖内部维护的 Cookie 或 Authorization（大小写无关）
  for (const k of Object.keys(reqHeaders)) {
    const lower = k.toLowerCase();
    if (lower === 'cookie' || lower === 'authorization') {
      delete reqHeaders[k];
    }
  }

  if (s.cookie && s.baseUrl === baseUrl) {
    reqHeaders['Cookie'] = s.cookie;
    const bearerToken = getBearerToken(s);
    if (bearerToken) reqHeaders['Authorization'] = 'Bearer ' + bearerToken;
  }

  return new Promise((resolve, reject) => {
    if (typeof wx === 'undefined' || !wx.request) {
      return reject(new Error('wx.request 不可用'));
    }

    wx.request({
      url: fullUrl,
      method,
      data,
      header: reqHeaders,
      timeout,
      success(res) {
        // 旧响应必须先丢弃，尤其不能让旧 401 清理重新登录后的会话。
        if (requestGen !== sessionGeneration || requestBaseUrl !== resolveBaseUrl()) {
          const err = new Error('会话状态或基地址已变更，已丢弃过期请求响应');
          err.code = 'STALE_SESSION';
          return reject(err);
        }

        // 1. 状态码判断
        const statusCode = res.statusCode;
        if (statusCode === 401 || statusCode === 403) {
          clearSession();
          const err = new Error('登录会话已失效，请重新登录');
          err.statusCode = statusCode;
          err.code = statusCode;
          return reject(err);
        }

        if (statusCode < 200 || statusCode >= 300) {
          const errMsg = (res.data && res.data.msg) || ('服务请求异常 (' + statusCode + ')');
          const err = new Error(errMsg);
          err.statusCode = statusCode;
          err.code = (res.data && res.data.code) || statusCode;
          err.data = res.data;
          return reject(err);
        }

        // 2. 业务 code 与 JSON envelope 判断 (必须是对象、code===0 且 data 存在)
        const respData = res.data;
        if (!respData || typeof respData !== 'object' || Array.isArray(respData)) {
          const err = new Error('响应格式错误：非标准响应格式');
          err.statusCode = statusCode;
          err.data = respData;
          return reject(err);
        }

        if (!isSuccessResponse(respData)) {
          const err = new Error(respData.msg || '业务操作失败');
          err.code = respData.code;
          err.statusCode = statusCode;
          err.data = respData;
          return reject(err);
        }

        if (respData.data === undefined || respData.data === null) {
          const err = new Error('响应缺少业务数据 data');
          err.code = respData.code;
          err.statusCode = statusCode;
          err.data = respData;
          return reject(err);
        }

        // 3. 严格通过 HTTP/Envelope 检验后，再检查 generation/base guard 保存 cookie
        const newCookie = extractJSessionId(res);
        if (newCookie) {
          const currentBase = resolveBaseUrl();
          if (requestGen === sessionGeneration && requestBaseUrl === currentBase) {
            s.cookie = newCookie;
            s.baseUrl = currentBase;
            persistSession(s);
          }
        }

        if (raw) {
          return resolve(respData);
        }
        return resolve(respData.data);
      },
      fail(err) {
        const message = err.errMsg || '网络连接不可用，请稍后重试';
        const error = new Error(message);
        error.raw = err;
        reject(error);
      }
    });
  });
}

/**
 * 带鉴权的请求：取消自动重放与静默重试。
 * 任何请求遇到 401 或失败立即由底层 clearSession 并抛出错误供用户主动重登，
 * 彻底避免并发竞态及写请求重复执行。
 */
function requestWithAuth(options) {
  return request(options);
}

/**
 * 微信临时 code 登录（按规范使用 wx.getUserProfile 嵌套 wx.login，单飞并发保护）
 */
function login(userProfile) {
  if (inFlightLoginPromise) {
    return inFlightLoginPromise;
  }

  const baseUrl = resolveBaseUrl();
  const loginGen = sessionGeneration;
  const loginBaseUrl = baseUrl;

  inFlightLoginPromise = new Promise((resolve, reject) => {
    if (typeof wx === 'undefined') {
      return reject(new Error('wx 不可用'));
    }

    const doLoginWithProfile = (resTemp) => {
      if (!wx.login) {
        return reject(new Error('wx.login 不可用'));
      }
      wx.login({
        success(res) {
          if (!res.code) {
            return reject(new Error('未获取到微信登录凭证 code'));
          }
          let validatedPath;
          try {
            validatedPath = validateAppletPath('/taste/userInfo/wxLogin');
          } catch (e) {
            return reject(e);
          }

          if (typeof wx === 'undefined' || !wx.request) {
            return reject(new Error('wx.request 不可用'));
          }

          const userInfo = (resTemp && resTemp.userInfo) || {};
          const userNick = userInfo.nickname !== undefined ? userInfo.nickname : (userInfo.nickName || '');

          wx.request({
            url: baseUrl + validatedPath,
            method: 'POST',
            data: {
              code: res.code,
              avatarUrl: userInfo.avatarUrl || '',
              nickName: userNick,
              sex: userInfo.sex !== undefined ? userInfo.sex : 0
            },
            header: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 10000,
            success(httpRes) {
              const receivedNewCookie = extractJSessionId(httpRes);
              const statusCode = httpRes.statusCode;

              if (statusCode < 200 || statusCode >= 300) {
                clearSession();
                const errMsg = (httpRes.data && httpRes.data.msg) || ('登录服务异常 (' + statusCode + ')');
                const err = new Error(errMsg);
                err.statusCode = statusCode;
                err.code = (httpRes.data && httpRes.data.code) || statusCode;
                err.data = httpRes.data;
                return reject(err);
              }

              const respData = httpRes.data;
              if (!respData || typeof respData !== 'object' || Array.isArray(respData)) {
                clearSession();
                const err = new Error('登录响应格式错误：非标准响应格式');
                err.statusCode = statusCode;
                return reject(err);
              }

              if (!isSuccessResponse(respData)) {
                clearSession();
                const err = new Error(respData.msg || '登录失败');
                err.code = respData.code;
                err.statusCode = statusCode;
                err.data = respData;
                return reject(err);
              }

              const payload = (respData.data && typeof respData.data === 'object') ? respData.data : respData;
              const openid = payload.openid || respData.openid || payload.openId || respData.openId ||
                (payload.userInfo && (payload.userInfo.openid || payload.userInfo.openId)) ||
                (payload.user && (payload.user.openid || payload.user.openId)) || '';

              if (!openid) {
                clearSession();
                const err = new Error('后台未返回有效身份标识 openid');
                err.code = respData.code;
                return reject(err);
              }

              if (!receivedNewCookie) {
                clearSession();
                const err = new Error('登录未收到有效服务端会话凭证 (JSESSIONID)');
                return reject(err);
              }

              const currentBase = resolveBaseUrl();
              if (loginGen !== sessionGeneration || loginBaseUrl !== currentBase) {
                const err = new Error('登录过程中会话状态或基地址已变更，已丢弃本次登录响应');
                return reject(err);
              }

              const remoteNick = payload.nickname || payload.nickName || respData.nickname || respData.nickName ||
                (payload.userInfo && (payload.userInfo.nickname || payload.userInfo.nickName)) ||
                (payload.user && (payload.user.nickname || payload.user.nickName)) || '';
              const finalNick = remoteNick || userNick || '';

              const remoteAvatar = payload.avatarUrl || payload.avatar || respData.avatarUrl || respData.avatar ||
                (payload.userInfo && (payload.userInfo.avatarUrl || payload.userInfo.avatar)) || '';
              const finalAvatar = remoteAvatar || userInfo.avatarUrl || '';

              const newSession = {
                cookie: receivedNewCookie,
                baseUrl: baseUrl,
                openid: openid,
                nickname: finalNick,
                avatarUrl: finalAvatar
              };
              // 新登录替换身份时，使此前发出的请求全部过期。
              sessionGeneration++;
              persistSession(newSession);
              notifySessionListeners('logged_in', newSession);
              resolve(newSession);
            },
            fail(err) {
              clearSession();
              const message = err.errMsg || '微信登录网络不可用，请稍后重试';
              reject(new Error(message));
            }
          });
        },
        fail(err) {
          reject(new Error(err.errMsg || '微信登录失败'));
        }
      });
    };

    if (typeof wx.getUserProfile === 'function') {
      const useFallbackProfile = (err) => {
        const errMsg = (err && err.errMsg) || (err && err.message) || String(err || '');
        if (errMsg.indexOf('auth deny') !== -1 || errMsg.indexOf('cancel') !== -1) {
          return reject(new Error('已取消授权'));
        }
        // 隐私指引未生效或接口同步抛错时，仍继续用 wx.login 建立身份；资料取页面已有值。
        console.warn('【盲酌】wx.getUserProfile 暂不可用，使用页面已有资料继续登录:', errMsg);
        doLoginWithProfile({ userInfo: (userProfile && typeof userProfile === 'object') ? userProfile : {} });
      };
      try {
        wx.getUserProfile({
          desc: '用于完善个人信息',
          success: (resTemp) => {
            doLoginWithProfile(resTemp);
          },
          fail: useFallbackProfile
        });
      } catch (err) {
        useFallbackProfile(err);
      }
    } else {
      doLoginWithProfile({ userInfo: (userProfile && typeof userProfile === 'object') ? userProfile : {} });
    }
  }).finally(() => {
    inFlightLoginPromise = null;
  });

  return inFlightLoginPromise;
}

/**
 * 主动登出
 */
async function logout() {
  try {
    await request({
      url: '/taste/applet/logout',
      method: 'POST'
    });
  } catch (e) {
    console.warn('Backend logout error:', e);
  } finally {
    clearSession();
  }
  return { ok: true };
}

function parseStrictPositiveInteger(val) {
  if (typeof val === 'number') {
    if (Number.isInteger(val) && val > 0) return val;
    return null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^[1-9]\d*$/.test(trimmed)) {
      const num = Number(trimmed);
      if (Number.isSafeInteger(num) && num > 0) return num;
    }
  }
  return null;
}

function parseStrictScore(val) {
  if (val === null || val === undefined || val === false || val === true) {
    return null;
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val) && val >= 0 && val <= 100) return val;
    return null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (/^(0|[1-9]\d*)$/.test(trimmed)) {
      const num = Number(trimmed);
      if (num >= 0 && num <= 100) return num;
    }
  }
  return null;
}

function parseStrictPagination(val, defaultVal, maxVal) {
  const parsed = parseStrictPositiveInteger(val);
  const finalVal = parsed !== null ? parsed : defaultVal;
  if (maxVal && finalVal > maxVal) return maxVal;
  return finalVal;
}

/**
 * 同步用户昵称
 */
async function updateProfile(nickname) {
  const cleanNick = String(nickname || '').trim();
  if (!cleanNick) {
    throw new Error('昵称不能为空');
  }
  if (cleanNick.length > 50) {
    throw new Error('昵称长度不可超过 50 个字符');
  }
  // 线上资料注册接口就是 wxLogin，提交当前昵称并返回新的 accessToken。
  // 复用同一身份链路，避免依赖未部署的旧 /taste/applet/profile 接口。
  return login({ nickName: cleanNick });
}

/**
 * 获取在线品鉴活动列表
 */
async function getTasteList(page = 1, limit = 15) {
  const p = parseStrictPagination(page, 1);
  const l = parseStrictPagination(limit, 15, 50);
  
  // 列表接口的 count 与 data 同级，需取完整响应体
  const body = await requestWithAuth({
    url: '/taste/applet/tastes?page=' + p + '&limit=' + l,
    method: 'GET',
    raw: true
  });
  return {
    list: (body && body.data) || [],
    count: (body && body.count) || 0
  };
}

/**
 * 发起在线酒局
 */
async function createTaste(params) {
  const { title, names, authentication } = params || {};
  if (!title || !title.trim()) throw new Error('请填写酒局名称');
  const cleanTitle = title.trim();
  if (cleanTitle.length > 32) throw new Error('酒局名称不能超过 32 个字符');

  if (!Array.isArray(names) || names.length < 2 || names.length > 20) {
    throw new Error('请提供 2 至 20 款酒样');
  }
  const cleanNames = [];
  const seenNames = new Set();
  for (const n of names) {
    const str = String(n || '').trim();
    if (!str) throw new Error('酒样名称不能为空');
    if (str.length > 100) throw new Error('酒样名称不能超过 100 个字符');
    if (seenNames.has(str)) throw new Error('酒样名称不能重复');
    seenNames.add(str);
    cleanNames.push(str);
  }

  if (!authentication || !authentication.trim()) {
    throw new Error('请输入主持人口令');
  }
  const cleanAuth = authentication.trim();
  if (cleanAuth.length > 64) throw new Error('主持人口令不能超过 64 个字符');
  
  return await requestWithAuth({
    url: '/taste/applet/tastes',
    method: 'POST',
    data: {
      title: cleanTitle,
      names: cleanNames,
      authentication: cleanAuth
    }
  });
}

/**
 * 获取酒局详情
 */
async function getTasteDetail(id) {
  const tasteId = parseStrictPositiveInteger(id);
  if (!tasteId) throw new Error('酒局编号无效');
  return await requestWithAuth({
    url: '/taste/applet/tastes/' + tasteId,
    method: 'GET'
  });
}

/**
 * 提交品鉴竞猜与评分
 */
async function submitScores(id, answers) {
  const tasteId = parseStrictPositiveInteger(id);
  if (!tasteId) throw new Error('酒局编号无效');
  if (!Array.isArray(answers) || answers.length === 0) {
    throw new Error('请完成全部酒样的判断和评分');
  }

  const seenSampleIds = new Set();
  const formattedAnswers = [];

  for (const a of answers) {
    if (!a || typeof a !== 'object') {
      throw new Error('评分项格式无效');
    }
    const sampleId = parseStrictPositiveInteger(a.sampleId);
    if (!sampleId) {
      throw new Error('酒样编号无效');
    }
    if (seenSampleIds.has(sampleId)) {
      throw new Error('存在重复的酒样评分项');
    }
    seenSampleIds.add(sampleId);

    const guessedName = String(a.guessedName || '').trim();
    if (!guessedName) {
      throw new Error('请为每款酒样选择竞猜酒名');
    }
    if (guessedName.length > 100) {
      throw new Error('竞猜酒名长度不能超过 100 个字符');
    }

    const scoreNum = parseStrictScore(a.score);
    if (scoreNum === null) {
      throw new Error('评分为 0 至 100 的整数');
    }

    formattedAnswers.push({
      sampleId,
      guessedName,
      score: scoreNum
    });
  }

  return await requestWithAuth({
    url: '/taste/applet/tastes/' + tasteId + '/scores',
    method: 'POST',
    data: {
      answers: formattedAnswers
    }
  });
}

/**
 * 主持人结束酒局
 */
async function closeTaste(id) {
  const tasteId = parseStrictPositiveInteger(id);
  if (!tasteId) throw new Error('酒局编号无效');
  return await requestWithAuth({
    url: '/taste/applet/tastes/' + tasteId + '/close',
    method: 'POST'
  });
}

/**
 * 获取酒局揭晓结果
 */
async function getTasteResults(id) {
  const tasteId = parseStrictPositiveInteger(id);
  if (!tasteId) throw new Error('酒局编号无效');
  return await requestWithAuth({
    url: '/taste/applet/tastes/' + tasteId + '/results',
    method: 'GET'
  });
}

module.exports = {
  DEFAULT_SAFE_BASE_URL,
  parseHttpUrl,
  isStrictPrivateDevHost,
  sanitizeHttpsBaseUrl,
  validateAppletPath,
  extractJSessionId,
  parseStrictPositiveInteger,
  parseStrictScore,
  parseStrictPagination,
  resolveBaseUrl,
  getSession,
  hasValidSession,
  clearSession,
  addSessionListener,
  request,
  login,
  logout,
  updateProfile,
  getTasteList,
  createTaste,
  getTasteDetail,
  submitScores,
  closeTaste,
  getTasteResults
};
