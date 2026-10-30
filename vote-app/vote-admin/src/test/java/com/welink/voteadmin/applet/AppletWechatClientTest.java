package com.welink.voteadmin.applet;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 微信客户端的入参校验单测：只覆盖发网络请求之前的分支，不访问微信服务器。
 */
class AppletWechatClientTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void unconfiguredCredentialsReturn503() {
        AppletWechatClient client = new AppletWechatClient("", "", mapper);
        ResponseStatusException e = assertThrows(ResponseStatusException.class, () -> client.exchange("any-code"));
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, e.getStatusCode());
    }

    @Test
    void blankCodeReturns400() {
        AppletWechatClient client = new AppletWechatClient("app-id", "app-secret", mapper);
        ResponseStatusException e = assertThrows(ResponseStatusException.class, () -> client.exchange("  "));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
    }

    @Test
    void nullCodeReturns400() {
        AppletWechatClient client = new AppletWechatClient("app-id", "app-secret", mapper);
        ResponseStatusException e = assertThrows(ResponseStatusException.class, () -> client.exchange(null));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
    }

    @Test
    void overlongCodeReturns400() {
        AppletWechatClient client = new AppletWechatClient("app-id", "app-secret", mapper);
        ResponseStatusException e = assertThrows(ResponseStatusException.class, () -> client.exchange("x".repeat(257)));
        assertEquals(HttpStatus.BAD_REQUEST, e.getStatusCode());
    }
}
