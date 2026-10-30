
DROP TABLE IF EXISTS `vote_taste`;
CREATE TABLE `vote_taste`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `taste_name` varchar(32)  NULL DEFAULT NULL COMMENT '任务名称',
  `img_url` varchar(1024)  NULL DEFAULT NULL COMMENT '图片',
  `create_open_id` varchar(64)  NULL DEFAULT NULL COMMENT '创建者',
  `create_time` datetime(0) NULL DEFAULT NULL COMMENT '创建时间',
  `status` tinyint(4) NULL DEFAULT NULL COMMENT '状态：0开启1停止',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB;

