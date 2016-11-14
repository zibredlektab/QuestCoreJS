var $area, $currentroom, $currentview;

var currentviewindex = 0;

var startingarea = "room1"; // These will eventually be loaded from a config file
var startingroom = "kitchen";

$(document).ready(function(){

	// load the starting area
	loadArea(startingarea);

	// left nav button logic
	$("#left").click(function(){
		turnTo("left");
	});

	// right nav button logic
	$("#right").click(function(){
		turnTo("right");
	});

	// forward nav button logic
	$("#forward").click(function(){
		switchToRoom($currentview.find("fwd-room").text(), $currentview.find("fwd-view").text());
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

			switchToRoom(startingroom);

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
		currentviewindex--;
		if (currentviewindex < 0) {
			currentviewindex = $currentroom.find("view").length-1;
		}
	} else if (direction == "right") {
		currentviewindex++;
		if (currentviewindex >= $currentroom.find("view").length) {
			currentviewindex = 0;
		}
	}

	navToIndex(currentviewindex);
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

	$currentview = $currentroom.find("view").eq(index);
	$(".game").css("background-image", "url(\"img/" + $currentroom.attr("ID") + "-" + $currentview.attr("dir") + ".png\")");

	onLoadView();
}


// switchToRoom assigns $customroom to the room data matching the requested ID
function switchToRoom(roomID, viewID) {

	console.log("attempting to switch to room " + roomID);

	var foundcurrentroom = false;

	// pull out all of the room objects from the area file
	$area.find("room").each(function(){
		if (!foundcurrentroom && $(this).attr("ID") == roomID) {
			// if this is the right ID, then we're done here
			$currentroom = $(this);
			foundcurrentroom = true;
		}
	});

	// make sure we actually found the requested room
	if (!foundcurrentroom) {
		alert("requested room doesn't exist in this area");
	}

	navToIndex(getViewIndexFromDirection(viewID));
}


// getViewIndex takes the name of a view (usually a cardinal direction) and returns a
// numerical index for that view
function getViewIndexFromDirection(direction) {
	var viewcount = 0;
	var foundview = false;
	$currentroom.find("view").each(function() {
		if (!foundview && $(this).attr("dir") == direction) {
			foundview = true;
		}
	});

	if (!foundview) {
		return viewcount;
	} else {
		return currentviewindex;
	}

}

function onLoadView() {
	// determine whether the "forward" clickbox should be active & make it so
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
