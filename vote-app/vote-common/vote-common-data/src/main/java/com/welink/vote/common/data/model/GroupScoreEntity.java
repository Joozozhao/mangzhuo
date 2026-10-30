package com.welink.vote.common.data.model;

import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

public class GroupScoreEntity implements Serializable {
    @ApiModelProperty("组ID")
    private Integer groupId;
    @ApiModelProperty("组名")
    private String groupName;
    @ApiModelProperty("组的总票数")
    private Integer groupScore;
    @ApiModelProperty("团队照片")
    private String groupImg;
    @ApiModelProperty("组员列表")
    private List<VoteUser> listMember;
    @ApiModelProperty("活动分数明细")
    private ArrayList<Object> listActiveScore;

    public Integer getGroupId() {
        return groupId;
    }

    public void setGroupId(Integer groupId) {
        this.groupId = groupId;
    }

    public String getGroupName() {
        return groupName;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public Integer getGroupScore() {
        return groupScore;
    }

    public void setGroupScore(Integer groupScore) {
        this.groupScore = groupScore;
    }

    public String getGroupImg() {
        return groupImg;
    }

    public void setGroupImg(String groupImg) {
        this.groupImg = groupImg;
    }

    public List<VoteUser> getListMember() {
        return listMember;
    }

    public void setListMember(List<VoteUser> listMember) {
        this.listMember = listMember;
    }

    public ArrayList<Object> getListActiveScore() {
        return listActiveScore;
    }

    public void setListActiveScore(ArrayList<Object> listActiveScore) {
        this.listActiveScore = listActiveScore;
    }

    public static Comparator<GroupScoreEntity> comparator = new Comparator<GroupScoreEntity>() {
        @Override
        public int compare(GroupScoreEntity o1, GroupScoreEntity o2) {
            return o1.getGroupScore()-o2.getGroupScore();
        }
    };
}
