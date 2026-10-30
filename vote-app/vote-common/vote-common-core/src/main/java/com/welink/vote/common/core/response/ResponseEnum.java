package com.welink.vote.common.core.response;

public enum ResponseEnum implements IResponseEnum {
    /**
     * 接口调用成功
     */
    SUCCESS(0, "接口调用成功"),
    /**
     * 参数校验失败
     */
    VALIDATE_FAILED(1001, "参数校验失败"),
    /**
     * 接口调用失败
     */
    COMMON_FAILED(1002, "接口调用失败"),
    /**
     *  没有权限访问资源
     */
    FORBIDDEN(1003, "您无操作该条数据的权限！"),
    /**
     * 登录过期
     */
    LOGIN_FAILURE(1004, "登录过期，请重新登录！"),
    /**
     * 无列表数据
     */
    NOT_DATA(1005, "暂无数据信息！"),
    /**
     * 无数据信息
     */
    DATA_NOT_EXIST(1006, "无该条数据信息！");

    ResponseEnum(int code, String message) {
        this.code = code;
        this.message = message;
    }
    /**
     * 状态码
     */
    private final int code;
    /**
     * 信息
     */
    private final String message;

    @Override
    public int getCode() {
        return this.code;
    }

    @Override
    public String getMessage() {
        return this.message;
    }

    @Override
    public String toString() {
        return this.message;
    }
}
