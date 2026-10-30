/**
 * scoring.js - 盲品计分引擎与智能对比分析
 * 
 * 计分权重对照表 (满分100分):
 * - 品牌 (Brand): 25 分 (完全匹配得25分，包含关键字得15分)
 * - 产品名 (Product): 25 分 (核心产品词匹配得25分，部分匹配得15分)
 * - 香型 (AromaType): 10 分 (一致即得10分)
 * - 酒精度 (AlcoholDegree): 10 分 (±1度以内得满分，±3度以内得5分)
 * - 年份 (Year): 15 分 (相同得15分，误差±1年得10分，±2年得5分)
 * - 价格区间 (PriceRange): 15 分 (命中真实价格区间得15分，相邻区间得8分)
 */

function cleanStr(str) {
  if (!str) return '';
  return String(str).trim().toLowerCase().replace(/\s+/g, '');
}

function calculateGuessScore(realSample, userGuess) {
  if (!userGuess) {
    return {
      totalScore: 0,
      breakdown: {
        brand: { score: 0, max: 25, isMatch: false },
        product: { score: 0, max: 25, isMatch: false },
        aromaType: { score: 0, max: 10, isMatch: false },
        alcoholDegree: { score: 0, max: 10, isMatch: false },
        year: { score: 0, max: 15, isMatch: false },
        price: { score: 0, max: 15, isMatch: false }
      }
    };
  }

  let brandScore = 0;
  const realB = cleanStr(realSample.brand);
  const guessB = cleanStr(userGuess.brand);
  if (realB && guessB) {
    if (realB === guessB) {
      brandScore = 25;
    } else if (realB.includes(guessB) || guessB.includes(realB)) {
      brandScore = 18;
    }
  }

  let prodScore = 0;
  const realP = cleanStr(realSample.product);
  const guessP = cleanStr(userGuess.product);
  if (realP && guessP) {
    if (realP === guessP) {
      prodScore = 25;
    } else if (realP.includes(guessP) || guessP.includes(realP)) {
      prodScore = 18;
    }
  }

  let aromaScore = 0;
  const realA = cleanStr(realSample.aromaType);
  const guessA = cleanStr(userGuess.aromaType);
  if (realA && guessA && realA === guessA) {
    aromaScore = 10;
  }

  let degreeScore = 0;
  const realDegNum = parseFloat(String(realSample.alcoholDegree).replace(/[^0-9.]/g, ''));
  const guessDegNum = parseFloat(String(userGuess.alcoholDegree).replace(/[^0-9.]/g, ''));
  if (!isNaN(realDegNum) && !isNaN(guessDegNum)) {
    const diff = Math.abs(realDegNum - guessDegNum);
    if (diff <= 0.5) {
      degreeScore = 10;
    } else if (diff <= 2) {
      degreeScore = 6;
    } else if (diff <= 4) {
      degreeScore = 3;
    }
  }

  let yearScore = 0;
  const realYr = parseInt(String(realSample.year), 10);
  const guessYr = parseInt(String(userGuess.year), 10);
  if (!isNaN(realYr) && !isNaN(guessYr)) {
    const yDiff = Math.abs(realYr - guessYr);
    if (yDiff === 0) {
      yearScore = 15;
    } else if (yDiff === 1) {
      yearScore = 10;
    } else if (yDiff === 2) {
      yearScore = 5;
    }
  }

  let priceScore = 0;
  const realPrc = parseFloat(realSample.marketPrice) || 0;
  const guessPrc = parseFloat(userGuess.estimatedPrice) || 0;
  if (realPrc > 0 && guessPrc > 0) {
    const ratio = Math.abs(realPrc - guessPrc) / realPrc;
    if (ratio <= 0.15) {
      priceScore = 15;
    } else if (ratio <= 0.35) {
      priceScore = 10;
    } else if (ratio <= 0.6) {
      priceScore = 5;
    }
  }

  const totalScore = brandScore + prodScore + aromaScore + degreeScore + yearScore + priceScore;

  return {
    totalScore,
    breakdown: {
      brand: { score: brandScore, max: 25, isMatch: brandScore >= 18 },
      product: { score: prodScore, max: 25, isMatch: prodScore >= 18 },
      aromaType: { score: aromaScore, max: 10, isMatch: aromaScore === 10 },
      alcoholDegree: { score: degreeScore, max: 10, isMatch: degreeScore >= 6 },
      year: { score: yearScore, max: 15, isMatch: yearScore >= 10 },
      price: { score: priceScore, max: 15, isMatch: priceScore >= 10 }
    }
  };
}

/**
 * 汇总酒局所有维度的排行榜与大数据洞察
 */
