package com.welink.vote.common.data.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.welink.vote.common.data.model.VoteScore;
import com.welink.vote.common.data.model.GroupMemberScore;

import java.util.HashMap;
import java.util.List;

/**
 * <p>
 *  Mapper 接口
 * </p>
 *
 * @author chendp
 * @since 2024-01-19
 */
public interface VoteScoreMapper extends BaseMapper<VoteScore> {
    Integer getGroupScore(HashMap<String, Object> map);
    List<GroupMemberScore> getMemberScore();
}
