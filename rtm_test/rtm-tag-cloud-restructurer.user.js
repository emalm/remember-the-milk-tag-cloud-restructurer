// ==UserScript==
// @name           RTM: Tag Cloud Restructurer
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

var prefs = {
	useBordersForCategories: true,
	borderColor: 'lightGrey',
	useSymbolInHeader: true,
	keepSymbolInTags: false,
	renameTags: false,
	indentChildTags: true,
	overrideHeaderLinks: true,
	EMPTY_QUERY_STR: 'tag:youdonthaveanytasksinthissection',
	hiddenTags: ['system', 'sent']
};

var sections = [
	{ prefix: '@', type: sectionFlat, 
	               hide: false,
	               displayname: 'Contexts', 
	               color: 'green' },
	
	{ prefix: '-', type: sectionHierarchy, 
	               hide: false,
	               depth: 3, 
	               sizes: ['6', '3', '1'],
	               separators: '|/+', 
	               colors: ['red', 'purple', 'brown'], 
	               hidechildren: [] },
	
	{ prefix: '', type: sectionFlat, 
	              hide: false,
	              displayname: 'Miscellaneous', 
	              color: 'gray' }
];

/*
 * Section classes
 */

function sectionBase(arguments) {
	this.prefix = arguments.prefix;
	this.hide = arguments.hide;
}

sectionBase.prototype.setupDiv = null;
sectionBase.prototype.addTag = null;
sectionBase.prototype.assembleDiv = null;
sectionBase.prototype.styleFinalBlock = null;

function sectionFlat(arguments) {
	this.super_constructor = sectionBase;
	this.super_constructor(arguments);
	this.displayname = arguments.displayname;
	this.color = arguments.color;
	this.setupDiv();
}

function sectionHierarchy(arguments) {
	this.super_constructor = sectionBase;
	this.super_constructor(arguments);
	this.depth = arguments.depth;
	this.sizes = arguments.sizes;
	this.separators = arguments.separators;
	this.colors = arguments.colors;
	this.hidechildren = arguments.hidechildren;
	this.setupDiv();
}

/*
 * Routines for sectionFlat class
 */

sectionFlat.prototype.setupDiv = function() {

	var wrapperDiv = document.createElement('div');

	var headerSpan = document.createElement('span');
	wrapperDiv.appendChild(headerSpan);

	var headerLink = document.createElement('a');
	headerSpan.appendChild(headerLink);
	headerLink.appendChild(document.createTextNode(this.displayname));
	var tagDiv = document.createElement('div');
	wrapperDiv.appendChild(tagDiv);

	if (prefs.useBordersForCategories) {
		wrapperDiv.style.borderTop = '1px solid';
		wrapperDiv.style.borderLeft = '1px solid';
		wrapperDiv.style.borderRight = '1px solid';
		wrapperDiv.style.borderColor = prefs.borderColor;
		wrapperDiv.style.paddingLeft = '2px';			
	}

	wrapperDiv.style.bottomMargin = '2px';

	headerSpan.className = 'tasktag level6';
	headerSpan.style.display = 'block';
	headerLink.style.color = this.color;
	tagDiv.style.paddingLeft = '10px';

	this.div = wrapperDiv;
	this.headerTag = headerLink;
	this.tagDiv = tagDiv;
	this.searchlist = [];
}

sectionFlat.prototype.addTag = function(tag) {
	tagname = tag.getAttribute('origTagName')

	this.tagDiv.appendChild(tag.parentNode);
	this.tagDiv.appendChild(document.createTextNode(' '));

	tag.style.color = this.color;
	
	if (!prefs.keepSymbolInTags) {
		tag.innerHTML = tagname.substring(this.prefix.length);
		if (prefs.renameTags) {
			tag.innerHTML = capitalizeAndSpace(tag.innerHTML);
		}
	}
	
	// add tag type, name to search string
	var searchstring = getTagSearchString(tag);

	if (searchstring) {
		this.searchlist.push(searchstring);
	}
	
	// deal with sizing (level##) in tag span, maybe
	// unsafeWindow.console.log("Tag '%s' is level '%d'", tagname, getTagSize(tag));
	
	if (getTagSize(tag) > 4) {
		setTagSize(tag, 4);
	}
}

sectionFlat.prototype.assembleDiv = function() {	
	var onclickstring = "document.getElementById('listFilter').value=";
	var searchstring = this.searchlist.join(' or ');
	
	onclickstring += "'" + searchstring + "';";
	onclickstring += "control.updateListFilter();return false";
	
	this.headerTag.setAttribute("onclick", onclickstring);
}

sectionFlat.prototype.styleFinalBlock = function() {
	if (prefs.useBordersForCategories) {
		this.div.style.borderBottom = '1px solid';
		this.div.style.borderColor = prefs.borderColor;
	}
}

/*
 * Routines for sectionHierarchy class
 */

sectionHierarchy.prototype.setupDiv = function() {
	var wrapperDiv = document.createElement('div');
	this.div = wrapperDiv;

	this.children = [];
}

