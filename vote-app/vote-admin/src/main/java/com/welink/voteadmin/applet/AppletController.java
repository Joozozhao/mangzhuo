package com.welink.voteadmin.applet;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.welink.vote.common.data.model.*;
import com.welink.vote.common.data.service.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

/** 原生 JSON 接口，复用原品酒四张表；与公众号 session 的 openId 隔离。 */
@RestController
@RequestMapping("/taste/applet")
public class AppletController {
    static final String IDENTITY = "appletOpenId";
    private final AppletWechatClient wechat;
    private final IVoteTasteUserService users;
    private final IVoteTasteService tastes;
    private final IVoteTasteTypeService types;
    private final IVoteTasteScoreService scores;
    private final String creationKey;

    public AppletController(AppletWechatClient wechat, IVoteTasteUserService users,
                            IVoteTasteService tastes, IVoteTasteTypeService types,
                            IVoteTasteScoreService scores,
                            @Value("${wechat.secretKey:}") String creationKey) {
        this.wechat = wechat; this.users = users; this.tastes = tastes;
        this.types = types; this.scores = scores; this.creationKey = creationKey;
    }

    public record LoginBody(String code) {}
    public record ProfileBody(String nickname) {}
    public record CreateBody(String title, List<String> names, String authentication) {}
    /** 数字字段走严格整数反序列化：JSON 小数（如 1.5）直接 400，不允许截断成 1。 */
    public record Answer(@JsonDeserialize(using = StrictIntegerDeserializer.class) Integer sampleId,
                         String guessedName,
                         @JsonDeserialize(using = StrictIntegerDeserializer.class) Integer score) {}
    public record ScoreBody(List<Answer> answers) {}

