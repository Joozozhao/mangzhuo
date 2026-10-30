package com.welink.voteadmin.common;

import io.micrometer.common.util.StringUtils;
import org.apache.http.client.HttpClient;
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * 用于模拟HTTP请求中GET/POST方式
 * @author Anyubo
 *
 */
public class HttpUtils {

	/** 
     * 发送GET请求 
     *  
     * @param url 
     *            目的地址 
     * @param parameters 
     *            请求参数，Map类型。 
     * @return 远程响应结果 
     */  
    public static String sendGet(String url, Map<String, String> parameters) { 
        String result="";
        BufferedReader in = null;// 读取响应输入流  
        StringBuffer sb = new StringBuffer();// 存储参数  
        String params = "";// 编码之后的参数
        try {
            // 编码请求参数
            String full_url = url;
            if(parameters.size()>0){
                if(parameters.size()==1){
                    for(String name:parameters.keySet()){
                        sb.append(name).append("=").append(
                                java.net.URLEncoder.encode(parameters.get(name),
                                        "UTF-8"));
                    }
                    params=sb.toString();
                }else{
                    for (String name : parameters.keySet()) {
                        sb.append(name).append("=").append(
                                java.net.URLEncoder.encode(parameters.get(name),
                                        "UTF-8")).append("&");
                    }
                    String temp_params = sb.toString();
                    params = temp_params.substring(0, temp_params.length() - 1);
                }
                full_url = url + "?" + params;
            }
            // 创建URL对象  
            URL connURL = new URL(full_url);
            // 打开URL连接  
            HttpURLConnection httpConn = (HttpURLConnection) connURL
                    .openConnection();  
            // 设置通用属性  
            httpConn.setRequestProperty("Accept", "*/*");  
            httpConn.setRequestProperty("Connection", "Keep-Alive");  
            httpConn.setRequestProperty("User-Agent",  
                    "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)");  
            // 建立实际的连接  
            httpConn.connect();  
            // 响应头部获取  
            /*
            Map<String, List<String>> headers = httpConn.getHeaderFields();  
            // 遍历所有的响应头字段  
			 * for (String key : headers.keySet()) { System.out.println(key + "\t：\t" +
			 * headers.get(key)); }
			 */  
            // 定义BufferedReader输入流来读取URL的响应,并设置编码方式  
            in = new BufferedReader(new InputStreamReader(httpConn  
                    .getInputStream(), "UTF-8"));  
            String line;  
            // 读取返回的内容  
            while ((line = in.readLine()) != null) {  
                result += line;  
            }  
        }catch(SocketTimeoutException t){ 
        	//超时异常
        	result="timeout";       	
        }catch (Exception e) {
            e.printStackTrace();
        }finally{
            try {  
                if (in != null) {  
                    in.close();  
                }  
            } catch (IOException ex) {  
                ex.printStackTrace();  
            }  
        }
        return result ;
    }  
  
    /** 
     * 发送POST请求 
     *  
     * @param url 
     *            目的地址 
     * @param parameters 
     *            请求参数，Map类型。 
     * @return 远程响应结果 
     */  
    public static String sendPost(String url, Map<String, String> parameters, String ipAddr) {
        String result = "";// 返回的结果  
        BufferedReader in = null;// 读取响应输入流  
        PrintWriter out = null;  
        StringBuffer sb = new StringBuffer();// 处理请求参数  
        String params = "";// 编码之后的参数  
        try {  
            // 编码请求参数  
            if (parameters.size() == 1) {  
                for (String name : parameters.keySet()) {  
                    sb.append(name).append("=").append(  
                            java.net.URLEncoder.encode(parameters.get(name),  
                                    "UTF-8"));  
                }  
                params = sb.toString();  
            } else {  
                for (String name : parameters.keySet()) {  
                    sb.append(name).append("=").append(  
                            java.net.URLEncoder.encode(parameters.get(name),  
                                    "UTF-8")).append("&");  
                }  
                String temp_params = sb.toString();  
                params = temp_params.substring(0, temp_params.length() - 1);  
            }  
            // 创建URL对象  
            URL connURL = new URL(url);
            // 打开URL连接  
            HttpURLConnection httpConn = (HttpURLConnection) connURL
                    .openConnection();  
            // 设置通用属性  
            httpConn.setRequestProperty("Accept", "*/*");  
            httpConn.setRequestProperty("Connection", "Keep-Alive");  
            httpConn.setRequestProperty("User-Agent",  
                    "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)");
            if (!StringUtils.isEmpty(ipAddr)) {
                httpConn.setRequestProperty("X-Forwarded-For", ipAddr);
            }
            // 设置POST方式 
            httpConn.setConnectTimeout(30000);
            httpConn.setReadTimeout(20000);
            httpConn.setDoInput(true);  
            httpConn.setDoOutput(true);
            // 获取HttpURLConnection对象对应的输出流  
            out = new PrintWriter(httpConn.getOutputStream());  
            // 发送请求参数  
            out.write(params);  
            // flush输出流的缓冲  
            out.flush();  
            // 定义BufferedReader输入流来读取URL的响应，设置编码方式  
            in = new BufferedReader(new InputStreamReader(httpConn  
                    .getInputStream(), "UTF-8"));  
            String line;  
            // 读取返回的内容  
            while ((line = in.readLine()) != null) {  
                result += line;  
            }  
        }catch(SocketTimeoutException t){ 
        	//超时异常
        	result="timeout";       	
        } catch (Exception e) {  
            e.printStackTrace();  
        } finally {  
            try {  
                if (out != null) {  
                    out.close();  
                }  
                if (in != null) {  
                    in.close();  
                }  
            } catch (IOException ex) {  
                ex.printStackTrace();  
            }  
        }  
        if (result.equals("{}")) {
			return null;
		}
        return result;  
    }  
     
