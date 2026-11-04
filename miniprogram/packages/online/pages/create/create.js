const welinkClient = require('../../../../services/welinkClient');
const identity = require('../../../../services/identity');
const { searchLiquors, refreshLiquors } = require('../../../../utils/liquorDb');

Page({
  data: {
    title: '',
    authentication: '',
    names: ['', ''],
    sampleCount: 2,
    created: false,
    submitting: false,
    suggestions: [], activeSuggestionIndex: -1, catalogLoading: false, catalogSource: 'builtin', catalogError: ''
  },

  onLoad() {
    this._disposed = false;
    if (!identity.isLoggedIn()) {
      wx.showModal({
        title: '需要微信登录',
        content: '发起在线品鉴需要先进行微信身份登录',
        confirmText: '去登录',
        confirmColor: '#274d3b',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/profile/profile' });
          } else {
            wx.navigateBack();
          }
        }
      });
      return;
    }
    this.loadWineCatalog();
  },
  onHide() { this.setData({authentication: ''}); },
  onUnload() { this._disposed = true; },

  async loadWineCatalog(force = false) {
    this.setData({ catalogLoading: true });
    const result = await refreshLiquors({ force: force === true });
    if (this._disposed) return;
    this.setData({ catalogLoading: false, catalogSource: result.source, catalogError: result.error, suggestions: searchLiquors(this._suggestionQuery || '') });
  },
  retryWineCatalog() { this.loadWineCatalog(true); },
  applyWineSuggestion(e) {
    const index = Number(e.currentTarget.dataset.index);
    const wine = e.currentTarget.dataset.item;
    if (!Number.isInteger(index) || index < 0 || index >= this.data.names.length) return;
    const name = wine.brand + ' · ' + wine.product;
    if (name.length > 100) { wx.showToast({ title: '酒名较长，请手动填写简称', icon: 'none' }); return; }
    const names = [...this.data.names];
    names[index] = name;
    this._suggestionQuery = '';
    this.setData({ names, suggestions: [], activeSuggestionIndex: -1 });
  },
  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  onAuthInput(e) {
    this.setData({ authentication: e.detail.value });
  },

  onNameInput(e) {
    const index = e.currentTarget.dataset.index;
    const names = [...this.data.names];
    names[index] = e.detail.value;
    this._suggestionQuery = e.detail.value;
    this.setData({ names, activeSuggestionIndex: Number(index), suggestions: searchLiquors(e.detail.value) });
  },

  onAddSample() {
    if (this.data.names.length >= 20) {
      wx.showToast({ title: '最多添加 20 款酒样', icon: 'none' });
      return;
    }
    this.setData({
      suggestions: [], activeSuggestionIndex: -1, names: [...this.data.names, ''], sampleCount: this.data.names.length + 1
    });
  },

  onRemoveSample(e) {
    if (this.data.names.length <= 2) {
      wx.showToast({ title: '至少需要 2 款酒样', icon: 'none' });
      return;
    }
    const index = e.currentTarget.dataset.index;
    const names = this.data.names.filter((_, i) => i !== index);
    this._suggestionQuery = '';
    this.setData({ names, sampleCount: names.length, suggestions: [], activeSuggestionIndex: -1 });
  },

  async onSubmit() {
    if (this.data.submitting || this.data.created) return;
    if (!identity.isLoggedIn()) {
      this.setData({authentication: ''});
      wx.showToast({title: '请先登录微信身份', icon: 'none'});
      return;
    }
    const owner = identity.getActiveOpenid();
    const title = this.data.title.trim();
    if (!title) {
      wx.showToast({ title: '请填写酒局名称', icon: 'none' });
      return;
    }
    const auth = this.data.authentication.trim();
    if (!auth) {
      wx.showToast({ title: '请输入主持人口令', icon: 'none' });
      return;
    }
    const cleanNames = this.data.names.map(n => n.trim()).filter(Boolean);
    if (cleanNames.length < 2) {
      wx.showToast({ title: '请完整填写至少 2 款酒样', icon: 'none' });
      return;
    }
    if (cleanNames.length !== this.data.names.length) {
      wx.showToast({ title: '请完整填写所有酒样名称', icon: 'none' });
      return;
    }
    const uniqueSet = new Set(cleanNames);
    if (uniqueSet.size !== cleanNames.length) {
      wx.showToast({ title: '酒名不能重复，请补充区分信息', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const res = await welinkClient.createTaste({
        title,
        names: cleanNames,
        authentication: auth
      });
      // 口令及时在内存中清空，不遗留
      this.setData({ authentication: '' });
      
      if (this._disposed || !identity.isLoggedIn() || owner !== identity.getActiveOpenid()) return;
      if (!res || !Number.isSafeInteger(res.id) || res.id < 1) {
        throw new Error('未获取到有效的新建活动编号，请刷新列表确认');
      }
      this.setData({created: true});
      wx.showToast({ title: '发起成功', icon: 'success' });
      wx.redirectTo({url: '/packages/online/pages/detail/detail?id=' + res.id});
    } catch (err) {
      wx.showModal({
        title: '发起失败',
        content: err.message || '网络或接口异常，请重试',
        showCancel: false,
        confirmColor: '#274d3b'
      });
    } finally {
      if (!this._disposed) this.setData({ submitting: false, authentication: '' });
    }
  }
});
