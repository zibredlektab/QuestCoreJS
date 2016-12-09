// ---------------------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------------------

var gameconfigname = "game";






// ---------------------------------------------------------------------------------------
// INIT
// ---------------------------------------------------------------------------------------


// starting settings (retrieved from the config file)
var startingarea;
var startingroom;
var startingdirection;


var $gameconfig, $currentarea, $currentroom, $currentview;

var $currentroomviews = {}; // This object maps room ids to their views
var $currentroomchain = []; // This array contains all the standard views of the current room (ie, not object views)
var currentchainindex = 0;

var $switches = {}; // this object maps switch ids to their values, and is initially populated from the config file


$(document).ready(function(){

	// load the config file for this game
	loadConfig(gameconfigname);



	// button stuff
	$(".nav").click(function(){
		navClick($(this));
	});

	$("#popup-bg").click(function(){
		hidePopUp();
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


	// debug outline checkbox
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

// loadConfig loads configuration information for this game, to kick everything off.
function loadConfig(gamename) {
	$.ajax({
		type: "GET",
		url: gamename + ".xml",
		dataType: "xml",
		success: function(xml) {

			$gameconfig = $(xml);

			console.log("game " + $gameconfig.find("title").text() + " loaded");


			// set the window title to the game title
			$("head").append("<title>" + $gameconfig.find("title").text() + "</title>");


			// set up the config stuff
			startingarea = $gameconfig.find("starting-area").text();
			startingroom = $gameconfig.find("starting-room").text();
			startingdirection = $gameconfig.find("starting-direction").text();


			// set up the game switches
			populateSwitches();


			// load the starting area
			loadArea(startingarea);

		},
		error: function (xhr, ajaxOptions, thrownError) {
			console.log("encountered an error parsing game file " + gamename + ".xml")
        	alert(thrownError);
      	}
	});
}

// populateSwitches reads the default state of all game switches and stores them in an object
function populateSwitches() {
	$gameconfig.find("switch").each(function(){
		var switchid = $(this).attr("id");
		$switches[switchid] = {
			internalvalue: $(this).text(),
			min: $(this).attr("min"),
			max: $(this).attr("max"),
			listener: function(val) {},
			set value(val) {
				this.internalvalue = val;
				this.listener(val);
			},
			get value() {
				return this.internalvalue;
			},
			registerListener: function(newlistener) {
				this.listener = newlistener;
			}
		};
		console.log("adding switch " + switchid + " with value of " + $switches[switchid].value + " to the switch list");
	});

}

// loadArea loads a set of area data (various rooms within an area, their views, etc) from
// an XML file named [areaName].xml. It then navigates to the specified starting direction
// in the specified starting room
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
			console.log("encountered an error parsing area file + " + areaName + ".xml")
        	alert(thrownError);
      	}
	});
}


// setCurrentChainIndex takes a direction and uses it to find the appropriate view in the
// "view chain" - the array holding the views for the current room, in order of direction
// it returns a numerical index of the appropriate view
function setCurrentChainIndex(direction) {
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

	changeBackgroundImage($currentroom.attr("id"), $currentview.attr("id"));

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

	setCurrentChainIndex(direction);

	console.log ("navigating to view by direction " + direction);

	navToView($currentroomviews[direction]);

}

// navToViewByName navigates using a specific id, this should really only be used for
// object views, because it does not change the current view index.
function navToViewByid(viewid) {

	if (viewid == undefined) {
		console.log("id to navigate to was undefined, navigating to first view in this room");
		viewid = $currentroomchain[0];
	}

	console.log ("navigating to view by id " + viewid);

	navToView($currentroomviews[viewid]);
}

// navToObjView takes an onclick object (as defined in xml) and begins navigating to the specified view
function navToObjView(onclick) {
	navToViewByid(onclick.attr("id"));
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

	// add any relevant objects to the view
	$currentview.find("object").each(function(){
		addObjectToView($(this));
	});
}

