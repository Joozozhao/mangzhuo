package com.welink.vote.common.data.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.welink.vote.common.data.dao.VoteTaskMapper;
import com.welink.vote.common.data.model.GroupMemberScore;
import com.welink.vote.common.data.model.VoteTask;
import com.welink.vote.common.data.service.IVoteTaskService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author chendp
 * @since 2024-01-19
 */
@Service
public class VoteTaskServiceImpl extends ServiceImpl<VoteTaskMapper, VoteTask> implements IVoteTaskService {
    @Resource
    private VoteTaskMapper voteTaskMapper;
    @Override
    public List<GroupMemberScore> getList() {
        return voteTaskMapper.getList();
    }
}
