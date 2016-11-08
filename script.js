$.getScript("room1.js"); //note that this only works over http://, not file:// (for local testing)

var viewindex = 0;

$(document).ready(function(){

	// left nav button logic
	$("#left").click(function(){
		turnTo("left");
	});
	
	// right nav button logic
	$("#right").click(function(){
		turnTo("right");
	});
	
});


// turnTo is a macro to simplify the logic of cycling from view to view within a room, and
// then navigating to the appropriate view.
function turnTo(direction) {
	if (direction == undefined) {
		direction = "left";
	} else if (direction == "left") {
		viewindex--;
		if (viewindex < 0) {
			viewindex = kitchenviews.length - 1;
		}
	} else if (direction == "right") {
		viewindex++;
		if (viewindex >= kitchenviews.length) {
			viewindex = 0;
		}
	}
	
	navToIndex(viewindex);
}


// navToIndex does the brunt work of swapping the background image, based on the provided
// "index" argument.
function navToIndex(index) {
	if (index == undefined) {
		index = 0;
	}	
	$(".game").css("background-image" , "url(\"img/" + kitchenviews[index] + ".png\")");
}