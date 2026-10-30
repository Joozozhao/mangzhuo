package com.welink.vote.common.data.model;

import java.util.Date;

public class VoteTasteEntity {
    private int id;
    /** 任务名称 */
    private String tasteName;
    /** 创建者 */
    private String createOpenId;
    /** 创建时间 */
    private Date createTime;
    /** 状态：0开启1停止 */
    private int status;
    /** 平均分 */
    private int average;
    /** 总分 */
    private int total_score;
    private String nickname;
    private int is_show;
    private int is_status_show;
    private String imgUrl;

    public String getImgUrl() {
        return imgUrl;
    }

    public void setImgUrl(String imgUrl) {
        this.imgUrl = imgUrl;
    }

    public int getIs_show() {
        return is_show;
    }

    public void setIs_show(int is_show) {
        this.is_show = is_show;
    }

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

    public int getAverage() {
        return average;
    }

    public void setAverage(int average) {
        this.average = average;
    }

    public int getTotal_score() {
        return total_score;
    }

    public void setTotal_score(int total_score) {
        this.total_score = total_score;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public int getIs_status_show() {
        return is_status_show;
    }

    public void setIs_status_show(int is_status_show) {
        this.is_status_show = is_status_show;
    }
}
