/**
 * card.js - 分享酒卡
 * 画布底部署上当前品鉴者的头像与昵称；头像异步加载，
 * 失败或超时自动降级为 emoji，从资料页返回后自动重绘新资料。
 */
const journal = require('../../services/journal');
const identity = require('../../services/identity');

Page({
  data: { note: null, imagePath: '', busy: false, profileCompleted: true, renderError: false },

  onLoad(options) {
    this.setData({ note: journal.get(options.id) || null });
  },

  onReady() {
    if (this.data.note) this.renderCard();
  },

  onShow() {
    this.setData({ profileCompleted: identity.hasCompletedProfile() });
    // 从资料页保存返回后，用最新头像昵称重绘酒卡
    if (this._rendered && this.data.note) this.renderCard();
  },

  goProfile() {
    wx.navigateTo({ url: '/pages/profile/profile' });
  },

  renderCard() {
    this.setData({ busy: true, imagePath: '', renderError: false });
    this._rendered = true;
    // 渲染令牌：资料页返回触发重绘时，作废旧渲染的异步回调，避免旧头像覆盖新卡
    const token = (this._renderToken = (this._renderToken || 0) + 1);
    const user = identity.getUser();
    this.createSelectorQuery().select('#poster').fields({ node: true, size: true }).exec(res => {
      try {
        if (token !== this._renderToken) return;
        if (!res[0] || !res[0].node) throw new Error('画布未就绪');
        const canvas = res[0].node;
        canvas.width = 750;
        canvas.height = 1200;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f7f3eb';
        ctx.fillRect(0, 0, 750, 1200);
        const n = this.data.note;
        const text = (value, x, y, size, color = '#28251f') => {
          ctx.fillStyle = color;
          ctx.font = size + 'px "Songti SC", "STSong", "SimSun", serif';
          ctx.fillText(value, x, y);
        };
        const wrap = (value, y, size, maxLines) => {
          let line = '', lines = [];
          ctx.font = size + 'px "Songti SC", "STSong", "SimSun", serif';
          for (const char of String(value || '')) {
            const br = char === String.fromCharCode(10);
            if (ctx.measureText(line + char).width > 630 || br) {
              lines.push(line);
              line = '';
            }
            if (!br) line += char;
          }
          if (line) lines.push(line);
          if (lines.length > maxLines) {
            lines = lines.slice(0, maxLines);
            let last = lines[maxLines - 1];
            while (last && ctx.measureText(last + '…').width > 630) last = last.slice(0, -1);
            lines[maxLines - 1] = last + '…';
          }
          lines.forEach(row => { text(row, 60, y, size); y += size * 1.6; });
          return y;
        };
        text('盲酌', 155, 95, 46);
        text('白酒品鉴手记', 450, 90, 24, '#893e32');
        ctx.fillStyle = '#cfc3b0';
        ctx.fillRect(60, 125, 630, 1);
        text([n.date, n.aromaType].filter(Boolean).join(' · '), 60, 180, 24, '#897b68');
        let y = wrap(n.title, 255, 42, 2) + 22;
        [['闻香', n.aroma], ['入口', n.taste], ['回味', n.finish]].forEach(pair => {
          text(pair[0], 60, y, 24, '#893e32');
          y += 37;
          y = wrap(pair[1] || '未记录', y, 26, 2) + 15;
        });
        if (n.note) {
          text('品鉴随记', 60, y + 8, 24, '#893e32');
          wrap(n.note, y + 45, 24, 3);
        }
        text('只凭味道 · 记录这一杯', 60, 1150, 23, '#897b68');

        const exportCard = () => {
          if (token !== this._renderToken) return;
          wx.canvasToTempFilePath({
            canvas,
            success: r => {
              if (token !== this._renderToken) return;
              this.setData({ imagePath: r.tempFilePath, busy: false });
            },
            fail: () => { if (token === this._renderToken) this.failed(); }
          }, this);
        };

        // 品鉴者署名：头像图片异步加载（失败/超时降级 emoji），完成后导出
        const drawAuthor = () => {
          identity.drawCanvasAvatar(canvas, ctx, 62, 1070, 26, user.avatar, () => token === this._renderToken)
            .then(() => {
              if (token !== this._renderToken) return;
              ctx.fillStyle = '#cfc3b0';
              ctx.fillRect(60, 1048, 630, 1);
              ctx.font = '24px "Songti SC", "STSong", "SimSun", serif';
              ctx.fillStyle = '#28251f';
              ctx.fillText(user.nickname || '匿名品鉴客', 126, 1092, 560);
              text('盲酌品鉴者', 126, 1118, 20, '#897b68');
              exportCard();
            })
            .catch(() => { if (token === this._renderToken) exportCard(); });
        };

        // logo 同样走带超时的加载器，避免极端情况下酒卡一直 busy
        identity.loadCanvasImage(canvas, '/assets/brand/libai.png').then(img => {
          if (token !== this._renderToken) return;
          if (img) ctx.drawImage(img, 55, 30, 90, 90);
          drawAuthor();
        }).catch(() => { if (token === this._renderToken) drawAuthor(); });
      } catch (e) {
        this.failed();
      }
    });
  },

  onUnload() { this._renderToken = (this._renderToken || 0) + 1; },

  failed() {
    this.setData({ busy: false, renderError: true });
    wx.showToast({ title: '酒卡生成失败，可点击重试', icon: 'none' });
  },

  // 由 <button open-type="agreePrivacyAuthorization"> 触发：
  // 用户未同意隐私协议时微信客户端先弹官方授权弹窗，同意后才回调；已同意则直接回调。
  save() {
    if (!this.data.imagePath) return this.renderCard();
    const saveToAlbum = () => {
      wx.saveImageToPhotosAlbum({
      filePath: this.data.imagePath,
      success: () => wx.showToast({ title: '已保存到相册' }),
      fail: () => wx.showModal({
        title: '未能保存',
        content: '你可以长按酒卡保存，或在设置中允许保存到相册。',
        confirmText: '打开设置',
        success: r => { if (r.confirm) wx.openSetting({}); }
      })
    });
    };

    saveToAlbum();
  },

  preview() {
    if (this.data.imagePath) wx.previewImage({ urls: [this.data.imagePath] });
  },

  onShareAppMessage() {
    const n = this.data.note;
    return {
      title: (n && n.title ? n.title + ' · ' : '') + '盲酌品鉴手记',
      path: '/pages/index/index',
      imageUrl: this.data.imagePath || '/assets/brand/libai-home.png'
    };
  },

  home() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
