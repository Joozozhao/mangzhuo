package com.welink.vote.common.data.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.welink.vote.common.data.dao.VoteUserMapper;
import com.welink.vote.common.data.model.VoteUser;
import com.welink.vote.common.data.service.IVoteUserService;
import org.springframework.stereotype.Service;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author chendp
 * @since 2024-01-19
 */
@Service
public class VoteUserServiceImpl extends ServiceImpl<VoteUserMapper, VoteUser> implements IVoteUserService {

}
