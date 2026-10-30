package com.welink.vote.common.data.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.welink.vote.common.data.model.VoteTasteScore;
import com.welink.vote.common.data.model.VoteTasteScoreEntity;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public interface VoteTasteScoreMapper  extends BaseMapper<VoteTasteScore> {
    List<Map<String,Object>> getList(HashMap<String, Object> map);
    int count(HashMap<String, Object> map);
    List<VoteTasteScoreEntity> getScoreList(HashMap<String, Object> map);
}