    public static String sendPost2(String url, Map<String, Object> parameters, String ipAddr) {
    	String result = "";// 返回的结果  
    	BufferedReader in = null;// 读取响应输入流  
    	PrintWriter out = null;  
    	StringBuffer sb = new StringBuffer();// 处理请求参数  
    	String params = "";// 编码之后的参数  
    	try {  
    		// 编码请求参数  
    		if (parameters.size() == 1) {  
    			for (String name : parameters.keySet()) {  
    				sb.append(name).append("=").append(  
    						java.net.URLEncoder.encode(parameters.get(name).toString(),  
    								"UTF-8"));  
    			}  
    			params = sb.toString();  
    		} else {  
    			for (String name : parameters.keySet()) {  
    				sb.append(name).append("=").append(  
    						java.net.URLEncoder.encode(parameters.get(name).toString(),  
    								"UTF-8")).append("&");  
    			}  
    			String temp_params = sb.toString();  
    			params = temp_params.substring(0, temp_params.length() - 1);  
    		}  
    		// 创建URL对象  
    		URL connURL = new URL(url);
    		// 打开URL连接  
    		HttpURLConnection httpConn = (HttpURLConnection) connURL
    				.openConnection();  
    		// 设置通用属性  
    		httpConn.setRequestProperty("Accept", "*/*");  
    		httpConn.setRequestProperty("Connection", "Keep-Alive");  
    		httpConn.setRequestProperty("User-Agent",  
    				"Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)");
            if (!StringUtils.isEmpty(ipAddr)) {
                httpConn.setRequestProperty("X-Forwarded-For", ipAddr);
            }
    		// 设置POST方式  
    		httpConn.setDoInput(true);  
    		httpConn.setDoOutput(true);  
    		// 获取HttpURLConnection对象对应的输出流  
    		out = new PrintWriter(httpConn.getOutputStream());  
    		// 发送请求参数  
    		out.write(params);  
    		// flush输出流的缓冲  
    		out.flush();  
    		// 定义BufferedReader输入流来读取URL的响应，设置编码方式  
    		in = new BufferedReader(new InputStreamReader(httpConn  
    				.getInputStream(), "UTF-8"));  
    		String line;  
    		// 读取返回的内容  
    		while ((line = in.readLine()) != null) {  
    			result += line;  
    		}  
    	} catch (Exception e) {  
    		e.printStackTrace();  
    	} finally {  
    		try {  
    			if (out != null) {  
    				out.close();  
    			}  
    			if (in != null) {  
    				in.close();  
    			}  
    		} catch (IOException ex) {  
    			ex.printStackTrace();  
    		}  
    	}  
    	if (result.equals("{}")) {
			return null;
		}
    	return result;  
    }  
    

    //生成msgID
    public static String sendPostMsgID(String url, String sname) {
        //生成msgid
        Map<String, String> parametMsgId=new HashMap<>();
        parametMsgId.put("account", sname);
        String sendPosts = HttpUtils.sendPost(url, parametMsgId, "");
        // 客户端标识
        return sendPosts;
    }

    /**
     * 获取请求签名
     * @param account
     * @param terminals
     * @param password
     * @param timestamp
     * @return
     */
    public static String getSign(String account, String terminals,String password,String timestamp){
        String getTerminals;
        if(terminals.contains(",")){
            getTerminals = terminals.split(",")[0];
        }
        else{
            getTerminals = terminals;
        }
        String str = "account=" + account + "&terminals=" + terminals + "&password=" + password.toLowerCase() + "&timestamp=" + timestamp;
        String sha256 = Md5Util.getSHA256(str).toLowerCase();
        return sha256;
    }

