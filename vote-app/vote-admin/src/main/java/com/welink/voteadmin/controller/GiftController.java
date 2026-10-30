package com.welink.voteadmin.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.welink.vote.common.core.response.R;
import com.welink.vote.common.data.model.*;
import com.welink.vote.common.data.service.IVoteGiftService;
import com.welink.vote.common.data.service.IVoteProgramRankService;
import com.welink.vote.common.data.service.IVoteUserService;
import io.swagger.annotations.ApiOperation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.text.SimpleDateFormat;
import java.util.*;

@Controller
@RequestMapping("/vote/gift")
public class GiftController {
    @Autowired
    private IVoteGiftService iVoteGiftService;
    @Autowired
    private IVoteProgramRankService iVoteProgramRankService;

    @ResponseBody
    @RequestMapping("/showGift")
    public R<?> saveCode(HttpServletRequest request, HttpServletResponse response){
        HashMap<String, Object> map = new HashMap<>();
        QueryWrapper<VoteGift> voteGiftQueryWrapper = new QueryWrapper<>();
        voteGiftQueryWrapper.ge("sort",1);
        voteGiftQueryWrapper.orderByAsc("sort");
        List<VoteGift> list = iVoteGiftService.list(voteGiftQueryWrapper);
        if(list!=null && list.size()>0){
            return R.ok(list);
        }
        return R.failed();
    }

    @ApiOperation(value = "获取礼物信息", httpMethod = "get", tags = "礼物信息")
    @ResponseBody
    @GetMapping("/list")
    public R<?> list(@RequestParam(value = "page", defaultValue = "1") int curPage,
                     @RequestParam(value = "limit", defaultValue = "15") int size) {
        Page<VoteGift> page = new Page<>(curPage, size);
        QueryWrapper<VoteGift> wrapper = new QueryWrapper<>();
        IPage<VoteGift> pageVo =  iVoteGiftService.page(page, wrapper);
        return R.ok(pageVo.getRecords(), pageVo.getTotal());
    }

    @ApiOperation(value = "删除礼物展示信息", httpMethod = "post", tags = "删除")
    @ResponseBody
    @PostMapping("/delSort")
    public R<?> delSort() {
        UpdateWrapper<VoteGift> objectUpdateWrapper = new UpdateWrapper<>();
        objectUpdateWrapper.set("sort",0);
        iVoteGiftService.update(objectUpdateWrapper);
        return R.ok();
    }

