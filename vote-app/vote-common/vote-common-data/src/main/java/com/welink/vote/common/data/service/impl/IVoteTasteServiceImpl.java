package com.welink.vote.common.data.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.welink.vote.common.data.dao.VoteTasteMapper;
import com.welink.vote.common.data.model.VoteTaste;
import com.welink.vote.common.data.model.VoteTasteEntity;
import com.welink.vote.common.data.service.IVoteTasteService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;

@Service
public class IVoteTasteServiceImpl extends ServiceImpl<VoteTasteMapper, VoteTaste> implements IVoteTasteService {
    @Resource
    private VoteTasteMapper voteTasteMapper;
    @Override
    public List<VoteTasteEntity> getList(int page, int size) {
        HashMap<String, Object> map = new HashMap<>();
        map.put("pageIndex", (page-1)*size);
        map.put("pageSize", size);
        return voteTasteMapper.getList(map);
    }

    @Override
    public int countVoteTaste() {
        return voteTasteMapper.countVoteTaste();
    }

    @Override
    public int insert(VoteTaste voteTaste) {
        return voteTasteMapper.insert(voteTaste);
    }
}
