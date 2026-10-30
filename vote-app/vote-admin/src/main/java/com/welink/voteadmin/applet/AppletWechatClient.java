package com.welink.voteadmin.applet;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/** 小程序凭证与公众号凭证分开配置；不记录包含 secret/code 的请求地址。 */
@Component
public class AppletWechatClient {
    private final String appId;
    private final String appSecret;
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();

    public AppletWechatClient(@Value("${applet.app-id:}") String appId,
                              @Value("${applet.app-secret:}") String appSecret,
                              ObjectMapper mapper) {
        this.appId = appId;
        this.appSecret = appSecret;
        this.mapper = mapper;
    }

    public String exchange(String code) {
        if (appId.isBlank() || appSecret.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "小程序登录尚未配置");
        }
        if (code == null || code.isBlank() || code.length() > 256) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "缺少有效的微信登录凭证");
        }
        String query = "appid=" + encode(appId) + "&secret=" + encode(appSecret)
                + "&js_code=" + encode(code) + "&grant_type=authorization_code";
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://api.weixin.qq.com/sns/jscode2session?" + query))
                    .timeout(Duration.ofSeconds(10)).GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode data = mapper.readTree(response.body());
            if (response.statusCode() != 200 || data.path("errcode").asInt(0) != 0
                    || data.path("openid").asText("").isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "微信登录凭证校验失败，请重新登录");
            }
            // session_key 永远不返回给客户端，也不复用公众号的 openid。
            return data.get("openid").asText();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "微信登录暂不可用");
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "微信登录暂不可用");
        }
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
