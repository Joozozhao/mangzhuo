/*document.addEventListener('DOMContentLoaded', function () {
	document.querySelector('main').className += 'loaded';
});
function onshow(){
	var fatherBody = $(window.top.document.body);//找到父页面的body对象  
    $('#main').clone().appendTo(fatherBody);
    $('#main', fatherBody).on('hidden', function () {
        this.remove();
    }).show();
}
function onhide(){
	$("#main").hide();
}*/
var UploadView = function() {
	return {
		// main function to initiate the module
		ajaxUpLoad : function(callback, fileId, url) {
			if (url != "sendsms/uplodesms" && url != "sendCharcter/uploadFile") {
				// 让全屏遮罩显示
				/*document.addEventListener('DOMContentLoaded', function() {
					document.querySelector('main').className += 'loaded';
				});
				var hei = $(window).height();
				var wid = $(window).width();
				$("#main").show();*/
			}
			// onhide();
			var filePath = $("#" + fileId).val();
			if (filePath != '') {
				// onshow();
				$.ajaxFileUpload({
							url : url,
							type : 'POST', // 文件提交的方式
							data : {
								fileId : fileId
							},// fileId为文件选择框id，上传类型0：导入，1，上传
							async : true,
							secureuri : false,// 是否需要安全协议
							fileElementId : fileId,
							dataType : 'text/json',
							success : function(data, status) {
								var json = JSON.parse(data);
								// onhide();
								// 让全屏遮罩隐藏
								document
										.addEventListener(
												'DOMContentLoaded',
												function() {
													document
															.querySelector('main').className += 'loaded';
												});
								var hei = $(window).height();
								var wid = $(window).width();
								$("#main").hide();
								callback(json);
							}
						});
			}
		}
	}
}();

var UploadViewImg = function() {
	return {
		// main function to initiate the module
		ajaxUpLoadImg : function(callback, fileId, jsonStr, listindex, url) {
			if (url != "sendsms/uplodesms" && url != "sendCharcter/uploadFile") {
				// 让全屏遮罩显示
				document.addEventListener('DOMContentLoaded', function() {
					document.querySelector('main').className += 'loaded';
				});
				var hei = $(window).height();
				var wid = $(window).width();
				$("#main").show();
			}

			// onhide();
			var filePath = $("#" + fileId).val();
			if (filePath != '') {
				// onshow();
				$
						.ajaxFileUpload({
							url : url,
							type : 'POST', // 文件提交的方式
							data : {
								fileId : fileId,
								freamlist : jsonStr,
								indexlist : listindex
							},// fileId为文件选择框id，上传类型0：导入，1，上传
							async : true,
							secureuri : false,// 是否需要安全协议
							fileElementId : fileId,
							dataType : 'text/json',
							success : function(data, status) {
								// var json = JSON.parse(data);
								// onhide();
								// 让全屏遮罩隐藏
								document
										.addEventListener(
												'DOMContentLoaded',
												function() {
													document
															.querySelector('main').className += 'loaded';
												});
								var hei = $(window).height();
								var wid = $(window).width();
								$("#main").hide();
								callback(data);
							}
						});
			}
		}
	}
}();

var UploadViewImgOld = function() {
	return {
		// main function to initiate the module
		ajaxUpLoadOld : function(callback, fileId, jsonStr, listindex,
				fileuuid, url) {
			if (url != "sendsms/uplodesms" && url != "sendCharcter/uploadFile") {
				// //让全屏遮罩显示
				// document.addEventListener('DOMContentLoaded', function () {
				// document.querySelector('main').className += 'loaded';
				// });
				// var hei=$(window).height();
				// var wid=$(window).width();
				// $("#main").show();
				myVar = setTimeout(function() {
					$("#main").show();
				}, 1000);
			}

			// onhide();
			var filePath = $("#" + fileId).val();
			if (filePath != '') {
				// onshow();
				$.ajaxFileUpload({
					url : url,
					type : 'POST', // 文件提交的方式
					data : {
						fileId : fileId,
						freamlist : jsonStr,
						indexlist : listindex,
						uuidfile : fileuuid
					},// fileId为文件选择框id，上传类型0：导入，1，上传
					async : true,
					secureuri : false,// 是否需要安全协议
					fileElementId : fileId,
					dataType : 'text/json',
					success : function(data, status) {
						// var json = JSON.parse(data);
						// onhide();
						/*
						 * //让全屏遮罩隐藏
						 * document.addEventListener('DOMContentLoaded',
						 * function () {
						 * document.querySelector('main').className += 'loaded';
						 * }); var hei=$(window).height(); var
						 * wid=$(window).width(); $("#main").hide();
						 */
						clearTimeout(myVar);
						$("#main").hide();
						callback(data);
					}
				});
			}
		}
	}
}();

var UploadViewProgress = function() {
	return {
		// main function to initiate the module
		ajaxUpLoadpre : function(callback, fileId, url, progress, progressnumId) {
			$.ajaxFileUpload({
				url : url,
				type : 'POST', // 文件提交的方式
				data : {
					fileId : fileId,
					freamlist : jsonStr,
					indexlist : listindex,
					uuidfile : fileuuid
				},// fileId为文件选择框id，上传类型0：导入，1，上传
				async : true,
				secureuri : false,// 是否需要安全协议
				fileElementId : fileId,
				dataType : 'text/json',
				success : function(data, status) {
					// var json = JSON.parse(data);
					// onhide();
					/*
					 * //让全屏遮罩隐藏
					 * document.addEventListener('DOMContentLoaded',
					 * function () {
					 * document.querySelector('main').className += 'loaded';
					 * }); var hei=$(window).height(); var
					 * wid=$(window).width(); $("#main").hide();
					 */
					clearTimeout(myVar);
					$("#main").hide();
					callback(data);
				}
			});

		}
	}
}();
