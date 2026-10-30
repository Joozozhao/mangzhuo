package com.welink.vote.common.core.response;

import cn.hutool.core.util.ObjectUtil;

import java.util.Arrays;
import java.util.Objects;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.Predicate;

public class ReturnOptional<T> {
    /**
     * 状态码为成功
     */
    public static final Predicate<R<?>> CODE_SUCCESS = r -> ResponseEnum.SUCCESS.getCode() == r.getCode();

    /**
     * 数据有值
     */
    public static final Predicate<R<?>> HAS_DATA = r -> ObjectUtil.isNotEmpty(r.getData());

    /**
     * 数据有值,并且包含元素
     */
    public static final Predicate<R<?>> HAS_ELEMENT = r -> ObjectUtil.isNotEmpty(r.getData());

    /**
     * 状态码为成功并且有值
     */
    public static final Predicate<R<?>> DATA_AVAILABLE = CODE_SUCCESS.and(HAS_DATA);

    private final R<T> original;

    ReturnOptional(R<T> original) {
        this.original = original;
    }

    public static <T> ReturnOptional<T> of(R<T> original) {
        return new ReturnOptional<>(Objects.requireNonNull(original));
    }

    /**
     * 观察原始值
     *
     * @return R
     */
    public R<T> peek() {
        return original;
    }

    /**
     * 读取{@code code}的值
     *
     * @return 返回code的值
     */
    public int getCode() {
        return original.getCode();
    }

    /**
     * 读取{@code data}的值
     *
     * @return 返回 Optional 包装的data
     */
    public Optional<T> getData() {
        return Optional.ofNullable(original.getData());
    }

    /**
     * 有条件地读取{@code data}的值
     *
     * @param predicate 断言函数
     * @return 返回 Optional 包装的data,如果断言失败返回empty
     */
    public Optional<T> getDataIf(Predicate<? super R<?>> predicate) {
        return predicate.test(original) ? getData() : Optional.empty();
    }

    /**
     * 读取{@code msg}的值
     *
     * @return 返回Optional包装的 msg
     */
    public Optional<String> getMsg() {
        return Optional.of(original.getMsg());
    }

    /**
     * 对{@code code}的值进行相等性测试
     *
     * @param value 基准值
     * @return 返回ture表示相等
     */
    public boolean codeEquals(int value) {
        return original.getCode() == value;
    }

    /**
     * 对{@code code}的值进行相等性测试
     *
     * @param value 基准值
     * @return 返回ture表示不相等
     */
    public boolean codeNotEquals(int value) {
        return !codeEquals(value);
    }

    /**
     * 是否成功
     *
     * @return 返回ture表示成功
     */
    public boolean isSuccess() {
        return codeEquals(ResponseEnum.SUCCESS.getCode());
    }

    /**
     * 是否失败
     *
     * @return 返回ture表示失败
     */
    public boolean notSuccess() {
        return !isSuccess();
    }

    /**
     * 断言{@code code}的值
     *
     * @param expect 预期的值
     * @param func   用户函数,负责创建异常对象
     * @param <Ex>   异常类型
     * @return 返回实例，以便于继续进行链式操作
     * @throws Ex 断言失败时抛出
     */
    public <Ex extends Exception> ReturnOptional<T> assertCode(int expect, Function<? super R<T>, ? extends Ex> func)
            throws Ex {
        if (codeNotEquals(expect)) {
            throw func.apply(original);
        }
        return this;
    }

    /**
     * 断言成功
     *
     * @param func 用户函数,负责创建异常对象
     * @param <Ex> 异常类型
     * @return 返回实例，以便于继续进行链式操作
     * @throws Ex 断言失败时抛出
     */
    public <Ex extends Exception> ReturnOptional<T> assertSuccess(Function<? super R<T>, ? extends Ex> func) throws Ex {
        return assertCode(ResponseEnum.SUCCESS.getCode(), func);
    }

    /**
     * 断言业务数据有值
     *
     * @param func 用户函数,负责创建异常对象
     * @param <Ex> 异常类型
     * @return 返回实例，以便于继续进行链式操作
     * @throws Ex 断言失败时抛出
     */
    public <Ex extends Exception> ReturnOptional<T> assertDataNotNull(Function<? super R<T>, ? extends Ex> func) throws Ex {
        if (Objects.isNull(original.getData())) {
            throw func.apply(original);
        }
        return this;
    }

    /**
     * 断言业务数据有值,并且包含元素
     *
     * @param func 用户函数,负责创建异常对象
     * @param <Ex> 异常类型
     * @return 返回实例，以便于继续进行链式操作
     * @throws Ex 断言失败时抛出
     */
    public <Ex extends Exception> ReturnOptional<T> assertDataNotEmpty(Function<? super R<T>, ? extends Ex> func) throws Ex {
        if (ObjectUtil.isNotEmpty(original.getData())) {
            throw func.apply(original);
        }
        return this;
    }

    /**
     * 对业务数据(data)转换
     *
     * @param mapper 业务数据转换函数
     * @param <U>    数据类型
     * @return 返回新实例，以便于继续进行链式操作
     */
    public <U> ReturnOptional<U> map(Function<? super T, ? extends U> mapper) {
        R<U> result = R.restResult(mapper.apply(original.getData()), original.getCode(), original.getMsg(), original.getCount());
        return of(result);
    }

    /**
     * 对业务数据(data)转换
     *
     * @param predicate 断言函数
     * @param mapper    业务数据转换函数
     * @param <U>       数据类型
     * @return 返回新实例，以便于继续进行链式操作
     * @see ReturnOptional#CODE_SUCCESS
     * @see ReturnOptional#HAS_DATA
     * @see ReturnOptional#HAS_ELEMENT
     * @see ReturnOptional#DATA_AVAILABLE
     */
    public <U> ReturnOptional<U> mapIf(Predicate<? super R<T>> predicate, Function<? super T, ? extends U> mapper) {
        R<U> result = R.restResult(mapper.apply(original.getData()), original.getCode(), original.getMsg(), original.getCount());
        return of(result);
    }

    /**
     * 消费数据,注意此方法保证数据可用
     *
     * @param consumer 消费函数
     */
    public void useData(Consumer<? super T> consumer) {
        consumer.accept(original.getData());
    }

    /**
     * 条件消费(错误代码匹配某个值)
     *
     * @param consumer 消费函数
     * @param codes    错误代码集合,匹配任意一个则调用消费函数
     */
    public void useDataOnCode(Consumer<? super T> consumer, int... codes) {
        useDataIf(o -> Arrays.stream(codes).filter(c -> original.getCode() == c).findFirst().isPresent(), consumer);
    }

    /**
     * 条件消费(错误代码表示成功)
     *
     * @param consumer 消费函数
     */
    public void useDataIfSuccess(Consumer<? super T> consumer) {
        useDataIf(CODE_SUCCESS, consumer);
    }

    /**
     * 条件消费
     *
     * @param predicate 断言函数
     * @param consumer  消费函数,断言函数返回{@code true}时被调用
     * @see ReturnOptional#CODE_SUCCESS
     * @see ReturnOptional#HAS_DATA
     * @see ReturnOptional#HAS_ELEMENT
     * @see ReturnOptional#DATA_AVAILABLE
     */
    public void useDataIf(Predicate<? super R<T>> predicate, Consumer<? super T> consumer) {
        if (predicate.test(original)) {
            consumer.accept(original.getData());
        }
    }
}
