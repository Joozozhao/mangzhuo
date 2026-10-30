package com.welink.vote.common.data.model;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.annotations.ApiModel;

import java.util.Date;

@TableName("vote_taste_score")
@ApiModel(value = "VoteTasteScore对象", description = "")
public class VoteTasteScore {
    @TableId(value = "id", type = IdType.AUTO)
    private int id;
    /** 用户 */
    private String openId;
    private String typeName;
    private int judgeResult;
    /** 分数 */
    private int score;
    /** 任务分类ID */
    private int tasteTypeId;
    /** 任务ID */
    private int tasteId;
    /**  */
    private Date createTime;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getOpenId() {
        return openId;
    }

    public void setOpenId(String openId) {
        this.openId = openId;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public int getTasteTypeId() {
        return tasteTypeId;
    }

    public void setTasteTypeId(int tasteTypeId) {
        this.tasteTypeId = tasteTypeId;
    }

    public int getTasteId() {
        return tasteId;
    }

    public void setTasteId(int tasteId) {
        this.tasteId = tasteId;
    }

    public Date getCreateTime() {
        return createTime;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public String getTypeName() {
        return typeName;
    }

    public void setTypeName(String typeName) {
        this.typeName = typeName;
    }

    public int getJudgeResult() {
        return judgeResult;
    }

    public void setJudgeResult(int judgeResult) {
        this.judgeResult = judgeResult;
    }
}
