package com.welink.voteadmin.controller;

import com.welink.vote.common.data.model.VoteTasteUser;
import com.welink.vote.common.data.service.IVoteTasteUserService;
import com.welink.voteadmin.common.HttpUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.MockedStatic;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** 微信 HTTP 全部替身，不调用真实公众号授权服务。 */
class WechatOAuthTest {
    private IVoteTasteUserService users;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        users = mock(IVoteTasteUserService.class);
        WechatController controller = new WechatController();
        ReflectionTestUtils.setField(controller, "iVoteTasteUserService", users);
        ReflectionTestUtils.setField(controller, "appId", "test-app");
        ReflectionTestUtils.setField(controller, "appSecret", "test-secret");
        ReflectionTestUtils.setField(controller, "getOpenIdUrl", "https://wechat.invalid/token");
        ReflectionTestUtils.setField(controller, "getUserByOpenId", "https://wechat.invalid/user");
        mvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void firstLoginUsesNewlySavedUserAndRotatesSession() throws Exception {
        MockHttpSession session = new MockHttpSession();
        String previousId = session.getId();
        session.setAttribute("appletOpenId", "unrelated-applet-user");
        when(users.save(any(VoteTasteUser.class))).thenReturn(true);
        try (MockedStatic<HttpUtils> http = mockStatic(HttpUtils.class)) {
            http.when(() -> HttpUtils.sendGet(eq("https://wechat.invalid/token"), anyMap()))
                    .thenReturn("{\"openid\":\"oauth-new-user\",\"access_token\":\"test-token\",\"errcode\":0}");
            http.when(() -> HttpUtils.sendGet(eq("https://wechat.invalid/user"), anyMap()))
                    .thenReturn("{\"openid\":\"oauth-new-user\",\"nickname\":\"测试用户\"}");
            MvcResult result = mvc.perform(get("/taste/wechat/getCode").session(session).param("code", "temporary-code"))
                    .andExpect(status().isFound())
                    .andExpect(redirectedUrl("/page/tasteindex.html"))
                    .andReturn();
            assertEquals("oauth-new-user", result.getRequest().getSession(false).getAttribute("openId"));
            assertNull(session.getAttribute("appletOpenId"));
            assertNotEquals(previousId, session.getId());
            verify(users).save(argThat(u -> "oauth-new-user".equals(u.getOpenid())));
        }
    }

    @Test
    void returningUserAlsoRotatesSessionWithoutFetchingProfile() throws Exception {
        VoteTasteUser existing = new VoteTasteUser();
        existing.setOpenid("oauth-existing");
        when(users.getOne(any())).thenReturn(existing);
        MockHttpSession session = new MockHttpSession();
        String previousId = session.getId();
        try (MockedStatic<HttpUtils> http = mockStatic(HttpUtils.class)) {
            http.when(() -> HttpUtils.sendGet(eq("https://wechat.invalid/token"), anyMap()))
                    .thenReturn("{\"openid\":\"oauth-existing\",\"access_token\":\"test-token\",\"errcode\":0}");
            mvc.perform(get("/taste/wechat/getCode").session(session).param("code", "temporary-code"))
                    .andExpect(status().isFound());
            assertEquals("oauth-existing", session.getAttribute("openId"));
            assertNotEquals(previousId, session.getId());
            verify(users, never()).save(any());
            http.verify(() -> HttpUtils.sendGet(eq("https://wechat.invalid/user"), anyMap()), never());
        }
    }
}
