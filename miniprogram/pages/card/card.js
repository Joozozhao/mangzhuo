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
        ctx.fillStyle = '#f7f6ef';
        ctx.fillRect(0, 0, 750, 1200);
        const n = this.data.note;
        ctx.strokeStyle = '#b9c5b1';
        ctx.lineWidth = 1;
        ctx.strokeRect(22, 22, 706, 1156);
        const text = (value, x, y, size, color = '#28382e', weight = '') => {
          ctx.fillStyle = color;
          ctx.font = weight + ' ' + size + 'px "Songti SC", "STSong", "SimSun", serif';
          ctx.fillText(value, x, y);
        };
        const wrap = (value, x, y, size, maxLines, width = 570, color = '#28382e') => {
          let line = '', lines = [];
          ctx.font = size + 'px "Songti SC", "STSong", "SimSun", serif';
          for (const char of String(value || '')) {
            const br = char === String.fromCharCode(10);
            if (ctx.measureText(line + char).width > width || br) {
              lines.push(line);
              line = '';
            }
            if (!br) line += char;
          }
          if (line) lines.push(line);
          if (lines.length > maxLines) {
            lines = lines.slice(0, maxLines);
            let last = lines[maxLines - 1];
            while (last && ctx.measureText(last + '…').width > width) last = last.slice(0, -1);
            lines[maxLines - 1] = last + '…';
          }
          lines.forEach(row => { text(row, x, y, size, color); y += size * 1.6; });
          return y;
        };
        text('白酒品鉴手记', 234, 96, 23, '#687365');
        text('去掉酒标，只凭味道', 60, 171, 20, '#687365');
        text([n.date, n.aromaType].filter(Boolean).join(' · '), 60, 207, 20, '#687365');
        ctx.fillStyle = '#d6ddcf';
        ctx.fillRect(60, 234, 630, 1);
        let y = wrap(n.title, 60, 302, 42, 2) + 26;
        [['闻香', n.aroma], ['入口', n.taste], ['回味', n.finish]].forEach(pair => {
          text(pair[0], 62, y, 21, '#274d3b');
          ctx.fillStyle = '#d6ddcf';
          ctx.fillRect(62, y + 17, 626, 1);
          y = wrap(pair[1] || '未记录', 62, y + 65, 24, 2, 626, '#52654c') + 18;
        });
        if (n.note) {
          const memoryTop = Math.min(y + 4, 910);
          ctx.fillStyle = '#edf0e7';
          ctx.fillRect(60, memoryTop, 630, 132);
          ctx.fillStyle = '#a8382b';
          ctx.fillRect(60, memoryTop, 3, 132);
          text('此刻的手记', 80, memoryTop + 33, 19, '#274d3b');
          wrap(n.note, 80, memoryTop + 76, 23, 2, 590, '#52654c');
        }
        text('一杯一记 · 留下风味，也留下记忆', 60, 1150, 19, '#687365');

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
              ctx.fillStyle = '#d6ddcf';
              ctx.fillRect(60, 1034, 630, 1);
              ctx.font = '24px "Songti SC", "STSong", "SimSun", serif';
              ctx.fillStyle = '#28382e';
              ctx.fillText(user.nickname || '匿名品鉴客', 126, 1092, 500);
              text('盲酌品鉴者', 126, 1118, 18, '#687365');
              // 红色印章是品牌图形标识，不依赖系统书法字体。
              ctx.strokeStyle = '#a8382b';
              ctx.lineWidth = 2;
              ctx.strokeRect(630, 1064, 62, 46);
              ctx.font = '20px "Songti SC", "STSong", "SimSun", serif';
              ctx.fillStyle = '#a8382b';
              ctx.fillText('知味', 640, 1095);
              exportCard();
            })
            .catch(() => { if (token === this._renderToken) exportCard(); });
        };

        // logo 同样走带超时的加载器，避免极端情况下酒卡一直 busy
        identity.loadCanvasImage(canvas, '/assets/brand/mangzhuo-lockup-v6.png').then(img => {
          if (token !== this._renderToken) return;
          if (img) ctx.drawImage(img, 60, 54, 154, 72);
          else text('盲酌', 60, 106, 48, '#274d3b');
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
