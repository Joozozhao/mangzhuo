package com.welink.voteadmin.controller;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.welink.vote.common.data.model.VoteTaste;
import com.welink.vote.common.data.model.VoteTasteScore;
import com.welink.vote.common.data.model.VoteTasteType;
import com.welink.vote.common.data.service.IVoteTasteScoreService;
import com.welink.vote.common.data.service.IVoteTasteService;
import com.welink.vote.common.data.service.IVoteTasteTypeService;
import com.welink.vote.common.data.service.IVoteTasteUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * WechatController 新权限规则的 MockMvc 单测：四个服务全部 Mock 并 ReflectionTestUtils 注入，
 * 不连数据库、不发微信请求。旧路径业务拒绝保持 HTTP 200 + R(code!=0,msg)，downloadXls 用状态码。
 */
class WechatControllerSecurityTest {
    private MockMvc mvc;
    private IVoteTasteUserService users;
    private IVoteTasteService tastes;
    private IVoteTasteTypeService types;
    private IVoteTasteScoreService scores;

    @BeforeEach
    void setUp() {
        users = mock(IVoteTasteUserService.class);
        tastes = mock(IVoteTasteService.class);
        types = mock(IVoteTasteTypeService.class);
        scores = mock(IVoteTasteScoreService.class);
        WechatController controller = new WechatController();
        ReflectionTestUtils.setField(controller, "iVoteTasteUserService", users);
        ReflectionTestUtils.setField(controller, "iVoteTasteService", tastes);
        ReflectionTestUtils.setField(controller, "iVoteTasteTypeService", types);
        ReflectionTestUtils.setField(controller, "iVoteTasteScoreService", scores);
        ReflectionTestUtils.setField(controller, "secretKey", "unit-test-secret");
        ReflectionTestUtils.setField(controller, "savePath", "/tmp/");
        mvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    // ---------- 匿名与身份隔离 ----------

    @Test
    void anonymousBusinessPathsReloginWithoutTouchingDb() throws Exception {
        MockHttpServletRequestBuilder[] requests = {
                get("/taste/wechat/tastelist"),
                post("/taste/wechat/uploadImgUrl"),
                post("/taste/wechat/savetastetype"),
                post("/taste/wechat/updatetastestatus").param("id", "5").param("status", "1"),
                post("/taste/wechat/gettaste").param("id", "5"),
                post("/taste/wechat/syncvote").param("id", "5"),
                post("/taste/wechat/updatetastetype").param("id", "5").param("tasteName", "局").param("tasteType", "A,B"),
                post("/taste/wechat/savescore").param("tasteId", "5")
                        .param("typeName", ",-1,-2").param("scoreStr", ",0,100").param("keyStr", ",-1,-2"),
                post("/taste/wechat/gettastetype").param("tasteId", "5"),
                post("/taste/wechat/getcolumns").param("tasteId", "5"),
                post("/taste/wechat/getvotedetail").param("tasteId", "5"),
        };
        for (MockHttpServletRequestBuilder request : requests) {
            mvc.perform(request)
                    .andExpect(status().isOk()) // 旧前端契约：业务拒绝仍是 HTTP 200
                    .andExpect(jsonPath("$.code").value(not(0)))
                    .andExpect(jsonPath("$.msg").value("relogin"));
        }
        // 身份检查必须先于任何查表
        verifyNoInteractions(users, tastes, types, scores);
    }

    @Test
    void appletSessionIsNotAWechatIdentity() throws Exception {
        mvc.perform(post("/taste/wechat/gettaste").param("id", "5").session(appletSession()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(not(0)))
                .andExpect(jsonPath("$.msg").value("relogin"));
        verifyNoInteractions(users, tastes, types, scores);

        mvc.perform(get("/taste/wechat/downloadXls").param("tasteId", "5").session(appletSession()))
                .andExpect(status().isUnauthorized());
    }

    // ---------- downloadXls ----------

    @Test
    void downloadXlsWithoutIdentityIs401() throws Exception {
        mvc.perform(get("/taste/wechat/downloadXls").param("tasteId", "5"))
                .andExpect(status().isUnauthorized());
        verifyNoInteractions(users, tastes, types, scores);
    }

    @Test
    void downloadXlsOngoingIs403EvenForOwner() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        mvc.perform(get("/taste/wechat/downloadXls").param("tasteId", "5").session(session("owner-1")))
                .andExpect(status().isForbidden());
        verify(scores, never()).getScoreList(anyInt());
    }

    @Test
    void downloadXlsEndedStreamsWorkbook() throws Exception {
        VoteTaste closed = taste(7, "owner-1", 1);
        closed.setTasteUrl(null); // 无对应图时不读任何文件
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(closed);
        when(scores.getScoreList(7)).thenReturn(List.of());
        when(types.list(any(QueryWrapper.class))).thenReturn(samples());

        MvcResult result = mvc.perform(get("/taste/wechat/downloadXls").param("tasteId", "7").session(session("participant-1")))
                .andExpect(status().isOk())
                .andReturn();
        assertTrue(result.getResponse().getContentType().contains("spreadsheetml"));
        byte[] body = result.getResponse().getContentAsByteArray();
        assertTrue(body.length > 2 && body[0] == 'P' && body[1] == 'K', "应为有效 xlsx 流");
    }

    // ---------- gettaste 反泄露 ----------

    @Test
    void gettasteOngoingHidesNamesFromParticipant() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(samples());

        mvc.perform(post("/taste/wechat/gettaste").param("id", "5").session(session("participant-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.isShow").value(0))
                // 酒样槽位保留真实 slot id 但不回传名称
                .andExpect(jsonPath("$.data.listVoteTasteType[0].id").value(11))
                .andExpect(jsonPath("$.data.listVoteTasteType[0].tasteType").value(nullValue()))
                .andExpect(jsonPath("$.data.listVoteTasteType[1].id").value(12))
                .andExpect(jsonPath("$.data.listVoteTasteType[1].tasteType").value(nullValue()))
                // 候选按名称排序、负编号，与真实 slot id 无关
                .andExpect(jsonPath("$.data.selectItemsType[0].id").value(-1))
                .andExpect(jsonPath("$.data.selectItemsType[0].tasteType").value("Alpha"))
                .andExpect(jsonPath("$.data.selectItemsType[1].id").value(-2))
                .andExpect(jsonPath("$.data.selectItemsType[1].tasteType").value("Beta"))
                // 对应图与创建者对参与者隐藏
                .andExpect(jsonPath("$.data.tasteUrl").value(nullValue()))
                .andExpect(jsonPath("$.data.createOpenId").value(nullValue()));
    }

    @Test
    void gettasteOngoingOwnerSeesNamesButChoicesStayNegative() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(samples());

        mvc.perform(post("/taste/wechat/gettaste").param("id", "5").session(session("owner-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.isShow").value(1))
                .andExpect(jsonPath("$.data.listVoteTasteType[0].tasteType").value("Beta"))
                .andExpect(jsonPath("$.data.listVoteTasteType[1].tasteType").value("Alpha"))
                .andExpect(jsonPath("$.data.tasteUrl").value("/img/map.png"))
                .andExpect(jsonPath("$.data.createOpenId").value(nullValue()))
                .andExpect(jsonPath("$.data.selectItemsType[0].id").value(-1))
                .andExpect(jsonPath("$.data.selectItemsType[1].id").value(-2));
    }

    @Test
    void gettasteEndedRevealsNamesToParticipant() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 1));
        when(types.list(any(QueryWrapper.class))).thenReturn(samples());

        mvc.perform(post("/taste/wechat/gettaste").param("id", "5").session(session("participant-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data.listVoteTasteType[0].tasteType").value("Beta"))
                .andExpect(jsonPath("$.data.listVoteTasteType[1].tasteType").value("Alpha"))
                .andExpect(jsonPath("$.data.tasteUrl").value("/img/map.png"));
    }

    // ---------- syncvote 反泄露 ----------

    @Test
    void syncvoteReturnsOnlyGuessAndScoreWithoutLeakingJudge() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        VoteTasteScore stored = new VoteTasteScore();
        stored.setId(555);
        stored.setTasteId(5);
        stored.setTasteTypeId(11); // 答题槽位 id，不是猜中酒样的真实 id
        stored.setOpenId("participant-1");
        stored.setTypeName("Alpha");
        stored.setScore(88);
        stored.setJudgeResult(1);
        stored.setCreateTime(new Date());
        when(scores.list(any(QueryWrapper.class))).thenReturn(List.of(stored));

        mvc.perform(post("/taste/wechat/syncvote").param("id", "5").session(session("participant-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0))
                .andExpect(jsonPath("$.data[0].tasteTypeId").value(11)) // 保留答题槽位 id，不重写
                .andExpect(jsonPath("$.data[0].typeName").value("Alpha"))
                .andExpect(jsonPath("$.data[0].score").value(88))
                .andExpect(jsonPath("$.data[0].judgeResult").value(0)) // 不回传判定结果
                .andExpect(jsonPath("$.data[0].id").value(0))
                .andExpect(jsonPath("$.data[0].openId").value(nullValue()));
    }

    // ---------- updatetastestatus ----------

    @Test
    void updatetastestatusRejectsNonOwner() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        mvc.perform(post("/taste/wechat/updatetastestatus").param("id", "5").param("status", "1")
                        .session(session("participant-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(not(0)))
                .andExpect(jsonPath("$.msg").value("只有主持人可以结束品鉴"));
        verify(tastes, never()).updateById(any());
    }

    @Test
    void updatetastestatusForbidsReopen() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        mvc.perform(post("/taste/wechat/updatetastestatus").param("id", "5").param("status", "0")
                        .session(session("owner-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(not(0)))
                .andExpect(jsonPath("$.msg").value("结束后不能重新开启品鉴"));
        verify(tastes, never()).updateById(any());
    }

    @Test
    void updatetastestatusOwnerClosesWithRowLock() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        when(tastes.updateById(any(VoteTaste.class))).thenReturn(true);

        mvc.perform(post("/taste/wechat/updatetastestatus").param("id", "5").param("status", "1")
                        .session(session("owner-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));

        ArgumentCaptor<QueryWrapper> query = ArgumentCaptor.forClass(QueryWrapper.class);
        verify(tastes).getOne(query.capture());
        assertTrue(query.getValue().getSqlSegment().contains("FOR UPDATE"), "写路径查活动应加行锁");
        ArgumentCaptor<VoteTaste> updated = ArgumentCaptor.forClass(VoteTaste.class);
        verify(tastes).updateById(updated.capture());
        assertEquals(1, updated.getValue().getStatus());
        assertEquals(5, updated.getValue().getId());
    }

    @Test
    void updatetastestatusRepeatCloseIsIdempotent() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 1));
        mvc.perform(post("/taste/wechat/updatetastestatus").param("id", "5").param("status", "1")
                        .session(session("owner-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));
        verify(tastes, never()).updateById(any());
    }

    // ---------- updatetastetype ----------

    @Test
    void updatetastetypeRejectsNonOwner() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        mvc.perform(post("/taste/wechat/updatetastetype").param("id", "5")
                        .param("tasteName", "新局").param("tasteType", "C,D").session(session("participant-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(not(0)))
                .andExpect(jsonPath("$.msg").value("只有主持人可以修改品鉴"));
        verify(tastes, never()).updateById(any());
        verify(types, never()).saveBatch(anyList());
    }

    @Test
    void updatetastetypeRejectsEndedTaste() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 1));
        mvc.perform(post("/taste/wechat/updatetastetype").param("id", "5")
                        .param("tasteName", "新局").param("tasteType", "C,D").session(session("owner-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(not(0)))
                .andExpect(jsonPath("$.msg").value("品鉴已结束，不能修改酒样"));
        verify(types, never()).saveBatch(anyList());
    }

    @Test
    void updatetastetypeRejectsWhenScoresExist() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        when(scores.count(any(QueryWrapper.class))).thenReturn(1L);
        mvc.perform(post("/taste/wechat/updatetastetype").param("id", "5")
                        .param("tasteName", "新局").param("tasteType", "C,D").session(session("owner-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(not(0)))
                .andExpect(jsonPath("$.msg").value("已有评分，不能修改酒样"));
        verify(tastes, never()).updateById(any());
        verify(types, never()).saveBatch(anyList());
    }

    @Test
    void updatetastetypeValidatesWineNames() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        mvc.perform(post("/taste/wechat/updatetastetype").param("id", "5")
                        .param("tasteName", "新局").param("tasteType", "A,A").session(session("owner-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(not(0)))
                .andExpect(jsonPath("$.msg").value("请填写 2 至 20 个不同酒名"));
        verify(types, never()).saveBatch(anyList());
    }

    // ---------- savescore ----------

    @Test
    void savescoreRejectsEndedTaste() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 1));
        mvc.perform(post("/taste/wechat/savescore").param("tasteId", "5")
                        .param("typeName", ",-1,-2").param("scoreStr", ",0,100").param("keyStr", ",-1,-2")
                        .session(session("participant-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(not(0)))
                .andExpect(jsonPath("$.msg").value("品鉴已结束，不能再修改评分"));
        verify(scores, never()).saveBatch(anyList());
    }

    @Test
    void savescoreRejectsIncompleteAnswers() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(samples());
        mvc.perform(post("/taste/wechat/savescore").param("tasteId", "5")
                        .param("typeName", ",-1").param("scoreStr", ",90").param("keyStr", ",-1")
                        .session(session("participant-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(not(0)))
                .andExpect(jsonPath("$.msg").value("请完成全部酒样的判断和评分"));
        verify(scores, never()).saveBatch(anyList());
    }

    @Test
    void savescoreRejectsNonIntegerOrOutOfRangeScore() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(samples());
        String[][] bodies = {{",11,12", ",Alpha,Beta", ",0,101"}, {",11,12", ",Alpha,Beta", ",1.5,50"}};
        for (String[] body : bodies) {
            mvc.perform(post("/taste/wechat/savescore").param("tasteId", "5")
                            .param("keyStr", body[0]).param("typeName", body[1]).param("scoreStr", body[2])
                            .session(session("participant-1")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(not(0)))
                    .andExpect(jsonPath("$.msg").value("分数须为 0 至 100 的整数"));
        }
        verify(scores, never()).saveBatch(anyList());
    }

    @Test
    void savescoreRejectsUnknownNegativeCandidate() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(samples());
        mvc.perform(post("/taste/wechat/savescore").param("tasteId", "5")
                        .param("typeName", ",-3,-1").param("scoreStr", ",50,60").param("keyStr", ",-3,-1")
                        .session(session("participant-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(not(0)))
                .andExpect(jsonPath("$.msg").value("酒名无效，请刷新页面重试"));
        verify(scores, never()).saveBatch(anyList());
    }

    @Test
    void savescoreRejectsCrossTasteUnorderedOrUnknownPositiveProtocol() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(samples());
        String[][] bodies = {
                {",11,99", ",Beta,Alpha"},   // 跨局正 ID
                {",12,11", ",Alpha,Beta"},   // 乱序正 ID
                {",11,12", ",Beta,NotAWine"},// 非本局候选酒名
        };
        for (String[] body : bodies) {
            mvc.perform(post("/taste/wechat/savescore").param("tasteId", "5")
                            .param("keyStr", body[0]).param("typeName", body[1]).param("scoreStr", ",50,60")
                            .session(session("participant-1")))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.code").value(not(0)))
                    .andExpect(jsonPath("$.msg").value("酒名或编号无效"));
        }
        verify(scores, never()).saveBatch(anyList());
    }

    @Test
    void savescoreNegativeCandidatesMapToSortedNamesAndServerSideJudge() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(samples());
        when(scores.saveBatch(anyList())).thenReturn(true);

        // 候选按名称排序：-1=Alpha, -2=Beta；槽位按 id 升序：11=Beta, 12=Alpha
        mvc.perform(post("/taste/wechat/savescore").param("tasteId", "5")
                        .param("typeName", ",-2,-2") // typeName 仅兼容，不参与关联
                        .param("scoreStr", ",0,100") // 合法边界 0 与 100
                        .param("keyStr", ",-2,-2")
                        .session(session("participant-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));

        // 先删本人旧评分再批量写入
        InOrder order = inOrder(scores);
        order.verify(scores).remove(any(QueryWrapper.class));
        order.verify(scores).saveBatch(anyList());

        ArgumentCaptor<List<VoteTasteScore>> saved = ArgumentCaptor.forClass(List.class);
        verify(scores).saveBatch(saved.capture());
        List<VoteTasteScore> rows = saved.getValue();
        assertEquals(2, rows.size());
        assertEquals(11, rows.get(0).getTasteTypeId());
        assertEquals("Beta", rows.get(0).getTypeName());
        assertEquals(0, rows.get(0).getScore());
        assertEquals(1, rows.get(0).getJudgeResult()); // 槽位 11 真名 Beta，猜 Beta 判对
        assertEquals("participant-1", rows.get(0).getOpenId());
        assertEquals(12, rows.get(1).getTasteTypeId());
        assertEquals("Beta", rows.get(1).getTypeName());
        assertEquals(100, rows.get(1).getScore());
        assertEquals(0, rows.get(1).getJudgeResult()); // 槽位 12 真名 Alpha，猜 Beta 判错
    }

    @Test
    void savescorePositiveSlotIdsWithTypedNamesAccepted() throws Exception {
        when(tastes.getOne(any(QueryWrapper.class))).thenReturn(taste(5, "owner-1", 0));
        when(types.list(any(QueryWrapper.class))).thenReturn(samples());
        when(scores.saveBatch(anyList())).thenReturn(true);

        // layui 旧页面协议：按槽位升序的真实 slot id + 手填候选酒名
        mvc.perform(post("/taste/wechat/savescore").param("tasteId", "5")
                        .param("keyStr", ",11,12").param("typeName", ",Beta,Alpha").param("scoreStr", ",0,100")
                        .session(session("participant-1")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(0));

        ArgumentCaptor<List<VoteTasteScore>> saved = ArgumentCaptor.forClass(List.class);
        verify(scores).saveBatch(saved.capture());
        List<VoteTasteScore> rows = saved.getValue();
        assertEquals(2, rows.size());
        assertEquals(11, rows.get(0).getTasteTypeId());
        assertEquals("Beta", rows.get(0).getTypeName());
        assertEquals(1, rows.get(0).getJudgeResult());
        assertEquals(12, rows.get(1).getTasteTypeId());
        assertEquals("Alpha", rows.get(1).getTypeName());
        assertEquals(1, rows.get(1).getJudgeResult());
    }

    // ---------- 夹具 ----------

    private static MockHttpSession session(String openId) {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("openId", openId);
        return session;
    }

    private static MockHttpSession appletSession() {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("appletOpenId", "applet-user-1");
        return session;
    }

    private static VoteTaste taste(int id, String owner, int status) {
        VoteTaste taste = new VoteTaste();
        taste.setId(id);
        taste.setCreateOpenId(owner);
        taste.setStatus(status);
        taste.setTasteName("盲品局");
        taste.setImgUrl("/img/cover.png");
        taste.setTasteUrl("/img/map.png");
        taste.setCreateTime(new Date());
        return taste;
    }

    private static VoteTasteType type(int id, String name) {
        VoteTasteType type = new VoteTasteType();
        type.setId(id);
        type.setTasteId(5);
        type.setTasteType(name);
        return type;
    }

    private static List<VoteTasteType> samples() {
        // 每次返回新对象，避免控制器或上一用例修改造成状态污染
        return new ArrayList<>(List.of(type(11, "Beta"), type(12, "Alpha")));
    }
}
