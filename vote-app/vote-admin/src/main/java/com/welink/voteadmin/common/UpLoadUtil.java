package com.welink.voteadmin.common;

import com.welink.voteadmin.models.domain.UploadFileEntity;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.commons.fileupload.util.Streams;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MultipartHttpServletRequest;
import java.io.*;
import java.nio.charset.Charset;
import java.nio.charset.UnsupportedCharsetException;
import java.util.List;

import java.util.UUID;


public class UpLoadUtil {
	/**
	 * 处理上传文件的公共方法(不生成随机名)
	 *
	 * @param request
	 * @return 返回上传文件服务器所在路径和文件url地址
	 * @throws IOException
	 */
	public static UploadFileEntity UpLoadFile(HttpServletRequest request,String savePath) {
		UploadFileEntity uploadFileEntity = null;
		String fileId = request.getParameter("fileId");
		MultipartHttpServletRequest multipartRequest = (MultipartHttpServletRequest) request;
		List<MultipartFile> multipartFiles = multipartRequest.getFiles(fileId);
		if (null != multipartFiles && !multipartFiles.isEmpty()) {
			MultipartFile file = multipartFiles.get(0);
			String fileName = file.getOriginalFilename();
			try {
				String fileSuffix = getExtensionName(fileName);
				String fileNewName = UUID.randomUUID().toString()+"."+fileSuffix;
				BufferedInputStream in = new BufferedInputStream(file.getInputStream());
				String filePath = savePath + fileNewName;
				BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(filePath));
				Streams.copy(in, out, true);
				uploadFileEntity = new UploadFileEntity();
				uploadFileEntity.setFile_name(fileName);
				uploadFileEntity.setFile_path("/upload/"+ fileNewName);
				uploadFileEntity.setFile_size(file.getSize());
				uploadFileEntity.setFile_url(fileName);
				uploadFileEntity.setFile_suffix(fileSuffix);
			} catch (IOException e) {
				// TODO Auto-generated catch block
				e.printStackTrace();
			}
		}
		return uploadFileEntity;
	}


	private static String getExtensionName(String filename) {
        if ((filename != null) && (filename.length() > 0)) {
            int dot = filename.lastIndexOf('.');
            if ((dot >-1) && (dot < (filename.length() - 1))) {
                return filename.substring(dot + 1);   
            }   
        }   
        return filename.toLowerCase();   
	}

	/**
	 * 只返回文件后缀
	 * @param request
	 * @return
	 */
	public static String getfileName(HttpServletRequest request){
		String fileId = request.getParameter("fileId");
		MultipartHttpServletRequest multipartRequest = (MultipartHttpServletRequest) request;
		List<MultipartFile> multipartFiles = multipartRequest.getFiles(fileId);
		if(multipartFiles!=null && multipartFiles.size()>0){
			MultipartFile file = multipartFiles.get(0);
			String fileName = file.getOriginalFilename();
			String extensionName = getExtensionName(fileName);		
			return extensionName.toLowerCase();
		}else{
			return "";
		}
		
	}

	 /** 
	     * 判断文件的编码格式 
	     * @param  :file
	     * @return 文件编码格式 
	     * @throws Exception 
	     */  
	    private static String codeString(BufferedInputStream bin) throws Exception{  
	        int p = (bin.read() << 8) + bin.read();  
	        //String code = null;  
	          
	       /* switch (p) {  
	            case 0xefbb:  
	                code = "UTF-8";  
	                break;  
	            case 0xfffe:  
	                code = "Unicode";  
	                break;  
	            case 0xfeff:  
	                code = "UTF-16BE";  
	                break;  
	            default:  
	                code = "GBK";  
	        }  
	          bin.close();*/
	    	byte [] head=new byte[3];
	    	bin.read(head);
	    	String code="GBK";
	    	 if (head[0] == -1 && head[1] == -2 )  
	             code = "UTF-16";  
	         if (head[0] == -2 && head[1] == -1 )  
	             code = "Unicode";  
	         if(head[0]==-17 && head[1]==-69 && head[2] ==-65)  
	             code = "UTF-8";  	       
	        return code;  
	    }  
	    /** 
	     * 把指定文件或目录转换成指定的编码 
	     *  
	     * @param file 
	     *            要转换的文件或目录 
	     * @param fromCharsetName 
	     *            源文件的编码 
	     * @param toCharsetName 
	     *            要转换的编码 
	     * @param filter 
	     *            文件名过滤器 
	     * @throws Exception 
	     */  
	    public static void convert(File file, String fromCharsetName,  
	            String toCharsetName, FilenameFilter filter) throws Exception {  
	        if (file.isDirectory()) {  
	            File[] fileList = null;  
	            if (filter == null) {  
	                fileList = file.listFiles();  
	            } else {  
	                fileList = file.listFiles(filter);  
	            }  
	            for (File f : fileList) {  
	                convert(f, fromCharsetName, toCharsetName, filter);  
	            }  
	        } else {  
	            if (filter == null  
	                    || filter.accept(file.getParentFile(), file.getName())) {  
	                String fileContent = getFileContentFromCharset(file,  
	                        fromCharsetName);  
	                saveFile2Charset(file, toCharsetName, fileContent);  
	            }  
	        }  
	    }  
	 
	    /** 
	     * 以指定编码方式读取文件，返回文件内容 
	     * 
	     * @param file 
	     *            要转换的文件 
	     * @param fromCharsetName 
	     *            源文件的编码 
	     * @return 
	     * @throws Exception 
	     */  
	    public static String getFileContentFromCharset(File file,  
	            String fromCharsetName) throws Exception {  
	        if (!Charset.isSupported(fromCharsetName)) {  
	            throw new UnsupportedCharsetException(fromCharsetName);  
	        }  
	        InputStream inputStream = new FileInputStream(file);  
	        InputStreamReader reader = new InputStreamReader(inputStream,  
	                fromCharsetName);  
	        char[] chs = new char[(int) file.length()];  
	        reader.read(chs);  
	        String str = new String(chs).trim();  
	        reader.close(); 
	       // System.out.println(str);
	        return str;  
	    }  
	    /** 
	     * 以指定编码方式写文本文件，存在会覆盖 
	     *  
	     * @param file 
	     *            要写入的文件 
	     * @param toCharsetName 
	     *            要转换的编码 
	     * @param content 
	     *            文件内容 
	     * @throws Exception 
	     */  
	    public static void saveFile2Charset(File file, String toCharsetName,  
	            String content) throws Exception {  
	        if (!Charset.isSupported(toCharsetName)) {  
	            throw new UnsupportedCharsetException(toCharsetName);  
	        }  
	        OutputStream outputStream = new FileOutputStream(file);  
	        OutputStreamWriter outWrite = new OutputStreamWriter(outputStream,  
	                toCharsetName);  
	        outWrite.write(content);  
	        outWrite.close();  
	    }  
	    
	    public static boolean delfile(String str){
			//删除文件因为文件大小超过100M
			File deleteFile = new File(str);
		    boolean delete = deleteFile.delete();
		    return delete;
	    }

}
