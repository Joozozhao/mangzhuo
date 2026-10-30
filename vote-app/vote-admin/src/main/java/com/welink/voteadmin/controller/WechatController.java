package com.welink.voteadmin.controller;

import com.alibaba.fastjson2.JSON;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.welink.vote.common.core.response.R;
import com.welink.vote.common.data.model.*;
import com.welink.vote.common.data.service.IVoteTasteScoreService;
import com.welink.vote.common.data.service.IVoteTasteService;
import com.welink.vote.common.data.service.IVoteTasteTypeService;
import com.welink.vote.common.data.service.IVoteTasteUserService;
import com.welink.voteadmin.common.HttpUtils;
import com.welink.voteadmin.common.UpLoadUtil;
import com.welink.voteadmin.models.domain.*;
import io.swagger.annotations.ApiOperation;
import io.swagger.v3.oas.annotations.Parameter;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.util.IOUtils;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;

import java.io.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.text.DecimalFormat;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Controller
@RequestMapping("/taste/wechat")
public class WechatController {
    @Value("${wechat.appId}")
    private String appId;
    @Value("${wechat.appSecret}")
    private String appSecret;
    @Value("${wechat.wechatUrl}")
    private String wechatUrl;
    @Value("${wechat.redirectUrl}")
    private String redirect_uri;
    @Value("${wechat.getOpenIdUrl}")
    private String getOpenIdUrl;
    @Value("${wechat.getUserByOpenId}")
    private String getUserByOpenId;
    @Value("${wechat.savepath}")
    private String savePath;
    @Value("${wechat.secretKey}")
    private String secretKey;
    @Resource
    private IVoteTasteUserService iVoteTasteUserService;
    @Autowired
    private IVoteTasteService iVoteTasteService;
    @Autowired
    private IVoteTasteTypeService iVoteTasteTypeService;
    @Autowired
    private IVoteTasteScoreService iVoteTasteScoreService;


    @ApiOperation(value = "获取微信访问地址", httpMethod = "GET", tags = "获取微信访问地址")
    @ResponseBody
    @RequestMapping("/geturl")
    public R<?> geturl(HttpServletResponse response){
        Map<String, String> parameters = new HashMap<String,String>();
        String url = wechatUrl+"?appid="+appId+"&redirect_uri="+ URLEncoder.encode(redirect_uri)
                +"&response_type=code&scope=snsapi_userinfo&state=STATE#wechat_redirect";
        return R.ok(url);
    }

    @ApiOperation(value = "获取微信返回code", httpMethod = "GET", tags = "获取微信返回code")
    @ResponseBody
    @RequestMapping("/getCode")
    public R<?> getCode(HttpServletRequest request,HttpServletResponse response,@RequestParam(value = "code", defaultValue = "") String code,
                          @RequestParam(value = "state", defaultValue = "") String state){
        if(StringUtils.isEmpty(code)){
          return R.failed("未获取code");
        }
        Map<String, String> map = new HashMap<>();
        map.put("appid",appId);
        map.put("secret",appSecret);
        map.put("code",code);
        map.put("grant_type","authorization_code");
        String getToken = HttpUtils.sendGet(getOpenIdUrl, map);
        if(!StringUtils.isEmpty(getToken)){
            WechatToken wechatToken = JSON.parseObject(getToken, WechatToken.class);
            if(wechatToken.getErrcode()==0 && StringUtils.isEmpty(wechatToken.getErrmsg())){
                Map<String, String> param = new HashMap<>();
                param.put("access_token",wechatToken.getAccess_token());
                QueryWrapper<VoteTasteUser> wrapper = new QueryWrapper<>();
                wrapper.eq("openid", wechatToken.getOpenid());
                VoteTasteUser getVoteTasteUser = iVoteTasteUserService.getOne(wrapper);
                HttpSession session = request.getSession();
                if(getVoteTasteUser !=null){
                    request.changeSessionId();
                    session.removeAttribute("appletOpenId");
                    session.setAttribute("openId", getVoteTasteUser.getOpenid());
                    try {
                        response.sendRedirect(response.encodeRedirectURL("/page/tasteindex.html"));
                    } catch (IOException e) {
                        throw new RuntimeException(e);
                    }
                    return R.ok("登录成功");
                }else{
                    param.put("openid",wechatToken.getOpenid());
                    param.put("lang","zh_CN");
                    //System.out.println(JSON.toJSON(param));
                    String userByOpenId = HttpUtils.sendGet(getUserByOpenId, param);
                    //System.out.println(JSON.toJSON(userByOpenId));
                    if(!StringUtils.isEmpty(userByOpenId)){
                        VoteTasteUser voteTasteUser = JSON.parseObject(userByOpenId, VoteTasteUser.class);
                        if(voteTasteUser !=null && !StringUtils.isEmpty(voteTasteUser.getOpenid())){
                            voteTasteUser.setCreate_time(new Date());
                            boolean save = iVoteTasteUserService.save(voteTasteUser);
                            if(save){
                                request.changeSessionId();
                                session.removeAttribute("appletOpenId");
                                session.setAttribute("openId", voteTasteUser.getOpenid());
                                try {
                                    response.sendRedirect(response.encodeRedirectURL("/page/tasteindex.html"));
                                } catch (IOException e) {
                                    throw new RuntimeException(e);
                                }
                                return R.ok("获取成功");
                            }
                        }
                    }
                }
            }
        }
        return R.failed("登录失败");
    }