sectionHierarchy.prototype.addTag = function(tag) {
	tagname = tag.getAttribute('origTagName')

	// strip off prefix from tagname
	tagname = tagname.substring(this.prefix.length);
	
	// find, store display name if present
	var displayname = null;
	var tagpath = null;
	
	var result = tagname.match(/\[\[.*\]\]\s*$/);
	
	if (result) {
		displayname = result[0].trim();
		displayname = displayname.substring(2, displayname.length - 2);
		
		tagpath = tagname.substring(0, tagname.length - result[0].length);
		tagpath = tagpath.trim();
	}
	else {
		tagpath = tagname.trim();
	}
	
	// split tagpath into tokens
	
	var re = new RegExp("[" + this.separators + "]+");
	var pathtokens = tagpath.split(re);
	
	if (pathtokens.length >= this.depth) {
		// too many tokens, so we need to get the last token
		var newtokens = pathtokens.slice(0, this.depth - 1);
		re = new RegExp("^[" + this.separators + "]+");
		var lasttoken = tagpath;
		
		for( var i = 0; i < this.depth - 1; i++ ) {
			lasttoken = lasttoken.substring(pathtokens[i].length);
			lasttoken = lasttoken.replace(re, '');
		}
		
		newtokens.push(lasttoken);
		pathtokens = newtokens;
	}
	
	if (displayname == null) {
		displayname = pathtokens[pathtokens.length - 1];
	}
	
	tag.innerHTML = displayname;
	
	// package tokens into tree structure in section
	var currentChildren = this.children;
	
	for ( var i = 0; i < pathtokens.length; i++ ) {
		
		// find child node, if there
		var childIndex = null;
		
		for (var j = 0; j < currentChildren.length; j++) {
			if (currentChildren[j].name == pathtokens[i]) {
				childIndex = j;
				break;
			}
		}
		
		if (childIndex != null) {
			currentChildren = currentChildren[childIndex].children;
		}
		else {
			// create new child in tree
			var newchild = { name: pathtokens[i], div: null, tag: null, children: [] };
			currentChildren.push(newchild);
			currentChildren = newchild.children;
			
			// add tag to new child node's tag if last in token list
			if (i == pathtokens.length - 1) {
				newchild.tag = tag;
			}
		}
	}
}

sectionHierarchy.prototype.assembleDiv = function() {
	var topDiv = this.div;
	var topChildren = this.children;
	
	for (var i = 0; i < topChildren.length; i++) {
		// pick color for top-level node and its children
		var topNodeColor = this.colors[i % this.colors.length];
		
		this.assembleNodeDiv(topChildren[i], 1, topNodeColor);
		var childDiv = topChildren[i].div
		
		if (prefs.useBordersForCategories) {
			childDiv.style.borderTop = '1px solid';
			childDiv.style.borderLeft = '1px solid';
			childDiv.style.borderRight = '1px solid';
			childDiv.style.borderColor = prefs.borderColor;
			childDiv.style.paddingLeft = '2px';			
		}
		topDiv.appendChild(childDiv);
	}
}

// helper routine for hierarchy node traversal
sectionHierarchy.prototype.assembleNodeDiv = function(node, depth, color) {
	// make sublevel for node
	node.div = document.createElement("div");
	
	if (node.tag != null) {
		// set color for tag anchor, insert containing span into node's div
		node.tag.style.color = color;
		setTagSize(node.tag, this.sizes[depth - 1]);
		node.div.appendChild(node.tag.parentNode);
	}
	// TODO: produce tag if null; search for all children?

	// adjust style for divs of leaf nodes? need to work this out
	if (depth == this.depth) {
		// at the lowest depth in hierarchy
		// so display tags inline
		node.div.style.display = "inline";
		
		// no children to process
	}
	else {
		// container for children's divs
		// TODO: set indent in hierarchy?
		var childDiv = document.createElement("div");
		childDiv.style.paddingLeft = "10px";
		node.div.appendChild(childDiv);

		// create divs for children
		for (var i = 0; i < node.children.length; i++) {
			this.assembleNodeDiv(node.children[i], depth + 1, color);
			childDiv.appendChild(node.children[i].div)
		}
	}
}

sectionHierarchy.prototype.styleFinalBlock = function() {
	if (prefs.useBordersForCategories) {
		if (this.children.length > 0) {
			var lastChild = this.children[this.children.length - 1];
			lastChild.div.style.borderBottom = '1px solid';
			lastChild.div.style.borderColor = prefs.borderColor;
		}
		else {
			this.div.style.borderBottom = '1px solid';
			this.div.style.borderColor = prefs.borderColor;
		}
	}
}

/*
 * Utility routines
 */

