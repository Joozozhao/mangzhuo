package com.welink.voteadmin.models.domain;

public enum FileEnum {
    IMAGESIZE_1("1"),
    IMAGESIZE_2("2"),
    IMAGESIZE_5("5"),
    IMAGESIZE_10("10"),
    FILE_TYPE_JPG("jpg"),
    FILE_TYPE_JPEG("jpeg"),
    FILE_TYPE_PNG("png"),
    FILE_TYPE_GIF("gif"),
    FILE_TYPE_ICO("ico"),
    FILE_TYPE_BMP("bmp"),
    FILE_TYPE_PJPEG("pjpeg"),
    FILE_TYPE_JFIF("jfif"),
    FILE_TYPE_PJP("pjp"),
    FILE_TYPE_DIB("dib"),
    //文件
    FILE_TYPE_PDF("pdf"),
    FILE_TYPE_DOC("doc"),
    FILE_TYPE_DOCX("docx"),
    FILE_TYPE_RAR("rar"),
    //视频
    FILE_TYPE_MP4("mp4"),
    FILE_TYPE_AVI("avi"),
    FILE_TYPE_3GP("3gp"),
    FILE_TYPE_FLV("flv"),
    FILE_TYPE_MOV("mov"),
    FILE_TYPE_MKV("mkv"),
    FILE_TYPE_WMV("wmv"),
    //音频
    FILE_TYPE_MP3("mp3"),
    FILE_TYPE_WAV("wav"),
    FILE_TYPE_AAC("aac"),
    FILE_TYPE_FLAC("flac"),
    FILE_TYPE_APE("ape"),
    FILE_TYPE_WMA("wma"),
    FILE_TYPE_OGG("ogg"),
    FILE_TYPE_MIDI("midi");
    private final String value;
    FileEnum(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
