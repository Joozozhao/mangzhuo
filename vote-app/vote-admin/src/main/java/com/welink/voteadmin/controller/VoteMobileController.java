package com.welink.voteadmin.controller;

import com.alibaba.fastjson2.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.welink.vote.common.core.response.R;
import com.welink.vote.common.data.model.*;
import com.welink.vote.common.data.service.*;
import com.welink.voteadmin.common.HttpUtils;
import com.welink.voteadmin.models.domain.ShowScore;
import io.swagger.annotations.ApiOperation;
import jakarta.annotation.Resource;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.net.URLEncoder;
import java.time.LocalDateTime;
import java.util.*;

@Controller
@RequestMapping("/vote/mobile")
public class VoteMobileController {
    @Value("${wechat.appId}")
    private String appId;
    @Value("${wechat.appSecret}")
    private String appSecret;
    @Value("${wechat.wechatUrl}")
    private String wechatUrl;
    @Value("${wechat.redirectUrl}")
    private String redirect_uri;
    @Value("${wechat.getOpenIdUrl}")
    private String getOpenUrl;
    @Resource
    private IVoteUserService iVoteUserService;
    @Resource
    private IVoteTaskService iVoteTaskService;
    @Resource
    private IVoteActyService iVoteActyService;
    @Resource
    private IVoteGroupService iVoteGroupService;
    @Resource
    private IVoteScoreService iVoteScoreService;

    @ApiOperation(value = "获取openID", httpMethod = "GET", tags = "获取openID")
    @ResponseBody
    @RequestMapping("/getOpenId")
    public void getOpenId(HttpServletResponse response){
        Map<String, String> parameters = new HashMap<String,String>();
        String url = wechatUrl+"?appid="+appId+"&redirect_uri="+URLEncoder.encode(redirect_uri)
                +"&response_type=code&scope=snsapi_base&state=STATE#wechat_redirect";
        System.out.println(url);
    }