    @ApiOperation(value = "获取品酒任务列表", httpMethod = "GET", tags = "获取品酒任务列表")
    @ResponseBody
    @RequestMapping("/tastelist")
    public R<?> tasteList(HttpServletRequest request,HttpServletResponse response,
                          @RequestParam(value = "page", defaultValue = "1") int curPage,
                          @RequestParam(value = "limit", defaultValue = "15") int size){
        String openId = legacyIdentity(request);
        requireLegacy(curPage >= 1 && curPage <= 100000 && size >= 1 && size <= 50, "分页参数无效");
        List<VoteTasteEntity> list = iVoteTasteService.getList(curPage, size);
        if (list == null) list = Collections.emptyList();
        int total = 0;
        if(list!=null && list.size()>0){
            total = iVoteTasteService.countVoteTaste();
        }
        for (int i=0;i<list.size();i++){
            list.get(i).setIs_show(0);
            list.get(i).setIs_status_show(0);
            QueryWrapper<VoteTasteScore> voteTasteScoreQueryWrapper = new QueryWrapper<>();
            voteTasteScoreQueryWrapper.eq("taste_id",list.get(i).getId());
            List<VoteTasteScore> listVoteTasteScore = iVoteTasteScoreService.list(voteTasteScoreQueryWrapper);
            if(openId.equals(list.get(i).getCreateOpenId()) && list.get(i).getStatus() == 0 && listVoteTasteScore.isEmpty()){
                list.get(i).setIs_show(1);
            }
            if(openId.equals(list.get(i).getCreateOpenId()) && list.get(i).getStatus() == 0){
                list.get(i).setIs_status_show(1);
            }
            list.get(i).setCreateOpenId(null);
        }
        return R.ok(list, total);
    }
    protected String backMessage(MultipartFile file, int max, List<String> types) {
        // 传空或者大小为0不限制
        if (types == null || types.size() <= 0) {
            return null;
        }
        if (max == 0) {// 传0不限制
            return null;
        }
        int x = file.getOriginalFilename().split("\\.").length;
        String y = file.getOriginalFilename().split("\\.")[x - 1];
        if (file.getSize() > 1048576 * max) {
            return "文件超过" + max + "MB";
        }
        if (types.contains(y.toLowerCase())) {
            return null;
        }
        return "文件格式不对";
    }
    @ApiOperation(value = "上传图片", httpMethod = "POST", tags = "上传图片")
    @ResponseBody
    @PostMapping("/uploadImgUrl")
    public R<?> uploadImgUrl(HttpServletRequest request, HttpServletResponse response){
        legacyIdentity(request);
        try {
            String fileId = request.getParameter("fileId");
            if(!StringUtils.isEmpty(fileId)){
                MultipartHttpServletRequest multipartRequest = (MultipartHttpServletRequest) request;
                List<MultipartFile> multipartFiles = multipartRequest.getFiles(fileId);
                if (null != multipartFiles && !multipartFiles.isEmpty()) {
                    MultipartFile file = multipartFiles.get(0);
                    List<String> types = new ArrayList<String>();
                    types.add(FileEnum.FILE_TYPE_PDF.getValue());
                    types.add(FileEnum.FILE_TYPE_DOC.getValue());
                    types.add(FileEnum.FILE_TYPE_DOCX.getValue());
                    types.add(FileEnum.FILE_TYPE_JPG.getValue());
                    types.add(FileEnum.FILE_TYPE_JPEG.getValue());
                    types.add(FileEnum.FILE_TYPE_GIF.getValue());
                    types.add(FileEnum.FILE_TYPE_RAR.getValue());
                    String x = backMessage(file, Integer.parseInt(FileEnum.IMAGESIZE_2.getValue()), types);
                    if (x != null) return R.failed(x);
                    UploadFileEntity upLoadFile = UpLoadUtil.UpLoadFile(request, savePath);
                    if(upLoadFile!=null){
                        return R.ok(upLoadFile.getFile_path());
                    }
                }
            }
            return R.failed("保存失败");
        }catch (Exception e){
            return R.failed("上传失败，请稍后重试");
        }
    }
    @ApiOperation(value = "保存分类信息", httpMethod = "POST", tags = "保存分类信息")
    @ResponseBody
    @PostMapping("/savetastetype")
    @Transactional
    public R<?> saveTasteType(HttpServletRequest request, HttpServletResponse response,
                             @RequestParam(value = "tasteName", defaultValue = "") String tasteName,
                             @RequestParam(value = "tasteType", defaultValue = "") String tasteType) {
        String openId = legacyIdentity(request);
        String expected = secretKey + LocalDate.now(ZoneId.of("Asia/Shanghai")).format(DateTimeFormatter.BASIC_ISO_DATE);
        String authentication = request.getParameter("authentication");
        requireLegacy(secretKey != null && !secretKey.isBlank() && authentication != null
                && java.security.MessageDigest.isEqual(expected.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                authentication.getBytes(java.nio.charset.StandardCharsets.UTF_8)), "身份验证失败");
        requireLegacy(tasteName != null && !tasteName.isBlank() && tasteName.trim().length() <= 32, "活动名称无效");
        List<String> names = legacyNames(tasteType);
        String imgUrl = request.getParameter("imgUrl"), tasteUrl = request.getParameter("tasteUrl");
        requireLegacy(StringUtils.hasText(imgUrl) && StringUtils.hasText(tasteUrl), "请上传封面与对应图");
        VoteTaste taste = new VoteTaste();
        taste.setTasteName(tasteName.trim()); taste.setStatus(0); taste.setCreateTime(new Date());
        taste.setCreateOpenId(openId); taste.setImgUrl(imgUrl); taste.setTasteUrl(tasteUrl);
        requireLegacy(iVoteTasteService.save(taste) && taste.getId() > 0, "保存失败");
        List<VoteTasteType> rows = new ArrayList<>();
        for (String name : names) rows.add(legacyType(0, taste.getId(), name));
        requireLegacy(iVoteTasteTypeService.saveBatch(rows), "酒样保存失败");
        return R.ok("保存成功");
    }

