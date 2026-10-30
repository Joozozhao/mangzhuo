package com.welink.vote.common.data.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.annotations.ApiModel;

import java.util.Date;

@TableName("vote_taste")
@ApiModel(value = "VoteTaste对象", description = "")
public class VoteTaste {
    @TableId(value = "id", type = IdType.AUTO)
    private int id;
    /** 任务名称 */
    private String tasteName;
    /** 创建者 */
    private String createOpenId;
    /** 创建时间 */
    private Date createTime;
    /** 状态：0开启1停止 */
    private int status;
    private String imgUrl;
    private String tasteUrl;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getTasteName() {
        return tasteName;
    }

    public void setTasteName(String tasteName) {
        this.tasteName = tasteName;
    }

    public String getCreateOpenId() {
        return createOpenId;
    }

    public void setCreateOpenId(String createOpenId) {
        this.createOpenId = createOpenId;
    }

    public Date getCreateTime() {
        return createTime;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public int getStatus() {
        return status;
    }

    public void setStatus(int status) {
        this.status = status;
    }

    public String getImgUrl() {
        return imgUrl;
    }

    public void setImgUrl(String imgUrl) {
        this.imgUrl = imgUrl;
    }

    public String getTasteUrl() {
        return tasteUrl;
    }

    public void setTasteUrl(String tasteUrl) {
        this.tasteUrl = tasteUrl;
    }
}
