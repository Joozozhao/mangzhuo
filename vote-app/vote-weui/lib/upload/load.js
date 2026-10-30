var clMenuOn = "active";
$(function() {
	var hei_if = $(document).height();
	$(".heig").height(hei_if - 111 + 'px');
	var tmp = $("#siteLogoId").val();
	$("#otherNameId").html(tmp);
	var hidbool = $("#hidbool").val();
	$("#otherHrefId").attr("href", $("#menuUrl").val());
	var urlTmp = $("#menuUrl").val();
	var stres_temp = urlTmp.split('?');
	if(stres_temp[0]=='index'){
		$("#otherHrefId").attr('class','fa fa-cogs');
	}else{
		$("#otherHrefId").attr('class','fa fa-send');
	}
	var eleMenus = $("#choMenu li a").click(function() {
		var query = this.href.split("?")[1];
		if (query == "#")
			return true;
		if (history.pushState && query && !$(this).hasClass(clMenuOn)) {
			/*
			 * ajax载入~~ 刷新iframe部分
			 */
			var stres = query.split('/');
			$("li[data-root='root_data']").each(function(index) {
				$(this).removeClass("active");
			})
			$("li[data-root='ch_data']").each(function(index) {
				$(this).removeClass("active");
			})
			$(this).parent().addClass('active');
			$(this).parent().parent().parent().addClass('active');
			openMenu(stres[0], stres[1]);
			// history处理
			document.title = document.title .split("-")[0];
			var title = $(document).attr("title")+ "-" + $(this).text().replace(/\d+$/, "");
			document.title = title;
			//event = window.event;
		/*	if (event && /\d/.test(event.button)) {*/
				history.pushState({
					title : title
				}, title, location.href.split("?")[0] + "?" + query);
			/*}*/
		}
		return false;
	});
	var fnHashTrigger = function(target) {
		var query = location.href.split("?")[1], eleTarget = target || null;
		if (typeof query == "undefined") {
			if (eleTarget = eleMenus.get(0)) {
				history.replaceState(null, document.title, location.href
						.split("#")[0]
						+ "?" + eleTarget.href.split("?")[1])
						+ location.hash;
				fnHashTrigger(eleTarget);
			}
		} else {
			eleMenus.each(function() {
				if (eleTarget === null && this.href.split("?")[1] === query) {
					eleTarget = this;
				}
			});

			if (!eleTarget) {
				history.replaceState(null, document.title, location.href
						.split("?")[0]);
				fnHashTrigger();
			} else {
				$(eleTarget).trigger("click");
			}
		}
	};
	if (history.pushState) {
		window.addEventListener("popstate", function() {
			fnHashTrigger();
		});
		// 默认载入
		fnHashTrigger();
	}
});
function openMenu(controller, action) {
	$("#mainCtId").load(controller+"/"+action);
}
function openTab(sId){
	var cn = $("#"+sId).attr('class');
	if(cn=="treeview"){
		$("#"+sId).addClass('active');
	}else{
		$("#"+sId).removeClass('active');
	}
}