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
@TableName("vote_task")
@ApiModel(value = "VoteTask对象", description = "")
public class VoteTask implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty("任务ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty("任务名称")
    private String taskName;

    @ApiModelProperty("演员")
    private String performer;

    @ApiModelProperty("0，未开始，1，开始投票")
    private Integer state;

    @ApiModelProperty("开始时间")
    private String startTime;

    @ApiModelProperty("结束时间")
    private String endTime;

    @ApiModelProperty("所属活动ID")
    private Integer actyId;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getTaskName() {
        return taskName;
    }

    public void setTaskName(String taskName) {
        this.taskName = taskName;
    }

    public String getPerformer() {
        return performer;
    }

    public void setPerformer(String performer) {
        this.performer = performer;
    }

    public Integer getState() {
        return state;
    }

    public void setState(Integer state) {
        this.state = state;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public Integer getActyId() {
        return actyId;
    }

    public void setActyId(Integer actyId) {
        this.actyId = actyId;
    }

    @Override
    public String toString() {
        return "VoteTask{" +
            "id = " + id +
            ", taskName = " + taskName +
            ", performer = " + performer +
            ", state = " + state +
            ", startTime = " + startTime +
            ", endTime = " + endTime +
            ", actyId = " + actyId +
        "}";
    }
}