    @ApiOperation(value = "更新礼物信息", httpMethod = "post", tags = "更新礼物信息")
    @ResponseBody
    @PostMapping("/update")
    public R<?> update(@RequestParam(value = "gift1") String gift1,
                       @RequestParam(value = "gift2") String gift2,
                       @RequestParam(value = "gift3") String gift3,
                       @RequestParam(value = "gift4") String gift4,
                       @RequestParam(value = "gift5") String gift5,
                       @RequestParam(value = "gift6") String gift6,
                       @RequestParam(value = "gift7") String gift7,
                       @RequestParam(value = "gift8") String gift8) {
        try{
            UpdateWrapper<VoteGift> objectUpdateWrapper = new UpdateWrapper<>();
            objectUpdateWrapper.set("sort",0);
            iVoteGiftService.update(objectUpdateWrapper);
            VoteGift voteGift = new VoteGift();
            if(!StringUtils.isEmpty(gift1)){
                VoteGift byId = iVoteGiftService.getById(gift1);
                QueryWrapper<VoteGift> wrapper1 = new QueryWrapper<>();
                wrapper1.eq("id", gift1);
                if(byId.getSort().equals("0")){
                    voteGift.setSort("1");
                }else{
                    voteGift.setSort(byId.getSort()+","+"1");
                }
                iVoteGiftService.update(voteGift,wrapper1);
            }
            if(!StringUtils.isEmpty(gift2)){
                VoteGift byId = iVoteGiftService.getById(gift2);
                QueryWrapper<VoteGift> wrapper2 = new QueryWrapper<>();
                wrapper2.eq("id", gift2);
                if(byId.getSort().equals("0")){
                    voteGift.setSort("2");
                }else{
                    voteGift.setSort(byId.getSort()+","+"2");
                }
                iVoteGiftService.update(voteGift,wrapper2);
            }
            if(!StringUtils.isEmpty(gift3)){
                VoteGift byId = iVoteGiftService.getById(gift3);
                QueryWrapper<VoteGift> wrapper3 = new QueryWrapper<>();
                wrapper3.eq("id", gift3);
                if(byId.getSort().equals("0")){
                    voteGift.setSort("3");
                }else{
                    voteGift.setSort(byId.getSort()+","+"3");
                }
                iVoteGiftService.update(voteGift,wrapper3);
            }
            if(!StringUtils.isEmpty(gift4)){
                VoteGift byId = iVoteGiftService.getById(gift4);
                QueryWrapper<VoteGift> wrapper4 = new QueryWrapper<>();
                wrapper4.eq("id", gift4);
                if(byId.getSort().equals("0")){
                    voteGift.setSort("4");
                }else{
                    voteGift.setSort(byId.getSort()+","+"4");
                }
                iVoteGiftService.update(voteGift,wrapper4);
            }
            if(!StringUtils.isEmpty(gift5)){
                VoteGift byId = iVoteGiftService.getById(gift5);
                QueryWrapper<VoteGift> wrapper5 = new QueryWrapper<>();
                wrapper5.eq("id", gift5);
                if(byId.getSort().equals("0")){
                    voteGift.setSort("5");
                }else{
                    voteGift.setSort(byId.getSort()+","+"5");
                }
                iVoteGiftService.update(voteGift,wrapper5);
            }
            if(!StringUtils.isEmpty(gift6)){
                VoteGift byId = iVoteGiftService.getById(gift6);
                QueryWrapper<VoteGift> wrapper6 = new QueryWrapper<>();
                wrapper6.eq("id", gift6);
                if(byId.getSort().equals("0")){
                    voteGift.setSort("6");
                }else{
                    voteGift.setSort(byId.getSort()+","+"6");
                }
                iVoteGiftService.update(voteGift,wrapper6);
            }
            if(!StringUtils.isEmpty(gift7)){
                VoteGift byId = iVoteGiftService.getById(gift7);
                QueryWrapper<VoteGift> wrapper7 = new QueryWrapper<>();
                wrapper7.eq("id", gift7);
                if(byId.getSort().equals("0")){
                    voteGift.setSort("7");
                }else{
                    voteGift.setSort(byId.getSort()+","+"7");
                }
                iVoteGiftService.update(voteGift,wrapper7);
            }
            if(!StringUtils.isEmpty(gift8)){
                VoteGift byId = iVoteGiftService.getById(gift8);
                QueryWrapper<VoteGift> wrapper8 = new QueryWrapper<>();
                wrapper8.eq("id", gift8);
                if(byId.getSort().equals("0")){
                    voteGift.setSort("8");
                }else{
                    voteGift.setSort(byId.getSort()+","+"8");
                }
                iVoteGiftService.update(voteGift,wrapper8);
            }
            return R.ok();
        }catch (Exception e){
            e.printStackTrace();
            return R.failed();
        }
    }

    @ApiOperation(value = "获取节目信息", httpMethod = "get", tags = "节目信息")
    @ResponseBody
    @GetMapping("/listrank")
    public R<?> listrank(@RequestParam(value = "page", defaultValue = "1") int curPage,
                     @RequestParam(value = "limit", defaultValue = "15") int size) {
        Page<VoteProramRank> page = new Page<>(curPage, size);
        QueryWrapper<VoteProramRank> wrapper = new QueryWrapper<>();
        wrapper.orderByDesc("score");
        IPage<VoteProramRank> pageVo =  iVoteProgramRankService.page(page, wrapper);
        return R.ok(pageVo.getRecords(), pageVo.getTotal());
    }
    @ApiOperation(value = "更新节目分数", httpMethod = "post", tags = "更新节目分数")
    @ResponseBody
    @PostMapping("/updatescore")
    public R<?> update(@RequestParam(value = "id") String id,
                       @RequestParam(value = "score") String score) {
        try{
            VoteProramRank byId = iVoteProgramRankService.getById(id);
            QueryWrapper<VoteProramRank> wrapper = new QueryWrapper<>();
            wrapper.eq("id", id);
            byId.setScore(score);
            iVoteProgramRankService.update(byId,wrapper);
            return R.ok();
        }catch (Exception e){
            e.printStackTrace();
            return R.failed();
        }
    }

    @ResponseBody
    @RequestMapping("/showrank")
    public R<?> showrank(HttpServletRequest request, HttpServletResponse response){
        HashMap<String, Object> map = new HashMap<>();
        QueryWrapper<VoteProramRank> voteProramRankQueryWrapper = new QueryWrapper<>();
        voteProramRankQueryWrapper.ge("score",1);
        voteProramRankQueryWrapper.orderByDesc("score");
        List<VoteProramRank> list = iVoteProgramRankService.list(voteProramRankQueryWrapper);
        if(list!=null && list.size()>0){
            return R.ok(list);
        }
        return R.failed();
    }

}
