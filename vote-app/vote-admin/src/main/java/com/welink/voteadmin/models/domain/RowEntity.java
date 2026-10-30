package com.welink.voteadmin.models.domain;

public class RowEntity {
    private String title;
    private int merged;
    private boolean bgColor;
    private int color;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public int getMerged() {
        return merged;
    }

    public void setMerged(int merged) {
        this.merged = merged;
    }

    public boolean isBgColor() {
        return bgColor;
    }

    public void setBgColor(boolean bgColor) {
        this.bgColor = bgColor;
    }

    public int getColor() {
        return color;
    }

    public void setColor(int color) {
        this.color = color;
    }
}
