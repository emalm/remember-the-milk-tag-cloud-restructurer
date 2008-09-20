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
	{ prefix: '@', type: sectionFlat, 
	               hide: false,
	               displayname: 'Contexts', 
	               color: 'green' },
	
	{ prefix: '-', type: sectionHierarchy, 
	               hide: false,
	               depth: 3, 
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

function sectionFlat(arguments) {
	this.super_constructor = sectionBase;
	this.super_constructor(arguments);
	this.displayname = arguments.displayname;
	this.color = arguments.color;
}

function sectionHierarchy(arguments) {
	this.super_constructor = sectionBase;
	this.super_constructor(arguments);
	this.depth = arguments.depth;
	this.separators = arguments.separators;
	this.colors = arguments.colors;
	this.hidechildren = arguments.hidechildren;
}


var prefs = {
	useBordersForCategories: true,
	borderColor: 'lightGrey',
	useSymbolInHeader: true,
	keepSymbolInTags: false,
	renameTags: false,
	indentChildTags: true,
	overrideHeaderLinks: true,
	EMPTY_QUERY_STR: 'tag:youdonthaveanytasksinthissection',
	hiddenTags: ['system', 'inbox', 'sent']
};

var sectionConstructors = {
	flat: sectionFlat,
	hierarchy: sectionHierarchy
}

sectionFlat.prototype.setupDiv = setupFlatDiv;
sectionFlat.prototype.addTag = addTagToFlatSection;
sectionFlat.prototype.assembleDiv = assembleFlatSectionDiv;

sectionHierarchy.prototype.setupDiv = setupHierarchyDiv;
sectionHierarchy.prototype.addTag = addTagToHierarchySection;
sectionHierarchy.prototype.assembleDiv = assembleHierarchySectionDiv;

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

	unsafeWindow.console.log(classname);

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


function setupSectionDivs(sectionlist) {
	
	// BEGIN DEBUG
	extraDebugDiv = document.createElement('div');
	extraDebugDiv.className = 'taskcloudcontent';
	overviewboxdiv = document.getElementById('overviewright');
	// unsafeWindow.console.log(overviewboxdiv);
	overviewboxdiv.appendChild(extraDebugDiv);
	// END DEBUG
	
	
	for( var i = 0; i < sectionlist.length; i++ ) {
		var curSection = sectionlist[i];
		
		// DEBUG
		// unsafeWindow.console.log("Processing Section %s %s", curSection.prefix, curSection.type);
		
		curSection.setupDiv(curSection);
		
		// DEBUG
		extraDebugDiv.appendChild(curSection.div);
	}	
}


function setupFlatDiv(section) {
	
	var wrapperDiv = document.createElement('div');
	
	var headerSpan = document.createElement('span');
	wrapperDiv.appendChild(headerSpan);

	var headerLink = document.createElement('a');
	headerSpan.appendChild(headerLink);
	headerLink.appendChild(document.createTextNode(section.displayname));
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
	
	// TODO: don't need this style now?
	headerSpan.className = 'tasktag level11 headerdiv';
	headerSpan.style.display = 'block';
	headerLink.className = 'tasktag level9';
	headerLink.style.color = section.color;
	tagDiv.style.paddingLeft = '10px';
	
	// TODO: set up handling for click event on the header

	section.div = wrapperDiv;
	section.headerTag = headerLink;
	section.tagDiv = tagDiv;
	section.searchlist = [];
}

function setupHierarchyDiv(section) {
	var wrapperDiv = document.createElement('div');
	section.div = wrapperDiv;
	
	section.children = [];
}

function addTagToFlatSection(section, tag) {
	tagname = tag.getAttribute('origTagName')

	// DEBUG
	// unsafeWindow.console.log("Added '%s' to section '%s'", tagname, section.prefix);
	
	section.tagDiv.appendChild(tag.parentNode);
	section.tagDiv.appendChild(document.createTextNode(" "));

	tag.style.color = section.color;
	
	if (!prefs.keepSymbolInTags) {
		tag.innerHTML = tagname.substring(section.prefix.length);
		if (prefs.renameTags) {
			tag.innerHTML = capitalizeAndSpace(tag.innerHTML);
		}
	}
	
	// add tag type, name to search string
	
	var searchstring = '';
	
	var tagtype;
	tagtype = getTagType(tag);
	
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
	
	section.searchlist.push(searchstring);
	
	// deal with sizing (level##) in tag span, maybe
}

function addTagToHierarchySection(section, tag) {
	tagname = tag.getAttribute('origTagName')

	// DEBUG
	// unsafeWindow.console.log("Added '%s' to section '%s'", tagname, section.prefix);
	
	// strip off prefix from tagname
	tagname = tagname.substring(section.prefix.length);
	
	// find, store display name if present
	var displayname = null;
	var tagpath = null;
	
	var result = tagname.match(/\[\[.*\]\]\s*$/);
	
	if (result) {
		
		displayname = result[0].trim();
		// DEBUG
		// unsafeWindow.console.log(displayname);
		displayname = displayname.substring(2, displayname.length - 2);
		
		tagpath = tagname.substring(0, tagname.length - result[0].length);
		tagpath = tagpath.trim();
		
		// DEBUG
		// unsafeWindow.console.log("Tag '%s' has display name '%s'", tagpath, displayname);
	}
	else {
		// DEBUG
		// unsafeWindow.console.log("Tag '%s' has no display name", tagname);
		tagpath = tagname.trim();
	}
	
	// split tagpath into tokens
	
	var re = new RegExp("[" + section.separators + "]+");
	var pathtokens = tagpath.split(re);
	
	if (pathtokens.length >= section.depth) {
		// too many tokens, so we need to get the last token
		var newtokens = pathtokens.slice(0, section.depth - 1);
		re = new RegExp("^[" + section.separators + "]+");
		var lasttoken = tagpath;
		
		for( var i = 0; i < section.depth - 1; i++ ) {
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
	var currentChildren = section.children;
	
	for ( var i = 0; i < pathtokens.length; i++ ) {
		
		// DEBUG
		// unsafeWindow.console.log("Searching for '%s'", pathtokens[i]);
		// unsafeWindow.console.log("Length of current children: %d", currentChildren.length);
		
		// find child node, if there
		var childIndex = null;
		
		for (var j = 0; j < currentChildren.length; j++) {
			// DEBUG
			// unsafeWindow.console.log(currentChildren[j].name);
			if (currentChildren[j].name == pathtokens[i]) {
				childIndex = j;
				// DEBUG
				// unsafeWindow.console.log("Found at index %d", childIndex);
				break;
			}
		}
		
		if (childIndex != null) {
			currentChildren = currentChildren[childIndex].children;
		}
		else {
			// DEBUG
			// unsafeWindow.console.log("Not found, creating new node");

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
	
	// unsafeWindow.console.log(section)
}

function assembleFlatSectionDiv(section) {
	// this string "document.getElementById('listFilter').value='tag:\'@errand\' or tag:@palo-alto'; control.updateListFilter();return false"
	// works for onclick attribute of anchor
	
	var onclickstring = "document.getElementById('listFilter').value=";
	var searchstring = section.searchlist.join(' or ');
	unsafeWindow.console.log(searchstring);
	
	
	onclickstring += "'" + searchstring + "';";
	onclickstring += "control.updateListFilter();return false";
	
	section.headerTag.setAttribute("onclick", onclickstring);
}

function assembleHierarchySectionDiv(section) {
	var topDiv = section.div;
	var topChildren = section.children;
	
	for (var i = 0; i < topChildren.length; i++) {
		// pick color for top-level node and its children
		var topNodeColor = section.colors[i % section.colors.length];
		
		assembleHierarchyNodeDiv(topChildren[i], section.depth - 1, topNodeColor);
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

function assembleHierarchyNodeDiv(node, depth, color) {
	// make sublevel for 
	node.div = document.createElement("div");
	
	// set color for tag anchor, insert containing span into node's div
	node.tag.style.color = color;
	node.div.appendChild(node.tag.parentNode);

	// adjust style for divs of leaf nodes? need to work this out
	if (depth == 0) {
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
			assembleHierarchyNodeDiv(node.children[i], depth - 1, color);
			childDiv.appendChild(node.children[i].div)
		}
	}
}


function matchTagToSection(sectionlist, tag) {
	// DEBUG
	// unsafeWindow.console.log("Processing " + tag.getAttribute('origTagName'));

	for (var i = 0; i < sectionlist.length; i++) {

		// DEBUG
		// unsafeWindow.console.log("Checking section " + sectionlist[i].prefix);

		if (tag.getAttribute('origTagName').indexOf(sectionlist[i].prefix) == 0) {
			return sectionlist[i];
		}
	}
	
	return false;
}

function processCloud() {
	// DEBUG
	unsafeWindow.console.log("Processing Cloud in RTM Test...")
	
	listenForTagChanges(false);
	
	var sectionlist = constructSections(sections);
	unsafeWindow.console.log(sectionlist);
	
	// set up divs for sections, store in sections' data dictionaries
	setupSectionDivs(sectionlist);
	
	// process all tags in cloud: add to approp section
	var cloud = document.getElementById('taskcloudcontent');
		
	if (cloud) {
		// cloud as context, collect all anchors inside spans
		var xpathStr = "./span/a"; 
		allTags = document.evaluate(xpathStr, cloud, null,
			XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
			
		for (var tagIndex = 0; tagIndex < allTags.snapshotLength; tagIndex++) {
		
			thisTag = allTags.snapshotItem(tagIndex);
			thisTagName = thisTag.innerHTML;
			
			// DEBUG
			// unsafeWindow.console.log(thisTagName);
			
			// tell tag to remember its original name
			// because we might change the HTML representation later
	
			if (thisTag.getAttribute('origTagName')) {
				thisTagName = thisTag.getAttribute('origTagName');
			} else {
				thisTag.setAttribute('origTagName', thisTagName);
			}
			
			
			if (prefs.hiddenTags.contains(thisTagName)) {
				// DEBUG
				// unsafeWindow.console.log("Removing " + thisTagName);
				thisTag.parentNode.parentNode.removeChild(thisTag.parentNode);
				continue;
			}
			
			var matchingSection = matchTagToSection(sectionlist, thisTag);
			
			if (matchingSection) {
				matchingSection.addTag(matchingSection, thisTag);
			}
			else {
				// remove any tags not falling into our sections
				// should happen only if no section defined with empty prefix
				thisTag.parentNode.parentNode.removeChild(thisTag.parentNode);
			}
		}
	}
	
	// assemble section divs into #taskcloudcontent
	for ( var i = 0; i < sectionlist.length; i++) {
		sectionlist[i].assembleDiv(sectionlist[i]);
		
		if (sectionlist[i].hide == false) {
			cloud.appendChild(sectionlist[i].div);
		}
		
		unsafeWindow.console.log(sectionlist[i]);
	}
	
	// copy #taskcloudcontent html, handlers to #taskcloudcontent_copy
	var copy = document.getElementById("taskcloudcontent_copy");
	
	if (copy) {
		copy.innerHTML = cloud.innerHTML;
	}
	
	// re-hook listenForTagChanges
	listenForTagChanges(true);
}

processCloud();

window.addEventListener('unload', 
					    function() { listenForTagChanges(false); }, false);











