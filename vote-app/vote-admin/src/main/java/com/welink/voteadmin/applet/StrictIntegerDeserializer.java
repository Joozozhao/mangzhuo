package com.welink.voteadmin.applet;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;

import java.io.IOException;

/**
 * 只接受 JSON 整数值。Jackson 默认开启 ACCEPT_FLOAT_AS_INT，会把 1.5 静默截断成 1，
 * 评分接口必须整体拒绝小数、字符串等非整数输入（反序列化失败统一按 400 处理）。
 */
class StrictIntegerDeserializer extends JsonDeserializer<Integer> {
    @Override
    public Integer deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        if (p.currentToken() == JsonToken.VALUE_NUMBER_INT) {
            return p.getIntValue(); // 超出 int 范围时抛出 InputCoercionException，按 400 处理
        }
        if (p.currentToken() == JsonToken.VALUE_NULL) {
            return null; // 交卷字段的空值由业务校验给出 400 提示
        }
        throw InvalidFormatException.from(p, "必须是 JSON 整数", p.getValueAsString(), Integer.class);
    }
}
