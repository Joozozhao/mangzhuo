const storageService = require("../../../../services/storage");
const identity = require("../../../../services/identity");
const { generateRoomAnalysis } = require("../../../../utils/scoring");

function fitPosterText(ctx, value, maxWidth) {
  const text = String(value || '');
  if (ctx.measureText(text).width <= maxWidth) return text;
  const chars = Array.from(text);
  while (chars.length && ctx.measureText(chars.join('') + '…').width > maxWidth) chars.pop();
  return chars.join('') + '…';
}

Page({
  data: {
    roomId: "", room: null, insights: null, posterUrl: ""
  },
  onLoad(options) {
    const roomId = options.roomId || "room_demo_01";
    this.setData({ roomId });
    this.loadReport();
  },
  loadReport() {
    const { roomId } = this.data;
    const room = storageService.getRoomById(roomId);
    const samples = storageService.getSamples(roomId);
    const members = storageService.getMembers(roomId);
    const guesses = storageService.getGuesses(roomId);
    const ratings = storageService.getRatings(roomId);

    const res = generateRoomAnalysis(room, samples, members, guesses, ratings);
    if (res.insights && res.insights.topGuesser) {
      res.insights.topGuesser.avatarImg = identity.isAvatarImage(res.insights.topGuesser.avatar);
    }
    this.setData({ room, insights: res.insights });
  },
  generatePoster() {
    wx.showLoading({ title: "正在绘制战报海报..." });
    const query = wx.createSelectorQuery();
    query.select("#posterCanvas")
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          wx.hideLoading();
          wx.showToast({ title: "长按本页截图即可分享", icon: "none" });
          return;
        }
        const canvas = res[0].node;
        const ctx = canvas.getContext("2d");
        const dpr = wx.getSystemInfoSync().pixelRatio || 2;
        canvas.width = 320 * dpr;
        canvas.height = 500 * dpr;
        ctx.scale(dpr, dpr);

        // 背景
        ctx.fillStyle = "#F7F3EB";
        ctx.fillRect(0, 0, 320, 500);

        // 顶栏卡片
        ctx.fillStyle = "#171714";
        ctx.fillRect(16, 16, 288, 110);

        ctx.fillStyle = "#D6B06A";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText("盲酌 · 白酒盲品战报", 30, 44);

        ctx.fillStyle = "#FFFFFF";
        ctx.font = "bold 18px sans-serif";
        ctx.fillText(fitPosterText(ctx, this.data.room.name, 260), 30, 74);

        ctx.fillStyle = "#A8A295";
        ctx.font = "11px sans-serif";
        ctx.fillText("去掉酒标，只凭味道 · 真实盲品数据", 30, 100);

        // 卡片1：最受欢迎
        ctx.fillStyle = "#FFFDF8";
        ctx.strokeStyle = "#D7B36D";
        ctx.lineWidth = 1;
        ctx.fillRect(16, 140, 288, 100);
        ctx.strokeRect(16, 140, 288, 100);

        ctx.fillStyle = "#8C5D1E";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("🌟 全场最受欢迎酒款", 28, 166);

        if (this.data.insights.mostPopular) {
          ctx.fillStyle = "#181713";
          ctx.font = "bold 15px sans-serif";
          ctx.fillText(fitPosterText(ctx, this.data.insights.mostPopular.brand + " · " + this.data.insights.mostPopular.product, 264), 28, 194);

          ctx.fillStyle = "#A97832";
          ctx.font = "bold 13px sans-serif";
          ctx.fillText("综合评分 " + this.data.insights.mostPopular.avgOverall + " 分", 28, 222);
        }

        // 卡片2：最大黑马
        ctx.fillStyle = "#FFFDF8";
        ctx.strokeStyle = "#E6DFD3";
        ctx.fillRect(16, 255, 288, 100);
        ctx.strokeRect(16, 255, 288, 100);

        ctx.fillStyle = "#2E8B57";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("🐴 全场最大黑马 (盲饮估价 > 实际售价)", 28, 281);

        if (this.data.insights.biggestDarkHorse) {
          ctx.fillStyle = "#181713";
          ctx.font = "bold 15px sans-serif";
          ctx.fillText(fitPosterText(ctx, this.data.insights.biggestDarkHorse.brand + " · " + this.data.insights.biggestDarkHorse.product, 264), 28, 309);

          ctx.fillStyle = "#555046";
          ctx.font = "12px sans-serif";
          ctx.fillText(fitPosterText(ctx, "原价 ¥" + this.data.insights.biggestDarkHorse.marketPrice + " vs 盲测均估 ¥" + this.data.insights.biggestDarkHorse.avgEstimatedPrice, 264), 28, 336);
        }

        // 卡片3：猜酒王
        ctx.fillStyle = "#FFFDF8";
        ctx.strokeStyle = "#E6DFD3";
        ctx.fillRect(16, 370, 288, 75);
        ctx.strokeRect(16, 370, 288, 75);

        ctx.fillStyle = "#A97832";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("👑 本场猜酒王", 28, 396);

        const topGuesser = this.data.insights.topGuesser;

        // 底部
        ctx.fillStyle = "#9C9486";
        ctx.font = "10px sans-serif";
        ctx.fillText("扫码进入微信小程序「盲酌」发起你的酒局", 50, 480);

        const finishPoster = () => {
          wx.canvasToTempFilePath({
            canvas,
            success: (resImg) => {
              wx.hideLoading();
              this.setData({ posterUrl: resImg.tempFilePath });
            },
            fail: () => {
              wx.hideLoading();
              wx.showToast({ title: "海报生成失败", icon: "none" });
            }
          });
        };

        // 猜酒王头像昵称：头像异步加载（失败/超时自动降级为 emoji），完成后导出
        if (topGuesser) {
          identity.drawCanvasAvatar(canvas, ctx, 28, 406, 14, topGuesser.avatar)
            .then(() => {
              ctx.fillStyle = "#181713";
              ctx.font = "bold 14px sans-serif";
              const score = " (得分: " + topGuesser.totalScore + "分)";
              ctx.fillText(fitPosterText(ctx, topGuesser.nickname, 230 - ctx.measureText(score).width) + score, 62, 424);
              finishPoster();
            })
            .catch(() => finishPoster());
        } else {
          finishPoster();
        }
      });
  },
  savePosterToAlbum() {
    if (!this.data.posterUrl) return;
    wx.saveImageToPhotosAlbum({
      filePath: this.data.posterUrl,
      success: () => {
        wx.showToast({ title: "已保存至相册！", icon: "success" });
        this.closePoster();
      },
      fail: () => {
        wx.showToast({ title: "请授权相册权限后保存", icon: "none" });
      }
    });
  },
  closePoster() {
    this.setData({ posterUrl: "" });
  },
  backToHome() {
    wx.reLaunch({ url: "/pages/index/index" });
  }
});
