package com.welink.voteadmin.models.domain;

public class SessionUser {
    private final int id;
    private final String account;

    public SessionUser(int id, String account){
        this.id = id;
        this.account = account;
    }

    public int getId() {
        return id;
    }

    public String getAccount() {
        return account;
    }
}
