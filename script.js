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
	var $objsettings = objecttoadd; // the js object defining this object
	var $objid = $objsettings.attr("id"); // the root name of this object
	var $objswitch = $objsettings.attr("switch"); // the switch tied to this objects display (if one exists)
	var $objstate = $objsettings; // the js object defining the object's current state (as determined by the switch). by default this is the same as the root js object for this object
	var conditionalvalue = ""; // the string that is modified in different states. for images, it is used as a filename suffix, for text it replaces the whole text
	var clickable; // should this object be clickable?
	var $onclick; // the settings for what should happen when the object is clicked (if it's clickable)

	console.log("adding object " + $objid + " at " + $objsettings.attr("x") + ", " + $objsettings.attr("y"));


	// need to determine object state here
	// very first thing we do is check for a switch, and get the value of that switch
	// then use the switch to set $objstate and conditionalvalue

	if ($objswitch) {
		var switchvalue = $switches[$objswitch].value;
		conditionalvalue = switchvalue;

		$objstate = getStateFromSwitch($objsettings, switchvalue);
		if ($objstate != $objsettings) {
			conditionalvalue = $objstate.text().replace(/(\r\n|\n|\r)/gm,"");
		}
	}


	// determine if there is an onclick on the state, or on the object itself

	if ($objstate.children("onclick").length) {
		// current state has onclick
		clickable = true;
		$onclick = $objstate.children("onclick");
	} else {
		// current state does not have onclick
		if ($objstate = $objsettings) {
			// this state is the default one
			clickable = false;
		} else {
			// this state is not the default one
			if ($objsettings.children("onclick").length) {
				// root object has an onclick
				clickable = true;
				$onclick = $objsettings.children("onclick");
			} else {
				// root object does not have an onclick
				clickable = false;
			}
		}
	}


/*	clickable = true;
	$onclick = $objstate.find("state > onclick");

	if (!$onclick.length) { // failed to find an onclick for the state, should check the root object
		console.log("this state does not have an onclick");
		$onclick = $objsettings.find("object > onclick");
		if (!$onclick.length) { // failed to find an onclick on the object
			console.log("this object doesn't have an onclick either");
			clickable = false;
		} else {
			console.log("but there is an onclick on the object");
		}
	} else {
		console.log("this state has an onclick");
	}*/


	// use <a> if it is clickable (has an onclick child object)
	// otherwise, make it a <div>
	// (the attr variable is for the href= value if it is clickable)
	var tag = "";
	var attr = "";

	if (clickable) {
		console.log("this object should have an <a> tag.");
		tag = "a";
		attr = "href=\"#obj\"";
	} else {
		console.log("this object should have an <div> tag.");
		tag = "div";
	}

	// put the object in the scene
	$(".object-container").append("<" + tag + " " + attr + " class=\"obj\" id=\"" + $objid + "\"></" + tag + ">");


	var obj = $("#" + $objid); // then find the object in the DOM so we can reference it later


	// if this object is dependent on a switch, then we should remove & re-add it if that switch changes
	if ($objswitch) {
		$switches[$objswitch].registerListener(function(){
			obj.remove();
			addObjectToView($objsettings);
		});
	}


	// what kind of object are we dealing with here?
	if ($objsettings.attr("type") == "text") {
		// this is a text object
		var textvalue = "";

		if ($objswitch) {
			// should get value from a switch
			textvalue = conditionalvalue;

		} else {
			// value is a static string
			textvalue = $objsettings.text();
		}

		obj.append(textvalue);

	} else if ($objsettings.attr("type") == "image"){
		// this is an image object

		var imagesuffix = "";

		if ($objswitch) {
			// should get image from a switch
			imagesuffix = conditionalvalue;
			// i would definitely like to have a fallback in here, if it can't find an image matching the suffix...
		}

		obj.css("background-image", "url(\"img/" + $currentroom.attr("id") + "-" + $objid + imagesuffix + ".png\")");

	} else {
		// this is a simple clickbox, for the time being no special processing is needed
	}


	// position the object
	obj.css("width", $objsettings.attr("width") / 3); // these should all eventually scale dynamically with the canvas, right now i am using a canvas scaled to 1/3 the size of the background images (1920x1080)
	obj.css("height", $objsettings.attr("height") / 3);
	obj.css("top", $objsettings.attr("y") / 3);
	obj.css("left", $objsettings.attr("x") / 3);


	// what happens when the object is clicked (if it has an onclick)
	if (clickable) {
		obj.click(function(){
			console.log("object " + $objid + " was clicked.");

			var $onclick = $objstate.find("onclick");

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



// getStateFromSwitch takes a js object defining an object and the value of a switch, and
// returns a state object if it finds one matching the current value of the switch. if it
// doesn't find a matching state it returns the root js object.
function getStateFromSwitch(objsettings, switchvalue) {
	var newstate = objsettings;
	objsettings.find("state").each(function() {

		if ($(this).attr("value") == switchvalue) {
			newstate = $(this);
			return;
		}
	});

	return newstate;
}

/*
// setTextObjectValueFromSwitch gets the value of a switch and checks it against any
// specified states for the text object. if it matches any, it uses the text for that state.
// otherwise, it simply uses the current value of the specified switch.
function setTextObjectValueFromSwitch(textobj, switchname, objsettings) {
	textobj.empty();
	var newtextvalue = $switches[switchname].value;

	// check to see if the switch matches any specific state
	objsettings.find("state").each(function(){
		if ($(this).attr("value") == $switches[switchname].value) {
			newtextvalue = $(this).text();
		}
	});

	textobj.append(newtextvalue);

}*/

// getImageSuffixFromSwitch provides a suffix for an image filename. it gets the value
// of a switch and checks it against any specified states for the image object. if it matches
// any, it uses the text to determine the new image name. otherwise, it simply uses the
// current value of the specified switch.
function getImageSuffixFromSwitch(switchname, objsettings) {

	var newimagesuffix = $switches[switchname].value;

	// check to see if the switch matches any specific state
	objsettings.find("state").each(function(){
		if ($(this).attr("value") == $switches[switchname].value) {
			newimagesuffix = $(this).text();
			return;
		}
	});

	return newimagesuffix;

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