function generateRoomAnalysis(room, samples, members, guesses, ratings) {
  // 1. 猜酒高手榜 (按所有酒款得分总和降序)
  const userScoreMap = {};
  members.forEach(m => {
    userScoreMap[m.userId] = {
      userId: m.userId,
      nickname: m.nickname,
      avatar: m.avatar || '🍶',
      totalScore: 0,
      detailScores: {},
      hitBrandsCount: 0
    };
  });

  samples.forEach(sample => {
    members.forEach(m => {
      const g = guesses.find(item => item.userId === m.userId && item.sampleId === sample.sampleId);
      const res = calculateGuessScore(sample, g);
      if (userScoreMap[m.userId]) {
        userScoreMap[m.userId].totalScore += res.totalScore;
        userScoreMap[m.userId].detailScores[sample.sampleId] = res;
        if (res.breakdown.brand.isMatch) {
          userScoreMap[m.userId].hitBrandsCount += 1;
        }
      }
    });
  });

  const guessRanking = Object.values(userScoreMap).sort((a, b) => b.totalScore - a.totalScore);
  guessRanking.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  // 2. 酒款大众品鉴榜 (按平均主观评分降序)
  const sampleRatingStats = samples.map(sample => {
    const sRatings = ratings.filter(r => r.sampleId === sample.sampleId);
    const sGuesses = guesses.filter(g => g.sampleId === sample.sampleId);

    const count = sRatings.length || 1;
    const avgOverall = (sRatings.reduce((sum, r) => sum + (parseFloat(r.overall) || 0), 0) / count).toFixed(1);
    const avgAroma = (sRatings.reduce((sum, r) => sum + (parseFloat(r.aroma) || 0), 0) / count).toFixed(1);
    const avgEntrance = (sRatings.reduce((sum, r) => sum + (parseFloat(r.entrance) || 0), 0) / count).toFixed(1);
    const avgRichness = (sRatings.reduce((sum, r) => sum + (parseFloat(r.richness) || 0), 0) / count).toFixed(1);
    const avgBalance = (sRatings.reduce((sum, r) => sum + (parseFloat(r.balance) || 0), 0) / count).toFixed(1);
    const avgFinish = (sRatings.reduce((sum, r) => sum + (parseFloat(r.finish) || 0), 0) / count).toFixed(1);

    // 估价统计
    const gCount = sGuesses.length || 1;
    const avgEstimatedPrice = Math.round(sGuesses.reduce((sum, g) => sum + (parseFloat(g.estimatedPrice) || 0), 0) / gCount);

    // 品牌猜中率
    const hitBrandCount = sGuesses.filter(g => {
      const realB = cleanStr(sample.brand);
      const guessB = cleanStr(g.brand);
      return realB && guessB && (realB === guessB || realB.includes(guessB) || guessB.includes(realB));
    }).length;
    const brandAccuracy = Math.round((hitBrandCount / gCount) * 100);

    return {
      sampleId: sample.sampleId,
      number: sample.number,
      bottleTag: sample.bottleTag || `${sample.number}号酒`,
      brand: sample.brand,
      product: sample.product,
      aromaType: sample.aromaType,
      alcoholDegree: sample.alcoholDegree,
      marketPrice: sample.marketPrice,
      year: sample.year,
      notes: sample.notes,
      avgOverall: parseFloat(avgOverall),
      avgAroma,
      avgEntrance,
      avgRichness,
      avgBalance,
      avgFinish,
      avgEstimatedPrice,
      brandAccuracy,
      priceDiff: avgEstimatedPrice - (sample.marketPrice || 0)
    };
  });

  const tasteRanking = [...sampleRatingStats].sort((a, b) => b.avgOverall - a.avgOverall);
  tasteRanking.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  // 3. 产生酒局报告金句与关键洞察
  // 最受欢迎：评分第一
  const mostPopular = tasteRanking[0] || null;

  // 最大黑马：实际售价较低，但评分靠前或估价明显高于售价
  const sortedByValue = [...sampleRatingStats].sort((a, b) => (b.priceDiff) - (a.priceDiff));
  const biggestDarkHorse = sortedByValue[0] || null;

  // 最难猜酒款：品牌命中率最低
  const sortedByHard = [...sampleRatingStats].sort((a, b) => a.brandAccuracy - b.brandAccuracy);
  const hardestSample = sortedByHard[0] || null;

  // 猜酒王
  const topGuesser = guessRanking[0] || null;

  return {
    guessRanking,
    tasteRanking,
    sampleRatingStats,
    insights: {
      mostPopular,
      biggestDarkHorse,
      hardestSample,
      topGuesser,
      totalMembers: members.length,
      totalSamples: samples.length
    }
  };
}

module.exports = {
  calculateGuessScore,
  generateRoomAnalysis
};
