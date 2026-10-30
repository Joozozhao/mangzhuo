package com.welink.voteadmin.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.welink.vote.common.core.response.R;
import com.welink.vote.common.data.model.VoteGroup;
import com.welink.vote.common.data.model.VoteTask;
import com.welink.vote.common.data.model.VoteUser;
import com.welink.vote.common.data.service.IVoteGroupService;
import com.welink.vote.common.data.service.IVoteTaskService;
import io.swagger.annotations.ApiOperation;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;
import org.springframework.stereotype.Controller;

import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * <p>
 *  前端控制器
 * </p>
 *
 * @author chendp
 * @since 2024-01-17
 */
@Controller
@RequestMapping("/vote/task")
public class VoteTaskController {
    @Resource
    private IVoteTaskService iVoteTaskService;
    @Resource
    private IVoteGroupService iVoteGroupService;

    @ApiOperation(value = "获取任务信息", httpMethod = "get", tags = "任务信息")
    @ResponseBody
    @GetMapping("/list")
    public R<?> list(@RequestParam(value = "page", defaultValue = "1") int curPage,
                     @RequestParam(value = "limit", defaultValue = "15") int size) {
        Page<VoteTask> page = new Page<>(curPage, size);
        QueryWrapper<VoteTask> wrapper = new QueryWrapper<>();
        IPage<VoteTask> pageVo =  iVoteTaskService.page(page, wrapper);
        return R.ok(pageVo.getRecords(), pageVo.getTotal());
    }

    @ApiOperation(value = "更新任务信息", httpMethod = "get", tags = "更新任务信息")
    @ResponseBody
    @PostMapping("/update")
    public R<?> update(@RequestParam(value = "state") int state,
                     @RequestParam(value = "id") int id) {
        if(id==0){
            return R.failed();
        }
        VoteTask voteTask = iVoteTaskService.getById(id);
        if(voteTask==null){
            return R.failed();
        }
        voteTask.setState(state);
        SimpleDateFormat formatter = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        Date date = new Date();
        String formattedDate = formatter.format(date);
        voteTask.setEndTime(formattedDate);
        QueryWrapper<VoteTask> wrapper = new QueryWrapper<>();
        wrapper.eq("id", id);
        boolean update = iVoteTaskService.update(voteTask, wrapper);
        if(update){
            return R.ok();
        }
        return R.failed();
    }
    @ApiOperation(value = "删除任务", httpMethod = "post", tags = "删除任务")
    @ResponseBody
    @PostMapping("/delSort")
    public R<?> delSort() {
        UpdateWrapper<VoteGroup> objectUpdateWrapper = new UpdateWrapper<>();
        objectUpdateWrapper.set("serial_no",0);
        iVoteGroupService.update(objectUpdateWrapper);
        return R.ok();
    }
}
