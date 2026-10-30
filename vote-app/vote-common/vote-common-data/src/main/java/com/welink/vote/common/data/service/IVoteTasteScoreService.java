package com.welink.vote.common.data.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.welink.vote.common.data.model.VoteTasteScore;
import com.welink.vote.common.data.model.VoteTasteScoreEntity;
import com.welink.vote.common.data.model.VoteTasteType;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public interface IVoteTasteScoreService extends IService<VoteTasteScore> {
    List<Map<String,Object>> getList(int page, int size, List<VoteTasteType> list,int tasteId);
    int count(List<VoteTasteType> list,int tasteId);
    List<VoteTasteScoreEntity> getScoreList(int tasteId);
}