    @ResponseBody
    @RequestMapping("/getCode")
    public R<?> getCode(HttpServletRequest request,HttpServletResponse response){
        Map<String, String> parameters = new HashMap<String,String>();
        String code = request.getParameter("code");
        if(StringUtils.isEmpty(code)){
           return R.failed("code不存在");
        }
        parameters.put("appid",appId);
        parameters.put("secret",appSecret);
        parameters.put("code",code);
        parameters.put("grant_type","authorization_code");
        String getRes = HttpUtils.sendGet(getOpenUrl, parameters);
        JSONObject jsonObject = JSONObject.parseObject(getRes);
        if(jsonObject!=null){
            String openId = null;
            if(jsonObject.containsKey("openid")){
                openId = jsonObject.getString("openid");
                System.out.println(openId);
                QueryWrapper<VoteUser> wrapper = new QueryWrapper<>();
                wrapper.eq("open_id", openId);
                Cookie cookie = new Cookie("openId", openId);
                cookie.setMaxAge(-1);
                response.addCookie(cookie);
                VoteUser voteUser = iVoteUserService.getOne(wrapper);
                if(voteUser!=null){
                    //记录当前用户信息
                    return R.ok();
                }
            }
        }
        return R.failed("获取openId失败");
    }
    @ResponseBody
    @RequestMapping("/saveCode")
    public R<?> saveCode(HttpServletRequest request,HttpServletResponse response){
        String code = request.getParameter("code");
        if(StringUtils.isEmpty(code)){
            return R.failed("code不能为空");
        }
        String openid = null;
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals("openId")) {
                    openid = cookie.getValue();
                    break;
                }
            }
        }
        QueryWrapper<VoteUser> wrapper = new QueryWrapper<>();
        wrapper.eq("code", code);
        VoteUser voteUser = iVoteUserService.getOne(wrapper);
        if(voteUser == null){
            return R.failed("参会码不存在");
        }
        if(!StringUtils.isEmpty(openid)){
            UpdateWrapper<VoteUser> voteUserUpdateWrapper = new UpdateWrapper<>();
            voteUserUpdateWrapper.set("open_id",openid);
            voteUserUpdateWrapper.eq("id", voteUser.getId());
            iVoteUserService.update(voteUserUpdateWrapper);
        }
        Cookie cookie = new Cookie("code", code);
        cookie.setMaxAge(-1);
        response.addCookie(cookie);
        return R.ok();
    }

    /**
     * 显示投票信息
     * @param request
     * @param response
     * @return
     */
    @ResponseBody
    @RequestMapping("/showScore")
    public R<?> showScore(HttpServletRequest request,HttpServletResponse response){
        //判断是否登录
        Cookie[] cookies = request.getCookies();
        String userOpenId = null;
        String userCode = null;
        if (cookies != null) {
            var isLogin = false;
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals("openId")) {
                    isLogin = true;
                    userOpenId = cookie.getValue();
                    break;
                }
                if(cookie.getName().equals("code")){
                    isLogin = true;
                    userCode = cookie.getValue();
                    break;
                }
            }
            if(!isLogin){
                return R.failed("nologin");
            }
        }else{
            return R.failed("nologin");
        }
        //正在进行的投票信息
        QueryWrapper<VoteTask> voteTaskQueryWrapper = new QueryWrapper<>();
        voteTaskQueryWrapper.eq("state",1);
        VoteTask voteTask = iVoteTaskService.getOne(voteTaskQueryWrapper);
        if(voteTask==null){
            //没有投票任务
            return R.failed("没有正在进行的投票");
        }
        ShowScore showScore = new ShowScore();
        showScore.setTaskName(voteTask.getTaskName());
        showScore.setPerformer(voteTask.getPerformer());
        //获取投票活动信息
        QueryWrapper<VoteActy> voteActyQueryWrapper = new QueryWrapper<>();
        voteActyQueryWrapper.eq("id",voteTask.getActyId());
        VoteActy voteActy = iVoteActyService.getOne(voteActyQueryWrapper);
        if(voteActy == null){
            return R.failed("没有活动信息");
        }
        showScore.setRemark(voteActy.getRemark());
        //获取排序信息
        QueryWrapper<VoteUser> voteUserQueryWrapper = new QueryWrapper<>();
        if(!StringUtils.isEmpty(userOpenId)){
            voteUserQueryWrapper.eq("open_id",userOpenId);
        }
        if(!StringUtils.isEmpty(userCode)){
            voteUserQueryWrapper.eq("code",userCode);
        }
        VoteUser voteUser = iVoteUserService.getOne(voteUserQueryWrapper);
        QueryWrapper<VoteGroup> voteGroupQueryWrapper = new QueryWrapper<>();
        voteGroupQueryWrapper.eq("id",voteUser.getGroupId());
        VoteGroup voteGroup = iVoteGroupService.getOne(voteGroupQueryWrapper);
        showScore.setSort(voteGroup.getSerialNo());
        //是否显示排序
        showScore.setShow(false);
        if(voteUser.getGroupId()<=8 && voteUser.getLevel()==1){
            //队长
            showScore.setShow(true);
        }
        if(voteTask.getPerformer().equals(voteUser.getUserName())){
            //活动演员
            showScore.setShow(true);
        }
        //身份
        showScore.setLevel(voteUser.getLevel());
        showScore.setGroupId(voteUser.getGroupId());
        showScore.setTaskId(voteTask.getId());
        //判断是否已投过
        QueryWrapper<VoteScore> voteScoreQueryWrapper = new QueryWrapper<>();
        voteScoreQueryWrapper.eq("task_id",voteTask.getId());
        voteScoreQueryWrapper.eq("name",voteUser.getUserName());
        VoteScore voteScore = iVoteScoreService.getOne(voteScoreQueryWrapper);
        showScore.setVote(false);
        if(voteScore==null){
            showScore.setVote(true);
        }
        //判断是显示什么头像
        QueryWrapper<VoteUser> voteUserQueryWrapper1 = new QueryWrapper<>();
        voteUserQueryWrapper1.eq("user_name",voteTask.getPerformer());
        VoteUser voteUser1 = iVoteUserService.getOne(voteUserQueryWrapper1);
        if(voteUser1==null){
            QueryWrapper<VoteGroup> voteGroupQueryWrapper1 = new QueryWrapper<>();
            voteGroupQueryWrapper1.eq("group_name",voteTask.getPerformer());
            VoteGroup voteGroup1 = iVoteGroupService.getOne(voteGroupQueryWrapper1);
            showScore.setImg(voteGroup1.getGroupImg());
        }else{
            showScore.setImg(voteUser1.getUserImg());
        }
        return R.ok(showScore);
    }

    @ResponseBody
    @RequestMapping("/saveVote")
    public R<?> saveVote(HttpServletRequest request,HttpServletResponse response){
        //判断是否登录
        Cookie[] cookies = request.getCookies();
        String userOpenId = null;
        String userCode = null;
        if (cookies != null) {
            var isLogin = false;
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals("openId")) {
                    isLogin = true;
                    userOpenId = cookie.getValue();
                    break;
                }
                if(cookie.getName().equals("code")){
                    isLogin = true;
                    userCode = cookie.getValue();
                    break;
                }
            }
            if(!isLogin){
                return R.failed("nologin");
            }
        }else{
            return R.failed("nologin");
        }
        try {
            VoteScore voteScore = new VoteScore();
            QueryWrapper<VoteUser> voteUserQueryWrapper = new QueryWrapper<>();
            if(!StringUtils.isEmpty(userOpenId)){
                voteUserQueryWrapper.eq("open_id",userOpenId);
            }
            if(!StringUtils.isEmpty(userCode)){
                voteUserQueryWrapper.eq("code",userCode);
            }
            VoteUser voteUser = iVoteUserService.getOne(voteUserQueryWrapper);
            voteScore.setName(voteUser.getUserName());
            voteScore.setOpenId(voteUser.getOpenId());
            String taskId = request.getParameter("taskId");
            String score = request.getParameter("score");
            voteScore.setScore(Integer.valueOf(score));
            voteScore.setTaskId(Integer.valueOf(taskId));
            QueryWrapper<VoteTask> voteTaskQueryWrapper = new QueryWrapper<>();
            voteTaskQueryWrapper.eq("id",taskId);
            VoteTask voteTask = iVoteTaskService.getOne(voteTaskQueryWrapper);
            //获取组信息
            QueryWrapper<VoteGroup> voteGroupQueryWrapper = new QueryWrapper<>();
            voteGroupQueryWrapper.eq("group_name",voteTask.getPerformer());
            VoteGroup voteGroup = iVoteGroupService.getOne(voteGroupQueryWrapper);
            voteScore.setGroupId(0);
            if(voteGroup!=null){
                voteScore.setGroupId(voteGroup.getId());
            }
            //获取被投的人信息
            QueryWrapper<VoteUser> voteUserQueryWrapper1 = new QueryWrapper<>();
            voteUserQueryWrapper1.eq("user_name",voteTask.getPerformer());
            VoteUser voteUsered = iVoteUserService.getOne(voteUserQueryWrapper1);
            voteScore.setUserId(0);
            if(voteUsered!=null){
                voteScore.setUserId(voteUsered.getId());
                voteScore.setGroupId(voteUsered.getGroupId());
            }
            voteScore.setCreateTime(LocalDateTime.now());
            boolean save = iVoteScoreService.save(voteScore);
            if(save){
                return R.ok();
            }
        }catch (Exception e){
            System.out.println(e.getMessage());
        }
        return R.failed();
    }

    /**
     * 队伍排名展示
     * @param request
     * @param response
     * @return
     */
    @ResponseBody
    @RequestMapping("/showSort")
    public R<?> showSort(HttpServletRequest request,HttpServletResponse response){
        //所有组信息
        QueryWrapper<VoteGroup> voteGroupQueryWrapper = new QueryWrapper<>();
        voteGroupQueryWrapper.le("id",8);
        List<VoteGroup> groupList = iVoteGroupService.list(voteGroupQueryWrapper);
        HashMap<String, Object> map = new HashMap<>();
        ArrayList<GroupScoreEntity> list = new ArrayList<>();
        //活动信息
        QueryWrapper<VoteActy> voteActyQueryWrapper = new QueryWrapper<>();
        voteActyQueryWrapper.ne("remark","");
        List<VoteActy> actyList = iVoteActyService.list(voteActyQueryWrapper);
        TreeSet<Integer> set = new TreeSet<>(Collections.reverseOrder());
        for(int i=0;i<groupList.size();i++){
            GroupScoreEntity groupScoreEntity = new GroupScoreEntity();
            //组信息
            groupScoreEntity.setGroupName(groupList.get(i).getGroupName());
            groupScoreEntity.setGroupImg(groupList.get(i).getGroupImg());
            groupScoreEntity.setGroupId(groupList.get(i).getId());
            //组员信息
            QueryWrapper<VoteUser> voteUserQueryWrapper = new QueryWrapper<>();
            voteUserQueryWrapper.eq("group_id",groupList.get(i).getId());
            List<VoteUser> listVoteUser = iVoteUserService.list(voteUserQueryWrapper);
            groupScoreEntity.setListMember(listVoteUser);
            //活动明细以及对应的分数
            int total = 0;
            ArrayList<Object> listActiveScore = new ArrayList<>();
            for (int j=0;j<actyList.size();j++){
                HashMap<String, Object> activeScore = new HashMap<>();
                Integer groupScoreByActyId = iVoteScoreService.getGroupScoreByActyId(actyList.get(j).getId(), groupList.get(i).getId());
                activeScore.put("actyName",actyList.get(j).getActyName());
                if(groupScoreByActyId!=null){
                    total = total+groupScoreByActyId.intValue();
                    activeScore.put("score",groupScoreByActyId.intValue());
                }else{
                    //没有分数提交记录
                    activeScore.put("score",0);
                }
                listActiveScore.add(activeScore);
            }
            groupScoreEntity.setListActiveScore(listActiveScore);
            //总票数
            groupScoreEntity.setGroupScore(total);
            set.add(total);
            list.add(groupScoreEntity);
        }
        //排顺序
        Collections.sort(list,GroupScoreEntity.comparator);
        map.put("list",list);
        map.put("set",set);
        return R.ok(map);
    }

    /**
     * 个人排名
     * @param request
     * @param response
     * @return
     */
    @ResponseBody
    @RequestMapping("/showMembers")
    public R<?> showMembers(HttpServletRequest request,HttpServletResponse response){
        HashMap<String, Object> map = new HashMap<>();
        List<GroupMemberScore> memberScore = iVoteScoreService.getMemberScore();
        TreeSet<Integer> set = new TreeSet<>(Collections.reverseOrder());
        if(memberScore!=null && memberScore.size()>0){
            map.put("memberScore",memberScore);
            for (int i=0;i<memberScore.size();i++){
                set.add(memberScore.get(i).getSumScore());
            }
            map.put("set",set);
            return R.ok(map);
        }
        return R.failed();
    }
    /**
     * 图片展示
     * @param request
     * @param response
     * @return
     */
    @ResponseBody
    @RequestMapping("/showImg")
    public R<?> showImg(HttpServletRequest request,HttpServletResponse response){
        List<GroupMemberScore> list = iVoteTaskService.getList();
        if(list!=null && list.size()>0){
            return R.ok(list);
        }
        return R.failed();
    }

    /**
     * 按组展示随机组排名
     * @param request
     * @param response
     * @return
     */
    @ResponseBody
    @RequestMapping("/showGroup")
    public R<?> showGroup(HttpServletRequest request,HttpServletResponse response){
        QueryWrapper<VoteGroup> voteGroupQueryWrapper = new QueryWrapper<>();
        voteGroupQueryWrapper.le("id",8);
        List<VoteGroup> groupList = iVoteGroupService.list(voteGroupQueryWrapper);
        if(groupList!=null && groupList.size()>0){
            return R.ok(groupList);
        }
        return R.failed();
    }
    /**
     * 按个人展示随机组排名
     * @param request
     * @param response
     * @return
     */
    @ResponseBody
    @RequestMapping("/showMemberSort")
    public R<?> showMemberSort(HttpServletRequest request,HttpServletResponse response){
        String taskName = request.getParameter("taskName");
        if(!StringUtils.isEmpty(taskName)){
            QueryWrapper<VoteTask> voteTaskQueryWrapper = new QueryWrapper<>();
            voteTaskQueryWrapper.like("task_name",taskName);
            List<VoteTask> list = iVoteTaskService.list(voteTaskQueryWrapper);
            if(list!=null && list.size()>0){
                ArrayList<Object> objects = new ArrayList<>();
                for (int i=0;i< list.size();i++){
                    QueryWrapper<VoteUser> voteUserQueryWrapper = new QueryWrapper<>();
                    voteUserQueryWrapper.eq("user_name",list.get(i).getPerformer());
                    VoteUser voteUser = iVoteUserService.getOne(voteUserQueryWrapper);
                    QueryWrapper<VoteGroup> voteGroupQueryWrapper = new QueryWrapper<>();
                    voteGroupQueryWrapper.eq("id",voteUser.getGroupId());
                    VoteGroup voteGroup = iVoteGroupService.getOne(voteGroupQueryWrapper);
                    HashMap<String, String> map = new HashMap<>();
                    map.put("userName",voteUser.getUserName());
                    map.put("userImg",voteUser.getUserImg());
                    map.put("groupId",voteGroup.getId()+"");
                    map.put("groupName",voteGroup.getGroupName());
                    map.put("serialNo",voteGroup.getSerialNo()+"");
                    objects.add(map);
                }
                return R.ok(objects);
            }
        }
        return R.failed();
    }
    /**
     * 保存排名
     * @param request
     * @param response
     * @return
     */
    @ResponseBody
    @RequestMapping("/saveSort")
    public R<?> saveSort(HttpServletRequest request,HttpServletResponse response){
        String sort = request.getParameter("sort");
        String groupId = request.getParameter("groupId");
        UpdateWrapper<VoteGroup> voteGroupUpdateWrapper = new UpdateWrapper<>();
        voteGroupUpdateWrapper.set("serial_no", sort);
        voteGroupUpdateWrapper.eq("id",groupId);
        boolean update = iVoteGroupService.update(null, voteGroupUpdateWrapper);
        if(update){
            return R.ok();
        }
        return R.failed();
    }
}
