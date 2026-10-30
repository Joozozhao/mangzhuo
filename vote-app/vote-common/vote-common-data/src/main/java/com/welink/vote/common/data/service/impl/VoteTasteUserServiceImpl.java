package com.welink.vote.common.data.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.welink.vote.common.data.dao.VoteTasteUserMapper;
import com.welink.vote.common.data.model.VoteTasteUser;
import com.welink.vote.common.data.service.IVoteTasteUserService;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

@Service
public class VoteTasteUserServiceImpl extends ServiceImpl<VoteTasteUserMapper, VoteTasteUser> implements IVoteTasteUserService {
    @Resource
    private VoteTasteUserMapper voteTasteUserMapper;
}
