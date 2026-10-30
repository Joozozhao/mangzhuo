package com.welink.vote.common.core.response;

import lombok.*;
import lombok.experimental.Accessors;

import java.io.Serial;
import java.io.Serializable;

@ToString
@NoArgsConstructor
@AllArgsConstructor
@Accessors(chain = true)
public class R<T> implements Serializable {
    @Serial
    private static final long serialVersionUID = 1L;

    @Getter
    @Setter
    private int code;

    @Getter
    @Setter
    private String msg;

    @Getter
    @Setter
    private long count = 0;

    @Getter
    @Setter
    private T data;

    public static <T> R<T> ok() {
        return restResult(null, ResponseEnum.SUCCESS.getCode(), ResponseEnum.SUCCESS.getMessage(), 0);
    }

    public static <T> R<T> ok(T data) {
        return restResult(data, ResponseEnum.SUCCESS.getCode(), ResponseEnum.SUCCESS.getMessage(), 0L);
    }

    public static <T> R<T> ok(T data, String msg) {
        return restResult(data, ResponseEnum.SUCCESS.getCode(), msg, 0L);
    }

    public static <T> R<T> ok(T data, long count) {
        return restResult(data, ResponseEnum.SUCCESS.getCode(), ResponseEnum.SUCCESS.getMessage(), count);
    }

    public static <T> R<T> failed() {
        return restResult(null, ResponseEnum.COMMON_FAILED.getCode(), ResponseEnum.SUCCESS.getMessage(), 0L);
    }

    public static <T> R<T> failed(String msg) {
        return restResult(null, ResponseEnum.COMMON_FAILED.getCode(), msg, 0L);
    }

    public static <T> R<T> failed(T data) {
        return restResult(data, ResponseEnum.COMMON_FAILED.getCode(), ResponseEnum.COMMON_FAILED.getMessage(), 0L);
    }

    public static <T> R<T> failed(T data, String msg) {
        return restResult(data, ResponseEnum.COMMON_FAILED.getCode(), msg, 0L);
    }

    public static <T> R<T> restResult(T data, int code, String msg, long count) {
        R<T> apiResult = new R<>();
        apiResult.setCode(code);
        apiResult.setData(data);
        apiResult.setMsg(msg);
        apiResult.setCount(count);
        return apiResult;
    }
}
