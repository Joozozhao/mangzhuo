package com.welink.voteadmin.models.domain;

import io.swagger.annotations.ApiModelProperty;
import lombok.Getter;

public class ShowScore {
    @ApiModelProperty("活动备注信息")
    private String remark;
    @ApiModelProperty("顺序")
    private Integer sort;
    @ApiModelProperty("是否显示排序")
    private Boolean isShow;
    @ApiModelProperty("身份信息")
    private Integer level;
    @ApiModelProperty("任务名称")
    private String taskName;
    @ApiModelProperty("组ID")
    private Integer groupId;
    @ApiModelProperty("任务ID")
    private Integer taskId;
    @ApiModelProperty("是否已投")
    private Boolean isVote;
    @Getter
    @ApiModelProperty("表演者")
    private String performer;
    private String img;

    public String getImg() {
        return img;
    }

    public void setImg(String img) {
        this.img = img;
    }

    public Boolean getVote() {
        return isVote;
    }

    public void setVote(Boolean vote) {
        isVote = vote;
    }

    public Integer getTaskId() {
        return taskId;
    }

    public void setTaskId(Integer taskId) {
        this.taskId = taskId;
    }

    public Integer getGroupId() {
        return groupId;
    }

    public void setGroupId(Integer groupId) {
        this.groupId = groupId;
    }

    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public Integer getSort() {
        return sort;
    }

    public void setSort(Integer sort) {
        this.sort = sort;
    }

    public Boolean getShow() {
        return isShow;
    }

    public void setShow(Boolean show) {
        isShow = show;
    }

    public Integer getLevel() {
        return level;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

    public String getTaskName() {
        return taskName;
    }

    public void setTaskName(String taskName) {
        this.taskName = taskName;
    }

    public void setPerformer(String performer) {
        this.performer = performer;
    }
}
