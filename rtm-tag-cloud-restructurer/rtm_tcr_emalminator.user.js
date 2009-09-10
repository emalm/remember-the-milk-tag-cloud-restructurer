// ==UserScript==
// @name           RTM: Tag Cloud Restructurer (emalminator)
// @namespace      http://www.rememberthemilk.com/home/emalminator/*
// @include        http://www.rememberthemilk.com/home/emalminator/*
// @include        https://www.rememberthemilk.com/home/emalminator/*
// @include        http://*.www.rememberthemilk.com/home/emalminator/*
// @include        https://*.www.rememberthemilk.com/home/emalminator/*
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

/*
  Hides cow graphic and adjusts status box position

  Adapted from the RememberTheMilkEnhanced script:
  http://userscripts.org/scripts/show/26057
*/

function HideRTMCowGraphic() {
	// Hide cow graphic
	document.getElementById("appheaderlogo").style.display = "none";
	
	// Reduce padding on status bar div so left edge aligns with list box
	document.getElementById("statusbox").style.paddingLeft = "9px";	
}

HideRTMCowGraphic()
// DisableSidebarAnimation()
FixSidebar()

/*
 ************************************************
 Ordinary List Hiding
 ************************************************
 */


/*
  Much of this code copied or adapted from the RememberTheMilkEnhanced script:
  http://userscripts.org/scripts/show/26057
*/

// TODO: reimplement using XPath?

var doNotRemoveLists = new Array("Inbox","Sent");

RemoveListHandler = function() {
	var listtabs = document.getElementById("listtabs");
	var ul = listtabs.childNodes[0];

	for( var i = 0; i < ul.childNodes.length; i++ ) {
		var tab = ul.childNodes[i];
		var txt = tab.childNodes[0].innerHTML;
		if (tab.className.indexOf("xtab_smartlist") == -1 &&
		 	tab.className.indexOf("xtab_selectted") == -1 && 
			!doNotRemoveLists.contains(txt))
		{
			//tab.setAttribute('class','xtab_smartlist');
			tab.style.display = "none";
		}
	}
	
	ListenForListTabChanges(true);
}

ListenForListTabChanges = function(listen)
{
	var listtabs = document.getElementById("listtabs");
	
	if (listtabs) {
		if (listen) {
			listtabs.addEventListener("DOMNodeInserted", RemoveListHandler, false);
			listtabs.addEventListener("DOMNodeRemoved", RemoveListHandler, false);
		} else {
			listtabs.removeEventListener("DOMNodeInserted", RemoveListHandler, false);
			listtabs.removeEventListener("DOMNodeRemoved", RemoveListHandler, false);
		}
	}
}

RemoveLists = function() {
	//addGlobalStyle('#listtabs ul li { display:none;}');
	//addGlobalStyle('#listtabs ul li.xtab_smartlist,#listtabs ul li.xtab_exclude,#listtabs ul li.xtab_selected { display:block;}');
	ListenForListTabChanges(true);
}

RemoveLists()

window.addEventListener('unload', function() {
	ListenForListTabChanges(false);
}, false);


/*
 ************************************************
 Task Cloud Restructuring
 ************************************************
 */

var prefs = {
	useBordersForCategories: true,
	borderColor: 'lightGrey',
	hiddenTags: ['system', 'sent']
};

// default preferences for each type of section
// some preferences should have no default

var sectionprefs = {
	sectionBase: {
		displayOrder: 0,
		hide: false
	},
	sectionRename: {
		displayOriginalName: false
	},
	sectionFlat: {
		useSymbolInHeader: false,
		keepSymbolInTags: false,
		renameTags: false
	},
	sectionHierarchy: {
		depth: 3,
        sizes: ['6', '4', '1'],
        separators: '|/+', 
		hidechildren: [],
		indentChildTags: true
	}
};

// section definitions

var emalminator_sections = [
	{ prefix: 'inbox', type: sectionRename, 
           	   		displayname: 'Unsorted', 
               		color: 'orange' },

	{ prefix: 'next', type: sectionRename, 
               	   displayname: 'Next Actions', 
                   color: 'red' },

	{ prefix: 'goal', type: sectionRename, 
               	   displayname: 'Goals', 
                   color: 'black' },

	{ prefix: '_', type: sectionFlat, 
	               displayname: 'Responsibilities', 
	               color: '#444444' },

	{ prefix: '@', type: sectionFlat, 
	               displayname: 'Contexts', 
	               color: 'blue' },
	
	{ prefix: '-', type: sectionHierarchy, 
	               colors: ['green', 'purple', 'brown'] },
	
	{ prefix: 'maybe', type: sectionRename, 
               	   displayname: 'Someday/Maybe', 
                   color: 'CornflowerBlue' },

    // catch-all section for unprocessed lists and tags
	{ prefix: '', type: sectionFlat, 
	              displayname: 'Miscellaneous', 
	              color: 'gray' }
];

