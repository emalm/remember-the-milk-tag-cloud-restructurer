// ==UserScript==
// @name           RTM test
// @namespace      rtm_test
// @include        http://www.rememberthemilk.com/*
// @include        https://www.rememberthemilk.com/*
// @include        http://*.www.rememberthemilk.com/*
// @include        https://*.www.rememberthemilk.com/*
// ==/UserScript==

/*
 ************************************************
 Miscellaneous Display Changes
 ************************************************
 */


function DisableSidebarAnimation() {
	var L = unsafeWindow.document.getElementById("detailsbox");
	L.moveDiv = function () {
		var L = unsafeWindow.document.getElementById("detailsbox");
		L.style.top = window.pageYOffset+"px";
		unsafeWindow.Autocomplete.handleWindowResize();
	};
}

function FixSidebar() {
	unsafeWindow.document.getElementById("detailsbox").style.position = "static"
}

function HideRTMCowGraphic() {
	/* Hide cow graphic */
	document.getElementById("appheaderlogo").style.display = "none";
	
	/* Reduce padding on status bar div so left edge aligns with list box */
	document.getElementById("statusbox").style.paddingLeft = "9px";	
}

HideRTMCowGraphic()
/*
DisableSidebarAnimation()
*/
FixSidebar()

/*
 ************************************************
 Task Cloud Restructuring
 ************************************************
 */

var sections = [
	{ prefix: '@', type: 'flat', 
	  data: { displayname: 'Contexts', color: 'green', hide: false } },
	{ prefix: '-', type: 'hierarchy', 
	  data: { depth: 3, colors: ['red', 'purple', 'brown'], hide: [] } },
	{ prefix: '', type: 'flat', 
	  data: { displayname: 'Miscellaneous', color: 'yellow', hide: false } }
];

var prefs = {
	renameTags: false,
	useBordersForCategories: true,
	borderColor: 'lightGrey',
	useSymbolInHeader: true,
	keepSymbolInTags: false,
	indentChildTags: true,
	overrideHeaderLinks: true,
	EMPTY_QUERY_STR: 'tag:youdonthaveanytasksinthissection',
	hiddenTags: ['system']
};

String.prototype.trim = function() { return this.replace(/^\s+|\s+$/, ''); };

Array.prototype.contains = function (element)  {
	for (var i = 0; i < this.length; i++) {
    	if (this[i] == element)  {
			return true;
        }
    }
    return false;
};

var waitingTask;

function handleChange() {
	if (waitingTask) {
		window.clearTimeout(waitingTask);
	}
	waitingTask = window.setTimeout(processCloud, 100);
}

function listenForTagChanges(listen) {
	var cloud = document.getElementById('taskcloudcontent');
	if (cloud) {
		if (listen) {
			cloud.addEventListener("DOMNodeInserted", handleChange, false);
			cloud.addEventListener("DOMNodeRemoved", handleChange, false);
		} else {
			cloud.removeEventListener("DOMNodeInserted", handleChange, false);
			cloud.removeEventListener("DOMNodeRemoved", handleChange, false);
		}
	}
}

function testProcessCloud() {
	unsafeWindow.console.log("Processing Cloud in RTM Test...")
	
	listenForTagChanges(false);

	var cloud = document.getElementById('taskcloudcontent');
	
	// re-hook listenForTagChanges
	listenForTagChanges(true);
}

testProcessCloud();

window.addEventListener('unload', 
					    function() { listenForTagChanges(false); }, false);











