#!/usr/bin/env node
'use strict';

const http = require('node:http');
const https = require('node:https');
const { URL } = require('node:url');

const DEFAULT_BASE_URL = 'https://applet.51welink.com';
const DEFAULT_TIMEOUT_MS = 5000;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 60000;
const MAX_RESPONSE_BYTES = 512 * 1024;

function printHelp() {
  const helpText = `用法:
  node scripts/check-welink-deployment.cjs [选项]

选项:
  --base-url <url>        设置探针基地址 (默认: ${DEFAULT_BASE_URL})
                          必须是合法绝对 URL，协议须为 HTTPS (HTTP 仅限 loopback 且需配合 --allow-local-http)
                          基地址禁止包含用户信息 (userinfo)、查询参数 (query) 或哈希片段 (hash)
  --timeout-ms <ms>       每个请求的超时毫秒数 (默认: ${DEFAULT_TIMEOUT_MS}ms, 范围: ${MIN_TIMEOUT_MS} - ${MAX_TIMEOUT_MS}ms 整数)
  --allow-local-http      仅允许在针对本地回环地址 (localhost, 127.0.0.1, ::1) 时使用 http:// 协议
  --json                  输出机器可读的结构化 JSON 报告
  -h, --help              打印帮助信息并退出 (退出码 0)

退出码:
  0 - 所有检查项全部通过预期 (新接口返回 401 JSON，旧端点安全未授权/拒绝)
  1 - 参数错误、网络失败、未部署、状态码不符合预期、返回 HTML 或重定向等任一检查项失败`;
  process.stdout.write(helpText + '\n');
}

function parseTimeoutArg(rawVal) {
  if (rawVal === undefined || rawVal === null || rawVal.trim() === '') {
    throw new Error('--timeout-ms 参数值不能为空');
  }
  const trimmed = rawVal.trim();
  const num = Number(trimmed);
  if (!Number.isInteger(num) || num < MIN_TIMEOUT_MS || num > MAX_TIMEOUT_MS) {
    throw new Error(`--timeout-ms 必须是 ${MIN_TIMEOUT_MS} 到 ${MAX_TIMEOUT_MS} 之间的整数`);
  }
  return num;
}

function parseArgs(args) {
  let baseUrl = DEFAULT_BASE_URL;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let allowLocalHttp = false;
  let jsonOutput = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      printHelp();
      process.exit(0);
    } else if (arg === '--base-url') {
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
        throw new Error('--base-url 需要提供有效的参数值');
      }
      baseUrl = args[++i];
    } else if (arg.startsWith('--base-url=')) {
      baseUrl = arg.slice('--base-url='.length);
    } else if (arg === '--timeout-ms') {
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
        throw new Error('--timeout-ms 需要提供有效的整数参数值');
      }
      timeoutMs = parseTimeoutArg(args[++i]);
    } else if (arg.startsWith('--timeout-ms=')) {
      timeoutMs = parseTimeoutArg(arg.slice('--timeout-ms='.length));
    } else if (arg === '--allow-local-http') {
      allowLocalHttp = true;
    } else if (arg === '--json') {
      jsonOutput = true;
    } else {
      throw new Error(`未知参数: ${arg}，请使用 --help 查看用法`);
    }
  }

  return { baseUrl, timeoutMs, allowLocalHttp, jsonOutput };
}

function validateAndNormalizeBaseUrl(inputUrl, allowLocalHttp) {
  let parsed;
  try {
    parsed = new URL(inputUrl);
  } catch (err) {
    throw new Error(`基地址解析失败: ${err.message}`);
  }

  if (parsed.username || parsed.password) {
    throw new Error('基地址禁止包含用户信息 (userinfo)');
  }

  if (parsed.search && parsed.search !== '') {
    throw new Error('基地址禁止包含查询参数 (query / search)');
  }

  if (parsed.hash && parsed.hash !== '') {
    throw new Error('基地址禁止包含哈希片段 (hash)');
  }

  let hostname = parsed.hostname;
  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    hostname = hostname.slice(1, -1);
  }

  const isLoopback = hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1';

  if (parsed.protocol === 'https:') {
    // HTTPS 允许所有合法 host
  } else if (parsed.protocol === 'http:') {
    if (!isLoopback) {
      throw new Error(`禁止使用 HTTP 明文协议访问远端主机 (${parsed.hostname})，仅允许使用 HTTPS`);
    }
    if (!allowLocalHttp) {
      throw new Error('本地 HTTP 访问必须显式指定 --allow-local-http 参数');
    }
  } else {
    throw new Error(`不支持的协议: ${parsed.protocol}，仅支持 https: (或本地 http:)`);
  }

  let normalized = parsed.origin;
  if (parsed.pathname && parsed.pathname !== '/') {
    normalized += parsed.pathname.replace(/\/+$/, '');
  }
  return normalized;
}

