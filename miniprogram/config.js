/**
 * config.js - 盲酌可配置项
 *
 * CLOUD_ENV_ID: 微信云开发环境 ID。
 *  - 留空 '' 表示使用 wx.cloud.DYNAMIC_CURRENT_ENV（开发者工具当前选定的环境）；
 *  - 未开通或未部署云环境时，身份服务自动保持游客模式，
 *    并在用户主动点击「微信登录」时给出明确失败提示，不影响本地功能。
 *
 * 完整配置与部署步骤见 docs/wechat-identity.md
 */
module.exports = {
  IDENTITY_PROVIDER: 'welink',
  DEFAULT_WELINK_BASE_URL: 'https://applet.51welink.com',
  WELINK_BASE_URL: 'https://applet.51welink.com',
  // 开发测试开关（仅限 develop / devtools 环境下调试局域网/localhost 使用，trial 与 release 环境即使置 true 也会被拦截）
  ALLOW_INSECURE_DEV_HTTP: false,
  DEV_HTTP_OVERRIDE_URL: '',
  CLOUD_ENV_ID: ''
};
