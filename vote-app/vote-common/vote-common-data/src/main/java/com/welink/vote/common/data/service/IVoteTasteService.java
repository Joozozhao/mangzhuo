package com.welink.vote.common.data.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.welink.vote.common.data.model.GroupMemberScore;
import com.welink.vote.common.data.model.VoteScore;
import com.welink.vote.common.data.model.VoteTaste;
import com.welink.vote.common.data.model.VoteTasteEntity;
import org.apache.ibatis.annotations.Options;

import java.util.List;

public interface IVoteTasteService extends IService<VoteTaste> {
    List<VoteTasteEntity> getList(int page, int size);

    int countVoteTaste();

    @Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(VoteTaste voteTaste);
}
