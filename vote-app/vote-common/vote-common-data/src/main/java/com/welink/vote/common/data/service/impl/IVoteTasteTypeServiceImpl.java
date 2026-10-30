package com.welink.vote.common.data.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.welink.vote.common.data.dao.VoteTasteMapper;
import com.welink.vote.common.data.dao.VoteTasteTypeMapper;
import com.welink.vote.common.data.model.VoteTaste;
import com.welink.vote.common.data.model.VoteTasteType;
import com.welink.vote.common.data.service.IVoteTasteService;
import com.welink.vote.common.data.service.IVoteTasteTypeService;
import org.springframework.stereotype.Service;

@Service
public class IVoteTasteTypeServiceImpl extends ServiceImpl<VoteTasteTypeMapper, VoteTasteType> implements IVoteTasteTypeService {

}
