package com.welink.vote.common.data.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.welink.vote.common.data.model.GroupMemberScore;
import com.welink.vote.common.data.model.VoteTask;

import java.util.List;

/**
 * <p>
 *  服务类
 * </p>
 *
 * @author chendp
 * @since 2024-01-19
 */
public interface IVoteTaskService extends IService<VoteTask> {

    List<GroupMemberScore> getList();
}