function constructSections(sectionargumentslist) {
	
	sectionobjlist = [];
	
	for (var i = 0; i < sectionargumentslist.length; i++ ) {
		secargs = sectionargumentslist[i];
		var newsection = new secargs.type(secargs);
		sectionobjlist.push(newsection);
	}
	
	return sectionobjlist;
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

function capitalizeAndSpace(str) {
	str = str.replace(/_+/g, ' ');
	
    str = str.replace(/\w+/g, function(a){
        return a.charAt(0).toUpperCase() + a.substr(1).toLowerCase();
    });
    return str;
}

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

function getTagType(tag) {
	var classname = tag.parentNode.className;

	var result = classname.match(/\w+tag/);
	
	if (result == null) {
		return false;
	}
	
	var tagstring = result[0];
	
	if (tagstring == "tasktag") {
		return "tag";
	}
	else if (tagstring == "listtag") {
		return "list";
	}
	else if (tagstring == "locationtag") {
		return "location";
	}
	else {
		return false;
	}
}


function getTagSize(tag) {
	var classname = tag.parentNode.className;
	var re = /level(\d+)/;

	var result = classname.match(re);
	
	if (result == null) {
		return false;
	}
	
	return parseInt(result[1]);
}

function setTagSize(tag, newsize) {
	var classname = tag.parentNode.className;
	var newlevelclass = "level" + newsize;
	
	// unsafeWindow.console.log("Resizing '%s' to '%s'", classname, newlevelclass);
	// unsafeWindow.console.log(classname.replace(/level\d+/, newlevelclass));

	tag.parentNode.className = classname.replace(/level\d+/, newlevelclass);
}

function getTagSearchString(tag) {
	var searchstring = '';
	
	var tagtype = getTagType(tag);
	
	// if tagtype found, build into search string
	if (tagtype) {
		searchstring = tagtype + ":";
	}
	
	// wrap name in quotes if contains a space
	if (tagname.match(/\s/)) {
		searchstring += "&quot;" + tagname + "&quot;";
	}
	else {
		searchstring += tagname;
	}
	
	return searchstring;
}

function setupSectionDivs(sectionlist) {
	
	// BEGIN DEBUG
	// extraDebugDiv = document.createElement('div');
	// extraDebugDiv.className = 'taskcloudcontent';
	// overviewboxdiv = document.getElementById('overviewright');
	// overviewboxdiv.appendChild(extraDebugDiv);
	// END DEBUG
	
	
	for( var i = 0; i < sectionlist.length; i++ ) {
		sectionlist[i].setupDiv();
		
		// DEBUG
		// extraDebugDiv.appendChild(sectionlist[i].div);
	}	
}

function collectAndMatchTags(cloud, sectionlist) {
	// cloud as context, collect all anchors inside spans
	var xpathStr = "./span/a"; 
	allTags = document.evaluate(xpathStr, cloud, null,
		XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
		
	for (var tagIndex = 0; tagIndex < allTags.snapshotLength; tagIndex++) {
	
		thisTag = allTags.snapshotItem(tagIndex);
		thisTagName = thisTag.innerHTML;
		
		// tell tag to remember its original name
		// because we might change the HTML representation later

		if (thisTag.getAttribute('origTagName')) {
			thisTagName = thisTag.getAttribute('origTagName');
		} else {
			thisTag.setAttribute('origTagName', thisTagName);
		}
		
		
		if (prefs.hiddenTags.contains(thisTagName)) {
			thisTag.parentNode.parentNode.removeChild(thisTag.parentNode);
			continue;
		}
		
		var matchingSection = matchTagToSection(sectionlist, thisTag);
		
		if (matchingSection) {
			matchingSection.addTag(thisTag);
		}
		else {
			// remove any tags not falling into our sections
			// should happen only if no section defined with empty prefix
			thisTag.parentNode.parentNode.removeChild(thisTag.parentNode);
		}
	}
}



function matchTagToSection(sectionlist, tag) {
	for (var i = 0; i < sectionlist.length; i++) {
		var tagname = tag.getAttribute('origTagName');
		var sectionPrefix = sectionlist[i].prefix;
		if (tagname.indexOf(sectionPrefix) == 0) {
			return sectionlist[i];
		}
	}
	
	return false;
}

function processCloud() {
	// DEBUG
	// unsafeWindow.console.log("Processing Cloud in RTM Test...")
	
	listenForTagChanges(false);
	
	var sectionlist = constructSections(sections);
	
	// set up divs for sections, store in sections' data dictionaries
	//setupSectionDivs(sectionlist);
	
	var cloud = document.getElementById('taskcloudcontent');
		
	if (cloud) {
		// process all tags in cloud: add to approp section
		collectAndMatchTags(cloud, sectionlist);
		// assemble section divs into #taskcloudcontent	
		var displayedSections = [];

		for ( var i = 0; i < sectionlist.length; i++) {
			sectionlist[i].assembleDiv();

			if (sectionlist[i].hide == false) {
				displayedSections.push(sectionlist[i]);
			}
		}

		for (var i = 0; i < displayedSections.length; i++ ) {
			cloud.appendChild(displayedSections[i].div);

			if (i == displayedSections.length - 1) {
				displayedSections[i].styleFinalBlock();
			}
		}

		// copy #taskcloudcontent html, handlers to #taskcloudcontent_copy
		var copy = document.getElementById("taskcloudcontent_copy");

		if (copy) {
			copy.innerHTML = cloud.innerHTML;
		}
	}
	
	// re-hook listenForTagChanges
	listenForTagChanges(true);
}

processCloud();

window.addEventListener('unload', 
					    function() { listenForTagChanges(false); }, false);
