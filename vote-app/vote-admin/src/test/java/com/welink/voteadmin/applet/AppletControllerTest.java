package com.welink.voteadmin.applet;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.welink.vote.common.data.model.VoteTaste;
import com.welink.vote.common.data.model.VoteTasteScore;
import com.welink.vote.common.data.model.VoteTasteType;
import com.welink.vote.common.data.model.VoteTasteUser;
import com.welink.vote.common.data.service.IVoteTasteScoreService;
import com.welink.vote.common.data.service.IVoteTasteService;
import com.welink.vote.common.data.service.IVoteTasteTypeService;
import com.welink.vote.common.data.service.IVoteTasteUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collection;
import java.util.Date;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * AppletController 的 MockMvc 单测：四个服务与微信客户端全部 Mock，不连数据库、不发远程请求。
 */
class AppletControllerTest {
    private static final String KEY = "unit-test-secret";
    private static final ZoneId SHANGHAI = ZoneId.of("Asia/Shanghai");

    private MockMvc mvc;
    private AppletWechatClient wechat;
    private IVoteTasteUserService users;
    private IVoteTasteService tastes;
    private IVoteTasteTypeService types;
    private IVoteTasteScoreService scores;

    @BeforeEach
    void setUp() {
        wechat = mock(AppletWechatClient.class);
        users = mock(IVoteTasteUserService.class);
        tastes = mock(IVoteTasteService.class);
        types = mock(IVoteTasteTypeService.class);
        scores = mock(IVoteTasteScoreService.class);
        mvc = MockMvcBuilders.standaloneSetup(
                new AppletController(wechat, users, tastes, types, scores, KEY)).build();
    }

    // ---------- 登录 / 会话 ----------

