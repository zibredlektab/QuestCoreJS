// ---------------------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------------------

var gameconfigname = "game";






// ---------------------------------------------------------------------------------------
// INIT (don't edit anything below here)
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


	// debug outline checkbox
	$("#debug").click(function() {
		if ($(this).prop("checked")) {
			$(".game").addClass("outlined");
		} else {
			$(".game").removeClass("outlined");
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
			min: parseInt($(this).attr("min")),
			max: parseInt($(this).attr("max")),
			rollover: $(this).attr("rollover"),
			listeners:{},

			set value(val) {
				var newvalue = this.internalvalue;

				if (val > this.max) {
					if (this.rollover) {
						newvalue = this.min;
					} else {
						newvalue = this.max;
					}
				} else if (val < this.min) {
					if (this.rollover) {
						newvalue = this.max;
					} else {
						newvalue = this.min;
					}
				} else {
					newvalue = val;
				}

				this.internalvalue = newvalue;

				// call all of the listener functions for this switch
				$.each(this.listeners, function(obj, listener) {
					listener(newvalue);
				});
			},

			add: function(val) {
				this.value = parseInt(val) + parseInt(this.internalvalue);
			},

			subtract: function(val) {
				this.value = parseInt(this.internalvalue) - parseInt(val);
			},

			get value() {
				return this.internalvalue;
			},

			// register listener functions, by adding them to the listeners object (keyed by their object id)
			registerListener: function(objid, newlistener) {
				this.listeners[objid] = newlistener;
			},

			removeListener: function(listenertoremove) {
				delete this.listeners[listenertoremove];
			}
		};
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
			$currentroomchain.push($(this).attr("id")); // add any navigable views to the room chain
		}
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
		if (navbutton.attr("id") == "forward") {
			// forward
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
			// navigate using the specified direction
			switchToRoomWithDirection($currentview.find("fwd-room").text(), $currentview.find("fwd-dir").text());
		} else {
			// no forward direction has been specified, try to just move along the current direction
			switchToRoom($currentview.find("fwd-room").text());
		}
	} else {
		console.log ("trying to move forward in a room that does not have a forward link!");
	}
}


