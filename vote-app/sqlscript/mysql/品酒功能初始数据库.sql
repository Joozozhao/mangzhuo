DROP TABLE IF EXISTS `vote_taste`;
CREATE TABLE `vote_taste`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `taste_name` varchar(32) CHARACTER NULL DEFAULT NULL COMMENT '任务名称',
  `create_open_id` varchar(64) CHARACTER  DEFAULT NULL COMMENT '创建者',
  `create_time` datetime(0) NULL DEFAULT NULL COMMENT '创建时间',
  `status` tinyint(4) NULL DEFAULT NULL COMMENT '状态：0开启1停止',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 0;

-- ----------------------------
-- Table structure for vote_taste_score
-- ----------------------------
DROP TABLE IF EXISTS `vote_taste_score`;
CREATE TABLE `vote_taste_score`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `open_id` varchar(64) NOT NULL COMMENT '用户',
  `type_name` varchar(64) NULL DEFAULT NULL COMMENT '酒名',
  `score` int(11) NOT NULL COMMENT '分数',
  `taste_type_id` int(11) NOT NULL COMMENT '任务分类ID',
  `taste_id` int(11) NOT NULL COMMENT '任务ID',
  `create_time` datetime(0) NOT NULL,
  `judge_result` tinyint(4) NULL DEFAULT NULL COMMENT '判断结果0错1正确',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 0;

-- ----------------------------
-- Table structure for vote_taste_type
-- ----------------------------
DROP TABLE IF EXISTS `vote_taste_type`;
CREATE TABLE `vote_taste_type`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `taste_type` varchar(100) NOT NULL COMMENT '分类名',
  `taste_id` int(11) NOT NULL COMMENT '任务ID',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 0;

-- ----------------------------
-- Table structure for vote_taste_user
-- ----------------------------
DROP TABLE IF EXISTS `vote_taste_user`;
CREATE TABLE `vote_taste_user`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `openid` varchar(64) NOT NULL COMMENT '用户的唯一标识',
  `nickname` varchar(64) NOT NULL COMMENT '用户昵称',
  `sex` tinyint(2) NULL DEFAULT NULL COMMENT '用户的性别，值为1时是男性，值为2时是女性，值为0时是未知',
  `province` varchar(255) NULL DEFAULT NULL COMMENT '用户个人资料填写的省份',
  `city` varchar(64)  NOT NULL COMMENT '普通用户个人资料填写的城市',
  `country` varchar(64)  NOT NULL COMMENT '国家，如中国为CN',
  `headimgurl` varchar(1024) DEFAULT NULL COMMENT '用户头像，最后一个数值代表正方形头像大小（有0、46、64、96、132数值可选，0代表640*640正方形头像），用户没有头像时该项为空。若用户更换头像，原有头像URL将失效。',
  `privilege` varchar(255) DEFAULT NULL COMMENT '用户特权信息，json 数组，如微信沃卡用户为（chinaunicom）',
  `unionid` varchar(64) DEFAULT NULL COMMENT '只有在用户将公众号绑定到微信开放平台账号后，才会出现该字段。',
  `create_time` datetime(0) NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `vote_taste_unique`(`openid`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 0 COMMENT = '微信用户信息';