    @Test
    void loginCreatesSessionAndNewUser() throws Exception {
        when(wechat.exchange("c1")).thenReturn("applet-openid-a");
        when(users.getOne(any(QueryWrapper.class))).thenReturn(null);
        when(users.save(any(VoteTasteUser.class))).thenReturn(true);

        MvcResult result = mvc.perform(post("/taste/applet/login")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"c1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.openid").value("applet-openid-a"))
                .andExpect(jsonPath("$.data.nickname").value("品鉴者"))
                .andReturn();
        MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
        assertNotNull(session, "登录成功后应建立会话");
        assertEquals("applet-openid-a", session.getAttribute("appletOpenId"));
        assertNull(session.getAttribute("openId"), "不应写公众号会话属性");
    }

    @Test
    void loginReturnsStoredNicknameWithoutRecreatingUser() throws Exception {
        VoteTasteUser existing = user("applet-openid-b", "老酒鬼");
        when(wechat.exchange("c2")).thenReturn("applet-openid-b");
        when(users.getOne(any(QueryWrapper.class))).thenReturn(existing);

        mvc.perform(post("/taste/applet/login")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"c2\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("老酒鬼"));
        verify(users, never()).save(any());
    }

    @Test
    void loginWechatFailureReturnsBadGatewayAndCreatesNoSession() throws Exception {
        when(wechat.exchange("bad")).thenThrow(
                new ResponseStatusException(HttpStatus.BAD_GATEWAY, "微信登录凭证校验失败，请重新登录"));

        MvcResult result = mvc.perform(post("/taste/applet/login")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"bad\"}"))
                .andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value(502))
                .andExpect(jsonPath("$.msg").value("微信登录凭证校验失败，请重新登录"))
                .andReturn();
        assertNull(result.getRequest().getSession(false), "微信校验失败不得建立会话");
        verify(users, never()).save(any());
    }

    @Test
    void loginUserSaveFailureCreatesNoSession() throws Exception {
        when(wechat.exchange("c3")).thenReturn("applet-openid-c");
        when(users.getOne(any(QueryWrapper.class))).thenReturn(null);
        when(users.save(any(VoteTasteUser.class))).thenReturn(false);

        MvcResult result = mvc.perform(post("/taste/applet/login")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"c3\"}"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value(500))
                .andReturn();
        assertNull(result.getRequest().getSession(false), "开户失败不得建立会话");
    }

    @Test
    void requestWithoutSessionIsUnauthorizedJson() throws Exception {
        mvc.perform(get("/taste/applet/tastes"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401))
                .andExpect(jsonPath("$.msg").value("请先微信登录"));
    }

    @Test
    void unauthenticatedRequestTouchesNoService() throws Exception {
        mvc.perform(post("/taste/applet/tastes/5/scores")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":[{\"sampleId\":11,\"guessedName\":\"Alpha\",\"score\":50}]}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value(401));
        verifyNoInteractions(users, tastes, types, scores);
    }

    @Test
    void logoutInvalidatesSession() throws Exception {
        MockHttpSession session = session("user-1");
        mvc.perform(post("/taste/applet/logout").session(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
        assertTrue(session.isInvalid());
    }

    @Test
    void malformedJsonBodyIsBadRequest() throws Exception {
        mvc.perform(post("/taste/applet/login")
                        .contentType(MediaType.APPLICATION_JSON).content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400))
                .andExpect(jsonPath("$.msg").exists());
    }

    // ---------- 昵称 ----------

    @Test
    void profileUpdatesNickname() throws Exception {
        VoteTasteUser stored = user("user-1", "旧名字");
        when(users.getOne(any(QueryWrapper.class))).thenReturn(stored);
        when(users.updateById(any(VoteTasteUser.class))).thenReturn(true);

        mvc.perform(post("/taste/applet/profile").session(session("user-1"))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"nickname\":\"新名字\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nickname").value("新名字"));
        ArgumentCaptor<VoteTasteUser> captor = ArgumentCaptor.forClass(VoteTasteUser.class);
        verify(users).updateById(captor.capture());
        assertEquals("新名字", captor.getValue().getNickname());
    }

    @Test
    void profileRejectsTooLongNickname() throws Exception {
        when(users.getOne(any(QueryWrapper.class))).thenReturn(user("user-1", "旧名字"));
        mvc.perform(post("/taste/applet/profile").session(session("user-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nickname\":\"这个昵称实在是太多太多太多太长太长太长太长太长啦\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
        verify(users, never()).updateById(any());
    }

    // ---------- 酒局列表 ----------

    @Test
    void listReturnsRowsAndTotalCount() throws Exception {
        Page<VoteTaste> result = new Page<>(2, 5);
        result.setRecords(List.of(taste(9, "user-1", 0)));
        result.setTotal(7);
        when(tastes.page(any(Page.class), any(QueryWrapper.class))).thenReturn(result);

        mvc.perform(get("/taste/applet/tastes?page=2&limit=5").session(session("user-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.count").value(7))
                .andExpect(jsonPath("$.data[0].id").value(9))
                .andExpect(jsonPath("$.data[0].title").value("周五盲品"))
                .andExpect(jsonPath("$.data[0].status").value(0))
                .andExpect(jsonPath("$.data[0].isOwner").value(true))
                .andExpect(jsonPath("$.data[0].createdAt").exists());
    }

    @Test
    void listRejectsInvalidPaging() throws Exception {
        mvc.perform(get("/taste/applet/tastes?page=0").session(session("user-1")))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/taste/applet/tastes?limit=99").session(session("user-1")))
                .andExpect(status().isBadRequest());
    }

    // ---------- 创建 ----------

    @Test
    void createSucceedsWithCorrectAuthentication() throws Exception {
        when(tastes.save(any(VoteTaste.class))).thenAnswer(invocation -> {
            VoteTaste saved = invocation.getArgument(0);
            saved.setId(42); // 模拟自增主键回填
            return true;
        });
        when(types.saveBatch(any())).thenReturn(true);

        mvc.perform(post("/taste/applet/tastes").session(session("owner-x"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"周五盲品\",\"names\":[\"Alpha\",\"Beta\"],\"authentication\":\"" + authentication() + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(42));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<VoteTasteType>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(types).saveBatch(captor.capture());
        assertEquals(2, captor.getValue().size());
        assertTrue(captor.getValue().stream().allMatch(t -> t.getTasteId() == 42));
    }

    @Test
    void createRejectsWrongAuthentication() throws Exception {
        mvc.perform(post("/taste/applet/tastes").session(session("owner-x"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"周五盲品\",\"names\":[\"Alpha\",\"Beta\"],\"authentication\":\"wrong\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403));
        verify(tastes, never()).save(any());
    }

    @Test
    void createRejectsDuplicateNames() throws Exception {
        mvc.perform(post("/taste/applet/tastes").session(session("owner-x"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"周五盲品\",\"names\":[\"Alpha\",\"Alpha\"],\"authentication\":\"" + authentication() + "\"}"))
                .andExpect(status().isBadRequest());
        verify(tastes, never()).save(any());
    }

    @Test
    void createRejectsSingleSample() throws Exception {
        mvc.perform(post("/taste/applet/tastes").session(session("owner-x"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"周五盲品\",\"names\":[\"Alpha\"],\"authentication\":\"" + authentication() + "\"}"))
                .andExpect(status().isBadRequest());
    }

    // ---------- 详情与候选保护 ----------

    @Test
    void detailHidesActualNamesFromGuestAndChoicesCarryNoIds() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(List.of(sample(12, "Beta"), sample(11, "Alpha")));
        when(scores.list(any(QueryWrapper.class))).thenReturn(List.of());

        mvc.perform(get("/taste/applet/tastes/5").session(session("guest-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isOwner").value(false))
                .andExpect(jsonPath("$.data.samples[0].actualName").doesNotExist())
                .andExpect(jsonPath("$.data.samples[1].actualName").doesNotExist())
                .andExpect(jsonPath("$.data.samples[0].sampleId").value(12))
                .andExpect(jsonPath("$.data.samples[0].number").value(1))
                // 候选按名称排序，仅文本，无法与酒样编号对应
                .andExpect(jsonPath("$.data.choices[0]").value("Alpha"))
                .andExpect(jsonPath("$.data.choices[1]").value("Beta"))
                .andExpect(jsonPath("$.data.answers").isEmpty());
    }

    @Test
    void detailShowsActualNamesToOwner() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(List.of(sample(11, "Alpha"), sample(12, "Beta")));
        when(scores.list(any(QueryWrapper.class))).thenReturn(List.of());

        mvc.perform(get("/taste/applet/tastes/5").session(session("owner-x")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isOwner").value(true))
                .andExpect(jsonPath("$.data.samples[0].actualName").value("Alpha"))
                .andExpect(jsonPath("$.data.samples[1].actualName").value("Beta"));
    }

    @Test
    void detailShowsActualNamesToEveryoneAfterClose() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 1));
        when(types.list(any(QueryWrapper.class))).thenReturn(List.of(sample(11, "Alpha")));
        when(scores.list(any(QueryWrapper.class))).thenReturn(List.of());

        mvc.perform(get("/taste/applet/tastes/5").session(session("guest-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.samples[0].actualName").value("Alpha"));
    }

    @Test
    void detailReturnsOwnAnswers() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(List.of(sample(11, "Alpha"), sample(12, "Beta")));
        when(scores.list(any(QueryWrapper.class)))
                .thenReturn(List.of(scoreRow("guest-1", 11, "Beta", 88, 0)));

        mvc.perform(get("/taste/applet/tastes/5").session(session("guest-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.answers[0].sampleId").value(11))
                .andExpect(jsonPath("$.data.answers[0].guessedName").value("Beta"))
                .andExpect(jsonPath("$.data.answers[0].score").value(88));
    }

    @Test
    void detailMissingTasteIsNotFound() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(null);
        mvc.perform(get("/taste/applet/tastes/99").session(session("user-1")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(404))
                .andExpect(jsonPath("$.msg").value("酒局不存在"));
    }

    @Test
    void nonNumericTasteIdIsBadRequest() throws Exception {
        mvc.perform(get("/taste/applet/tastes/abc").session(session("user-1")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
    }

    // ---------- 评分 ----------

    @Test
    void scoreAcceptsBoundaryValues0And100() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(List.of(sample(11, "Alpha"), sample(12, "Beta")));
        when(scores.remove(any(QueryWrapper.class))).thenReturn(true);
        when(scores.saveBatch(any())).thenReturn(true);

        mvc.perform(post("/taste/applet/tastes/5/scores").session(session("guest-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":["
                                + "{\"sampleId\":11,\"guessedName\":\"Beta\",\"score\":0},"
                                + "{\"sampleId\":12,\"guessedName\":\"Beta\",\"score\":100}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.submitted").value(true));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<VoteTasteScore>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(scores).saveBatch(captor.capture());
        List<VoteTasteScore> rows = List.copyOf(captor.getValue());
        assertEquals(2, rows.size());
        assertEquals(0, rows.get(0).getScore());
        assertEquals(100, rows.get(1).getScore());
        assertEquals(0, rows.get(0).getJudgeResult(), "猜错应为 0");
        assertEquals(1, rows.get(1).getJudgeResult(), "猜对应为 1");
        assertTrue(rows.stream().allMatch(r -> r.getTasteId() == 5 && "guest-1".equals(r.getOpenId())));
    }

    @Test
    void scoreRejectsForeignSampleId() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(List.of(sample(11, "Alpha"), sample(12, "Beta")));

        mvc.perform(post("/taste/applet/tastes/5/scores").session(session("guest-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":["
                                + "{\"sampleId\":999,\"guessedName\":\"Alpha\",\"score\":50},"
                                + "{\"sampleId\":12,\"guessedName\":\"Beta\",\"score\":60}]}"))
                .andExpect(status().isBadRequest());
        verify(scores, never()).saveBatch(any());
    }

    @Test
    void scoreRejectsDuplicateSampleId() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(List.of(sample(11, "Alpha"), sample(12, "Beta")));

        mvc.perform(post("/taste/applet/tastes/5/scores").session(session("guest-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":["
                                + "{\"sampleId\":11,\"guessedName\":\"Alpha\",\"score\":50},"
                                + "{\"sampleId\":11,\"guessedName\":\"Beta\",\"score\":60}]}"))
                .andExpect(status().isBadRequest());
        verify(scores, never()).saveBatch(any());
    }

    @Test
    void scoreRejectsOutOfRangeValues() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(List.of(sample(11, "Alpha"), sample(12, "Beta")));

        mvc.perform(post("/taste/applet/tastes/5/scores").session(session("guest-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":[{\"sampleId\":11,\"guessedName\":\"Alpha\",\"score\":101},"
                                + "{\"sampleId\":12,\"guessedName\":\"Beta\",\"score\":60}]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/taste/applet/tastes/5/scores").session(session("guest-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":[{\"sampleId\":11,\"guessedName\":\"Alpha\",\"score\":-1},"
                                + "{\"sampleId\":12,\"guessedName\":\"Beta\",\"score\":60}]}"))
                .andExpect(status().isBadRequest());
        verify(scores, never()).saveBatch(any());
    }

    @Test
    void scoreRejectsFractionalScore() throws Exception {
        // Jackson 默认 ACCEPT_FLOAT_AS_INT 会把 1.5 截断为 1，必须在反序列化阶段整体拒绝
        mvc.perform(post("/taste/applet/tastes/5/scores").session(session("guest-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":[{\"sampleId\":11,\"guessedName\":\"Alpha\",\"score\":1.5},"
                                + "{\"sampleId\":12,\"guessedName\":\"Beta\",\"score\":60}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(400));
        verify(scores, never()).saveBatch(any());
        verify(tastes, never()).getOne(any(QueryWrapper.class));
    }

    @Test
    void scoreRejectsFractionalSampleId() throws Exception {
        mvc.perform(post("/taste/applet/tastes/5/scores").session(session("guest-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":[{\"sampleId\":1.5,\"guessedName\":\"Alpha\",\"score\":50},"
                                + "{\"sampleId\":12,\"guessedName\":\"Beta\",\"score\":60}]}"))
                .andExpect(status().isBadRequest());
        verify(scores, never()).saveBatch(any());
    }

    @Test
    void scoreRejectsIncompleteAnswers() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(List.of(sample(11, "Alpha"), sample(12, "Beta")));

        mvc.perform(post("/taste/applet/tastes/5/scores").session(session("guest-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":[{\"sampleId\":11,\"guessedName\":\"Alpha\",\"score\":50}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void scoreRejectsUnknownGuessedName() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(List.of(sample(11, "Alpha"), sample(12, "Beta")));

        mvc.perform(post("/taste/applet/tastes/5/scores").session(session("guest-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":[{\"sampleId\":11,\"guessedName\":\"Gamma\",\"score\":50},"
                                + "{\"sampleId\":12,\"guessedName\":\"Beta\",\"score\":60}]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void scoreAfterCloseIsRejected() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 1));

        mvc.perform(post("/taste/applet/tastes/5/scores").session(session("guest-1"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":[{\"sampleId\":11,\"guessedName\":\"Alpha\",\"score\":50}]}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value(409));
        verify(scores, never()).saveBatch(any());
    }

    // ---------- 结束与结果 ----------

    @Test
    void ownerCanClose() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 0));
        when(tastes.updateById(any(VoteTaste.class))).thenReturn(true);

        mvc.perform(post("/taste/applet/tastes/5/close").session(session("owner-x")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value(1));
        ArgumentCaptor<VoteTaste> captor = ArgumentCaptor.forClass(VoteTaste.class);
        verify(tastes).updateById(captor.capture());
        assertEquals(1, captor.getValue().getStatus());
    }

    @Test
    void nonOwnerCannotClose() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 0));

        mvc.perform(post("/taste/applet/tastes/5/close").session(session("guest-1")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(403))
                .andExpect(jsonPath("$.msg").value("只有主持人可以结束品鉴"));
        verify(tastes, never()).updateById(any());
    }

    @Test
    void resultsAreProtectedBeforeClose() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 0));

        mvc.perform(get("/taste/applet/tastes/5/results").session(session("owner-x")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.msg").value("品鉴结束后才能查看结果"));
    }

    @Test
    void resultsAggregateScoresAfterClose() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-x", 1));
        when(types.list(any(QueryWrapper.class))).thenReturn(List.of(sample(11, "Alpha"), sample(12, "Beta")));
        when(scores.list(any(QueryWrapper.class))).thenReturn(List.of(
                scoreRow("user-1", 11, "Alpha", 80, 1),
                scoreRow("user-1", 12, "Beta", 90, 1),
                scoreRow("user-2", 11, "Beta", 60, 0),
                scoreRow("user-2", 12, "Alpha", 100, 0)));

        mvc.perform(get("/taste/applet/tastes/5/results").session(session("guest-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.title").value("周五盲品"))
                .andExpect(jsonPath("$.data.participantCount").value(2))
                .andExpect(jsonPath("$.data.samples[0].sampleId").value(11))
                .andExpect(jsonPath("$.data.samples[0].number").value(1))
                .andExpect(jsonPath("$.data.samples[0].name").value("Alpha"))
                .andExpect(jsonPath("$.data.samples[0].average").value(70.0))
                .andExpect(jsonPath("$.data.samples[0].count").value(2))
                .andExpect(jsonPath("$.data.samples[0].correct").value(1))
                .andExpect(jsonPath("$.data.samples[1].average").value(95.0))
                .andExpect(jsonPath("$.data.samples[1].correct").value(1));
    }

    // ---------- 辅助 ----------

    private String authentication() {
        return KEY + LocalDate.now(SHANGHAI).format(DateTimeFormatter.BASIC_ISO_DATE);
    }

    private MockHttpSession session(String openid) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("appletOpenId", openid);
        return session;
    }

    private VoteTaste taste(int id, String owner, int status) {
        VoteTaste taste = new VoteTaste();
        taste.setId(id);
        taste.setTasteName("周五盲品");
        taste.setCreateOpenId(owner);
        taste.setStatus(status);
        taste.setCreateTime(new Date());
        return taste;
    }

    private VoteTasteType sample(int id, String name) {
        VoteTasteType sample = new VoteTasteType();
        sample.setId(id);
        sample.setTasteId(5);
        sample.setTasteType(name);
        return sample;
    }

    private VoteTasteScore scoreRow(String openid, int typeId, String typeName, int score, int judge) {
        VoteTasteScore row = new VoteTasteScore();
        row.setOpenId(openid);
        row.setTasteId(5);
        row.setTasteTypeId(typeId);
        row.setTypeName(typeName);
        row.setScore(score);
        row.setJudgeResult(judge);
        row.setCreateTime(new Date());
        return row;
    }

    private VoteTasteUser user(String openid, String nickname) {
        VoteTasteUser user = new VoteTasteUser();
        user.setId(7);
        user.setOpenid(openid);
        user.setNickname(nickname);
        return user;
    }
}
