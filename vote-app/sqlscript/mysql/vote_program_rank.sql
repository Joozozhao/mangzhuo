/*
 Navicat Premium Data Transfer

 Source Server         : GMP-10.1.120.152
 Source Server Type    : MySQL
 Source Server Version : 50637
 Source Host           : 10.1.120.152:3306
 Source Schema         : vote

 Target Server Type    : MySQL
 Target Server Version : 50637
 File Encoding         : 65001

 Date: 20/01/2025 16:04:29
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for vote_program_rank
-- ----------------------------
DROP TABLE IF EXISTS `vote_program_rank`;
CREATE TABLE `vote_program_rank`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `program_name` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '节目名称',
  `score` int(11) NULL DEFAULT 0 COMMENT '分数',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 10 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Compact;

SET FOREIGN_KEY_CHECKS = 1;
