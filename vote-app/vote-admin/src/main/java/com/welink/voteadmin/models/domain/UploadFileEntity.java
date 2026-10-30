package com.welink.voteadmin.models.domain;

import java.util.List;

public class UploadFileEntity {
	//文件的原始名字
	private String file_name;
	//文件大小
	private long file_size;
	//文件的url地址
	private String file_url;
	//文件在服务器上的存储路径
	private String file_path;
	//文件的存储名字
	private String file_new_name;
	//文件后缀
	private String file_suffix;
	//uuid
	private String frameuuid;
	private int large;//文件是不是过大 1代表是空代表不是

	private List<String> fileList;

	public List<String> getFileList() {
		return fileList;
	}

	public void setFileList(List<String> fileList) {
		this.fileList = fileList;
	}

	public int getLarge() {
		return large;
	}
	public void setLarge(int large) {
		this.large = large;
	}
	public String getFrameuuid() {
		return frameuuid;
	}
	public void setFrameuuid(String frameuuid) {
		this.frameuuid = frameuuid;
	}
	public String getFile_suffix() {
		return file_suffix;
	}
	public void setFile_suffix(String file_suffix) {
		this.file_suffix = file_suffix;
	}
	public String getFile_name() {
		return file_name;
	}
	public void setFile_name(String file_name) {
		this.file_name = file_name;
	}
	public long getFile_size() {
		return file_size;
	}
	public void setFile_size(long file_size) {
		this.file_size = file_size;
	}
	public String getFile_url() {
		return file_url;
	}
	public void setFile_url(String file_url) {
		this.file_url = file_url;
	}
	public String getFile_path() {
		return file_path;
	}
	public void setFile_path(String file_path) {
		this.file_path = file_path;
	}
	public String getFile_new_name() {
		return file_new_name;
	}
	public void setFile_new_name(String file_new_name) {
		this.file_new_name = file_new_name;
	}
}
