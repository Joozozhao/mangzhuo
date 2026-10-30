package com.welink.vote.common.data.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.io.Serializable;
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
@TableName("vote_group")
@ApiModel(value = "VoteGroup对象", description = "")
public class VoteGroup implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty("组ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty("组名")
    private String groupName;

    @ApiModelProperty("组序号")
    private Integer serialNo;

    @ApiModelProperty("团队照片地址")
    private String groupImg;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getGroupName() {
        return groupName;
    }

    public void setGroupName(String groupName) {
        this.groupName = groupName;
    }

    public Integer getSerialNo() {
        return serialNo;
    }

    public void setSerialNo(Integer serialNo) {
        this.serialNo = serialNo;
    }

    public String getGroupImg() {
        return groupImg;
    }

    public void setGroupImg(String groupImg) {
        this.groupImg = groupImg;
    }

    @Override
    public String toString() {
        return "VoteGroup{" +
            "id = " + id +
            ", groupName = " + groupName +
            ", serialNo = " + serialNo +
            ", groupImg = " + groupImg +
        "}";
    }
}
