package com.welink.vote.common.data.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.annotations.ApiModel;

@TableName("vote_taste_type")
@ApiModel(value = "VoteTasteType对象", description = "")
public class VoteTasteType {
    @TableId(value = "id", type = IdType.AUTO)
    private int id;
    /** 分类名 */
    private String tasteType;
    /** 任务ID */
    private int tasteId;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getTasteType() {
        return tasteType;
    }

    public void setTasteType(String tasteType) {
        this.tasteType = tasteType;
    }

    public int getTasteId() {
        return tasteId;
    }

    public void setTasteId(int tasteId) {
        this.tasteId = tasteId;
    }
}
