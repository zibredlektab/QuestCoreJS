var kitchenviews = ["kitchen-n.png","kitchen-e.png","kitchen-s.png","kitchen-w.png"];
var viewindex = 0;

$(document).ready(function(){
	$("#left").click(function(){
		viewindex--;
		if (viewindex < 0) {
			viewindex = kitchenviews.length - 1
		}
		$(".game").css("background-image" , "url(\"img/" + kitchenviews[viewindex] + "\")");
		console.log("left clicked, now looking at " + kitchenviews[viewindex] + ".");
	});
	
	$("#right").click(function(){
		viewindex++;
		if (viewindex >= kitchenviews.length) {
			viewindex = 0;
		}
		$(".game").css("background-image" , "url(\"img/" + kitchenviews[viewindex] + "\")");
		console.log("right clicked, now looking at " + kitchenviews[viewindex] + ".");

	});
});