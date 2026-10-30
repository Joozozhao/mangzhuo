package com.welink.vote.common.data.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.welink.vote.common.data.model.GroupMemberScore;
import com.welink.vote.common.data.model.GroupScoreEntity;
import com.welink.vote.common.data.model.VoteScore;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * <p>
 *  服务类
 * </p>
 *
 * @author chendp
 * @since 2024-01-19
 */
public interface IVoteScoreService extends IService<VoteScore> {
    Integer getGroupScoreByActyId(Integer actyId, Integer groupId);

    List<GroupMemberScore> getMemberScore();
}
