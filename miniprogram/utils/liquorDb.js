/**
 * 酒款联想：优先公开接口与最近成功缓存；内置目录仅作离线兜底。
 */
const LIQUOR_DATABASE = [
  // 酱香型
  { brand: '贵州茅台', product: '飞天茅台 (53%vol)', aromaType: '酱香型', degree: '53°', defaultPrice: 2800 },
  { brand: '贵州茅台', product: '茅台王子酒 (酱香经典)', aromaType: '酱香型', degree: '53°', defaultPrice: 320 },
  { brand: '贵州茅台', product: '汉酱酒 (铂金蓝)', aromaType: '酱香型', degree: '51°', defaultPrice: 450 },
  { brand: '习酒', product: '君品习酒', aromaType: '酱香型', degree: '53°', defaultPrice: 980 },
  { brand: '习酒', product: '窖藏1988', aromaType: '酱香型', degree: '53°', defaultPrice: 580 },
  { brand: '习酒', product: '金质习酒', aromaType: '酱香型', degree: '53°', defaultPrice: 260 },
  { brand: '四川郎酒', product: '青花郎 (二十)', aromaType: '酱香型', degree: '53°', defaultPrice: 1050 },
  { brand: '四川郎酒', product: '红花郎 (十五)', aromaType: '酱香型', degree: '53°', defaultPrice: 560 },
  { brand: '四川郎酒', product: '红花郎 (十)', aromaType: '酱香型', degree: '53°', defaultPrice: 380 },
  { brand: '国台', product: '国台国标酒', aromaType: '酱香型', degree: '53°', defaultPrice: 420 },
  { brand: '国台', product: '国台十五年', aromaType: '酱香型', degree: '53°', defaultPrice: 880 },
  { brand: '贵州珍酒', product: '珍十五 (经典)', aromaType: '酱香型', degree: '53°', defaultPrice: 420 },
  { brand: '贵州珍酒', product: '珍三十', aromaType: '酱香型', degree: '53°', defaultPrice: 980 },
  { brand: '钓鱼台', product: '钓鱼台国宾酒', aromaType: '酱香型', degree: '53°', defaultPrice: 780 },

  // 浓香型
  { brand: '宜宾五粮液', product: '第八代五粮液 (普五)', aromaType: '浓香型', degree: '52°', defaultPrice: 1050 },
  { brand: '宜宾五粮液', product: '五粮春 (第二代)', aromaType: '浓香型', degree: '52°', defaultPrice: 240 },
  { brand: '宜宾五粮液', product: '五粮特曲', aromaType: '浓香型', degree: '52°', defaultPrice: 300 },
  { brand: '泸州老窖', product: '国窖1573', aromaType: '浓香型', degree: '52°', defaultPrice: 980 },
  { brand: '泸州老窖', product: '特曲老字号', aromaType: '浓香型', degree: '52°', defaultPrice: 320 },
  { brand: '泸州老窖', product: '头曲', aromaType: '浓香型', degree: '52°', defaultPrice: 110 },
  { brand: '四川剑南春', product: '水晶剑 (剑南春)', aromaType: '浓香型', degree: '52°', defaultPrice: 460 },
  { brand: '四川剑南春', product: '珍藏级剑南春', aromaType: '浓香型', degree: '52°', defaultPrice: 750 },
  { brand: '洋河股份', product: '梦之蓝 M6+', aromaType: '浓香型', degree: '52°', defaultPrice: 720 },
  { brand: '洋河股份', product: '天之蓝', aromaType: '浓香型', degree: '52°', defaultPrice: 350 },
  { brand: '洋河股份', product: '海之蓝', aromaType: '浓香型', degree: '52°', defaultPrice: 160 },
  { brand: '安徽古井贡', product: '年份原浆 古20', aromaType: '浓香型', degree: '52°', defaultPrice: 650 },
  { brand: '安徽古井贡', product: '年份原浆 古16', aromaType: '浓香型', degree: '52°', defaultPrice: 450 },
  { brand: '四川舍得', product: '品味舍得', aromaType: '浓香型', degree: '52°', defaultPrice: 460 },
  { brand: '四川水井坊', product: '井台', aromaType: '浓香型', degree: '52°', defaultPrice: 580 },
  { brand: '四川水井坊', product: '臻酿八号', aromaType: '浓香型', degree: '52°', defaultPrice: 380 },

  // 清香型
  { brand: '山西汾酒', product: '青花汾酒20', aromaType: '清香型', degree: '53°', defaultPrice: 460 },
  { brand: '山西汾酒', product: '青花汾酒30 复兴版', aromaType: '清香型', degree: '53°', defaultPrice: 950 },
  { brand: '山西汾酒', product: '老白汾10', aromaType: '清香型', degree: '53°', defaultPrice: 160 },
  { brand: '山西汾酒', product: '黄盖玻汾 (口粮之王)', aromaType: '清香型', degree: '53°', defaultPrice: 55 },
  { brand: '北京红星', product: '红星二锅头 (蓝瓶绵柔)', aromaType: '清香型', degree: '53°', defaultPrice: 45 },
  { brand: '北京牛栏山', product: '牛栏山陈酿 (白牛二)', aromaType: '清香型', degree: '42°', defaultPrice: 20 },
  { brand: '宝丰酒', product: '宝丰国色清香', aromaType: '清香型', degree: '54°', defaultPrice: 220 },

  // 凤香型 / 兼香型 / 董香型 / 特香型
  { brand: '陕西西凤酒', product: '西凤酒绿脖 (高脖西凤)', aromaType: '凤香型', degree: '55°', defaultPrice: 55 },
  { brand: '陕西西凤酒', product: '西凤华山论剑 20年', aromaType: '凤香型', degree: '52°', defaultPrice: 320 },
  { brand: '安徽口子窖', product: '口子窖 10年型', aromaType: '兼香型', degree: '46°', defaultPrice: 280 },
  { brand: '湖北白云边', product: '白云边 15年陈酿', aromaType: '兼香型', degree: '45°', defaultPrice: 180 },
  { brand: '贵州董酒', product: '董酒密藏 (国密)', aromaType: '董香型', degree: '54°', defaultPrice: 580 },
  { brand: '江西四特酒', product: '四特东方韵 (弘韵)', aromaType: '特香型', degree: '52°', defaultPrice: 220 },
  { brand: '河北衡水老白干', product: '衡水老白干 古法20', aromaType: '老白干香型', degree: '67°', defaultPrice: 460 }
];

const wineCatalog = require('../services/wineCatalog');

function getLiquors() {
  const cached = wineCatalog.getCachedWineCatalog();
  return cached ? cached.list : LIQUOR_DATABASE;
}

async function refreshLiquors(options) {
  try {
    const list = await wineCatalog.loadWineCatalog(options);
    return { list, source: 'remote', error: '' };
  } catch (err) {
    const cached = wineCatalog.getCachedWineCatalog();
    return {
      list: cached ? cached.list : LIQUOR_DATABASE,
      source: cached ? 'cache' : 'builtin',
      error: err.message || '酒款目录暂不可用'
    };
  }
}

function searchLiquors(keyword) {
  if (!keyword || !keyword.trim()) return [];
  const kw = keyword.trim().toLowerCase();
  return getLiquors().filter(item => {
    return item.brand.toLowerCase().includes(kw) || item.product.toLowerCase().includes(kw);
  }).slice(0, 6);
}

module.exports = {
  LIQUOR_DATABASE,
  getLiquors,
  refreshLiquors,
  searchLiquors
};