    @ApiOperation(value = "更新任务状态", httpMethod = "POST", tags = "更新任务状态")
    @ResponseBody
    @PostMapping("/updatetastestatus")
    @Transactional
    public R<?> updateTasteStatus(HttpServletRequest request, HttpServletResponse response,
                                 @RequestParam(value = "id") int id,
                                 @RequestParam(value = "status") int status) {
        String openId = legacyIdentity(request);
        VoteTaste taste = legacyTaste(id, true);
        requireLegacy(openId.equals(taste.getCreateOpenId()), "只有主持人可以结束品鉴");
        requireLegacy(status == 1, "结束后不能重新开启品鉴");
        if (taste.getStatus() == 1) return R.ok("更新成功");
        requireLegacy(taste.getStatus() == 0, "活动状态异常");
        taste.setStatus(1);
        requireLegacy(iVoteTasteService.updateById(taste), "更新失败");
        return R.ok("更新成功");
    }

    @ApiOperation(value = "获取任务信息", httpMethod = "POST", tags = "获取任务信息")
    @ResponseBody
    @RequestMapping("/gettaste")
    public R<?> getTaste(HttpServletRequest request, HttpServletResponse response,
                         @RequestParam(value = "id") int id,
                         @RequestParam(value = "sort", defaultValue = "") String sort) {
        String openId = legacyIdentity(request);
        VoteTaste taste = legacyTaste(id, false);
        boolean owner = openId.equals(taste.getCreateOpenId());
        boolean reveal = owner || taste.getStatus() == 1;
        List<VoteTasteType> samples = getVoteTasteType(id, "");
        TasteTypeEntity result = TasteTypeEntity.getTasteTypeEntity(taste);
        List<VoteTasteType> visible = new ArrayList<>();
        for (VoteTasteType sample : samples) {
            visible.add(legacyType(sample.getId(), id, reveal ? sample.getTasteType() : null));
        }
        // 按名称排序的负候选编号不携带真实酒样 ID，旧网页 select 仍使用数值 value。
        List<VoteTasteType> choices = legacyChoices(samples, id);
        result.setListVoteTasteType(visible);
        result.setSelectItemsType(choices);
        result.setIsShow(owner ? 1 : 0);
        if (!reveal) result.setTasteUrl(null); // 对应图仅主持人或开奖后可见。
        result.setCreateOpenId(null);
        return R.ok(result);
    }

    private List<VoteTasteType> getVoteTasteType(int tasteId, String sort) {
        QueryWrapper<VoteTasteType> query = new QueryWrapper<>();
        query.eq("taste_id", tasteId).orderByAsc("id");
        return iVoteTasteTypeService.list(query);
    }

    private List<VoteTasteType> legacyChoices(List<VoteTasteType> samples, int tasteId) {
        List<String> names = samples.stream().map(VoteTasteType::getTasteType).sorted().toList();
        List<VoteTasteType> choices = new ArrayList<>();
        for (int i = 0; i < names.size(); i++) choices.add(legacyType(-i - 1, tasteId, names.get(i)));
        return choices;
    }

    private VoteTasteType legacyType(int id, int tasteId, String name) {
        VoteTasteType row = new VoteTasteType();
        row.setId(id); row.setTasteId(tasteId); row.setTasteType(name);
        return row;
    }

    private String legacyIdentity(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Object identity = session == null ? null : session.getAttribute("openId");
        requireLegacy(identity instanceof String && !((String) identity).isBlank(), "relogin");
        return (String) identity;
    }

    private VoteTaste legacyTaste(int id, boolean lock) {
        requireLegacy(id > 0, "活动编号无效");
        QueryWrapper<VoteTaste> query = new QueryWrapper<VoteTaste>().eq("id", id);
        if (lock) query.last("FOR UPDATE"); // 与 /taste/applet 的评分、结束使用同一行锁。
        VoteTaste taste = iVoteTasteService.getOne(query);
        requireLegacy(taste != null, "活动不存在");
        return taste;
    }

    private VoteTaste legacyResults(HttpServletRequest request, int id) {
        legacyIdentity(request);
        VoteTaste taste = legacyTaste(id, false);
        requireLegacy(taste.getStatus() == 1, "品鉴结束后才能查看结果");
        return taste;
    }

    private void requireLegacy(boolean valid, String message) {
        if (!valid) throw new LegacyFailure(message);
    }

    private static class LegacyFailure extends RuntimeException {
        LegacyFailure(String message) { super(message); }
    }

    @ExceptionHandler(LegacyFailure.class)
    @ResponseBody
    public R<?> legacyFailure(LegacyFailure error) {
        // 保留公众号网页既有的业务错误处理与 relogin 跳转。
        return R.failed(error.getMessage());
    }

    @ExceptionHandler(org.springframework.dao.DataAccessException.class)
    @ResponseBody
    public R<?> legacyStorageFailure() {
        return R.failed("操作失败，请稍后重试");
    }

    @ApiOperation(value = "获取投票回填", httpMethod = "POST", tags = "获取投票回填")
    @ResponseBody
    @RequestMapping("/syncvote")
    public R<?> syncVote(HttpServletRequest request, HttpServletResponse response,
                         @RequestParam(value = "id") int id) {
        String openId = legacyIdentity(request);
        legacyTaste(id, false);
        List<VoteTasteScore> mine = iVoteTasteScoreService.list(new QueryWrapper<VoteTasteScore>()
                .eq("taste_id", id).eq("open_id", openId).orderByAsc("taste_type_id"));
        List<VoteTasteScore> visible = new ArrayList<>();
        for (VoteTasteScore answer : mine) {
            VoteTasteScore row = new VoteTasteScore();
            row.setTasteId(id); row.setTasteTypeId(answer.getTasteTypeId());
            row.setTypeName(answer.getTypeName()); row.setScore(answer.getScore());
            // 不回传 judgeResult 或猜测名称所对应的真实酒样 ID，避免反复试猜得到答案。
            visible.add(row);
        }
        return visible.isEmpty() ? R.failed("未投票") : R.ok(visible);
    }