// addObjectToView takes a js object with settings for an object (clickable image, clickbox,
// or dynamic text) with settings defining the object as it is seen by default, and what
// happens when the object is clicked.
function addObjectToView(objecttoadd) {
	var $objsettings = objecttoadd;
	var $objid = $objsettings.attr("id");
	var $objswitch = $objsettings.attr("switch");
	var hasonclick;

	console.log("adding object " + $objid + " at " + $objsettings.attr("x") + ", " + $objsettings.attr("y"));

	// use <a> if it is clickable (has an onclick child object)
	// otherwise, make it a <div>
	// (the attr variable is for the href= value if it is clickable)
	var tag = "";
	var attr = "";

	if ($objsettings.find("onclick").length) {
		hasonclick = true;
		tag = "a";
		attr = "href=\"#obj\"";
	} else {
		hasonclick = false;
		tag = "div";
	}

	// put the object in the scene
	$(".object-container").append("<" + tag + " " + attr + " class=\"obj\" id=\"" + $objid + "\"></" + tag + ">");

	var obj = $("#" + $objid);


	// what kind of object are we dealing with here?
	if ($objsettings.attr("type") == "text") {
		// this is a text object
		var textvalue = "";

		if ($objswitch) {
			// should get value from a switch
			textvalue = $switches[$objswitch].value;

			// register a listener function to re-draw the text if the switch changes
			$switches[$objswitch].registerListener(function(){
				obj.empty();
				obj.append($switches[$objswitch].value);
			});

		} else {
			// value is a static string
			textvalue = $objsettings.text();
		}

		obj.addClass("text-obj");
		obj.append(textvalue);

	} else if ($objsettings.attr("type") == "image"){
		// this is an image object
		obj.css("background-image", "url(\"img/" + $currentroom.attr("id") + "-" + $objid + ".png\")");
	} else {
		// this is a simple clickbox, for the time being no special processing is needed
	}


	// position the object
	obj.css("width", $objsettings.attr("width") / 3); // these should all eventually scale dynamically with the canvas, right now i am using a canvas scaled to 1/3 the size of the background images (1920x1080)
	obj.css("height", $objsettings.attr("height") / 3);
	obj.css("top", $objsettings.attr("y") / 3);
	obj.css("left", $objsettings.attr("x") / 3);


	// what happens when the object is clicked (if it has an onclick)
	if (hasonclick) {
		obj.click(function(){
			console.log("object " + $objid + " was clicked.");

			var $onclick = $objsettings.find("onclick");

			if ($onclick.attr("action") == "view") {
				console.log("transitioning to object view " + $onclick.attr("id"));
				navToObjView($onclick);
			} else if ($onclick.attr("action") == "popup") {
				console.log("popup with image: " + $onclick.attr("img"));
				makePopUp($onclick);
			} else if ($onclick.attr("action") == "add") {
				var switchname = $onclick.attr("switch");
				console.log("adding " + $onclick.attr("value") + " to switch " + switchname);
				$switches[switchname].value = parseInt($switches[switchname].value) + parseInt($onclick.attr("value")); // just pray to god the user set everything up as integers or i don't even know what happens here but it probably fails
				console.log("value of switch " + switchname + " is now " + $switches[switchname].value);

			} else if ($onclick.attr("action") == "subtract") {
				var switchname = $onclick.attr("switch");
				console.log("subtracting " + $onclick.attr("value") + " from switch " + switchname);
				$switches[switchname].value = parseInt($switches[switchname].value) - parseInt($onclick.attr("value"));
				console.log("value of switch " + switchname + " is now " + $switches[switchname].value);

			} else if ($onclick.attr("action") == "set") {
				var switchname = $onclick.attr("switch");
				console.log("adding " + $onclick.attr("value") + " to switch " + switchname);
				$switches[switchname].value = parseInt($onclick.attr("value"));
				console.log("value of switch " + switchname + " is now " + $switches[switchname].value);

			} else {
				console.log("object " + $objid + " wants to perform an unknown action (" + $onclick.attr("action") + ")");
			}
		});
	}
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


// switchToRoomWithDirection assigns $customroom to the room data matching the requested id
// and navigates to the specified direction in the room.
function switchToRoomWithDirection(roomid, viewdirection) {

	console.log("attempting to switch to room " + roomid + " facing " + viewdirection);

	var foundcurrentroom = false;

	// pull out all of the room objects from the area file
	$currentarea.find("room").each(function(){
		if (!foundcurrentroom && $(this).attr("id") == roomid) {
			// if this is the right id, then we're done here
			$currentroom = $(this);
			foundcurrentroom = true;
			console.log("currently in room " + $currentroom.attr("id"));
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
function switchToRoom(roomid) {
	switchToRoomWithDirection(roomid, $currentview.attr("id"));
	console.log("switching to room " + roomid + " with view " + $currentview.attr("id"));
}









// ---------------------------------------------------------------------------------------
// POPUP FUNCTIONS
// ---------------------------------------------------------------------------------------


// makePopUp takes an onclick object (as defined in xml) and constructs a popup overlay from it
function makePopUp(onclick) {
	$("#popup-object").attr("src", "img/" + $currentroom.attr("id") + "-" + onclick.attr("img") + ".png");
	$(".popup-contents").append("<p class=\"popup-caption\">" + onclick.attr("caption") + "</p>");
	$(".popup").fadeIn(200);
}


// hidePopUp clears out the image and caption from the popup display, and hides the display
function hidePopUp() {
	$(".popup").fadeOut(200, function(){
		$("#popup-object").attr("src", "");
		$(".popup-caption").remove();
	});
}




// ---------------------------------------------------------------------------------------
// USEFUL DEBUG THINGS
// ---------------------------------------------------------------------------------------

/*



	// print out all of the views associated with this room (and only this room)
	$currentroom.find("view").each(function(){
		console.log($(this).attr("id"));
	});

*/