// pick the above section list as sections to process
var sections = emalminator_sections;

/*
 * Section classes
 */

function sectionBase(arguments) {
	// copy or overwrite default preferences
	for (key in sectionprefs.sectionBase) {
		if (key in arguments) {
			this[key] = arguments[key];
		}
		else {
			this[key] = sectionprefs.sectionBase[key];
		}
	}
	
	// set required data
	this.prefix = arguments.prefix;
}

// void base-class member functions
sectionBase.prototype.setupDiv = null;
sectionBase.prototype.includeTag = null;
sectionBase.prototype.addTag = null;
sectionBase.prototype.assembleDiv = null;
sectionBase.prototype.styleFinalBlock = null;

// constructors for section subclasses

function sectionFlat(arguments) {
	// call sectionBase base class constructor
	this.super_constructor = sectionBase;
	this.super_constructor(arguments);
	
	// copy or overwrite default preferences
	for (key in sectionprefs.sectionFlat) {
		if (key in arguments) {
			this[key] = arguments[key];
		}
		else {
			this[key] = sectionprefs.sectionFlat[key];
		}
	}
	
	// set no-default required data
	this.displayname = arguments.displayname;
	this.color = arguments.color;
	
	// construct html div containing section
	this.setupDiv();
}

function sectionHierarchy(arguments) {
	// call sectionBase base class constructor
	this.super_constructor = sectionBase;
	this.super_constructor(arguments);
	
	// copy or overwrite default preferences
	for (key in sectionprefs.sectionHierarchy) {
		if (key in arguments) {
			this[key] = arguments[key];
		}
		else {
			this[key] = sectionprefs.sectionHierarchy[key];
		}
	}
	
	// set no-default required data
	this.colors = arguments.colors;
	
	// construct html div containing section
	this.setupDiv();
}

function sectionRename(arguments) {
	// call sectionBase base class constructor
	this.super_constructor = sectionBase;
	this.super_constructor(arguments);

	// copy or overwrite default preferences
	for (key in sectionprefs.sectionRename) {
		if (key in arguments) {
			this[key] = arguments[key];
		}
		else {
			this[key] = sectionprefs.sectionRename[key];
		}
	}
	
	// set no-default required data
	this.displayname = arguments.displayname;
	this.color = arguments.color;
	
	// construct html div containing section
	this.setupDiv();
}

/*
 * Routines for sectionFlat class
 */

sectionFlat.prototype.setupDiv = function() {
	this.div = document.createElement('div');

	var headerSpan = document.createElement('span');
	this.div.appendChild(headerSpan);

	this.headerTag = document.createElement('a');
	headerSpan.appendChild(this.headerTag);
	this.headerTag.appendChild(document.createTextNode(this.displayname));
	
	if (this.useSymbolInHeader) {
		this.headerTag.appendChild(document.createTextNode(" (" + this.prefix + ")"));
	}
	
	this.tagDiv = document.createElement('div');
	this.div.appendChild(this.tagDiv);

	if (prefs.useBordersForCategories) {
		this.div.style.borderTop = '1px solid';
		this.div.style.borderLeft = '1px solid';
		this.div.style.borderRight = '1px solid';
		this.div.style.borderColor = prefs.borderColor;
		this.div.style.paddingLeft = '2px';			
	}

	this.div.style.bottomMargin = '2px';

	headerSpan.className = 'tasktag level6';
	headerSpan.style.display = 'block';
	this.headerTag.style.color = this.color;
	this.tagDiv.style.paddingLeft = '10px';

	this.searchlist = [];
}

sectionFlat.prototype.includeTag = function(tag) {
	var tagname = tag.getAttribute('origTagName');
	return (tagname.indexOf(this.prefix) == 0);
}

