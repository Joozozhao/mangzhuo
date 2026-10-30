const welinkClient = require('../../../../services/welinkClient');
const identity = require('../../../../services/identity');

function positiveId(value) {
  const text = String(value || '');
  return /^[1-9]\d*$/.test(text) && Number.isSafeInteger(Number(text)) ? Number(text) : null;
}
function score(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^\d{1,3}$/.test(value.trim())) return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 100 ? n : null;
}

Page({
  data: {
    id: null, loading: true, error: '', needLogin: false, detail: null, sampleCount: 0,
    formMap: {}, userAnswersMap: {}, hasSubmitted: false, submitting: false,
    closing: false, loadingResults: false, results: null, resultsError: ''
  },
  onLoad(options) {
    this._disposed = false;
    const id = positiveId(options && options.id);
    if (!id) { this.setData({loading: false, error: '请输入有效的活动编号'}); return; }
    this.setData({id});
    this.loadData();
  },
  onShow() {
    if (!this.data.id) return;
    const owner = identity.isLoggedIn() ? identity.getActiveOpenid() : '';
    if (!owner) this.clearPrivate('参与在线品鉴需要先进行微信身份登录', true);
    else if (this.data.needLogin || (this._loadedOwner !== undefined && owner !== this._loadedOwner)) this.loadData();
  },
  onUnload() { this._disposed = true; this._loadSeq = (this._loadSeq || 0) + 1; this._resultSeq = (this._resultSeq || 0) + 1; },
  onPullDownRefresh() { return this.loadData().finally(() => wx.stopPullDownRefresh()); },
  onShareAppMessage() {
    const title = (this.data.detail && this.data.detail.title) || '盲酌在线品鉴';
    return {title: '邀请你参与【' + title + '】盲品打分', path: this.data.id ? '/packages/online/pages/detail/detail?id=' + this.data.id : '/pages/gather/gather'};
  },
  clearPrivate(message, needLogin) {
    this._loadSeq = (this._loadSeq || 0) + 1;
    this._resultSeq = (this._resultSeq || 0) + 1;
    this._loadedOwner = '';
    if (!this._disposed) this.setData({detail: null, sampleCount: 0, results: null, formMap: {}, userAnswersMap: {},
      hasSubmitted: false, loading: false, loadingResults: false, error: message || '', resultsError: '', needLogin: !!needLogin});
  },
  currentOwner(owner) {
    return !this._disposed && identity.isLoggedIn() && owner === identity.getActiveOpenid();
  },
  handleError(err, fallback) {
    if (err.statusCode === 401 || !identity.isLoggedIn()) this.clearPrivate('登录会话已失效，请重新登录', true);
    else this.setData({loading: false, error: err.message || fallback});
  },
  async loadData() {
    if (!this.data.id || this._disposed) return;
    if (!identity.isLoggedIn()) { this.clearPrivate('参与在线品鉴需要先进行微信身份登录', true); return; }
    const owner = identity.getActiveOpenid();
    if (owner !== this._loadedOwner) this.clearPrivate('', false);
    this._loadedOwner = owner;
    const seq = this._loadSeq = (this._loadSeq || 0) + 1;
    this.setData({loading: true, needLogin: false, error: '', resultsError: ''});
    try {
      const detail = await welinkClient.getTasteDetail(this.data.id);
      if (seq !== this._loadSeq || this._disposed) return;
      if (!this.currentOwner(owner)) { this.clearPrivate('身份已变更，请重新加载', !identity.isLoggedIn()); return; }
      if (!detail || !Array.isArray(detail.samples) || !Array.isArray(detail.choices) || !Array.isArray(detail.answers)
          || (detail.status !== 0 && detail.status !== 1)) throw new Error('品鉴详情格式无效');
      const formMap = {}, userAnswersMap = {};
      detail.answers.forEach(a => { userAnswersMap[a.sampleId] = a; });
      detail.samples.forEach(s => {
        const existing = userAnswersMap[s.sampleId];
        const guessedName = existing ? existing.guessedName : '';
        const value = existing ? score(existing.score) : null;
        const choiceIndex = detail.choices.indexOf(guessedName);
        formMap[s.sampleId] = {guessedName, score: value === null ? '' : String(value), scoreNumber: value === null ? 50 : value, choiceIndex: choiceIndex < 0 ? null : choiceIndex};
      });
      this.setData({detail, sampleCount: detail.samples.length, formMap, userAnswersMap,
        hasSubmitted: detail.answers.length > 0, loading: false, results: null});
      if (detail.status === 1) await this.loadResults();
    } catch (err) {
      if (seq === this._loadSeq && !this._disposed) this.handleError(err, '加载品鉴详情失败');
    }
  },
  async loadResults() {
    if (!this.data.detail || this.data.detail.status !== 1 || this.data.loadingResults || !identity.isLoggedIn()) return;
    const owner = identity.getActiveOpenid();
    const seq = this._resultSeq = (this._resultSeq || 0) + 1;
    this.setData({loadingResults: true, results: null, resultsError: ''});
    try {
      const results = await welinkClient.getTasteResults(this.data.id);
      if (seq !== this._resultSeq || this._disposed) return;
      if (!this.currentOwner(owner)) { this.clearPrivate('身份已变更，请重新加载', !identity.isLoggedIn()); return; }
      if (!results || !Array.isArray(results.samples)) throw new Error('品鉴结果格式无效');
      this.setData({results, loadingResults: false});
    } catch (err) {
      if (seq !== this._resultSeq || this._disposed) return;
      if (err.statusCode === 401 || !identity.isLoggedIn()) this.clearPrivate('登录会话已失效，请重新登录', true);
      else this.setData({loadingResults: false, resultsError: err.message || '获取揭晓结果失败'});
    }
  },
  editable() {
    return !!this.data.detail && this.data.detail.status === 0 && !this.data.loading && !this.data.submitting && !this.data.closing
      && this.currentOwner(this._loadedOwner);
  },
  onChoiceChange(e) {
    if (!this.editable()) return;
    const sampleId = e.currentTarget.dataset.sampleId;
    const index = Number(e.detail.value);
    if (!this.data.formMap[sampleId] || !Number.isInteger(index) || index < 0 || index >= this.data.detail.choices.length) return;
    const formMap = Object.assign({}, this.data.formMap);
    formMap[sampleId] = Object.assign({}, formMap[sampleId], {guessedName: this.data.detail.choices[index], choiceIndex: index});
    this.setData({formMap});
  },
  onSliderChange(e) {
    if (!this.editable()) return;
    const sampleId = e.currentTarget.dataset.sampleId, value = score(e.detail.value);
    if (!this.data.formMap[sampleId] || value === null) return;
    const formMap = Object.assign({}, this.data.formMap);
    formMap[sampleId] = Object.assign({}, formMap[sampleId], {score: String(value), scoreNumber: value});
    this.setData({formMap});
  },
  onSliderChanging(e) { this.onSliderChange(e); },
  onScoreInput(e) {
    if (!this.editable()) return;
    const sampleId = e.currentTarget.dataset.sampleId, text = String(e.detail.value).trim();
    if (!this.data.formMap[sampleId]) return;
    const value = score(text), formMap = Object.assign({}, this.data.formMap);
    formMap[sampleId] = Object.assign({}, formMap[sampleId], {score: text, scoreNumber: value === null ? 50 : value});
    this.setData({formMap});
  },
  async onSubmitScores() {
    if (!this.editable()) return;
    const answers = [];
    for (const sample of this.data.detail.samples) {
      const item = this.data.formMap[sample.sampleId];
      if (!item || !this.data.detail.choices.includes(item.guessedName)) { wx.showToast({title: '请为每款酒样选择竞猜酒名', icon: 'none'}); return; }
      const value = score(item.score);
      if (value === null) { wx.showToast({title: '评分需为 0 至 100 的整数', icon: 'none'}); return; }
      answers.push({sampleId: sample.sampleId, guessedName: item.guessedName, score: value});
    }
    const owner = identity.getActiveOpenid();
    this.setData({submitting: true});
    try {
      const response = await welinkClient.submitScores(this.data.id, answers);
      if (!this.currentOwner(owner)) return;
      if (!response || response.submitted !== true) throw new Error('未能确认评分提交结果，请刷新后核对');
      wx.showToast({title: '评分提交成功', icon: 'success'});
      this.setData({hasSubmitted: true});
      await this.loadData();
    } catch (err) {
      if (this._disposed) return;
      if (err.statusCode === 401 || !identity.isLoggedIn()) this.handleError(err);
      else wx.showModal({title: '提交失败', content: err.message || '提交结果未确认，请刷新后核对', showCancel: false});
    } finally { if (!this._disposed) this.setData({submitting: false}); }
  },
  onCloseTaste() {
    if (!this.editable() || !this.data.detail.isOwner) return;
    const owner = identity.getActiveOpenid();
    this.setData({closing: true});
    wx.showModal({title: '确认结束品鉴', content: '结束后将揭晓答案与成绩，参与者不能再修改评分，确定结束吗？',
      confirmText: '结束并揭晓', confirmColor: '#893e32',
      success: async res => {
        try {
          if (!res.confirm || !this.currentOwner(owner)) return;
          const result = await welinkClient.closeTaste(this.data.id);
          if (!this.currentOwner(owner)) return;
          if (!result || result.status !== 1) throw new Error('未能确认结束结果，请刷新后核对');
          wx.showToast({title: '已揭晓', icon: 'success'});
          await this.loadData();
        } catch (err) {
          if (this._disposed) return;
          if (err.statusCode === 401 || !identity.isLoggedIn()) this.handleError(err);
          else wx.showModal({title: '结束品鉴失败', content: err.message || '请刷新后确认活动状态', showCancel: false});
        } finally { if (!this._disposed) this.setData({closing: false}); }
      },
      fail: () => { if (!this._disposed) this.setData({closing: false}); }
    });
  },
  goBack() { if (getCurrentPages().length > 1) wx.navigateBack(); else wx.switchTab({url: '/pages/gather/gather'}); },
  goLogin() { wx.navigateTo({url: '/pages/profile/profile'}); }
});