function makeGetRequest(targetUrl, timeoutMs) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const transport = urlObj.protocol === 'https:' ? https : http;

    let timer = null;
    let settled = false;

    function cleanup() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function safeReject(err) {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    }

    function safeResolve(val) {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(val);
    }

    timer = setTimeout(() => {
      safeReject(new Error(`请求超时 (超过 ${timeoutMs}ms)`));
      try {
        req.destroy();
      } catch (_) {}
    }, timeoutMs);

    const req = transport.get(urlObj, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Welink-Deployment-Checker/1.0',
        'Connection': 'close'
      }
    }, (res) => {
      let totalBytes = 0;
      const chunks = [];

      res.on('data', (chunk) => {
        totalBytes += chunk.length;
        if (totalBytes > MAX_RESPONSE_BYTES) {
          try {
            res.destroy();
            req.destroy();
          } catch (_) {}
          safeReject(new Error(`响应体超出最大允许大小 (${MAX_RESPONSE_BYTES} 字节)`));
        } else {
          chunks.push(chunk);
        }
      });

      res.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf8');
        safeResolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          rawBody
        });
      });

      res.on('error', (err) => {
        safeReject(err);
      });

      res.on('aborted', () => {
        safeReject(new Error('响应连接意外中断 (res aborted)'));
      });
    });

    req.on('error', (err) => {
      safeReject(err);
    });
  });
}

const CHECK_TASKS = [
  {
    id: 'taste_applet_tastes',
    name: '新接口匿名品鉴列表探测',
    path: '/taste/applet/tastes',
    description: '未登录匿名访问新增的小程序品鉴列表，期望返回 HTTP 401 且 JSON code=401',
    validate(res) {
      const { statusCode, headers, rawBody } = res;

      if (statusCode >= 300 && statusCode < 400) {
        return {
          pass: false,
          reason: `检测到重定向 (HTTP ${statusCode} -> ${headers.location || '未知'})`
        };
      }

      if (statusCode === 404) {
        return {
          pass: false,
          reason: '收到 HTTP 404：新接口公开路径不可用，请检查部署版本与 /taste/applet/** 网关路由'
        };
      }

      const contentType = (headers['content-type'] || '').toLowerCase();
      const isHtml = contentType.includes('text/html') || /<html[\s>]/i.test(rawBody);
      if (isHtml) {
        return {
          pass: false,
          reason: `响应为 HTML 页面 (Content-Type: ${contentType})，非预期的新接口 JSON 响应`
        };
      }

      if (statusCode !== 401) {
        return {
          pass: false,
          reason: `HTTP 状态码为 ${statusCode}，非预期的 HTTP 401 Unauthorized`
        };
      }

      let parsed;
      try {
        parsed = JSON.parse(rawBody);
      } catch (err) {
        return {
          pass: false,
          reason: `响应体非合法 JSON: ${err.message} (body: ${rawBody.slice(0, 100)})`
        };
      }

      if (parsed && typeof parsed === 'object' && parsed.code === 401) {
        return {
          pass: true,
          details: `HTTP ${statusCode}, 业务 code=${parsed.code}, msg="${parsed.msg || ''}"`
        };
      }

      return {
        pass: false,
        reason: `JSON 响应体未包含预期的 code: 401 (实际响应: ${JSON.stringify(parsed).slice(0, 150)})`
      };
    }
  },
  {
    id: 'legacy_gettaste',
    name: '旧端品鉴详情安全读取探测',
    path: '/taste/wechat/gettaste?id=0&sort=',
    description: '未登录匿名访问旧端品鉴详情读取接口，期望因未登录返回 HTTP 200且code为非0数字且msg=relogin，或HTTP 401/403',
    validate(res) {
      return validateLegacyEndpoint(res, 'gettaste');
    }
  },
  {
    id: 'legacy_gettastetype',
    name: '旧端任务信息安全读取探测',
    path: '/taste/wechat/gettastetype?tasteId=0',
    description: '未登录访问旧端任务类型读取接口，测试空/无效 id=0，期望HTTP 200且code为非0数字且msg=relogin，或HTTP 401/403',
    validate(res) {
      return validateLegacyEndpoint(res, 'gettastetype');
    }
  },
  {
    id: 'legacy_getcolumns',
    name: '旧端投票表头安全读取探测',
    path: '/taste/wechat/getcolumns?tasteId=0',
    description: '未登录访问旧端表头信息读取接口，测试空/无效 tasteId=0，期望HTTP 200且code为非0数字且msg=relogin，或HTTP 401/403',
    validate(res) {
      return validateLegacyEndpoint(res, 'getcolumns');
    }
  }
];

