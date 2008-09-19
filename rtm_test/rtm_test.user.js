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
	// Hide cow graphic
	document.getElementById("appheaderlogo").style.display = "none";
	
	// Reduce padding on status bar div so left edge aligns with list box
	document.getElementById("statusbox").style.paddingLeft = "9px";	
}

HideRTMCowGraphic()
//DisableSidebarAnimation()
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


var sectionCallbacks = {
	flat: { setupDiv: setupFlatDiv, addTag: function() {} },
	hierarchy: { setupDiv: setupHierarchyDiv, addTag: function() {} }
}

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

function setupSectionDivs() {
	
	// BEGIN DEBUG
	extraDebugDiv = document.createElement('div');
	extraDebugDiv.className = 'taskcloudcontent';
	detailsboxdiv = document.getElementById('detailsbox');
	unsafeWindow.console.log(detailsboxdiv);
	detailsboxdiv.appendChild(extraDebugDiv);
	// END DEBUG
	
	
	for( var i = 0; i < sections.length; i++ ) {
		var curSection = sections[i];
		unsafeWindow.console.log("Processing Section %s %s", curSection.prefix, curSection.type);
		
		sectionCallbacks[curSection.type].setupDiv(curSection);
		
		extraDebugDiv.appendChild(curSection.data.wrapperDiv);
	}	
}


function setupFlatDiv(section) {
	
	var wrapperDiv = document.createElement('div');
	
	unsafeWindow.console.log("Here")
	var headerSpan = document.createElement('span');
	wrapperDiv.appendChild(headerSpan);

	var headerLink = document.createElement('a');
	headerSpan.appendChild(headerLink);
	headerLink.appendChild(document.createTextNode(section.data.displayname));
	var tagDiv = document.createElement('div');
	wrapperDiv.appendChild(tagDiv);
	// setupHeader(miscDiv, miscHeader, miscTagDiv, miscLink, miscDivColor);
	// setupHeader(wrapperDiv, headerDiv, tagDiv, tagLink, customColor)
	
	if (prefs.useBordersForCategories) {
		wrapperDiv.style.border = '1px solid';
		wrapperDiv.style.borderColor = prefs.borderColor;
		wrapperDiv.style.paddingLeft = '2px';			
	}
	
	wrapperDiv.style.bottomMargin = '2px';
	headerSpan.className = 'tasktag level11 headerdiv';
	headerSpan.style.display = 'block';
	headerLink.className = 'tasktag level9';
	headerLink.style.color = section.data.color;
	tagDiv.style.paddingLeft = '10px';

	section.data.wrapperDiv = wrapperDiv;
	section.data.tagDiv = tagDiv;
}

function setupHierarchyDiv(section) {
	var wrapperDiv = document.createElement('div');
	section.data.wrapperDiv = wrapperDiv;
}

function processCloud() {
	// DEBUG
	unsafeWindow.console.log("Processing Cloud in RTM Test...")
	
	listenForTagChanges(false);

	// set up divs for sections, store in sections' data dictionaries
	setupSectionDivs();
	
	
	/*
	var cloud = document.getElementById('taskcloudcontent');
	
	unsafeWindow.console.log(cloud);
	
	if (cloud) {
		// cloud as context, collect all anchors inside spans
		var xpathStr = "./span/a"; 
		allTags = document.evaluate(xpathStr, cloud, null,
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
	}
	*/
	
	// process all tags in cloud: add to approp section
	
	// assemble section divs into #taskcloudcontent
	
	// copy #taskcloudcontent html, handlers to #taskcloudcontent_copy
	
	// re-hook listenForTagChanges
	listenForTagChanges(true);
}

processCloud();

window.addEventListener('unload', 
					    function() { listenForTagChanges(false); }, false);