    @ApiOperation(value = "更新任务信息", httpMethod = "POST", tags = "更新任务信息")
    @ResponseBody
    @PostMapping("/updatetastetype")
    @Transactional
    public R<?> updateTasteType(HttpServletRequest request, HttpServletResponse response,
                               @RequestParam(value = "id") int id,
                               @RequestParam(value = "tasteName") String tasteName,
                               @RequestParam(value = "tasteType") String tasteType) {
        String openId = legacyIdentity(request);
        VoteTaste taste = legacyTaste(id, true);
        requireLegacy(openId.equals(taste.getCreateOpenId()), "只有主持人可以修改品鉴");
        requireLegacy(taste.getStatus() == 0, "品鉴已结束，不能修改酒样");
        requireLegacy(iVoteTasteScoreService.count(new QueryWrapper<VoteTasteScore>().eq("taste_id", id)) == 0,
                "已有评分，不能修改酒样");
        List<String> names = legacyNames(tasteType);
        requireLegacy(tasteName != null && !tasteName.isBlank() && tasteName.trim().length() <= 32, "活动名称无效");
        taste.setTasteName(tasteName.trim());
        taste.setImgUrl(request.getParameter("imgUrl")); taste.setTasteUrl(request.getParameter("tasteUrl"));
        requireLegacy(iVoteTasteService.updateById(taste), "更新失败");
        requireLegacy(iVoteTasteTypeService.remove(new QueryWrapper<VoteTasteType>().eq("taste_id", id)), "酒样更新失败");
        List<VoteTasteType> rows = new ArrayList<>();
        for (String name : names) rows.add(legacyType(0, id, name));
        requireLegacy(iVoteTasteTypeService.saveBatch(rows), "酒样更新失败");
        return R.ok("更新成功");
    }

    private List<String> legacyNames(String text) {
        requireLegacy(text != null && text.length() <= 2100, "酒样无效");
        List<String> names = Arrays.stream(text.split(",", -1)).map(String::trim).toList();
        requireLegacy(names.size() >= 2 && names.size() <= 20 && names.stream().allMatch(n -> !n.isBlank() && n.length() <= 100)
                && new HashSet<>(names).size() == names.size(), "请填写 2 至 20 个不同酒名");
        return names;
    }

    @ApiOperation(value = "评分", httpMethod = "POST", tags = "评分")
    @ResponseBody
    @PostMapping("/savescore")
    @Transactional
    public R<?> savescore(HttpServletRequest request, HttpServletResponse response,
                         @RequestParam(value = "tasteId") int id,
                         @RequestParam(value = "typeName") String typeName,
                         @RequestParam(value = "scoreStr") String scoreStr,
                         @RequestParam(value = "keyStr") String keyStr) {
        String openId = legacyIdentity(request);
        VoteTaste taste = legacyTaste(id, true);
        requireLegacy(taste.getStatus() == 0, "品鉴已结束，不能再修改评分");
        List<VoteTasteType> samples = getVoteTasteType(id, "");
        List<VoteTasteType> choices = legacyChoices(samples, id);
        String[] keys = legacyCsv(keyStr), values = legacyCsv(scoreStr);
        requireLegacy(!samples.isEmpty() && keys.length == samples.size() && values.length == samples.size(), "请完成全部酒样的判断和评分");
        boolean candidateTokens = keys[0].startsWith("-");
        String[] typedNames = candidateTokens ? null : legacyCsv(typeName);
        requireLegacy(candidateTokens || typedNames.length == samples.size(), "请完成全部酒样的判断和评分");
        Set<String> knownNames = new HashSet<>();
        for (VoteTasteType sample : samples) knownNames.add(sample.getTasteType());
        List<VoteTasteScore> rows = new ArrayList<>();
        for (int i = 0; i < samples.size(); i++) {
            requireLegacy(values[i].matches("(?:0|[1-9][0-9]?|100)"), "分数须为 0 至 100 的整数");
            String guessed;
            if (candidateTokens) {
                requireLegacy(keys[i].matches("-[1-9][0-9]{0,8}"), "酒名无效，请刷新页面重试");
                int choice = -Integer.parseInt(keys[i]) - 1;
                requireLegacy(choice >= 0 && choice < choices.size(), "酒名无效，请刷新页面重试");
                guessed = choices.get(choice).getTasteType();
            } else {
                // layui 旧页面提交的是酒样编号与手填酒名；只接受本局完整且有序的编号。
                requireLegacy(keys[i].equals(Integer.toString(samples.get(i).getId())) && knownNames.contains(typedNames[i]), "酒名或编号无效");
                guessed = typedNames[i];
            }
            VoteTasteScore row = new VoteTasteScore();
            row.setTasteId(id); row.setTasteTypeId(samples.get(i).getId()); row.setOpenId(openId);
            row.setTypeName(guessed); row.setScore(Integer.parseInt(values[i])); row.setCreateTime(new Date());
            row.setJudgeResult(samples.get(i).getTasteType().equals(guessed) ? 1 : 0);
            rows.add(row);
        }
        iVoteTasteScoreService.remove(new QueryWrapper<VoteTasteScore>().eq("taste_id", id).eq("open_id", openId));
        requireLegacy(iVoteTasteScoreService.saveBatch(rows), "评分保存失败");
        return R.ok("评分成功");
    }

    private String[] legacyCsv(String text) {
        requireLegacy(text != null && text.length() <= 2100, "评分参数无效");
        // 兼容原 weui 以逗号开头的序列，禁止缺项、额外空值和不完整交卷。
        return (text.startsWith(",") ? text.substring(1) : text).split(",", -1);
    }

