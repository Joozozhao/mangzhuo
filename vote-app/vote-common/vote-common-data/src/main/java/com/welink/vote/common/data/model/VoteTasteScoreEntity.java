package com.welink.vote.common.data.model;

import lombok.Data;

@Data
public class VoteTasteScoreEntity {
    private String openId;
    private String nickname;
    private Integer tasteTypeId;
    private Integer score;
    private String typeName;
    private Integer judgeResult;
}
