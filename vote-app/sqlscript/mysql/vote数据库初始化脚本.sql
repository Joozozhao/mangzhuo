/*
 Navicat Premium Data Transfer

 Source Server         : GMP-一键部署
 Source Server Type    : MySQL
 Source Server Version : 50637
 Source Host           : 10.1.120.152:3306
 Source Schema         : vote

 Target Server Type    : MySQL
 Target Server Version : 50637
 File Encoding         : 65001

 Date: 23/01/2024 16:13:27
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for vote_acty
-- ----------------------------
DROP TABLE IF EXISTS `vote_acty`;
CREATE TABLE `vote_acty`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '活动ID',
  `acty_name` varchar(64) CHARACTER SET utf8 COLLATE utf8_german2_ci NOT NULL COMMENT '活动名称',
  `acty_rule` varchar(256) CHARACTER SET utf8 COLLATE utf8_german2_ci NOT NULL COMMENT '活动规则',
  `start_time` datetime NOT NULL COMMENT '开始时间',
  `end_time` datetime NOT NULL COMMENT '结束时间',
  `remark` varchar(256) CHARACTER SET utf8 COLLATE utf8_german2_ci NOT NULL COMMENT '备注',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_german2_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Records of vote_acty
-- ----------------------------
INSERT INTO `vote_acty` VALUES (1, '团队展示', '', '2024-02-04 09:00:00', '2024-02-04 12:00:00', '评分参考：创意新颖、视觉效果、配乐选择、团队风范、语言运用、主题契合度。');
INSERT INTO `vote_acty` VALUES (2, '团队共创-训练营', '', '2024-02-04 09:30:00', '2024-02-04 12:00:00', '评分参考：材料充足、实施性强、逻辑性强、商业计划、项目创意、演示效果。');
INSERT INTO `vote_acty` VALUES (3, '团队拓展', '', '2024-02-04 14:00:00', '2024-02-04 17:00:00', '');
INSERT INTO `vote_acty` VALUES (4, '团队共创-脱口秀', '', '2024-02-05 09:00:00', '2024-02-05 12:00:00', '评分参考：内容深度与原创性、幽默感与节奏感、观点与价值观、表达技巧与舞台表现、观众互动与反馈、整体效果与呈现。');

-- ----------------------------
-- Table structure for vote_group
-- ----------------------------
DROP TABLE IF EXISTS `vote_group`;
CREATE TABLE `vote_group`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '组ID',
  `group_name` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '组名',
  `serial_no` tinyint(3) NOT NULL DEFAULT 0 COMMENT '组序号',
  `group_img` varchar(256) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '团队照片地址',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_group_name`(`group_name`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Records of vote_group
-- ----------------------------
INSERT INTO `vote_group` VALUES (1, '1组', 4, '');
INSERT INTO `vote_group` VALUES (2, '2组', 6, '');
INSERT INTO `vote_group` VALUES (3, '3组', 1, '');
INSERT INTO `vote_group` VALUES (4, '4组', 5, '');
INSERT INTO `vote_group` VALUES (5, '5组', 8, '');
INSERT INTO `vote_group` VALUES (6, '6组', 7, '');
INSERT INTO `vote_group` VALUES (7, '7组', 3, '');
INSERT INTO `vote_group` VALUES (8, '8组', 2, '');
INSERT INTO `vote_group` VALUES (9, '评委组', 0, '');
INSERT INTO `vote_group` VALUES (10, '会务组', 0, '');

-- ----------------------------
-- Table structure for vote_score
-- ----------------------------
DROP TABLE IF EXISTS `vote_score`;
CREATE TABLE `vote_score`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `name` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '打分人名字',
  `open_id` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '打分人openID',
  `score` tinyint(3) NOT NULL COMMENT '分数',
  `task_id` int(11) NOT NULL COMMENT '任务ID',
  `group_id` int(11) NOT NULL COMMENT '组ID',
  `user_id` int(11) NOT NULL COMMENT '被打分用户ID',
  `create_time` datetime NOT NULL COMMENT '打分时间',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Records of vote_score
-- ----------------------------
INSERT INTO `vote_score` VALUES (1, '芮志强', 'ogmBy51T5LdCS1NNjK48z3QX8f-A', 3, 11, 7, 19, '2024-01-22 12:01:53');
INSERT INTO `vote_score` VALUES (2, '芮志强', 'ogmBy51T5LdCS1NNjK48z3QX8f-A', 1, 11, 3, 20, '2024-01-22 12:01:53');
INSERT INTO `vote_score` VALUES (3, '芮志强', 'ogmBy51T5LdCS1NNjK48z3QX8f-A', 2, 11, 4, 21, '2024-01-22 12:01:53');
INSERT INTO `vote_score` VALUES (4, '芮志强', 'ogmBy51T5LdCS1NNjK48z3QX8f-A', 2, 11, 3, 22, '2024-01-22 12:01:53');

-- ----------------------------
-- Table structure for vote_task
-- ----------------------------
DROP TABLE IF EXISTS `vote_task`;
CREATE TABLE `vote_task`  (
  `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  `task_name` varchar(128) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '任务名称',
  `performer` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '演员',
  `state` tinyint(3) NOT NULL COMMENT '0，未开始，1，开始投票',
  `start_time` datetime NOT NULL COMMENT '开始时间',
  `end_time` datetime NOT NULL COMMENT '结束时间',
  `acty_id` int(11) NOT NULL COMMENT '所属活动ID',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Records of vote_task
-- ----------------------------
INSERT INTO `vote_task` VALUES (3, '团队展示-1组', '1组', 0, '2024-02-04 09:00:00', '2024-01-22 11:19:26', 1);
INSERT INTO `vote_task` VALUES (4, '团队展示-2组', '2组', 0, '2024-02-04 09:05:00', '2024-02-04 09:08:00', 1);
INSERT INTO `vote_task` VALUES (5, '团队展示-3组', '3组', 0, '2024-02-04 09:10:00', '2024-02-04 09:13:00', 1);
INSERT INTO `vote_task` VALUES (6, '团队展示-4组', '4组', 0, '2024-02-04 09:15:00', '2024-02-04 09:18:00', 1);
INSERT INTO `vote_task` VALUES (7, '团队展示-5组', '5组', 0, '2024-02-04 09:20:00', '2024-02-04 09:23:00', 1);
INSERT INTO `vote_task` VALUES (8, '团队展示-6组', '6组', 0, '2024-02-04 09:25:00', '2024-02-04 09:28:00', 1);
INSERT INTO `vote_task` VALUES (9, '团队展示-7组', '7组', 0, '2024-02-04 09:30:00', '2024-02-04 09:33:00', 1);
INSERT INTO `vote_task` VALUES (10, '团队展示-8组', '8组', 0, '2024-02-04 09:35:00', '2024-02-04 09:38:00', 1);
INSERT INTO `vote_task` VALUES (11, '团队共创-训练营', '1组', 1, '2024-02-04 09:40:00', '2024-01-22 11:20:47', 2);
INSERT INTO `vote_task` VALUES (12, '团队共创-训练营', '2组', 0, '2024-02-04 09:55:00', '2024-02-04 10:10:00', 2);
INSERT INTO `vote_task` VALUES (13, '团队共创-训练营', '3组', 0, '2024-02-04 10:10:00', '2024-02-04 10:25:00', 2);
INSERT INTO `vote_task` VALUES (14, '团队共创-训练营', '4组', 0, '2024-02-04 10:25:00', '2024-02-04 10:40:00', 2);
INSERT INTO `vote_task` VALUES (15, '团队共创-训练营', '5组', 0, '2024-02-04 10:40:00', '2024-02-04 10:55:00', 2);
INSERT INTO `vote_task` VALUES (16, '团队共创-训练营', '6组', 0, '2024-02-04 10:55:00', '2024-02-04 11:10:00', 2);
INSERT INTO `vote_task` VALUES (17, '团队共创-训练营', '7组', 0, '2024-02-04 11:10:00', '2024-02-04 11:25:00', 2);
INSERT INTO `vote_task` VALUES (18, '团队共创-训练营', '8组', 0, '2024-02-04 11:25:00', '2024-02-04 11:40:00', 2);
INSERT INTO `vote_task` VALUES (19, '团队共创-脱口秀-工作篇', '王亮', 0, '2024-02-05 09:00:00', '2024-02-05 09:05:00', 4);
INSERT INTO `vote_task` VALUES (20, '团队共创-脱口秀-工作篇', '张帆', 0, '2024-02-05 09:05:00', '2024-02-05 09:10:00', 4);
INSERT INTO `vote_task` VALUES (21, '团队共创-脱口秀-工作篇', '高存良', 0, '2024-02-05 09:10:00', '2024-02-05 09:15:00', 4);
INSERT INTO `vote_task` VALUES (22, '团队共创-脱口秀-工作篇', '孙秀娟', 0, '2024-02-05 09:15:00', '2024-02-05 09:20:00', 4);
INSERT INTO `vote_task` VALUES (23, '团队共创-脱口秀-工作篇', '张宁', 0, '2024-02-05 09:20:00', '2024-02-05 09:25:00', 4);
INSERT INTO `vote_task` VALUES (24, '团队共创-脱口秀-工作篇', '温福哲', 0, '2024-02-05 09:25:00', '2024-02-05 09:30:00', 4);
INSERT INTO `vote_task` VALUES (25, '团队共创-脱口秀-工作篇', '李海龙', 0, '2024-02-05 09:30:00', '2024-02-05 09:35:00', 4);
INSERT INTO `vote_task` VALUES (26, '团队共创-脱口秀-工作篇', '邢海月', 0, '2024-02-05 09:35:00', '2024-02-05 09:40:00', 4);
INSERT INTO `vote_task` VALUES (27, '团队共创-脱口秀-生活篇', '徐冉', 0, '2024-02-05 09:40:00', '2024-02-05 09:45:00', 4);
INSERT INTO `vote_task` VALUES (28, '团队共创-脱口秀-生活篇', '刘颖', 0, '2024-02-05 09:45:00', '2024-02-05 09:50:00', 4);
INSERT INTO `vote_task` VALUES (29, '团队共创-脱口秀-生活篇', '孙永山', 0, '2024-02-05 09:50:00', '2024-02-05 09:55:00', 4);
INSERT INTO `vote_task` VALUES (30, '团队共创-脱口秀-生活篇', '贺开华', 0, '2024-02-05 09:55:00', '2024-02-05 10:00:00', 4);
INSERT INTO `vote_task` VALUES (31, '团队共创-脱口秀-生活篇', '蒋倪', 0, '2024-02-05 10:00:00', '2024-02-05 10:05:00', 4);
INSERT INTO `vote_task` VALUES (32, '团队共创-脱口秀-生活篇', '吕健', 0, '2024-02-05 10:05:00', '2024-02-05 10:10:00', 4);
INSERT INTO `vote_task` VALUES (33, '团队共创-脱口秀-生活篇', '姚磊', 0, '2024-02-05 10:10:00', '2024-02-05 10:15:00', 4);
INSERT INTO `vote_task` VALUES (34, '团队共创-脱口秀-生活篇', '张华英', 0, '2024-02-05 10:15:00', '2024-02-05 10:20:00', 4);
INSERT INTO `vote_task` VALUES (35, '团队共创-脱口秀-其他篇', '许加梅', 0, '2024-02-05 10:20:00', '2024-02-05 10:25:00', 4);
INSERT INTO `vote_task` VALUES (36, '团队共创-脱口秀-其他篇', '单鸿媛', 0, '2024-02-05 10:25:00', '2024-02-05 10:30:00', 4);
INSERT INTO `vote_task` VALUES (37, '团队共创-脱口秀-其他篇', '喻敏', 0, '2024-02-05 10:30:00', '2024-02-05 10:35:00', 4);
INSERT INTO `vote_task` VALUES (38, '团队共创-脱口秀-其他篇', '王钦科', 0, '2024-02-05 10:35:00', '2024-02-05 10:40:00', 4);
INSERT INTO `vote_task` VALUES (39, '团队共创-脱口秀-其他篇', '弓伟', 0, '2024-02-05 10:40:00', '2024-02-05 10:45:00', 4);
INSERT INTO `vote_task` VALUES (40, '团队共创-脱口秀-其他篇', '申伟', 0, '2024-02-05 10:45:00', '2024-02-05 10:50:00', 4);
INSERT INTO `vote_task` VALUES (41, '团队共创-脱口秀-其他篇', '王金宇', 0, '2024-02-05 10:50:00', '2024-02-05 10:55:00', 4);
INSERT INTO `vote_task` VALUES (42, '团队共创-脱口秀-其他篇', '丁明章', 0, '2024-02-05 10:55:00', '2024-02-05 11:00:00', 4);

-- ----------------------------
-- Table structure for vote_user
-- ----------------------------
DROP TABLE IF EXISTS `vote_user`;
CREATE TABLE `vote_user`  (
  `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `user_name` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '用户名',
  `mobile` varchar(16) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '' COMMENT '用户手机号',
  `code` varchar(12) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '' COMMENT '参会码',
  `open_id` varchar(256) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL DEFAULT '' COMMENT '微信的openID',
  `group_id` tinyint(3) UNSIGNED NOT NULL DEFAULT 0 COMMENT '组号，9组评委组，10会务组',
  `level` tinyint(4) NOT NULL DEFAULT 0 COMMENT '0:队员，1:队长，2:高管',
  `user_img` varchar(256) CHARACTER SET utf8 COLLATE utf8_general_ci NOT NULL COMMENT '成员照片',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `uk_code`(`code`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Compact;

-- ----------------------------
-- Records of vote_user
-- ----------------------------
INSERT INTO `vote_user` VALUES (1, '张福连', '', '862701', '', 9, 2, '');
INSERT INTO `vote_user` VALUES (2, '程传雷', '', '680745', '', 9, 2, '');
INSERT INTO `vote_user` VALUES (3, '张静', '', '420451', '', 9, 2, '');
INSERT INTO `vote_user` VALUES (4, '陈豪', '', '768562', '', 9, 2, '');
INSERT INTO `vote_user` VALUES (5, '韩志敏', '', '601363', '', 2, 0, '');
INSERT INTO `vote_user` VALUES (6, '李雪松', '', '916356', '', 5, 0, '');
INSERT INTO `vote_user` VALUES (7, '董成伟', '', '261324', '', 6, 0, '');
INSERT INTO `vote_user` VALUES (8, '安媛', '', '725869', '', 1, 0, '');
INSERT INTO `vote_user` VALUES (9, '孔蕾', '', '305549', '', 5, 0, '');
INSERT INTO `vote_user` VALUES (10, '王露雪', '', '475818', '', 3, 0, '');
INSERT INTO `vote_user` VALUES (11, '马峰', '', '158567', '', 1, 0, '');
INSERT INTO `vote_user` VALUES (12, '徐磊', '', '790093', '', 10, 3, '');
INSERT INTO `vote_user` VALUES (13, '于秋玲', '', '123231', '', 1, 0, '');
INSERT INTO `vote_user` VALUES (14, '赵金花 ', '', '181383', '', 3, 0, '');
INSERT INTO `vote_user` VALUES (15, '弓伟', '', '552551', '', 5, 0, '');
INSERT INTO `vote_user` VALUES (16, '刘丽娜', '', '322997', '', 8, 0, '');
INSERT INTO `vote_user` VALUES (17, '申巍', '', '716448', '', 6, 0, '');
INSERT INTO `vote_user` VALUES (18, '陈德平', '', '114450', '', 10, 3, '');
INSERT INTO `vote_user` VALUES (19, '芮志强', '', '380090', 'ogmBy51T5LdCS1NNjK48z3QX8f-A', 7, 0, '');
INSERT INTO `vote_user` VALUES (20, '高存良', '', '182253', '', 3, 0, '');
INSERT INTO `vote_user` VALUES (21, '许淼', '', '731915', '', 4, 0, '');
INSERT INTO `vote_user` VALUES (22, '胡素素', '', '970015', '', 3, 0, '');
INSERT INTO `vote_user` VALUES (23, '郭枫', '', '300699', '', 8, 0, '');
INSERT INTO `vote_user` VALUES (24, '赵彦兵', '', '420725', '', 10, 3, '');
INSERT INTO `vote_user` VALUES (25, '惠所重', '', '920547', '', 1, 0, '');
INSERT INTO `vote_user` VALUES (26, '王亚鑫', '', '166341', '', 2, 0, '');
INSERT INTO `vote_user` VALUES (27, '马丽君', '', '178529', '', 7, 0, '');
INSERT INTO `vote_user` VALUES (28, '武杰', '', '442547', '', 10, 3, '');
INSERT INTO `vote_user` VALUES (29, '徐利霞', '', '465873', '', 1, 0, '');
INSERT INTO `vote_user` VALUES (30, '戴钗钗', '', '494411', '', 4, 0, '');
INSERT INTO `vote_user` VALUES (31, '朱倚临', '', '270818', '', 1, 1, '');
INSERT INTO `vote_user` VALUES (32, '朱金龙', '', '368103', '', 2, 0, '');
INSERT INTO `vote_user` VALUES (33, '蒋倪', '', '178744', '', 5, 0, '');
INSERT INTO `vote_user` VALUES (34, '喻敏', '', '798946', '', 3, 0, '');
INSERT INTO `vote_user` VALUES (35, '罗胜峰', '', '306978', '', 7, 0, '');
INSERT INTO `vote_user` VALUES (36, '刘颖', '', '414914', '', 2, 1, '');
INSERT INTO `vote_user` VALUES (37, '李娜', '', '850961', '', 6, 0, '');
INSERT INTO `vote_user` VALUES (38, '韩林娜', '', '246172', '', 4, 0, '');
INSERT INTO `vote_user` VALUES (39, '徐天娇', '', '690617', '', 8, 0, '');
INSERT INTO `vote_user` VALUES (40, '李王淼', '', '360030', '', 1, 0, '');
INSERT INTO `vote_user` VALUES (41, '温福哲', '', '391127', '', 6, 1, '');
INSERT INTO `vote_user` VALUES (42, '周凡', '', '359255', '', 2, 0, '');
INSERT INTO `vote_user` VALUES (43, '王钦科', '', '105988', '', 4, 0, '');
INSERT INTO `vote_user` VALUES (44, '王金宇', '', '307678', '', 7, 1, '');
INSERT INTO `vote_user` VALUES (45, '张宁', '', '597552', '', 5, 1, '');
INSERT INTO `vote_user` VALUES (46, '王亮', '', '531151', '', 1, 0, '');
INSERT INTO `vote_user` VALUES (47, '罗竣峰', '', '453387', '', 8, 0, '');
INSERT INTO `vote_user` VALUES (48, '张延辉', '', '924015', '', 7, 0, '');
INSERT INTO `vote_user` VALUES (49, '张海', '', '547964', '', 3, 0, '');
INSERT INTO `vote_user` VALUES (50, '赵景舰', '', '397572', '', 4, 0, '');
INSERT INTO `vote_user` VALUES (51, '张庆阳', '', '536663', '', 5, 0, '');
INSERT INTO `vote_user` VALUES (52, '钱雨薇', '', '973775', '', 7, 0, '');
INSERT INTO `vote_user` VALUES (53, '张帆', '', '676269', '', 2, 0, '');
INSERT INTO `vote_user` VALUES (54, '刘永杰', '', '665184', '', 8, 0, '');
INSERT INTO `vote_user` VALUES (55, '吴剑光', '', '545614', '', 9, 2, '');
INSERT INTO `vote_user` VALUES (56, '安传荣', '', '760068', '', 9, 2, '');
INSERT INTO `vote_user` VALUES (57, '董庆文', '', '778840', '', 9, 2, '');
INSERT INTO `vote_user` VALUES (58, '孙秀娟', '', '814187', '', 4, 0, '');
INSERT INTO `vote_user` VALUES (59, '尹晓丽', '', '757109', '', 7, 0, '');
INSERT INTO `vote_user` VALUES (60, '孙永山', '', '805361', '', 3, 0, '');
INSERT INTO `vote_user` VALUES (61, '申伟', '', '998272', '', 6, 0, '');
INSERT INTO `vote_user` VALUES (62, '王淑敏', '', '278391', '', 5, 0, '');
INSERT INTO `vote_user` VALUES (63, '王明霞', '', '132566', '', 2, 0, '');
INSERT INTO `vote_user` VALUES (64, '刘欣欣', '', '101246', '', 4, 0, '');
INSERT INTO `vote_user` VALUES (65, '陆坤', '', '842101', '', 1, 0, '');
INSERT INTO `vote_user` VALUES (66, '邢海月', '', '630521', '', 8, 0, '');
INSERT INTO `vote_user` VALUES (67, '郭冬梅', '', '140152', '', 7, 0, '');
INSERT INTO `vote_user` VALUES (68, '单鸿媛', '', '762749', '', 2, 0, '');
INSERT INTO `vote_user` VALUES (69, '董婷', '', '278678', '', 6, 0, '');
INSERT INTO `vote_user` VALUES (70, '刘丽梅', '', '151943', '', 8, 1, '');
INSERT INTO `vote_user` VALUES (71, '卢元婷', '', '979592', '', 8, 0, '');
INSERT INTO `vote_user` VALUES (72, '卢立磊', '', '798660', '', 3, 0, '');
INSERT INTO `vote_user` VALUES (73, '姚磊', '', '324527', '', 7, 0, '');
INSERT INTO `vote_user` VALUES (74, '李海龙', '', '320530', '', 7, 0, '');
INSERT INTO `vote_user` VALUES (75, '安佰理', '', '933021', '', 5, 0, '');
INSERT INTO `vote_user` VALUES (76, '刘刚', '', '246123', '', 6, 0, '');
INSERT INTO `vote_user` VALUES (77, '顾永兴', '', '528332', '', 3, 0, '');
INSERT INTO `vote_user` VALUES (78, '贺开华', '', '377548', '', 4, 0, '');
INSERT INTO `vote_user` VALUES (79, '孙元梅', '', '787750', '', 3, 0, '');
INSERT INTO `vote_user` VALUES (80, '辛本玉', '', '120723', '', 5, 0, '');
INSERT INTO `vote_user` VALUES (81, '王远霞', '', '976352', '', 7, 0, '');
INSERT INTO `vote_user` VALUES (82, '安玉龙', '', '402496', '', 4, 0, '');
INSERT INTO `vote_user` VALUES (83, '孙万龙', '', '318991', '', 6, 0, '');
INSERT INTO `vote_user` VALUES (84, '万晓', '', '947194', '', 8, 0, '');
INSERT INTO `vote_user` VALUES (85, '丁梦萍', '', '842238', '', 1, 0, '');
INSERT INTO `vote_user` VALUES (86, '卢琼', '', '721278', '', 2, 0, '');
INSERT INTO `vote_user` VALUES (87, '刘双双', '', '655018', '', 5, 0, '');
INSERT INTO `vote_user` VALUES (88, '吕明杰', '', '244581', '', 2, 0, '');
INSERT INTO `vote_user` VALUES (89, '郭丽丽', '', '304974', '', 7, 0, '');
INSERT INTO `vote_user` VALUES (90, '李增兵', '', '177971', '', 1, 0, '');
INSERT INTO `vote_user` VALUES (91, '丁宁', '', '720241', '', 2, 0, '');
INSERT INTO `vote_user` VALUES (92, '杨梅', '', '490814', '', 7, 0, '');
INSERT INTO `vote_user` VALUES (93, '王璐', '', '178774', '', 2, 0, '');
INSERT INTO `vote_user` VALUES (94, '许斌', '', '132429', '', 4, 1, '');
INSERT INTO `vote_user` VALUES (95, '范冲', '', '737829', '', 8, 0, '');
INSERT INTO `vote_user` VALUES (96, '许加梅', '', '568569', '', 1, 0, '');
INSERT INTO `vote_user` VALUES (97, '付德龙', '', '509751', '', 6, 0, '');
INSERT INTO `vote_user` VALUES (98, '刘强', '', '922096', '', 1, 0, '');
INSERT INTO `vote_user` VALUES (99, '韩冬', '', '768450', '', 5, 0, '');
INSERT INTO `vote_user` VALUES (100, '朱凯', '', '114759', '', 10, 0, '');
INSERT INTO `vote_user` VALUES (101, '丁明章', '', '248015', '', 8, 0, '');
INSERT INTO `vote_user` VALUES (102, '王珊珊', '', '288730', '', 4, 0, '');
INSERT INTO `vote_user` VALUES (103, '商瑞祥', '', '792425', '', 3, 1, '');
INSERT INTO `vote_user` VALUES (104, '白晓峰', '', '547541', '', 5, 0, '');
INSERT INTO `vote_user` VALUES (105, '张琦', '', '234619', '', 4, 0, '');
INSERT INTO `vote_user` VALUES (106, '陈迎芝', '', '352464', '', 6, 0, '');
INSERT INTO `vote_user` VALUES (107, '张学玉', '', '641641', '', 5, 0, '');
INSERT INTO `vote_user` VALUES (108, '吕健', '', '467457', '', 6, 0, '');
INSERT INTO `vote_user` VALUES (109, '辛慧', '', '612582', '', 6, 0, '');
INSERT INTO `vote_user` VALUES (110, '张华英', '', '888592', '', 8, 0, '');
INSERT INTO `vote_user` VALUES (111, '曹伟', '', '101462', '', 4, 0, '');
INSERT INTO `vote_user` VALUES (112, '徐珊珊', '', '471383', '', 10, 3, '');
INSERT INTO `vote_user` VALUES (113, '申晓梅', '', '751972', '', 6, 0, '');

SET FOREIGN_KEY_CHECKS = 1;
