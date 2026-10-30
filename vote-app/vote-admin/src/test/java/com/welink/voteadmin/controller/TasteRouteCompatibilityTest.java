package com.welink.voteadmin.controller;

import com.welink.vote.common.data.model.*;
import com.welink.vote.common.data.service.*;
import com.welink.voteadmin.applet.AppletController;
import com.welink.voteadmin.applet.AppletWechatClient;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** 两组路由共享同一组服务替身，验证原生端关闭后公众号不能继续写入。 */
class TasteRouteCompatibilityTest {
    @Test
    void nativeCloseRevealsLegacyReadButStopsBothScoringRoutes() throws Exception {
        IVoteTasteUserService users = mock(IVoteTasteUserService.class);
        IVoteTasteService tastes = mock(IVoteTasteService.class);
        IVoteTasteTypeService types = mock(IVoteTasteTypeService.class);
        IVoteTasteScoreService scores = mock(IVoteTasteScoreService.class);
        VoteTaste taste = new VoteTaste();
        taste.setId(7); taste.setTasteName("共用品鉴"); taste.setCreateOpenId("native-owner");
        taste.setStatus(0); taste.setTasteUrl("/upload/correspondence.png");
        VoteTasteType first = new VoteTasteType();
        first.setId(11); first.setTasteId(7); first.setTasteType("Beta");
        VoteTasteType second = new VoteTasteType();
        second.setId(12); second.setTasteId(7); second.setTasteType("Alpha");
        when(tastes.getOne(any())).thenReturn(taste);
        when(tastes.updateById(any())).thenReturn(true);
        when(types.list(any())).thenReturn(List.of(first, second));

        WechatController legacy = new WechatController();
        ReflectionTestUtils.setField(legacy, "iVoteTasteUserService", users);
        ReflectionTestUtils.setField(legacy, "iVoteTasteService", tastes);
        ReflectionTestUtils.setField(legacy, "iVoteTasteTypeService", types);
        ReflectionTestUtils.setField(legacy, "iVoteTasteScoreService", scores);
        AppletController applet = new AppletController(mock(AppletWechatClient.class), users, tastes, types, scores, "test-key");
        MockMvc mvc = MockMvcBuilders.standaloneSetup(legacy, applet).build();
        MockHttpSession publicSession = new MockHttpSession();
        publicSession.setAttribute("openId", "public-participant");
        MockHttpSession nativeSession = new MockHttpSession();
        nativeSession.setAttribute("appletOpenId", "native-owner");

        mvc.perform(post("/taste/wechat/gettaste").session(publicSession).param("id", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.listVoteTasteType[0].tasteType").isEmpty())
                .andExpect(jsonPath("$.data.tasteUrl").isEmpty())
                .andExpect(jsonPath("$.data.selectItemsType[0].id").value(-1))
                .andExpect(jsonPath("$.data.selectItemsType[0].tasteType").value("Alpha"));

        mvc.perform(post("/taste/applet/tastes/7/close").session(nativeSession))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value(1));
        mvc.perform(post("/taste/wechat/gettaste").session(publicSession).param("id", "7"))
                .andExpect(jsonPath("$.data.listVoteTasteType[0].tasteType").value("Beta"));
        mvc.perform(post("/taste/wechat/savescore").session(publicSession)
                        .param("tasteId", "7").param("keyStr", ",-1,-2")
                        .param("scoreStr", ",0,100").param("typeName", ",-1,-2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.not(0)));
        mvc.perform(post("/taste/applet/tastes/7/scores").session(nativeSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":[{\"sampleId\":11,\"guessedName\":\"Alpha\",\"score\":0},{\"sampleId\":12,\"guessedName\":\"Beta\",\"score\":100}]}"))
                .andExpect(status().isConflict());
        verifyNoInteractions(scores);
    }
}
