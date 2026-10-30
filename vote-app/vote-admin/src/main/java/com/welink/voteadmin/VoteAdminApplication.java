package com.welink.voteadmin;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@AutoConfiguration
@ComponentScan(basePackages = {"com.welink.vote.common.data", "com.welink.voteadmin"})
@MapperScan("com.welink.vote.common.data.dao")
@SpringBootApplication
public class VoteAdminApplication {

    public static void main(String[] args) {
        SpringApplication.run(VoteAdminApplication.class, args);
    }

}
