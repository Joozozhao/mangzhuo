package com.welink.voteadmin.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;

@Controller
public class IndexController {
    @ResponseBody
    @RequestMapping("/MP_verify_sPYg5TNqA5CFXSdl.txt")
    public String wxPrivateKey(){
        return "sPYg5TNqA5CFXSdl";
    }
}
