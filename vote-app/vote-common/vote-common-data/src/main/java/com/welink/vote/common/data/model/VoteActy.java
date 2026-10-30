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
@TableName("vote_acty")
@ApiModel(value = "VoteActy对象", description = "")
public class VoteActy implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty("活动ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty("活动名称")
    private String actyName;

    @ApiModelProperty("活动规则")
    private String actyRule;

    @ApiModelProperty("开始时间")
    private LocalDateTime startTime;

    @ApiModelProperty("结束时间")
    private LocalDateTime endTime;

    @ApiModelProperty("备注")
    private String remark;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getActyName() {
        return actyName;
    }

    public void setActyName(String actyName) {
        this.actyName = actyName;
    }

    public String getActyRule() {
        return actyRule;
    }

    public void setActyRule(String actyRule) {
        this.actyRule = actyRule;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    @Override
    public String toString() {
        return "VoteActy{" +
            "id = " + id +
            ", actyName = " + actyName +
            ", actyRule = " + actyRule +
            ", startTime = " + startTime +
            ", endTime = " + endTime +
            ", remark = " + remark +
        "}";
    }
}