// turnTo simplifies the logic of cycling from view to view within a room (without overflowing
// the bounds of the room, and then navigating to the appropriate view.
function turnTo(direction) {
	if (direction == undefined) {
		console.log("turn direction is undefined, doing nothing");
		return;
	}

	if (direction == "left") {
		currentchainindex--;
		if (currentchainindex < 0) {
			currentchainindex = $currentroomchain.length-1;
		}
	} else if (direction == "right") {
		currentchainindex++;
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


	navToView($currentroomviews[direction]);

}

// navToViewByName navigates using a specific id, this should really only be used for
// object views, because it does not change the current view index.
function navToViewByid(viewid) {

	if (viewid == undefined) {
		console.log("id to navigate to was undefined, navigating to first view in this room");
		viewid = $currentroomchain[0];
	}


	navToView($currentroomviews[viewid]);
}


// onLoadView is called any time a view is loaded. It handles setting up nav boxes and
// objects for the given view.
function onLoadView() {
	// determine whether the "forward" clickbox should be active & make it so
	if ($currentview.has("fwd-room").length > 0) {
		$("#forward").css("display", "block");
	} else {
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

	// execute any action objects in the view
	processActions($currentview.find("actions").children());
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


	// use <a> if it is clickable, otherwise make it a <div>
	// (the attr variable is for the href= value if it is clickable)
	var tag = "";
	var attr = "";

	if (clickable) {
		tag = "a";
		attr = "href=\"#obj\"";
	} else {
		tag = "div";
	}

	// put the object in the scene
	$(".object-container").append("<" + tag + " " + attr + " class=\"obj\" id=\"" + $objid + "\"></" + tag + ">");

	// then find the object in the DOM so we can reference it later
	var obj = $("#" + $objid);


	// if this object is dependent on a switch, then we should remove & re-add it if that switch changes
	if ($objswitch) {

		obj.attr("switch", $objswitch);

		$switches[$objswitch].registerListener($objid, function(){
			// remove the current object, so we can start from a blank state
			removeObjectFromView($objid);
			// and remove the object's switch listener
			$switches[$objswitch].removeListener($objid);
			// now, add the object again
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

	// other css stuff
	obj.css(getObjStyleOptions($objstate));


	// what happens when the object is clicked (if it has an onclick)
	if (clickable) {
		obj.click(function(){
			var actions = $objstate.find("onclick").children();
			processActions(actions);
		});
	}
}


// removeObjectFromView is used to remove any registered listeners, and then remove the object
function removeObjectFromView(objid) {
	var $obj = $("#" + objid);

	if ($obj.attr("switch")) {
		// remove the object's switch listener
		$switches[$obj.attr("switch")].removeListener(objid);
	}

	$obj.remove();
}

// processActions goes through any action objects in the view/object and executes actions
// depending on what the action is.
function processActions(actions) {
	actions.each(function(){
		var action = $(this);
		if (action.tagName() == "nav") {
			navToViewByid(action.attr("viewid"));

		} else if (action.tagName() == "popup") {
			makePopUp(action);

		} else if (action.tagName() == "add") {
			var switchname = action.attr("switch");
			$switches[switchname].add(action.attr("value"));

		} else if (action.tagName() == "subtract") {
			var switchname = action.attr("switch");
			$switches[switchname].subtract(action.attr("value"));

		} else if (action.tagName() == "set") {
			var switchname = action.attr("switch");
			$switches[switchname].value = action.attr("value");

		} else {
			console.log("object " + $objid + " wants to perform an unknown action (" + action.tagName() + ")");
		}
	});
}


// getStateFromSwitch takes a js object defining an object and the value of a switch, and
// returns a state object if it finds one matching the current value of the switch. if it
// doesn't find a matching state it returns the root js object.
function getStateFromSwitch(objsettings, switchvalue) {
	var newstate = objsettings;
	var condition;

	objsettings.find("state").each(function() {

		condition = $(this).attr("value");

		if (condition.includes("+")) {
			// this state applies to a range from x to infinity
			if (switchvalue >= condition.replace("+","")) {
				newstate = $(this);
				return;
			}
		} else if (condition.includes("-")) {
			if (condition.match("\\d+-\\d+")) {
				// this state applies to a range of two numbers

				var range = condition.split("-");
				if (switchvalue >= range[0] && switchvalue <= range[1]) {
					// switch is within this range
					newstate = $(this);
					return;
				}

			} else if (condition.match("\\d+-$")) {
				// this state applies to a range from -infinity to x
				if (condition.replace("-","") >= switchvalue) {
					newstate = $(this);
					return;
				}
			} else {
				// this is just a negative number
			}
		}

		if (condition == switchvalue) {
			newstate = $(this);
			return;
		}

	});

	return newstate;
}

function getObjStyleOptions(obj) {
	var options = {};
	var optionsFromXML = obj.attr("css");

	if (optionsFromXML) {
		// this object has css attributes

		optionsFromXML.split(";").forEach(function (option) {
			// each attribute ends in a ;, and for readability may start with a space
			var thisprop = option.replace(/^\s/,"").split(":");
			options[thisprop[0]] = thisprop[1];
		});
	}

	return options;

}


// onLeaveView is called just before a new view is loaded, it is used to unload objects
function onLeaveView() {
	if ($currentview != undefined) {
		$(".obj").each(function(){
			removeObjectFromView($(this).attr("id"));
		});
	}
}





// ---------------------------------------------------------------------------------------
// ROOM SWITCHING FUNCTIONS
// ---------------------------------------------------------------------------------------


// switchToRoomWithDirection assigns $customroom to the room data matching the requested id
// and navigates to the specified direction in the room.
function switchToRoomWithDirection(roomid, viewdirection) {

	var foundcurrentroom = false;

	// pull out all of the room objects from the area file
	$currentarea.find("room").each(function(){
		if (!foundcurrentroom && $(this).attr("id") == roomid) {
			// if this is the right id, then we're done here
			$currentroom = $(this);
			foundcurrentroom = true;
			return false;
		}
	});

	// make sure we actually found the requested room
	if (!foundcurrentroom) {
		alert("requested room doesn't exist in this area");
	} else {
		console.log("entered room " + roomid);
		populateRoomViewChain();

		navToViewByDirection(viewdirection);
	}
}

// switchToRoom shortcut, so that we need not always specify a direction (usually, switching
// rooms will take us to the same direction in a new room)
function switchToRoom(roomid) {
	switchToRoomWithDirection(roomid, $currentview.attr("id"));
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





jQuery.fn.tagName = function() {
	return this.prop("tagName").toLowerCase();
};


// ---------------------------------------------------------------------------------------
// USEFUL DEBUG THINGS
// ---------------------------------------------------------------------------------------

/*


	// print out all of the views associated with this room (and only this room)
	$currentroom.find("view").each(function(){
		console.log($(this).attr("id"));
	});

*/
