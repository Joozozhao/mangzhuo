package com.welink.vote.common.data.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
import java.time.LocalDateTime;
import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;

/**
 * <p>
 * 
 * </p>
 *
 * @author chendp
 * @since 2024-01-19
 */
@TableName("vote_score")
@ApiModel(value = "VoteScore对象", description = "")
public class VoteScore implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty("记录ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty("打分人名字")
    private String name;

    @ApiModelProperty("打分人openID")
    private String openId;

    @ApiModelProperty("分数")
    private Integer score;

    @ApiModelProperty("任务ID")
    private Integer taskId;

    @ApiModelProperty("组ID")
    private Integer groupId;

    @ApiModelProperty("被打分用户ID")
    private Integer userId;

    @ApiModelProperty("打分时间")
    private LocalDateTime createTime;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getOpenId() {
        return openId;
    }

    public void setOpenId(String openId) {
        this.openId = openId;
    }

    public Integer getScore() {
        return score;
    }

    public void setScore(Integer score) {
        this.score = score;
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

    public Integer getUserId() {
        return userId;
    }

    public void setUserId(Integer userId) {
        this.userId = userId;
    }

    public LocalDateTime getCreateTime() {
        return createTime;
    }

    public void setCreateTime(LocalDateTime createTime) {
        this.createTime = createTime;
    }

    @Override
    public String toString() {
        return "VoteScore{" +
            "id = " + id +
            ", name = " + name +
            ", openId = " + openId +
            ", score = " + score +
            ", taskId = " + taskId +
            ", groupId = " + groupId +
            ", userId = " + userId +
            ", createTime = " + createTime +
        "}";
    }
}
