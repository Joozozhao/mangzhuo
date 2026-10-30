package com.welink.vote.common.data.dao;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.welink.vote.common.data.model.VoteTaste;
import com.welink.vote.common.data.model.VoteTasteEntity;

import java.util.HashMap;
import java.util.List;

public interface VoteTasteMapper  extends BaseMapper<VoteTaste> {
    List<VoteTasteEntity> getList(HashMap<String, Object> map);

    Integer countVoteTaste();

}
