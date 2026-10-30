package com.welink.vote.common.data.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.welink.vote.common.data.dao.VoteScoreMapper;
import com.welink.vote.common.data.model.GroupMemberScore;
import com.welink.vote.common.data.model.GroupScoreEntity;
import com.welink.vote.common.data.model.VoteScore;
import com.welink.vote.common.data.service.IVoteScoreService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author chendp
 * @since 2024-01-19
 */
@Service
public class VoteScoreServiceImpl extends ServiceImpl<VoteScoreMapper, VoteScore> implements IVoteScoreService {
    @Resource
    private VoteScoreMapper voteScoreMapper;

    @Override
    public Integer getGroupScoreByActyId(Integer actyId,Integer groupId) {
        HashMap<String, Object> map = new HashMap<>();
        map.put("actyId",actyId);
        map.put("groupId",groupId);
        return voteScoreMapper.getGroupScore(map);
    }

    @Override
    public List<GroupMemberScore> getMemberScore() {
        return voteScoreMapper.getMemberScore();
    }
}
