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
@TableName("vote_user")
@ApiModel(value = "VoteUser对象", description = "")
public class VoteUser implements Serializable {

    private static final long serialVersionUID = 1L;

    @ApiModelProperty("用户ID")
    @TableId(value = "id", type = IdType.AUTO)
    private Integer id;

    @ApiModelProperty("用户名")
    private String userName;

    @ApiModelProperty("用户手机号")
    private String mobile;

    @ApiModelProperty("参会码")
    private String code;

    @ApiModelProperty("微信的openID")
    private String openId;

    @ApiModelProperty("组号")
    private Integer groupId;

    @ApiModelProperty("0:队员，1:高管，2:汇演者")
    private Integer level;

    @ApiModelProperty("成员照片")
    private String userImg;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getMobile() {
        return mobile;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getOpenId() {
        return openId;
    }

    public void setOpenId(String openId) {
        this.openId = openId;
    }

    public Integer getGroupId() {
        return groupId;
    }

    public void setGroupId(Integer groupId) {
        this.groupId = groupId;
    }

    public Integer getLevel() {
        return level;
    }

    public void setLevel(Integer level) {
        this.level = level;
    }

    public String getUserImg() {
        return userImg;
    }

    public void setUserImg(String userImg) {
        this.userImg = userImg;
    }

    @Override
    public String toString() {
        return "VoteUser{" +
            "id = " + id +
            ", userName = " + userName +
            ", mobile = " + mobile +
            ", code = " + code +
            ", openId = " + openId +
            ", groupId = " + groupId +
            ", level = " + level +
            ", userImg = " + userImg +
        "}";
    }
}
