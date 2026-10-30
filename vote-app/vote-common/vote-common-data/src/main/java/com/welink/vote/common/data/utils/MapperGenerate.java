package com.welink.vote.common.data.utils;

import com.baomidou.mybatisplus.generator.FastAutoGenerator;
import com.baomidou.mybatisplus.generator.config.OutputFile;
import com.baomidou.mybatisplus.generator.config.rules.DbColumnType;
import com.baomidou.mybatisplus.generator.engine.FreemarkerTemplateEngine;

import java.sql.Types;
import java.util.Collections;

public class MapperGenerate {
    public static void main(String[] args) {
        //tb_exam_book,tb_exam_book_chapter,tb_exam_book_knowledge,tb_exam_chapter,tb_exam_image_map,tb_exam_info,
        //tb_exam_knowledge,tb_exam_paper,tb_exam_paper_question,tb_exam_question,tb_exam_subject,tb_sys_log,tb_sys_user,tb_user
//        FastAutoGenerator.create("jdbc:mysql://10.1.120.152:3306/vote?useUnicode=true&characterEncoding=UTF-8&serverTimezone=UTC", "root", "51welinkdb")
//                .globalConfig(builder -> {
//                    builder.author("chendp") // 设置作者
//                            .enableSwagger() // 开启 swagger 模式
//                            .fileOverride() // 覆盖已生成文件
//                            .outputDir("./"); // 指定输出目录
//                })
//                .dataSourceConfig(builder -> builder.typeConvertHandler((globalConfig, typeRegistry, metaInfo) -> {
//                    int typeCode = metaInfo.getJdbcType().TYPE_CODE;
//                    if (typeCode == Types.SMALLINT) {
//                        // 自定义类型转换
//                        return DbColumnType.INTEGER;
//                    }
//                    if (typeCode == Types.TINYINT) {
//                        return DbColumnType.INTEGER;
//                    }
//                    return typeRegistry.getColumnType(metaInfo);
//
//                }))
//                .packageConfig(builder -> {
//                    builder.parent("com.welink.vote.common") // 设置父包名
//                            .moduleName("data") // 设置父包模块名
//                            .pathInfo(Collections.singletonMap(OutputFile.xml, "./")); // 设置mapperXml生成路径
//                })
//                .strategyConfig(builder -> {
//                    builder.addInclude("vote_group","vote_score","vote_task","vote_user","vote_acty"); // 设置需要生成的表名
//                    //.addTablePrefix("tb_"); // 设置过滤表前缀
//                })
//                .templateEngine(new FreemarkerTemplateEngine()) // 使用Freemarker引擎模板，默认的是Velocity引擎模板
//                .execute();
    }
}