    @ApiOperation(value = "获取投票信息表头", httpMethod = "POST", tags = "获取投票信息表头")
    @ResponseBody
    @RequestMapping("/getcolumns")
    public R<?> getColumns(HttpServletRequest request, HttpServletResponse response,
                          @RequestParam(value = "tasteId") int id){
        legacyResults(request, id);
        QueryWrapper<VoteTasteType> voteTasteTypeQueryWrapper = new QueryWrapper<>();
        voteTasteTypeQueryWrapper.eq("taste_id",id);
        voteTasteTypeQueryWrapper.orderByAsc("id");
        List<VoteTasteType> list = iVoteTasteTypeService.list(voteTasteTypeQueryWrapper);
        if(list == null || list.size()==0){
            return R.failed("获取数据异常");
        }
        ArrayList<Map<String,Object>> fieldEntities = new ArrayList<>();
        Map<String,Object> fieldEntity = new HashMap<String,Object>();
        fieldEntity.put("field","nickname");
        fieldEntity.put("align","center");
        fieldEntity.put("title","品酒师");
        fieldEntity.put("width",80);
        fieldEntity.put("totalRowText","合计");
        fieldEntities.add(fieldEntity);
        for (int i=0;i<list.size();i++){
            Map<String,Object> fieldEntity1 = new HashMap<String,Object>();
            fieldEntity1.put("field","field"+list.get(i).getId());
            fieldEntity1.put("align","center");
            fieldEntity1.put("width",150);
            fieldEntity1.put("colspan",2);
            fieldEntity1.put("title",list.get(i).getTasteType());
            fieldEntities.add(fieldEntity1);

            Map<String,Object> fieldEntity2 = new HashMap<String,Object>();
            fieldEntity2.put("field","score"+list.get(i).getId());
            fieldEntity2.put("align","center");
            fieldEntity2.put("title","分数");
            fieldEntity2.put("width",80);
            fieldEntities.add(fieldEntity2);
        }
        Map<String,Object> fieldEntity3 = new HashMap<String,Object>();
        fieldEntity3.put("field","judge_result_num");
        fieldEntity3.put("align","center");
        fieldEntity3.put("title","正确数");
        fieldEntity3.put("width",80);
        fieldEntities.add(fieldEntity3);
        return R.ok(fieldEntities);
    }

    @ApiOperation(value = "获取投票信息", httpMethod = "POST", tags = "获取投票信息")
    @ResponseBody
    @RequestMapping("/getvotedetail")
    public R<?> getVoteDetail(HttpServletRequest request, HttpServletResponse response,
                              @RequestParam(value = "page", defaultValue = "1") int curPage,
                              @RequestParam(value = "limit", defaultValue = "10") int size,
                              @RequestParam(value = "tasteId") int id){
        legacyResults(request, id);
        requireLegacy(curPage >= 1 && curPage <= 100000 && size >= 1 && size <= 50, "分页参数无效");
        try {
            QueryWrapper<VoteTasteType> voteTasteTypeQueryWrapper = new QueryWrapper<>();
            voteTasteTypeQueryWrapper.eq("taste_id",id);
            List<VoteTasteType> list = iVoteTasteTypeService.list(voteTasteTypeQueryWrapper);
            List<Map<String, Object>> listTasteScore = iVoteTasteScoreService.getList(curPage, size, list,id);
            int totalNum = 0;
            if(listTasteScore!=null && listTasteScore.size()>0){
                totalNum = iVoteTasteScoreService.count(list,id);
                Map<String, Object> total = new HashMap<>();
                total.put("nickname","合计");
                Map<String, Object> avg = new HashMap<>();
                avg.put("nickname","平均数");
                for (int j=0;j<list.size();j++){
                    total.put("field"+list.get(j).getId(),"");
                    total.put("score"+list.get(j).getId(),0);
                    avg.put("field"+list.get(j).getId(),"");
                    avg.put("score"+list.get(j).getId(),0);
                }
                for (int i=0;i<listTasteScore.size();i++){
                    int num = 0;
                    Map<String, Object> stringStringMap = listTasteScore.get(i);
                    for (int j=0;j<list.size();j++){
                        int judge_result_num= stringStringMap.get("judge_result" + list.get(j).getId())==null?0:(int) stringStringMap.get("judge_result"+list.get(j).getId());
                        num = num + judge_result_num;
                        //合计
                        int score = Integer.parseInt(total.get("score" + list.get(j).getId())+"");
                        score = Integer.parseInt(StringUtils.isEmpty(stringStringMap.get("score" + list.get(j).getId()))?"0":stringStringMap.get("score" + list.get(j).getId())+"")+score;
                        total.put("score" + list.get(j).getId(),score);
                    }
                    stringStringMap.put("judge_result_num",num+"");
                    listTasteScore.set(i,stringStringMap);
                }
                //平均数
                for(String key : total.keySet()){
                    if(key.contains("score")){
                        BigDecimal dividend = new BigDecimal(String.valueOf(total.get(key)));
                        BigDecimal divisor = new BigDecimal(listTasteScore.size());
                        BigDecimal result = dividend.divide(divisor, 2, RoundingMode.HALF_UP);
                        avg.put(key,result);
                    }
                }
                listTasteScore.add(total);
                listTasteScore.add(avg);
                return R.ok(listTasteScore, totalNum);
            }else{
                return R.failed("未查到数据");
            }
        }catch (Exception e){
            e.printStackTrace();
            return R.failed("获取数据异常");
        }
    }

    @ApiOperation(value = "获取任务信息", httpMethod = "POST", tags = "获取任务信息")
    @ResponseBody
    @RequestMapping("/gettastetype")
    public R<?> getTasteType(HttpServletRequest request, HttpServletResponse response,
                            @RequestParam(value = "tasteId") int id) {
        legacyResults(request, id);
        return R.ok(getVoteTasteType(id, ""));
    }

