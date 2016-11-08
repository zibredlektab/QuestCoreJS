var $area, $currentroom, $currentview;

var viewindex = 0;

$(document).ready(function(){

	// load the starting area
	loadArea("room1");

	// left nav button logic
	$("#left").click(function(){
		turnTo("left");
	});

	// right nav button logic
	$("#right").click(function(){
		turnTo("right");
	});

});



// loadArea loads a set of area data (various rooms within an area, their views, etc) from
// an XML file named [areaName].xml. It then navigates to index 0 in that room (for now)
function loadArea(areaName) {
	$.ajax({
		type: "GET",
		url: areaName + ".xml",
		dataType: "xml",
		success: function(xml) {
			$area = $(xml);

			// assign $currentroom to the room matching the requested ID (encapsulate this eventually)
			var foundcurrentroom = false;
			$area.find("room").each(function(){
				if ($(this).attr("ID") == "kitchen" && !foundcurrentroom) {
					$currentroom = $(this);
					foundcurrentroom = true;
				}
			});

			// make sure we actually found the requested room
			if (!foundcurrentroom) {
				alert("requested room doesn't exist in this area");
			}

			//console.log("area "+ areaName + " loaded");
			//console.log("currently in room " + $currentroom.attr("ID"));

			navToIndex(0);
		}
	});
}



// turnTo simplifies the logic of cycling from view to view within a room (without overflowing
// the bounds of the room, and then navigating to the appropriate view.
function turnTo(direction) {
	if (direction == undefined) {
		direction = "left";
	} else if (direction == "left") {
		viewindex--;
		if (viewindex < 0) {
			viewindex = $currentroom.find("view").length-1;
		}
	} else if (direction == "right") {
		viewindex++;
		if (viewindex >= $currentroom.find("view").length) {
			viewindex = 0;
		}
	}

	navToIndex(viewindex);
}


// navToIndex does the brunt work of swapping the background image, based on the provided
// "index" argument.
function navToIndex(index) {
	// I don't know in what circumstance I'd ever call this function without a valid index, but just in case...
	if (index == undefined) {
		console.log("index to navigate to was undefined, navigating to 0");
		index = 0;
	}

	console.log ("navigating to index " + index);

	$currentview = $area.find("view").eq(index);
	$(".game").css("background-image", "url(\"img/" + $currentroom.attr("ID") + "-" + $currentview.attr("ID") + ".png\")");

	// determine whether the "forward" clickbox should be active & make it so (this does not belong in this function)
	if ($currentview.has("fwd-room").length > 0) {
		//console.log("forward exists here");
		$("#forward").css("display", "block");
	} else {
		//console.log("forward does not exist here");
		$("#forward").css("display", "none");
	}
}






/* USEFUL DEBUG THINGS



	// print out all of the views associated with this room (and only this room)
	$currentroom.find("view").each(function(){
		console.log($(this).attr("ID"));
	});

*/
