package com.welink.voteadmin.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.welink.vote.common.core.response.R;
import com.welink.vote.common.data.model.VoteUser;
import com.welink.vote.common.data.service.IVoteUserService;
import io.swagger.annotations.ApiOperation;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

/**
 * <p>
 *  前端控制器
 * </p>
 *
 * @author chendp
 * @since 2024-01-17
 */
@Controller
@RequestMapping("/vote/user")
public class VoteUserController {
    @Resource
    private IVoteUserService iVoteUserService;

    @ApiOperation(value = "获取用户信息", httpMethod = "GET", tags = "用户信息")
    @ResponseBody
    @GetMapping("/list")
    public R<?> list(@RequestParam(value = "page", defaultValue = "1") int curPage,
                     @RequestParam(value = "limit", defaultValue = "15") int size, @RequestParam(value = "level", defaultValue = "") String key) {
        Page<VoteUser> page = new Page<>(curPage, size);
        QueryWrapper<VoteUser> wrapper = new QueryWrapper<>();
        if (key != null && !key.isEmpty()) {
            wrapper.eq("level", key);
        }
        IPage<VoteUser> pageVo =  iVoteUserService.page(page, wrapper);
        return R.ok(pageVo.getRecords(), pageVo.getTotal());
    }
}