function validateLegacyEndpoint(res, endpointName) {
  const { statusCode, headers, rawBody } = res;

  if (statusCode >= 300 && statusCode < 400) {
    return {
      pass: false,
      reason: `检测到重定向 (HTTP ${statusCode} -> ${headers.location || '未知'})`
    };
  }

  if (statusCode === 404) {
    return {
      pass: false,
      reason: '旧端读取路径收到 HTTP 404 Not Found'
    };
  }

  const contentType = (headers['content-type'] || '').toLowerCase();
  const isHtml = contentType.includes('text/html') || /<html[\s>]/i.test(rawBody);
  if (isHtml) {
    return {
      pass: false,
      reason: `旧端响应为 HTML 内容 (Content-Type: ${contentType})`
    };
  }

  if (statusCode === 401 || statusCode === 403) {
    return {
      pass: true,
      details: `HTTP ${statusCode} (端点在传输层拒绝匿名请求)`
    };
  }

  if (statusCode === 200) {
    let parsed;
    try {
      parsed = JSON.parse(rawBody);
    } catch (err) {
      return {
        pass: false,
        reason: `HTTP 200 但响应体非合法 JSON: ${err.message}`
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        pass: false,
        reason: 'HTTP 200 响应解析后非标准 JSON 对象'
      };
    }

    if (!Number.isInteger(parsed.code)) {
      return {
        pass: false,
        reason: `HTTP 200 响应缺少整数 code 字段 (实际: ${JSON.stringify(parsed).slice(0, 100)})`
      };
    }

    if (parsed.code === 0) {
      return {
        pass: false,
        reason: '严重异常: 匿名请求返回了 HTTP 200 且业务 code=0，未按约定拒绝'
      };
    }

    if (parsed.msg === 'relogin') {
      return {
        pass: true,
        details: `HTTP 200, 业务错误码 code=${parsed.code}, msg="relogin"`
      };
    }

    return {
      pass: false,
      reason: `HTTP 200 但未返回预期的未授权鉴权拦截 msg="relogin" (实际 msg: "${parsed.msg || ''}", code: ${parsed.code})`
    };
  }

  return {
    pass: false,
    reason: `HTTP ${statusCode} 状态异常：旧端只允许 HTTP 401/403 或 HTTP 200 带 relogin，其他 4xx/5xx 一律判定失败`
  };
}

async function run() {
  let parsedConfig;
  try {
    parsedConfig = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`错误: ${err.message}\n\n`);
    printHelp();
    process.exit(1);
  }

  const { baseUrl: rawBaseUrl, timeoutMs, allowLocalHttp, jsonOutput } = parsedConfig;

  let validatedBaseUrl;
  try {
    validatedBaseUrl = validateAndNormalizeBaseUrl(rawBaseUrl, allowLocalHttp);
  } catch (err) {
    if (jsonOutput) {
      process.stdout.write(JSON.stringify({
        success: false,
        error: err.message,
        timestamp: new Date().toISOString()
      }, null, 2) + '\n');
    } else {
      process.stderr.write(`[配置错误] ${err.message}\n`);
    }
    process.exit(1);
  }

  const results = [];
  let allPassed = true;

  if (!jsonOutput) {
    process.stdout.write('============================================================\n');
    process.stdout.write(' Welink 后端部署状态只读探测\n');
    process.stdout.write(` 目标基地址: ${validatedBaseUrl}\n`);
    process.stdout.write(` 请求超时限制: ${timeoutMs}ms\n`);
    process.stdout.write(' 安全模式: 仅限只读 GET / 无 Cookie / 不追踪重定向\n');
    process.stdout.write('============================================================\n\n');
  }

  for (const task of CHECK_TASKS) {
    const targetUrl = validatedBaseUrl + task.path;
    const taskResult = {
      id: task.id,
      name: task.name,
      url: targetUrl,
      path: task.path,
      passed: false,
      statusCode: null,
      error: null,
      details: null
    };

    try {
      const response = await makeGetRequest(targetUrl, timeoutMs);
      taskResult.statusCode = response.statusCode;
      const validation = task.validate(response);
      taskResult.passed = validation.pass;
      if (validation.pass) {
        taskResult.details = validation.details;
      } else {
        taskResult.error = validation.reason;
        allPassed = false;
      }
    } catch (err) {
      taskResult.passed = false;
      taskResult.error = err.message || String(err);
      allPassed = false;
    }

    results.push(taskResult);

    if (!jsonOutput) {
      const statusIcon = taskResult.passed ? '[PASS]' : '[FAIL]';
      process.stdout.write(`${statusIcon} ${task.name}\n`);
      process.stdout.write(`       路径: ${task.path}\n`);
      if (taskResult.passed) {
        process.stdout.write(`       结果: ${taskResult.details}\n\n`);
      } else {
        process.stdout.write(`       原因: ${taskResult.error}\n\n`);
      }
    }
  }

  if (jsonOutput) {
    const report = {
      success: allPassed,
      baseUrl: validatedBaseUrl,
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length
      },
      results
    };
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    process.stdout.write('------------------------------------------------------------\n');
    if (allPassed) {
      process.stdout.write('探测结论: 匿名响应检查通过，仍需真实登录与数据库业务联调。\n');
    } else {
      process.stdout.write('探测结论: 存在未通过项。若新端点返回 404，表明新增代码尚未部署或网关路由未生效。\n');
    }
    process.stdout.write('============================================================\n');
  }

  process.exit(allPassed ? 0 : 1);
}

if (require.main === module) {
  run();
}

module.exports = {
  validateAndNormalizeBaseUrl,
  makeGetRequest,
  CHECK_TASKS,
  validateLegacyEndpoint
};
