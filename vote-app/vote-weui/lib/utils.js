const request = function (url, method, data, success){
    $.ajax({
        url: url,
        type: method,
        contentType: "application/json",
        data: data,
        success: function (res) {
            if (success) success(res);
        },
        fail: function (error){
            layer.msg(error, {icon: 2});
        }
    });
};