    @GetMapping("/downloadXls")
    public void downloadXls(HttpServletRequest request, HttpServletResponse response, @RequestParam(value = "tasteId") int tasteId) throws IOException {
        HttpSession session = request.getSession(false);
        Object identity = session == null ? null : session.getAttribute("openId");
        if (!(identity instanceof String) || ((String) identity).isBlank()) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED); return;
        }
        if (tasteId <= 0) { response.sendError(HttpServletResponse.SC_BAD_REQUEST); return; }
        VoteTaste voteTaste = iVoteTasteService.getOne(new QueryWrapper<VoteTaste>().eq("id", tasteId));
        if (voteTaste == null) { response.sendError(HttpServletResponse.SC_NOT_FOUND); return; }
        if (voteTaste.getStatus() != 1) { response.sendError(HttpServletResponse.SC_FORBIDDEN); return; }
        //生成excel文件
        List<VoteTasteScoreEntity> scoreList = iVoteTasteScoreService.getScoreList(tasteId);
        QueryWrapper<VoteTasteType> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("taste_id", tasteId);
        queryWrapper.orderByAsc("id");
        List<VoteTasteType> typeList = iVoteTasteTypeService.list(queryWrapper);
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setCharacterEncoding("utf-8");
        response.setHeader("Content-disposition", "attachment;filename=" + UUID.randomUUID() + ".xlsx");
        createExcel(voteTaste, scoreList, typeList, response.getOutputStream());
        response.flushBuffer();
    }

    private final List<Character> AZ_LIST = Arrays.asList('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z');

    private void createExcel(VoteTaste voteTaste, List<VoteTasteScoreEntity> scoreList, List<VoteTasteType> typeList, OutputStream outputStream) throws IOException {
        Map<String, String> headerMap = new HashMap<>();
        Map<String, String> typeMap = new HashMap<>();
        for (int i = 0; i < typeList.size(); i++) {
            headerMap.put((i + 1) + "", AZ_LIST.get(i).toString());
            typeMap.put(typeList.get(i).getTasteType(), AZ_LIST.get(i).toString());
        }
        try (Workbook workbook = new XSSFWorkbook()) {
        int lastCol = typeList.size() * 2 + 1;
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy.MM.dd");
        String date = sdf.format(voteTaste.getCreateTime());
        int rowIndex = 0;
        Sheet sheet = workbook.createSheet("sheet");
        //--------第一行----------------------------
        Row row = sheet.createRow(rowIndex);
        Cell cell = row.createCell(0);
        cell.setCellValue(voteTaste.getTasteName());
        sheet.addMergedRegion(new CellRangeAddress(rowIndex, rowIndex, 0, lastCol));
        CellStyle style = createCellStyle(false, IndexedColors.WHITE.getIndex(), true, 18, workbook);
        cell.setCellStyle(style);
        sheet.setColumnWidth(0, 18 * 256); // Avoid AWT font discovery so report generation works on headless servers.
        //--------第二行----------------------------
        rowIndex += 1;
        Row row1 = sheet.createRow(rowIndex);
        Cell cell1 = row1.createCell(0);
        cell1.setCellValue("日期：" + date);
        sheet.addMergedRegion(new CellRangeAddress(rowIndex, rowIndex, 0, lastCol));
        CellStyle style1 = createCellStyle(false, IndexedColors.WHITE.getIndex(), true, 11, workbook);
        style1.setAlignment(HorizontalAlignment.RIGHT);
        cell1.setCellStyle(style1);
        //--------第三行----------------------------
        rowIndex += 1;
        createRowHeader(headerMap, sheet, workbook);
        Map<String, List<String>> bodyList = new HashMap<>();
        Map<String, Integer> correctList = new HashMap<>();
        for (int i = 0; i < scoreList.size(); i++) {
            if (!bodyList.containsKey(scoreList.get(i).getOpenId())) {
                bodyList.put(scoreList.get(i).getOpenId(), new ArrayList<>());
                bodyList.get(scoreList.get(i).getOpenId()).add(scoreList.get(i).getNickname());
                correctList.put(scoreList.get(i).getOpenId(), 0);
            }
            if (scoreList.get(i).getJudgeResult() == 1) {
                correctList.put(scoreList.get(i).getOpenId(), correctList.get(scoreList.get(i).getOpenId()) + 1);
            }
            String tag = typeMap.get(scoreList.get(i).getTypeName());
            bodyList.get(scoreList.get(i).getOpenId()).add(scoreList.get(i).getScore() + "");
            bodyList.get(scoreList.get(i).getOpenId()).add(tag);
        }
        rowIndex += 1;
        short size = 11;
        int cellIndex;
        Map<String, List<Integer>> scoreMap = new HashMap<>();
        for (Map.Entry<String, List<String>> entry : bodyList.entrySet()) {
            cellIndex = 0;
            Row bodyRow = sheet.createRow(rowIndex);
            for (int i = 0; i < entry.getValue().size(); i++) {
                boolean bgcolor = false;
                short color = IndexedColors.WHITE.getIndex();
                if (i > 0 && i % 2 == 0){
                    if (entry.getValue().get(i).equals(headerMap.get((i/2) + ""))){
                        bgcolor = true;
                        color = IndexedColors.YELLOW.getIndex();
                    }
                }
                if (i > 0 && i % 2 != 0) {
                    String key = (i / 2) + "";
                    if (!scoreMap.containsKey(key)) {
                        scoreMap.put(key, new ArrayList<>());
                    }
                    scoreMap.get(key).add(Integer.parseInt(entry.getValue().get(i)));
                }
                CellStyle style2 = createCellStyle(bgcolor, color, false, size, workbook);
                createCellBody(bodyRow, cellIndex, entry.getValue().get(i), style2, 0, 0, 0, 0);
                cellIndex += 1;
            }
            CellStyle style3 = createCellStyle(false, IndexedColors.WHITE.getIndex(), false, size, workbook);
            createCellBody(bodyRow, cellIndex, correctList.get(entry.getKey()) + "", style3, 0, 0, 0, 1);
            rowIndex += 1;
        }
        cellIndex = 0;
        Row endRow = sheet.createRow(rowIndex);
        CellStyle style3 = createCellStyle(true, IndexedColors.GREY_25_PERCENT.getIndex(), true, 14, workbook);
        createCellBody(endRow, cellIndex, "平均分:", style3, 0, 1, 0, 0);
        cellIndex += 1;
        TreeMap<Integer, Double> avgSortMap = new TreeMap<>();
        for (Map.Entry<String, List<Integer>> entry : scoreMap.entrySet()) {
            CellStyle endStyle = createCellStyle(true, IndexedColors.GREY_25_PERCENT.getIndex(), true, 14, workbook);
            String avg = getAvg(entry.getValue());
            Double avgDouble = Double.parseDouble(avg);
            avgSortMap.put(Integer.parseInt(entry.getKey()) + 1, avgDouble);
            createCellBody(endRow, cellIndex, avg, endStyle, 0, 1, 0, 0);
            sheet.addMergedRegion(new CellRangeAddress(rowIndex, rowIndex, cellIndex, cellIndex + 1));
            Cell tempCell = endRow.getCell(cellIndex + 1);
            if (tempCell == null){
                tempCell = endRow.createCell(cellIndex + 1);
            }
            tempCell.setCellStyle(endStyle);
            cellIndex += 2;
        }
        CellStyle endStyle1 = createCellStyle(true, IndexedColors.GREY_25_PERCENT.getIndex(), true, 14, workbook);
        createCellBody(endRow, cellIndex, "", endStyle1, 0, 1, 0, 1);

        List<Map.Entry<Integer, Double>> list = new ArrayList<>(avgSortMap.entrySet());
        Collections.sort(list, (o1, o2) -> {
            return o2.getValue().compareTo(o1.getValue()); // 倒序
        });
        Map<Integer, Double> sortedMap = new LinkedHashMap<>();
        for (Map.Entry<Integer, Double> entry : list) {
            sortedMap.put(entry.getKey(), entry.getValue());
        }

        rowIndex += 2;
        Map<Integer, List<RowEntity>> rowMap = new TreeMap<>();
        int x = 0;
        rowMap.put(x, getRowList());
        x += 1;
        for (Integer entry : sortedMap.keySet()) {
            rowMap.put(x, getRowList(sortedMap.get(entry) + "", x, entry, headerMap, typeList));
            x += 1;
        }
        x = 0;
        for (Integer entry : rowMap.keySet()) {
            if (x == 0) {
                createRow(rowIndex, rowMap.get(entry), 14, true, 1, 1, 1, 1, sheet, workbook);
            }else{
                createRow(rowIndex, rowMap.get(entry), 11, false, 0, 0, 0, 0, sheet, workbook);
            }
            rowIndex += 1;
            x += 1;
        }
        //贴图
        rowIndex += 1;
        String filePath = savePath.replace("/upload/", "") + voteTaste.getTasteUrl();
        try {
            if (StringUtils.hasText(voteTaste.getTasteUrl())) {
            InputStream imageStream = new FileInputStream(filePath);
            byte[] imageBytes = IOUtils.toByteArray(imageStream);
            imageStream.close();

            int pictureIdx = workbook.addPicture(imageBytes, Workbook.PICTURE_TYPE_PNG);
            CreationHelper helper = workbook.getCreationHelper();
            Drawing<?> drawing = sheet.createDrawingPatriarch();
            ClientAnchor anchor = helper.createClientAnchor();
            anchor.setCol1(0);
            anchor.setRow1(rowIndex);
            anchor.setCol2(lastCol);
            anchor.setRow2(rowIndex + 27);

            Picture picture = drawing.createPicture(anchor, pictureIdx);
            }
        }catch (Exception ex){
            ex.printStackTrace();
        }

        workbook.write(outputStream);
        }
    }

    private List<RowEntity> getRowList(String avg, Integer sort, Integer index, Map<String, String> headerMap, List<VoteTasteType> typeList) {
        List<String> tpList = new ArrayList<>();
        tpList.add(headerMap.get(index + ""));
        tpList.add(typeList.get(index - 1).getTasteType());
        tpList.add(avg);
        tpList.add(sort + "");
        return getTitleList(tpList);
    }

    private List<RowEntity> getTitleList(List<String> tpList) {
        List<RowEntity> resList = new ArrayList<>();
        for (int i=0;i<tpList.size();i++){
            RowEntity rowEntity = new RowEntity();
            rowEntity.setTitle(tpList.get(i));
            rowEntity.setBgColor(false);
            rowEntity.setColor(0);
            rowEntity.setMerged(0);
            resList.add(rowEntity);
        }
        return resList;
    }

    private List<RowEntity> getRowList() {
        List<String> tpList = new ArrayList<>();
        tpList.add("代码");
        tpList.add("酒名");
        tpList.add("平均分");
        tpList.add("排名");
        return getTitleList(tpList);
    }

    private String getAvg(List<Integer> tpList) {
        double sum = 0;
        for (Integer num : tpList) {
            sum += num;
        }
        double avg = sum / tpList.size();
        DecimalFormat df = new DecimalFormat("#.00");
        return df.format(avg);
    }
    private void createRow(int rowIndex, List<RowEntity> titleList, int size, boolean isBold, int top, int bottom, int left, int right, Sheet sheet, Workbook workbook) {
        Row row = sheet.createRow(rowIndex);
        for (int i=0;i<titleList.size();i++) {
            CellStyle style = createCellStyle(titleList.get(i).isBgColor(), (short) titleList.get(i).getColor(), isBold, size, workbook);
            createCellBody(row, i, titleList.get(i).getTitle(), style, top, bottom, left, right);
        }
    }

    private void createRowHeader(Map<String, String> headerMap, Sheet sheet, Workbook workbook) {
        Row row = sheet.createRow(2);
        short size = 14;
        createCellHeader(2, 0, "品鉴师", false, size,true, row, sheet, workbook);
        int index = 1;
        for (Map.Entry<String, String> entry : headerMap.entrySet()) {
            String title =   entry.getKey() + "#   （" + entry.getValue() + "）";
            createCellHeader(2, index, title, true, size, true, row, sheet, workbook);
            index += 2;
        }
        createCellHeader(2, index, "正确数", false, size, true, row, sheet, workbook);
    }

    private CellStyle createCellStyle(boolean bgColor, short color, boolean isBold, int fontSize, Workbook workbook) {
        CellStyle style = workbook.createCellStyle();
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        if (bgColor) {
            style.setFillForegroundColor(color);
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
        Font font = workbook.createFont();
        font.setFontName("宋体");
        font.setBold(true);
        font.setFontHeightInPoints((short) fontSize);
        style.setFont(font);
        return style;
    }

    private void createCellBody(Row row, int cellIndex, String title, CellStyle cellStyle, int top, int bottom, int left, int right) {
        Cell cell = row.createCell(cellIndex);
        cell.setCellValue(title);
        if (top == 0) {
            cellStyle.setBorderTop(BorderStyle.THIN);
        }else{
            cellStyle.setBorderTop(BorderStyle.MEDIUM);
        }
        if (bottom == 0) {
            cellStyle.setBorderBottom(BorderStyle.THIN);
        }else{
            cellStyle.setBorderBottom(BorderStyle.MEDIUM);
        }
        if (left == 0) {
            cellStyle.setBorderLeft(BorderStyle.THIN);
        }else{
            cellStyle.setBorderLeft(BorderStyle.MEDIUM);
        }
        if (right == 0) {
            cellStyle.setBorderRight(BorderStyle.THIN);
        }else{
            cellStyle.setBorderRight(BorderStyle.MEDIUM);
        }
        cell.setCellStyle(cellStyle);
    }

    private void createCellHeader(int rowIndex, int cellIndex, String title, boolean isMerged, short fontSize, boolean isBgColor, Row row, Sheet sheet, Workbook workbook) {
        Cell cell = row.createCell(cellIndex);
        cell.setCellValue(title);
        CellStyle style = createCellStyle(isBgColor, IndexedColors.GREY_25_PERCENT.getIndex(), true, fontSize, workbook);
        style.setBorderBottom(BorderStyle.MEDIUM);
        style.setBorderTop(BorderStyle.MEDIUM);
        style.setBorderLeft(BorderStyle.THIN);
        if (cellIndex == 15) {
            style.setBorderRight(BorderStyle.MEDIUM);
        }
        cell.setCellStyle(style);
        if(isMerged) {
            sheet.addMergedRegion(new CellRangeAddress(rowIndex, rowIndex, cellIndex, cellIndex + 1));
            Cell cell1 = row.getCell(cellIndex + 1);
            if (cell1 == null){
                cell1 = row.createCell(cellIndex + 1);
            }
            cell1.setCellStyle(style);
        }
    }


//    public static void main(String[] args) {
//        System.out.println("xx");
//        VoteTaste voteTaste = new VoteTaste();
//        voteTaste.setCreateTime(new Date());
//        voteTaste.setTasteName("金沙系列品鉴");
//        voteTaste.setTasteUrl("/Users/gaoliang/Documents/work/code/python/sms_tpl/mals/bg1751020472.1104782.png");
//
//        List<VoteTasteType> typeList = getTypeList();
//        List<VoteTasteScoreEntity> scoreList1 = getScoreList(typeList, "ch", "9c8qwdh8q7323");
//        List<VoteTasteScoreEntity> scoreList2 = getScoreList(typeList, "cdp", "0ascj23ujcec");
//        List<VoteTasteScoreEntity> scoreList3 = getScoreList(typeList, "zf", "09asc23jacjh");
//        List<VoteTasteScoreEntity> scoreList = new ArrayList<>();
//        scoreList.addAll(scoreList1);
//        scoreList.addAll(scoreList2);
//        scoreList.addAll(scoreList3);
//        createExcel(voteTaste, scoreList, typeList);
//    }
//    private static List<VoteTasteScoreEntity> getScoreList(List<VoteTasteType> typeList, String name, String openId) {
//        Random rd = new Random();
//        List<Integer> tpList = new ArrayList<>();
//        for (int i = 0; i < 7; i++) {
//            tpList.add(i);
//        }
//        Collections.shuffle(tpList);
//        List<VoteTasteScoreEntity> result = new ArrayList<>();
//        for (int i = 0; i < typeList.size(); i++) {
//            VoteTasteScoreEntity v1 = new VoteTasteScoreEntity();
//            v1.setScore(rd.nextInt(70, 99));
//            v1.setOpen_id(openId);
//            v1.setNickname(name);
//            String val = "1983_" + tpList.get(i);
//            if (val.equals(typeList.get(i).getTasteType())){
//                v1.setJudge_result(1);
//            }else{
//                v1.setJudge_result(0);
//            }
//            v1.setType_name(val);
//            v1.setTaste_type_id(typeList.get(i).getId());
//            result.add(v1);
//        }
//        return result;
//    }
//    private static List<VoteTasteType> getTypeList() {
//        List<VoteTasteType> typeList = new ArrayList<>();
//        for (int i = 0; i < 7; i++) {
//            VoteTasteType v1 = new VoteTasteType();
//            v1.setId(i + 31);
//            v1.setTasteType("1983_" + i);
//            v1.setTasteId(8);
//            typeList.add(v1);
//        }
//        return typeList;
//    }
}
