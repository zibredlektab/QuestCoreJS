var $area, $currentroom, $currentview;

var currentviewindex = 0;

var startingarea = "room1"; // These will eventually be loaded from a config file
var startingroom = "kitchen";

$(document).ready(function(){


	$("#left").addClass("objectviewnav");

	// load the starting area
	loadArea(startingarea);

	// left nav button logic
	$("#left").click(function(){
		turnTo("left");
		$("#left").removeClass("objectviewnav");
	});

	// right nav button logic
	$("#right").click(function(){
		turnTo("right");
	});

	// forward nav button logic
	$("#forward").click(function(){
		if ($currentview.has("fwd-room").length > 0) {
			if ($currentview.has("fwd-dir").length > 0) {
				switchToRoomWithDirection($currentview.find("fwd-room").text(), $currentview.find("fwd-dir").text());
			} else {
				console.log("no fwd dir");
				switchToRoom($currentview.find("fwd-room").text());
			}
		} else {
			console.log ("trying to move forward in a room that should not have a forward link...");
		}
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

			switchToRoomWithDirection(startingroom, "n");

			console.log("area "+ areaName + " loaded");
			console.log("currently in room " + $currentroom.attr("ID"));

			//navToIndex(0);
		},
		error: function (xhr, ajaxOptions, thrownError) {
			console.log("encountered an error parsing + " + areaName + ".xml")
        	alert(thrownError);
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

	onLeaveView();

	$currentview = $currentroom.find("view").eq(index);
	$(".game").css("background-image", "url(\"img/" + $currentroom.attr("ID") + "-" + $currentview.attr("dir") + ".png\")");

	onLoadView();
}




// switchToRoomWithDirection assigns $customroom to the room data matching the requested ID
// and navigates to the specified direction in the room.
function switchToRoomWithDirection(roomID, viewdirection) {

	console.log("attempting to switch to room " + roomID);

	var foundcurrentroom = false;

	// pull out all of the room objects from the area file
	$area.find("room").each(function(){
		if (!foundcurrentroom && $(this).attr("ID") == roomID) {
			// if this is the right ID, then we're done here
			$currentroom = $(this);
			foundcurrentroom = true;
			return false;
		}
	});

	// make sure we actually found the requested room
	if (!foundcurrentroom) {
		alert("requested room doesn't exist in this area");
	}

	navToIndex(getViewIndexFromDirection(viewdirection));
}

// switchToRoom shortcut, so that we need not always specify a direction (usually, switching
// rooms will take us to the same direction in a new room)
function switchToRoom(roomID) {
	switchToRoomWithDirection(roomID, $currentview.attr("dir"));
	console.log("switching to room " + roomID + " with view " + $currentview.attr("dir"));
}





// getViewIndex takes the name of a view (usually a cardinal direction) and returns a
// numerical index for that view
function getViewIndexFromDirection(direction) {
	var viewcount = 0;
	var foundview = false;
	$currentroom.find("view").each(function() {
		if (!foundview && $(this).attr("dir") == direction) {
			foundview = true;
			return false;
		}
		viewcount++;
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

	//


	// add any relevant objects to the view
	$currentview.find("object").each(function(){
		var $objid = $(this).attr("id");
		var $objselector = "#" + $objid;
		console.log("adding object " + $objid);
		$(".game").append("<a href=\"#obj\" class=\"obj\" id=\"" + $objid + "\"></a>");//("<div class=\"obj\" id=\"" + objid + "></div>");
		if ($(this).attr("type") != "clickbox") {
			$($objselector).css("background-image", "url(\"img/" + $currentroom.attr("ID") + "-" + $objid + ".png\")");
		}
		$($objselector).css("width", $(this).attr("width") / 3); // these should all eventually scale dynamically with the canvas
		$($objselector).css("height", $(this).attr("height") / 3);
		$($objselector).css("top", $(this).attr("y") / 3);
		$($objselector).css("left", $(this).attr("x") / 3);

		$($objselector).click(function(){
			console.log("object " + $objid + " was clicked.");

		});
	});
}

function onLeaveView() {
	if ($currentview != undefined) {
		$(".obj").each(function(){
			console.log("removing object " + $(this).attr("id"));
			$(this).remove();
		});
	}
}


/* USEFUL DEBUG THINGS



	// print out all of the views associated with this room (and only this room)
	$currentroom.find("view").each(function(){
		console.log($(this).attr("ID"));
	});

*/