sectionFlat.prototype.addTag = function(tag) {
	tagname = tag.getAttribute('origTagName')

	this.tagDiv.appendChild(tag.parentNode);
	
	// insert space so that tag spans break across lines
	// consider thin space? \u2009
	this.tagDiv.appendChild(document.createTextNode('\u2009'));

	tag.style.color = this.color;
	
	if (this.keepSymbolInTags == false) {
		tag.innerHTML = tagname.substring(this.prefix.length);
		if (this.renameTags) {
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

sectionHierarchy.prototype.includeTag = function(tag) {
	var tagname = tag.getAttribute('origTagName');
	return (tagname.indexOf(this.prefix) == 0);
}

sectionHierarchy.prototype.addTag = function(tag) {
	var tagname = tag.getAttribute('origTagName')

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
		node.div.appendChild(node.tag.parentNode);
	}
	else {
		// create new tag for this sublevel
		var tagspan = document.createElement('span');
		node.tag = document.createElement('a');
		node.tag.style.color = color;
		tagspan.appendChild(node.tag);
		node.tag.appendChild(document.createTextNode(node.name));
		node.div.appendChild(tagspan);

		// TODO: on click, search for all child nodes?
	}

	// adjust style of tag anchor and span
	// set padding around each tag to 0
	// RTM sets right padding on each tag anchor to 5px as a separator
	node.tag.style.paddingRight = "0px";
	node.tag.parentNode.style.paddingRight = "2px";
	setTagSize(node.tag, this.sizes[depth - 1]);

	// adjust style for divs of leaf nodes? need to work this out
	if (depth == this.depth) {
		// at the lowest depth in hierarchy
		// so display tags inline
		node.div.style.display = "inline";
		
		// no children to process
	}
	else if (depth == this.depth - 1) {
		// in end stages of hierarchy
		// so assemble children as (this tag): (child tag) (child tag) ...
		// so that (this tag) has a hanging indent
		if (node.children.length > 0) {
			node.tag.appendChild(document.createTextNode(":"));
			node.tag.parentNode.style.paddingRight = "5px";
			node.div.style.paddingLeft = "10px";
			node.div.style.textIndent = "-10px";
			node.div.style.color = color;
			
			for (var i = 0; i < node.children.length; i++) {
				this.assembleNodeDiv(node.children[i], depth + 1, color);
				var childtag = node.children[i].tag;
				childtag.parentNode.style.paddingRight = "0px";
				
				if (i > 0) {
					var sepnode = document.createTextNode("\u2009\xb7\u2009");
					node.div.appendChild(sepnode);
				}
				
				node.div.appendChild(childtag.parentNode);
			}
		}		
	}
	else {
		// above 
		// container for children's divs
		// TODO: set indent in hierarchy?
		// create divs for children
		for (var i = 0; i < node.children.length; i++) {
			this.assembleNodeDiv(node.children[i], depth + 1, color);
			node.children[i].div.style.marginLeft = "10px";
			node.div.appendChild(node.children[i].div)
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
 * Routines for sectionRename class
 */

sectionRename.prototype.setupDiv = function() {
	this.div = document.createElement('div');

	if (prefs.useBordersForCategories) {
		this.div.style.borderTop = '1px solid';
		this.div.style.borderLeft = '1px solid';
		this.div.style.borderRight = '1px solid';
		this.div.style.borderColor = prefs.borderColor;
		this.div.style.paddingLeft = '2px';			
	}

	this.div.style.bottomMargin = '2px';
}

sectionRename.prototype.includeTag = function(tag) {
	return (tag.getAttribute('origTagName') == this.prefix);
}

sectionRename.prototype.addTag = function(tag) {
	var tagname = tag.getAttribute('origTagName');
	if (tagname == this.prefix) {
		this.tag = tag;
		this.tag.innerHTML = this.displayname;
		if (this.displayOriginalName) {
			this.tag.innerHTML += " (" + this.prefix + ")";
		}
		this.tag.style.color = this.color;
		setTagSize(this.tag, 6);
		this.div.appendChild(this.tag.parentNode);
	}
}

sectionRename.prototype.assembleDiv = function() {
	
}

sectionRename.prototype.styleFinalBlock = function() {
	if (prefs.useBordersForCategories) {
		this.div.style.borderBottom = '1px solid';
		this.div.style.borderColor = prefs.borderColor;
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
	waitingTask = window.setTimeout(processCloud, 100, sections);
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
	if (classname.match(/level\d+/)) {
		tag.parentNode.className = classname.replace(/level\d+/, newlevelclass);
	}
	else { 
		tag.parentNode.className = classname + " " + newlevelclass;
	}
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
		if (sectionlist[i].includeTag(tag)) {
			return sectionlist[i];
		}
	}
	
	return false;
}

// function to sort sections by decreasing displayorder

function sortSection(a, b) {
	if (a.displayOrder < b.displayOrder)
		return 1;
	if (a.displayOrder > b.displayOrder)
		return -1;
	return 0;
}

function processCloud(sectionlistconfig) {
	// DEBUG
	// unsafeWindow.console.log("Processing Cloud in RTM Test...")
	
	listenForTagChanges(false);
	
	//unsafeWindow.console.log("Config");	
	//unsafeWindow.console.log(sectionlistconfig);
	//unsafeWindow.console.log("Global");	
	//unsafeWindow.console.log(sections);
	
	var sectionlist = constructSections(sections);
	var cloud = document.getElementById('taskcloudcontent');
		
	if (cloud) {
		// process all tags in cloud: add to approp section
		collectAndMatchTags(cloud, sectionlist);

		// assemble section divs into #taskcloudcontent	
		var displayedSections = [];

		// build each section, push those to be displayed onto list
		for ( var i = 0; i < sectionlist.length; i++) {
			sectionlist[i].assembleDiv();

			if (sectionlist[i].hide == false) {
				displayedSections.push(sectionlist[i]);
			}
		}
		
		// sort sections by decreasing displayorder
		displayedSections.sort(sortSection);

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

processCloud(sections);

window.addEventListener('unload', 
					    function() { listenForTagChanges(false); }, false);
