// ---------------------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------------------

var startingarea = "area1"; // These will eventually be loaded from a config file
var startingroom = "kitchen";
var startingdirection = "n";






// ---------------------------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------------------------

var $currentarea, $currentroom, $currentview;

var $currentroomviews = {}; // This object maps room ids to their views
var $currentroomchain = []; // This array contains all the standard views of the current room (ie, not object views)

var currentchainindex = 0;


$(document).ready(function(){

	// load the starting area
	loadArea(startingarea);

	$(".nav").click(function(){
		navClick($(this));
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

	$("#debug").click(function() {
		if ($(this).prop("checked")) {
			$("body").prepend("<style>* { border: 2px dotted black; }</style>");
		} else {
			$("style").remove();
		}
	});
});



// ---------------------------------------------------------------------------------------
// SETUP FUNCTIONS
// ---------------------------------------------------------------------------------------

// loadArea loads a set of area data (various rooms within an area, their views, etc) from
// an XML file named [areaName].xml. It then navigates to index 0 in that room (for now)
function loadArea(areaName) {
	$.ajax({
		type: "GET",
		url: areaName + ".xml",
		dataType: "xml",
		success: function(xml) {
			$currentarea = $(xml);

			console.log("area "+ areaName + " loaded");

			switchToRoomWithDirection(startingroom, startingdirection);
		},
		error: function (xhr, ajaxOptions, thrownError) {
			console.log("encountered an error parsing + " + areaName + ".xml")
        	alert(thrownError);
      	}
	});
}

function setcurrentchainindex(direction) {
	//need to set currentchainindex appropriately
	for (var i = 0; i < $currentroomchain.length; i++) {
		if ($currentroomchain[i] == direction) {
			currentchainindex = i;
			return;
		}
	}
}

// populateRoomChain builds an array of all standard (directional, non-object) views in a room
function populateRoomViewChain() {
	// first, empty both the room chain and room views object
	$currentroomchain = [];
	$currentroomviews = {};

	$currentroom.find("view").each(function(){
		if ($(this).attr("type") != "object") {
			//console.log("adding " + $(this).attr("id") + " to the room chain");
			$currentroomchain.push($(this).attr("id")); // add any navigable views to the room chain
		}
		//console.log ("adding " + $(this).attr("id") + " to the room views object");
		var viewid = $(this).attr("id");
		$currentroomviews[viewid] = $(this); // add all views to the roomviews object
	});
}





// ---------------------------------------------------------------------------------------
// NAV FUNCTIONS
// ---------------------------------------------------------------------------------------

// navClick is called any time a nav button is clicked
function navClick(navbutton) {

	if ($.inArray("objectviewnav", navbutton.classes()) != -1) {
		// we are in an object view, all nav buttons should back out to the main view
		navToViewByIndex(currentchainindex);
	} else {
		// we are in a normal view, nav buttons behave according to their id
		if (navbutton.id == "forward") {
			goForward();
		} else {
			// left or right
			turnTo(navbutton.attr("id"));
		}
	}
}


// goForward is called when a #forward nav button is clicked
function goForward() {
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
}


// turnTo simplifies the logic of cycling from view to view within a room (without overflowing
// the bounds of the room, and then navigating to the appropriate view.
function turnTo(direction) {
	if (direction == undefined) {
		console.log("direction is undefined, doing nothing");
		return;
	}

	if (direction == "left") {
		currentchainindex--;
		//console.log("turning left, currentchainindex is now " + currentchainindex);
		if (currentchainindex < 0) {
			currentchainindex = $currentroomchain.length-1;
		}
	} else if (direction == "right") {
		currentchainindex++;
		//console.log("turning right, currentchainindex is now " + currentchainindex);
		if (currentchainindex >= $currentroomchain.length) {
			currentchainindex = 0;
		}
	} else {
		// this nav box doesn't go left or right, so do nothing
		console.log ("can't turn to direction " + direction + ", doing nothing");
		return;
	}

	navToViewByIndex(currentchainindex);
}


// navToView is the core navigation function, all navigation functions should eventually
// call this.
function navToView(viewobject) {
	onLeaveView();

	$currentview = viewobject;

	changeBackgroundImage($currentroom.attr("ID"), $currentview.attr("id"));

	onLoadView();

}

// changeBackgroundImage changes the game background image (duh)
function changeBackgroundImage(roomname, viewname) {
	$(".game").css("background-image", "url(\"img/" + roomname + "-" + viewname + ".png\")");
}

// navToViewByIndex uses an index number (from the current room chain) to find the
// appropriate view (useful for turning)
function navToViewByIndex(index) {

	if (index == undefined) {
		console.log("index to navigate to was undefined, navigating to 0");
		index = 0;
	}

	currentchainindex = index;

	console.log ("navigating to view by index " + index);

	navToView($currentroomviews[$currentroomchain[index]]);

}

// navToViewByDirection uses the name of a direction to navigate, which is useful for room
// switching
function navToViewByDirection(direction) {

	if (direction == undefined) {
		console.log("index to navigate to was undefined, navigating to first view in this room");
		direction = $currentroomchain[0];
	}

	setcurrentchainindex(direction);

	console.log ("navigating to view by direction " + direction);

	navToView($currentroomviews[direction]);

}

// navToViewByName navigates using a specific id, this should really only be used for
// object views, because it does not change the current view index.
function navToViewByID(viewid) {

	if (viewid == undefined) {
		console.log("id to navigate to was undefined, navigating to first view in this room");
		viewid = $currentroomchain[0];
	}

	console.log ("navigating to view by id " + viewid);

	navToView($currentroomviews[viewid]);
}

// navToObjView takes an onclick object (as defined in xml) and begins navigating to the specified view
function navToObjView(onclick) {
	navToViewByID(onclick.attr("id"));
}


// onLoadView is called any time a view is loaded. It handles setting up nav boxes and
// objects for the given view.
function onLoadView() {
	// determine whether the "forward" clickbox should be active & make it so
	if ($currentview.has("fwd-room").length > 0) {
		//console.log("forward exists here");
		$("#forward").css("display", "block");
	} else {
		//console.log("forward does not exist here");
		$("#forward").css("display", "none");
	}

	// determine if this is an object view, and if so enable the "back" clickbox
	if ($currentview.attr("type") == "object") {
		$("#back").css("display", "block");
		$("#left, #right").addClass("objectviewnav");

	} else {
		$("#back").css("display", "none");
		$("#left, #right").removeClass("objectviewnav");
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
					console.log("transitioning to object view " + $onclick.attr("id"));
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


// onLeaveView is called just before a new view is loaded, it is used to unload objects
function onLeaveView() {
	if ($currentview != undefined) {
		$(".obj").each(function(){
			console.log("removing object " + $(this).attr("id"));
			$(this).remove();
		});
	}
}






// ---------------------------------------------------------------------------------------
// ROOM SWITCHING FUNCTIONS
// ---------------------------------------------------------------------------------------


// switchToRoomWithDirection assigns $customroom to the room data matching the requested ID
// and navigates to the specified direction in the room.
function switchToRoomWithDirection(roomID, viewdirection) {

	console.log("attempting to switch to room " + roomID + " facing " + viewdirection);

	var foundcurrentroom = false;

	// pull out all of the room objects from the area file
	$currentarea.find("room").each(function(){
		if (!foundcurrentroom && $(this).attr("ID") == roomID) {
			// if this is the right ID, then we're done here
			$currentroom = $(this);
			foundcurrentroom = true;
			console.log("currently in room " + $currentroom.attr("ID"));
			return false;
		}
	});

	// make sure we actually found the requested room
	if (!foundcurrentroom) {
		alert("requested room doesn't exist in this area");
	} else {
		populateRoomViewChain();

		navToViewByDirection(viewdirection);
	}
}

// switchToRoom shortcut, so that we need not always specify a direction (usually, switching
// rooms will take us to the same direction in a new room)
function switchToRoom(roomID) {
	switchToRoomWithDirection(roomID, $currentview.attr("id"));
	console.log("switching to room " + roomID + " with view " + $currentview.attr("id"));
}









// ---------------------------------------------------------------------------------------
// HELPER FUNCTIONS
// ---------------------------------------------------------------------------------------


// makePopUp takes an onclick object (as defined in xml) and constructs a popup overlay from it
function makePopUp(onclick) {

}






// ---------------------------------------------------------------------------------------
// USEFUL DEBUG THINGS
// ---------------------------------------------------------------------------------------

/*



	// print out all of the views associated with this room (and only this room)
	$currentroom.find("view").each(function(){
		console.log($(this).attr("ID"));
	});

*/
