package com.welink.voteadmin.common;

import java.io.UnsupportedEncodingException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

public class Md5Util {
    private final static char[] DIGIT = { '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F' };
	/**
     * 对字符串进行MD5摘要加密，返回结果与MySQL的MD5函数一致
     * @param str
     * @return 返回值中的字母为小写
     */
    public static String md5(String str) {
        String sgin = "";
    	MessageDigest md5;
        try {
            md5 = MessageDigest.getInstance("MD5");
            md5.reset();
            md5.update(str.getBytes("UTF-8"));
            sgin = byteToStr(md5.digest()).toUpperCase();
        } catch (NoSuchAlgorithmException e) {
            e.printStackTrace();
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
        }
        return sgin;
    }

    /**
     * 对字符串进行sha256加密
     * @param str
     * @return
     */
    public static String getSHA256(String str){
        MessageDigest messageDigest;
        String result = "";
        try{
            messageDigest = MessageDigest.getInstance("SHA-256");
            messageDigest.update(str.getBytes("UTF-8"));
            result = byteToStr(messageDigest.digest());
        }catch (Exception ex){
            ex.printStackTrace();
        }
        return result;
    }

    /**
     * 将字节数组转换为十六进制字符串
     * @param byteArray
     * @return
     */
    private static String byteToStr(byte[] byteArray) {
        String strDigest = "";
        for (int i = 0; i < byteArray.length; i++) {
            strDigest += byteToHexStr(byteArray[i]);
        }
        return strDigest;
    }
    /**
     * 将字节转换为十六进制字符串
     * @param bytes
     * @return
     */
    private static String byteToHexStr(byte bytes) {
        char[] tempArr = new char[2];
        tempArr[0] = DIGIT[(bytes >>> 4) & 0X0F];
        tempArr[1] = DIGIT[bytes & 0X0F];
        return new String(tempArr);
    }
    /*public static void main(String[] args) {
    	System.out.println(md5("qwer1234asdf"));
	}*/
}
