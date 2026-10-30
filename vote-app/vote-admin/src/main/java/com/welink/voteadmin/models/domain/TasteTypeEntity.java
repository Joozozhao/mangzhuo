package com.welink.voteadmin.models.domain;

import com.welink.vote.common.data.model.VoteTaste;
import com.welink.vote.common.data.model.VoteTasteType;

import java.util.List;

public class TasteTypeEntity extends VoteTaste {
    private List<VoteTasteType> listVoteTasteType;
    private List<VoteTasteType> selectItemsType;
    private int isShow;

    public int getIsShow() {
        return isShow;
    }

    public void setIsShow(int isShow) {
        this.isShow = isShow;
    }

    public List<VoteTasteType> getListVoteTasteType() {
        return listVoteTasteType;
    }

    public void setListVoteTasteType(List<VoteTasteType> listVoteTasteType) {
        this.listVoteTasteType = listVoteTasteType;
    }

    public List<VoteTasteType> getSelectItemsType() {
        return selectItemsType;
    }

    public void setSelectItemsType(List<VoteTasteType> selectItemsType) {
        this.selectItemsType = selectItemsType;
    }

    public static TasteTypeEntity getTasteTypeEntity(VoteTaste voteTaste){
        TasteTypeEntity tasteTypeEntity = new TasteTypeEntity();
        tasteTypeEntity.setId(voteTaste.getId());
        tasteTypeEntity.setTasteName(voteTaste.getTasteName());
        tasteTypeEntity.setStatus(voteTaste.getStatus());
        tasteTypeEntity.setCreateOpenId(voteTaste.getCreateOpenId());
        tasteTypeEntity.setCreateTime(voteTaste.getCreateTime());
        tasteTypeEntity.setImgUrl(voteTaste.getImgUrl());
        tasteTypeEntity.setTasteUrl(voteTaste.getTasteUrl());
        return tasteTypeEntity;
    }
}
