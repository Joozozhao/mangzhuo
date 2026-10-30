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

 Date: 14/01/2025 11:42:17
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for vote_gift
-- ----------------------------
DROP TABLE IF EXISTS `vote_gift`;
CREATE TABLE `vote_gift`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `gift_name` varchar(64) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '礼物名称',
  `gift_img_url` varchar(255) CHARACTER SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL COMMENT '礼物路径',
  `sort` int(11) NULL DEFAULT 0 COMMENT '显示排序',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 8 CHARACTER SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = Compact;

SET FOREIGN_KEY_CHECKS = 1;