    /**
     * 发送post请求
     * @param url  请求地址
     * @param json  json格式字符串
     * @param contentType  这里用 "application/json"
     * @return
     */
    public static String post(String url, String json,String ipAddr,String contentType) {
        /*HttpClientBuilder httpClientBuilder = HttpClientBuilder.create();
        //HttpClient
        CloseableHttpClient client = httpClientBuilder.build();
        client = (CloseableHttpClient) wrapClient(client);
        HttpPost post = new HttpPost(url);
        try {
            StringEntity s = new StringEntity(json, "utf-8");
            if (StringUtils.isBlank(contentType)) {
                s.setContentType("application/json");
            }
            if(!StringUtils.isEmpty(ipAddr)){
                post.addHeader("x-forwarded-for",ipAddr);
            }
            s.setContentType(contentType);
            post.setEntity(s);
            HttpResponse res = client.execute(post);
            HttpEntity entity = res.getEntity();
            String str = EntityUtils.toString(entity, "utf-8");
            return str;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;*/
        String result = "";// 返回的结果
        BufferedReader in = null;// 读取响应输入流
        PrintWriter out = null;
        StringBuffer sb = new StringBuffer();// 处理请求参数
        //String params = "";// 编码之后的参数
        try {
            // 编码请求参数
            /*if (parameters.size() == 1) {
                for (String name : parameters.keySet()) {
                    sb.append(name).append("=").append(
                            java.net.URLEncoder.encode(parameters.get(name),
                                    "UTF-8"));
                }
                params = sb.toString();
            } else {
                for (String name : parameters.keySet()) {
                    sb.append(name).append("=").append(
                            java.net.URLEncoder.encode(parameters.get(name),
                                    "UTF-8")).append("&");
                }
                String temp_params = sb.toString();
                params = temp_params.substring(0, temp_params.length() - 1);
            }*/
            // 创建URL对象
            URL connURL = new URL(url);
            // 打开URL连接
            HttpURLConnection httpConn = (HttpURLConnection) connURL
                    .openConnection();
            // 设置通用属性
            httpConn.setRequestProperty("Accept", "*/*");
            httpConn.setRequestProperty("Connection", "Keep-Alive");
            httpConn.setRequestProperty("User-Agent",
                    "Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.1)");
            if (!StringUtils.isEmpty(ipAddr)) {
                httpConn.setRequestProperty("X-Forwarded-For", ipAddr);
            }
            if (StringUtils.isEmpty(contentType)) {
                httpConn.setRequestProperty("Content-Type", "application/json");
            }else{
                httpConn.setRequestProperty("Content-Type", contentType);
            }
            // 设置POST方式
            httpConn.setConnectTimeout(30000);
            httpConn.setReadTimeout(20000);
            httpConn.setDoInput(true);
            httpConn.setDoOutput(true);
            // 获取HttpURLConnection对象对应的输出流
            out = new PrintWriter(httpConn.getOutputStream());
            // 发送请求参数
            out.write(json);
            // flush输出流的缓冲
            out.flush();
            // 定义BufferedReader输入流来读取URL的响应，设置编码方式
            in = new BufferedReader(new InputStreamReader(httpConn
                    .getInputStream(), "UTF-8"));
            String line;
            // 读取返回的内容
            while ((line = in.readLine()) != null) {
                result += line;
            }
        }catch(SocketTimeoutException t){
            //超时异常
            result="timeout";
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            try {
                if (out != null) {
                    out.close();
                }
                if (in != null) {
                    in.close();
                }
            } catch (IOException ex) {
                ex.printStackTrace();
            }
        }
        if (result.equals("{}")) {
            return null;
        }
        return result;
    }
    private static HttpClient wrapClient(HttpClient base) {
        try {
            SSLContext ctx = SSLContext.getInstance("TLSv1");
            X509TrustManager tm = new X509TrustManager() {
                public void checkClientTrusted(X509Certificate[] xcs,
                                               String string) throws CertificateException {
                }

                public void checkServerTrusted(X509Certificate[] xcs,
                                               String string) throws CertificateException {
                }

                public X509Certificate[] getAcceptedIssuers() {
                    return null;
                }
            };
            ctx.init(null, new TrustManager[]{tm}, null);
            SSLConnectionSocketFactory sslsf = new SSLConnectionSocketFactory(ctx, new String[]{"TLSv1"}, null,
                    SSLConnectionSocketFactory.BROWSER_COMPATIBLE_HOSTNAME_VERIFIER);
            CloseableHttpClient httpclient = HttpClients.custom().setSSLSocketFactory(sslsf).build();
            return httpclient;

        } catch (Exception ex) {
            return null;
        }
    }
}
