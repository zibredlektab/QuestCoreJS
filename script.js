var $currentarea, $currentroom, $currentview;

var $currentroomchain = []; // This array contains all the standard views of the current room (ie, not object views)

var currentviewindex;

var startingarea = "area1"; // These will eventually be loaded from a config file
var startingroom = "kitchen";
var startingdirection = "n";

$(document).ready(function(){

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

	$("#back").click(function(){
		navToIndex(currentviewindex);
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
			$currentarea = $(xml);

			switchToRoomWithDirection(startingroom, startingdirection);

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
			currentviewindex = $currentroomchain.length-1;
		}
	} else if (direction == "right") {
		currentviewindex++;
		if (currentviewindex >= $currentroomchain.length) {
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

	$currentview = $currentroomchain[index];
	currentviewindex = index;
	$(".game").css("background-image", "url(\"img/" + $currentroom.attr("ID") + "-" + $currentview.attr("id") + ".png\")");

	onLoadView();
}

function navToView(viewid) {
	// I don't know in what circumstance I'd ever call this function without a valid index, but just in case...

	if (viewid == undefined) {
		console.log("index to navigate to was undefined, navigating to 0");
		viewid = "n";
	}

	console.log ("navigating to view " + viewid);


	navToIndex(getViewIndexFromDirection(viewid));

}


function navToObjView(onclick) {
	var viewid = onclick.attr("id");

	onLeaveView();

	$(".game").css("background-image", "url(\"img/" + $currentroom.attr("ID") + "-" + viewid + ".png\")");

	$("#back").css("display", "block");
}


function makePopUp(onclick) {

}


// switchToRoomWithDirection assigns $customroom to the room data matching the requested ID
// and navigates to the specified direction in the room.
function switchToRoomWithDirection(roomID, viewdirection) {

	console.log("attempting to switch to room " + roomID);

	var foundcurrentroom = false;

	// pull out all of the room objects from the area file
	$currentarea.find("room").each(function(){
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
	} else {

		populateRoomViewChain();

		navToView(viewdirection);
	}
}

// switchToRoom shortcut, so that we need not always specify a direction (usually, switching
// rooms will take us to the same direction in a new room)
function switchToRoom(roomID) {
	switchToRoomWithDirection(roomID, $currentview.attr("id"));
	console.log("switching to room " + roomID + " with view " + $currentview.attr("id"));
}


// populateRoomChain builds an array of all standard (directional, non-object) views in a room
function populateRoomViewChain() {
	$currentroomchain = [];
	$currentroom.find("view").each(function(){
		if ($(this).attr("type") != "object") {
			console.log("adding " + $(this).attr("id") + " to the room chain");
			$currentroomchain.push($(this));
		}
	});
}


// getViewIndex takes the name of a view (usually a cardinal direction) and returns a
// numerical index for that view
function getViewIndexFromDirection(direction) {
	var viewcount = 0;
	var foundview = false;
	$.each($currentroomchain, function() {
		if (!foundview && $(this).attr("id") == direction) {
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



	// add any relevant objects to the view (maybe encapsulate this)
	$currentview.find("object").each(function(){
		var $thisobj = $(this);
		var $objid = $thisobj.attr("id");
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
			var $onclick = $thisobj.find("onclick");
			if ($onclick.length) {
				if ($onclick.attr("action") == "view") {
					console.log("transition to view " + $onclick.attr("id"));
					navToObjView($onclick);
				} else if ($onclick.attr("action") == "popup") {
					console.log("popup with image: " + $onclick.attr("img"));
					makePopUp($onclick);
				} else {
					console.log("object " + $objid + " wants to perform an unknown action");
				}
			} else {
				console.log("object " + $objid + " has no defined onclick action");
			}
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
