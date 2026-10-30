package com.welink.vote.common.data.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.welink.vote.common.data.model.GroupMemberScore;
import com.welink.vote.common.data.model.VoteTask;

import java.util.List;

/**
 * <p>
 *  Mapper 接口
 * </p>
 *
 * @author chendp
 * @since 2024-01-19
 */
public interface VoteTaskMapper extends BaseMapper<VoteTask> {

    List<GroupMemberScore> getList();

}
