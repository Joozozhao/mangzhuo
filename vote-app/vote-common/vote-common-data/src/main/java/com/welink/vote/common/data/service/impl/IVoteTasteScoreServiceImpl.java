package com.welink.vote.common.data.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.welink.vote.common.data.dao.VoteTasteScoreMapper;
import com.welink.vote.common.data.model.VoteTasteScore;
import com.welink.vote.common.data.model.VoteTasteScoreEntity;
import com.welink.vote.common.data.model.VoteTasteType;
import com.welink.vote.common.data.service.IVoteTasteScoreService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class IVoteTasteScoreServiceImpl extends ServiceImpl<VoteTasteScoreMapper, VoteTasteScore> implements IVoteTasteScoreService {
    @Autowired
    private VoteTasteScoreMapper voteTasteScoreMapper;
    @Override
    public int count(List<VoteTasteType> list,int tasteId) {
        HashMap<String, Object> map = new HashMap<>();
        map.put("list", list);
        map.put("tasteId", tasteId);
        return voteTasteScoreMapper.count(map);
    }

    @Override
    public List<VoteTasteScoreEntity> getScoreList(int tasteId) {
        HashMap<String, Object> map = new HashMap<>();
        map.put("taste_id", tasteId);
        return voteTasteScoreMapper.getScoreList(map);
    }

    @Override
    public List<Map<String, Object>> getList(int page, int size, List<VoteTasteType> list,int tasteId) {
        HashMap<String, Object> map = new HashMap<>();
        map.put("pageIndex", (page-1)*size);
        map.put("pageSize", size);
        map.put("list", list);
        map.put("tasteId", tasteId);
        return voteTasteScoreMapper.getList(map);
    }
}