    @PostMapping("/login")
    @Transactional
    public Map<String, Object> login(@RequestBody LoginBody body, HttpServletRequest request) {
        String openid = wechat.exchange(body.code());
        VoteTasteUser user = user(openid);
        if (user == null) {
            user = new VoteTasteUser();
            user.setOpenid(openid); user.setNickname("品鉴者");
            user.setCity(""); user.setCountry(""); user.setCreate_time(new Date());
            check(users.save(user), "登录资料保存失败");
        }
        HttpSession old = request.getSession(false);
        if (old != null) old.invalidate();
        HttpSession session = request.getSession(true);
        session.setMaxInactiveInterval(7200);
        session.setAttribute(IDENTITY, openid);
        return ok(Map.of("openid", openid, "nickname", user.getNickname() == null ? "" : user.getNickname()));
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) session.invalidate();
        return ok(Map.of());
    }

    @PostMapping("/profile")
    @Transactional
    public Map<String, Object> profile(@RequestBody ProfileBody body, HttpServletRequest request) {
        VoteTasteUser user = user(identity(request));
        if (user == null) throw error(HttpStatus.UNAUTHORIZED, "请重新登录");
        user.setNickname(text(body.nickname(), 20, "昵称"));
        check(users.updateById(user), "资料保存失败");
        return ok(Map.of("nickname", user.getNickname()));
    }

    @GetMapping("/tastes")
    public Map<String, Object> list(HttpServletRequest request,
                                   @RequestParam(defaultValue = "1") int page,
                                   @RequestParam(defaultValue = "15") int limit) {
        String openid = identity(request);
        if (page < 1 || page > 100000 || limit < 1 || limit > 50) throw error(HttpStatus.BAD_REQUEST, "分页参数无效");
        // 不复用旧 getList 聚合 SQL（join + group by 在 ONLY_FULL_GROUP_BY 下不可用），新端点只做简单分页。
        Page<VoteTaste> result = tastes.page(new Page<>(page, limit),
                new QueryWrapper<VoteTaste>().orderByAsc("create_time"));
        List<Map<String, Object>> rows = result.getRecords().stream().map(t -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", t.getId()); row.put("title", t.getTasteName());
            row.put("status", t.getStatus()); row.put("isOwner", openid.equals(t.getCreateOpenId()));
            row.put("createdAt", t.getCreateTime());
            return row;
        }).collect(Collectors.toList());
        Map<String, Object> response = ok(rows);
        response.put("count", result.getTotal());
        return response;
    }

    @GetMapping("/tastes/{id}")
    public Map<String, Object> detail(@PathVariable int id, HttpServletRequest request) {
        String openid = identity(request);
        VoteTaste taste = taste(id, false);
        List<VoteTasteType> samples = samples(id);
        boolean owner = openid.equals(taste.getCreateOpenId());
        List<Map<String, Object>> numbered = new ArrayList<>();
        for (int i = 0; i < samples.size(); i++) {
            VoteTasteType s = samples.get(i);
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("sampleId", s.getId()); row.put("number", i + 1);
            if (owner || taste.getStatus() == 1) row.put("actualName", s.getTasteType());
            numbered.add(row);
        }
        // 候选只返回按名称排序的文本，不把真实酒样 ID 与名称一起暴露。
        List<String> choices = samples.stream().map(VoteTasteType::getTasteType).sorted().collect(Collectors.toList());
        List<Map<String, Object>> mine = ownScores(id, openid).stream().map(s -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("sampleId", s.getTasteTypeId()); row.put("guessedName", s.getTypeName()); row.put("score", s.getScore());
            return row;
        }).collect(Collectors.toList());
        return ok(Map.of("id", id, "title", taste.getTasteName(), "status", taste.getStatus(),
                "isOwner", owner, "samples", numbered, "choices", choices, "answers", mine));
    }

    @PostMapping("/tastes")
    @Transactional
    public Map<String, Object> create(@RequestBody CreateBody body, HttpServletRequest request) {
        String openid = identity(request);
        String expected = creationKey + LocalDate.now(ZoneId.of("Asia/Shanghai")).format(DateTimeFormatter.BASIC_ISO_DATE);
        // 沿用原系统主持人创建口令，不把口令或 secretKey 下发到前端。
        if (creationKey.isBlank() || body.authentication() == null || !MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8), body.authentication().getBytes(StandardCharsets.UTF_8))) {
            throw error(HttpStatus.FORBIDDEN, "主持人口令无效");
        }
        String title = text(body.title(), 32, "酒局名称");
        if (body.names() == null || body.names().size() < 2 || body.names().size() > 20) {
            throw error(HttpStatus.BAD_REQUEST, "请按编号填写 2 至 20 款酒样");
        }
        List<String> names = body.names().stream().map(n -> text(n, 100, "酒名")).collect(Collectors.toList());
        if (new HashSet<>(names).size() != names.size()) throw error(HttpStatus.BAD_REQUEST, "酒名不能重复，请补充区分信息");
        VoteTaste taste = new VoteTaste();
        taste.setTasteName(title); taste.setCreateOpenId(openid); taste.setCreateTime(new Date());
        taste.setStatus(0); taste.setImgUrl(""); taste.setTasteUrl("");
        check(tastes.save(taste), "酒局保存失败");
        List<VoteTasteType> rows = names.stream().map(name -> {
            VoteTasteType row = new VoteTasteType(); row.setTasteId(taste.getId()); row.setTasteType(name); return row;
        }).collect(Collectors.toList());
        check(types.saveBatch(rows), "酒样保存失败");
        return ok(Map.of("id", taste.getId()));
    }

    @PostMapping("/tastes/{id}/scores")
    @Transactional
    public Map<String, Object> score(@PathVariable int id, @RequestBody ScoreBody body, HttpServletRequest request) {
        String openid = identity(request);
        VoteTaste taste = taste(id, true); // 与结束品鉴、其他交卷共用行锁，避免重复与关闭竞态。
        if (taste.getStatus() != 0) throw error(HttpStatus.CONFLICT, "品鉴已结束，不能再修改评分");
        List<VoteTasteType> samples = samples(id);
        if (body.answers() == null || body.answers().size() != samples.size() || samples.isEmpty()) {
            throw error(HttpStatus.BAD_REQUEST, "请完成全部酒样的判断和评分");
        }
        Map<Integer, VoteTasteType> byId = samples.stream().collect(Collectors.toMap(VoteTasteType::getId, s -> s));
        Set<String> choices = samples.stream().map(VoteTasteType::getTasteType).collect(Collectors.toSet());
        Set<Integer> seen = new HashSet<>();
        for (Answer a : body.answers()) {
            if (a == null || a.sampleId() == null || !byId.containsKey(a.sampleId()) || !seen.add(a.sampleId())
                    || !choices.contains(a.guessedName())
                    || a.score() == null || a.score() < 0 || a.score() > 100) {
                throw error(HttpStatus.BAD_REQUEST, "酒样、酒名或评分无效，分数需为 0 至 100 的整数");
            }
        }
        scores.remove(new QueryWrapper<VoteTasteScore>().eq("taste_id", id).eq("open_id", openid));
        List<VoteTasteScore> rows = body.answers().stream().map(a -> {
            VoteTasteScore row = new VoteTasteScore();
            row.setTasteId(id); row.setTasteTypeId(a.sampleId()); row.setOpenId(openid);
            row.setTypeName(a.guessedName()); row.setScore(a.score()); row.setCreateTime(new Date());
            row.setJudgeResult(byId.get(a.sampleId()).getTasteType().equals(a.guessedName()) ? 1 : 0);
            return row;
        }).collect(Collectors.toList());
        check(scores.saveBatch(rows), "评分保存失败");
        return ok(Map.of("submitted", true));
    }

    @PostMapping("/tastes/{id}/close")
    @Transactional
    public Map<String, Object> close(@PathVariable int id, HttpServletRequest request) {
        String openid = identity(request);
        VoteTaste taste = taste(id, true);
        if (!openid.equals(taste.getCreateOpenId())) throw error(HttpStatus.FORBIDDEN, "只有主持人可以结束品鉴");
        taste.setStatus(1);
        check(tastes.updateById(taste), "结束品鉴失败");
        return ok(Map.of("status", 1));
    }

    @GetMapping("/tastes/{id}/results")
    public Map<String, Object> results(@PathVariable int id, HttpServletRequest request) {
        identity(request);
        VoteTaste taste = taste(id, false);
        if (taste.getStatus() != 1) throw error(HttpStatus.FORBIDDEN, "品鉴结束后才能查看结果");
        List<VoteTasteType> samples = samples(id);
        List<VoteTasteScore> all = scores.list(new QueryWrapper<VoteTasteScore>().eq("taste_id", id));
        List<Map<String, Object>> summary = new ArrayList<>();
        for (int i = 0; i < samples.size(); i++) {
            VoteTasteType s = samples.get(i);
            List<VoteTasteScore> votes = all.stream().filter(v -> v.getTasteTypeId() == s.getId()).collect(Collectors.toList());
            double average = votes.stream().mapToInt(VoteTasteScore::getScore).average().orElse(0);
            summary.add(Map.of("sampleId", s.getId(), "number", i + 1, "name", s.getTasteType(),
                    "average", Math.round(average * 100.0) / 100.0, "count", votes.size(),
                    "correct", votes.stream().filter(v -> v.getJudgeResult() == 1).count()));
        }
        return ok(Map.of("title", taste.getTasteName(), "samples", summary,
                "participantCount", all.stream().map(VoteTasteScore::getOpenId).distinct().count()));
    }

    private VoteTasteUser user(String openid) {
        return users.getOne(new QueryWrapper<VoteTasteUser>().eq("openid", openid));
    }
    private List<VoteTasteScore> ownScores(int id, String openid) {
        return scores.list(new QueryWrapper<VoteTasteScore>().eq("taste_id", id).eq("open_id", openid));
    }
    private List<VoteTasteType> samples(int id) {
        return types.list(new QueryWrapper<VoteTasteType>().eq("taste_id", id).orderByAsc("id"));
    }
    private VoteTaste taste(int id, boolean lock) {
        if (id < 1) throw error(HttpStatus.BAD_REQUEST, "酒局编号无效");
        QueryWrapper<VoteTaste> query = new QueryWrapper<VoteTaste>().eq("id", id);
        if (lock) query.last("FOR UPDATE");
        VoteTaste taste = tastes.getOne(query);
        if (taste == null) throw error(HttpStatus.NOT_FOUND, "酒局不存在");
        return taste;
    }
    private String identity(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        String openid = session == null ? null : (String) session.getAttribute(IDENTITY);
        if (openid == null || openid.isBlank()) throw error(HttpStatus.UNAUTHORIZED, "请先微信登录");
        return openid;
    }
    private String text(String value, int max, String label) {
        if (value == null || value.isBlank() || value.trim().length() > max) throw error(HttpStatus.BAD_REQUEST, label + "长度无效");
        return value.trim();
    }
    private void check(boolean saved, String message) {
        if (!saved) throw error(HttpStatus.INTERNAL_SERVER_ERROR, message);
    }
    private ResponseStatusException error(HttpStatus status, String message) {
        return new ResponseStatusException(status, message);
    }
    /** 返回可变 Map：列表接口需要在 ok 结果上追加 count。 */
    private Map<String, Object> ok(Object data) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", 0);
        body.put("msg", "接口调用成功");
        body.put("data", data);
        return body;
    }
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> failure(ResponseStatusException e) {
        return fail(e.getStatusCode(), Objects.requireNonNullElse(e.getReason(), "请求失败"));
    }
    /** 请求体缺失/非法 JSON、参数缺失、路径参数类型错误统一按 400 返回 code/msg。 */
    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Map<String, Object>> badRequest(Exception e) {
        return fail(HttpStatus.BAD_REQUEST, "请求参数格式无效");
    }
    /** 兜底异常不向前端暴露内部细节。 */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> unexpected(Exception e) {
        return fail(HttpStatus.INTERNAL_SERVER_ERROR, "服务暂不可用，请稍后重试");
    }
    private ResponseEntity<Map<String, Object>> fail(HttpStatusCode status, String message) {
        return ResponseEntity.status(status).body(Map.of("code", status.value(), "msg", message));
    }
}
