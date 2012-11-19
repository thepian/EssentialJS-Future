(function(){
	"use strict"; // Enable ECMAScript "strict" operation for this function. See more: http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/

	var essential = Resolver("essential",{});
	var ObjectType = essential("ObjectType");
	var console = essential("console");
	var MutableEvent = essential("MutableEvent");
	var StatefulResolver = essential("StatefulResolver");
	var statefulCleaner = essential("statefulCleaner");
	var HTMLElement = essential("HTMLElement");
	var HTMLScriptElement = essential("HTMLScriptElement");
	var Layouter = essential("Layouter");
	var Laidout = essential("Laidout");

	var addEventListeners = essential("addEventListeners");
	var removeEventListeners = essential("removeEventListeners");
	var DocumentRoles = essential("DocumentRoles");
	var fireAction = essential("fireAction");

	var baseUrl = location.href.substring(0,location.href.split("?")[0].lastIndexOf("/")+1);
	var serverUrl = location.protocol + "//" + location.host;


	function form_onsubmit(ev) {
		var frm = this;
		setTimeout(function(){
			frm.submit(ev);
		},0);
		return false;
	}
	function form_submit(ev) {
		if (document.activeElement) document.activeElement.blur();
		this.blur();

		dialog_submit.call(this,ev);
	}
	function dialog_submit(clicked) {
		if (clicked == undefined) clicked = MutableEvent().withDefaultSubmit(this);

		if (clicked.commandElement) {
			fireAction(clicked);
		} else {
			//TODO default submit when no submit button or event
		}
	}

	function toolbar_submit(ev) {
		return dialog_submit.call(this,ev);
	}

	function form_blur() {
		for(var i=0,e; e=this.elements[i]; ++i) e.blur();
	}
	function form_focus() {
		for(var i=0,e; e=this.elements[i]; ++i) {
			var autofocus = e.getAttribute("autofocus");
			if (autofocus == undefined) continue;
			e.focus();
			break; 
		}
	}
	
	function dialog_button_click(ev) {
		ev = MutableEvent(ev).withActionInfo();

		if (ev.commandElement) {
			if (ev.stateful && ev.stateful("state.disabled")) return; // disable
			if (ev.ariaDisabled) return; //TODO fold into stateful

			this.submit(ev); //TODO action context
			ev.stopPropagation();
		}
		if (ev.defaultPrevented) return false;
	}


	DocumentRoles.enhance_dialog = function (el,role,config) {
		switch(el.tagName.toLowerCase()) {
			case "form":
				// f.method=null; f.action=null;
				el.onsubmit = form_onsubmit;
				el.__builtinSubmit = el.submit;
				el.submit = form_submit;
				el.__builtinBlur = el.blur;
				el.blur = form_blur;
				el.__builtinFocus = el.focus;
				el.focus = form_focus;
				break;
				
			default:
				// make sure no submit buttons outside form, or enter key will fire the first one.
				forceNoSubmitType(el.getElementsByTagName("BUTTON"));
				applyDefaultRole(el.getElementsByTagName("BUTTON"));
				applyDefaultRole(el.getElementsByTagName("A"));

				el.submit = dialog_submit;
				// debugger;
				//TODO capture enter from inputs, tweak tab indexes
				break;
		}
		
		addEventListeners(el, {
			"click": dialog_button_click
		},false);

		return {};
	};

	DocumentRoles.layout_dialog = function(el,layout,instance) {
		
	};
	DocumentRoles.discard_dialog = function (el,role,instance) {
	};

	function applyDefaultRole(elements) {
		for(var i=0,el; el = elements[i]; ++i) switch(el.tagName) {
			case "button":
			case "BUTTON":
				el.setAttribute("role","button");
				break;
			case "a":
			case "A":
				el.setAttribute("role","link");
				break;
			// menuitem
		}
	}

	/* convert listed button elements */
	function forceNoSubmitType(buttons) {

		for(var i=0,button; button = buttons[i]; ++i) if (button.type == "submit") {
			button.setAttribute("type","button");
			if (button.type == "submit") button.type = "submit";
		}
	}

	DocumentRoles.enhance_toolbar = function(el,role,config) {
		// make sure no submit buttons outside form, or enter key will fire the first one.
		forceNoSubmitType(el.getElementsByTagName("BUTTON"));
		applyDefaultRole(el.getElementsByTagName("BUTTON"));
		applyDefaultRole(el.getElementsByTagName("A"));

		el.submit = toolbar_submit;

		addEventListeners(el, {
			"click": dialog_button_click
		},false);

		return {};
	};

	DocumentRoles.layout_toolbar = function(el,layout,instance) {
		
	};
	DocumentRoles.discard_toolbar = function(el,role,instance) {
		
	};

	// menu, menubar
	DocumentRoles.enhance_navigation = 
	DocumentRoles.enhance_menu = DocumentRoles.enhance_menubar = DocumentRoles.enhance_toolbar;

	DocumentRoles.enhance_sheet = function(el,role,config) {
		
		return {};
	};

	DocumentRoles.layout_sheet = function(el,layout,instance) {
		
	};
	DocumentRoles.discard_sheet = function(el,role,instance) {
		
	};

	DocumentRoles.enhance_spinner = function(el,role,config) {
		var opts = {
			lines: 8,
			length: 5,
			width: 5,
			radius: 8,
			color: '#fff',
			speed: 1,
			trail: 60,
			shadow: false,
			hwaccel: true,
			className: 'spinner',
			zIndex: config.zIndex != undefined? config.zIndex : 2e9, // data-role
			top: 'auto',
			left: 'auto'
		};
		return new Spinner(opts).spin(el);
	};

	DocumentRoles.layout_spinner = function(el,layout,instance) {
		
	};
	DocumentRoles.discard_spinner = function(el,role,instance) {
		instance.stop();
		el.innerHTML = "";
	};
	
	function _lookup_generator(name,resolver) {
		var constructor = Resolver(resolver || "default")(name,"null");
		
		return constructor? Generator(constructor) : null;
	}

	DocumentRoles.enhance_application = function(el,role,config) {
		if (config.variant) {
//    		variant of generator (default ApplicationController)
		}
		if (config.generator) {
			var g = _lookup_generator(config.generator,config.resolver);
			if (g) {
				var instance = g(el,role,config);
				return instance;
			}
			else return false; // not yet ready
		}
		
		return {};
	};

	DocumentRoles.layout_application = function(el,layout,instance) {
		
	};
	DocumentRoles.discard_application = function(el,role,instance) {
		
	};

	var contains;
	function doc_contains(a,b) {
		return a !== b && (a.contains ? a.contains(b) : true);
	}
	function cdp_contains(a,b) {
		return !!(a.compareDocumentPosition(b) & 16);
	}
	function false_contains(a,b) { return false; }

	if (document.documentElement.contains) {
		contains = doc_contains;
	} else if (document.documentElement.compareDocumentPosition) {
		contains = cdp_contains;
	} else {
		contains = false_contains;
	}
	essential.declare("contains",contains);

	//TODO find parent of scrolled role

	function getOfRole(el,role,parentProp) {
		parentProp = parentProp || "parentNode";
		while(el) {
			if (el.getAttribute && el.getAttribute("role") == role) return el;
			el = el[parentProp];
		}
		return null;
	}

	var is_inside = 0;

	var ENHANCED_SCROLLED_PARENT_EVENTS = {
		"mousemove": function(ev) {
		},
		"mouseover": function(ev) {
			var enhanced = this.scrolled.enhanced;

			if (this.stateful.movedOutInterval) clearTimeout(this.stateful.movedOutInterval);
			this.stateful.movedOutInterval = null;
			this.stateful.set("over",true);
			enhanced.vert.show();
			enhanced.horz.show();
		},
		"mouseout": function(ev) {
			var sp = this;
			var enhanced = this.scrolled.enhanced;
			
			if (this.stateful.movedOutInterval) clearTimeout(this.stateful.movedOutInterval);
			this.stateful.movedOutInterval = setTimeout(function(){
				sp.stateful.set("over",false);
				if (sp.stateful("dragging") != true) {
					enhanced.vert.hide();
					enhanced.horz.hide();
				}
				console.log("mouse out of scrolled.");
			},30);
		}

		// mousedown, scroll, mousewheel
	};

	var ENHANCED_SCROLLED_EVENTS = {
		"scroll": function(ev) {
			// if not shown, show and if not entered and not dragging, hide after 1500 ms
			if (!this.enhanced.vert.shown) {
				this.enhanced.vert.show();
				this.enhanced.horz.show();
				if (!this.stateful("over") && !this.stateful("dragging")) {
					this.enhanced.vert.delayedHide();
					this.enhanced.horz.delayedHide();
				}
			}
			this.enhanced.refresh(this);
		},
		"mousewheel": function(ev) {
			var delta = ev.delta, deltaX = ev.x, deltaY = ev.y;
			// calcs from jquery.mousewheel.js

			// Old school scrollwheel delta
			if (ev.wheelDelta) { delta = ev.wheelDelta/120; }
			if (ev.detail) { delta = -ev.detail/3; }

			// New school multidim scroll (touchpads) deltas
			deltaY = delta;

			// Gecko
			if (ev.axis != undefined && ev.axis == ev.HORIZONTAL_AXIS) {
				deltaY = 0;
				deltaX = -1 * delta;
			}

			// Webkit
			if (ev.wheelDeltaY !== undefined) { deltaY = ev.wheelDeltaY/120; }
			if (ev.wheelDeltaX !== undefined) { deltaX = -1 * ev.wheelDeltaX/120; }

			if ((deltaX < 0 && 0 == this.scrollLeft) || 
				(deltaX > 0 && (this.scrollLeft + Math.ceil(this.offsetWidth) == this.scrollWidth))) {

				if (ev.preventDefault) ev.preventDefault();
				return false;
			}
			// if webkitDirectionInvertedFromDevice == false do the inverse
			/*
			if ((deltaY < 0 && 0 == this.scrollTop) || 
				(deltaY > 0 && (this.scrollTop + Math.ceil(this.offsetHeight) == this.scrollHeight))) {

				if (ev.preventDefault) ev.preventDefault();
				return false;
			}
			*/
		}

		// mousedown, scroll, mousewheel
	};

	// Current active Movement activity
	var activeMovement = null;

	function ElementMovement() {
	}

	ElementMovement.prototype.track = function(ev) {

	};

	ElementMovement.prototype.start = function(el,event) {
		var movement = this;
		this.el = el;
		this.event = event;

		// getPageOffsets
		this.startPageY = event.pageY; // - getComputedStyle( 'top' )
		this.startPageX = event.pageX; //??
		document.onselectstart = function(ev) { return false; };

		//TODO capture in IE

		if (el.stateful) el.stateful.set("dragging",true);

		this.drag_events = {
			//TODO  keyup ESC
			"mousemove": function(ev) {
				var maxY = 1000, maxX = 1000;
				var y = Math.min( Math.max(ev.pageY - movement.startPageY,0), maxY );
				var x = Math.min( Math.max(ev.pageX - movement.startPageX,0), maxX );
				movement.track(ev,x,y);
			},
			"mouseup": function(ev) {
				movement.end();
			}
		};
		addEventListeners(document.body,this.drag_events);

		activeMovement = this;

		return this;
	};

	ElementMovement.prototype.end = function() {
		if (this.el.stateful) this.el.stateful.set("dragging",false);
		removeEventListeners(document.body,this.drag_events);

		delete document.onselectstart ;

		activeMovement = null;

		return this;
	};

	
	var ENHANCED_SCROLLBAR_EVENTS = {
		"mousedown": function(ev) {
			if (activeMovement != null) return;

			if (ev.preventDefault) ev.preventDefault();
			//TODO this.stateful instead of var scrolled = this.parentNode.scrolled;
			var scrolled = this.parentNode.scrolled;
			var movement = new ElementMovement();
			movement.track = function(ev,x,y) {
				scrolled.scrollTop = (scrolled.scrollHeight -  scrolled.clientHeight) * y / (scrolled.clientHeight - 9);
				scrolled.scrollLeft = (scrolled.scrollWidth -  scrolled.clientWidth) * y / (scrolled.clientWidth - 9);
			};
			movement.start(this,ev);
			return false; // prevent default
		}
	};

	function EnhancedScrollbar(el,opts,trackScrolled,update) {
		this.scrolled = el;
		this.el = HTMLElement("div", { "class":opts["class"] }, '<nav><header></header><footer></footer></nav>');
		el.parentNode.appendChild(this.el);
		this.autoHide = opts.autoHide;
		this.trackScrolled = trackScrolled;
		this.update = update; // update method

		this.trackScrolled(el);

		addEventListeners(el,ENHANCED_SCROLLED_EVENTS);
		addEventListeners(this.el,ENHANCED_SCROLLBAR_EVENTS);

		if (opts.initialDisplay !== false) {
			if (this.show()) {
				this.hiding = setTimeout(this.hide.bind(this), parseInt(opts.initialDisplay,10) || 3000);
			}
		}
	}

	EnhancedScrollbar.prototype.show = function() {
		if (this.scrolledContentSize <= this.scrolledSize) return false;

		if (!this.shown) {
			this.update(this.scrolled);
			this.el.className += " shown";
			if (this.hiding) {
				clearTimeout(this.hiding);
				delete this.hiding;
			}
			this.shown = true;

			return true;
		}
	};

	EnhancedScrollbar.prototype.hide = function() {
		if (this.autoHide !== false && this.shown) {
			this.el.className = this.el.className.replace(" shown","");
			if (this.hiding) {
				clearTimeout(this.hiding);
				delete this.hiding;
			}
			this.shown = false;
		}
	};

	EnhancedScrollbar.prototype.delayedHide = function(delay) {
		this.hiding = setTimeout(this.hide.bind(this), 1500);
	};

	EnhancedScrollbar.prototype.destroy = function() {
		this.el.parentNode.removeChild(this.el);
		callCleaners(this.el);
		delete this.el;
	};

	function vertTrackScrolled(scrolled) {
		this.scrolledTo = scrolled.scrollTop;
		this.scrolledSize = scrolled.clientHeight; //scrolled.offsetHeight - scrollbarSize();
		this.scrolledContentSize = scrolled.scrollHeight;
	}

	function vertUpdateScrollbar(scrolled) {
		this.el.firstChild.style.top = (100 * this.scrolledTo / this.scrolledContentSize) + "%";
		this.el.firstChild.style.height = (100 * this.scrolledSize / this.scrolledContentSize) + "%";
	}

	function horzTrackScrolled(scrolled) {
		this.scrolledTo = scrolled.scrollLeft;
		this.scrolledSize = scrolled.clientWidth; //scrolled.offsetWidth - scrollbarSize();
		this.scrolledContentSize = scrolled.scrollWidth;
	}

	function horzUpdateScrollbar(scrolled) {
		this.el.firstChild.style.left = (100 * this.scrolledTo / this.scrolledContentSize) + "%";
		this.el.firstChild.style.width = (100 * this.scrolledSize / this.scrolledContentSize) + "%";
	}

	function EnhancedScrolled(el,config) {
		//? this.el = el
		this.x = false !== config.x;
		this.y = false !== config.y;
		this.vert = new EnhancedScrollbar(el,{ "class":"vert-scroller", initialDisplay: config.initialDisplay },vertTrackScrolled,vertUpdateScrollbar);
		this.horz = new EnhancedScrollbar(el,{ "class":"horz-scroller", initialDisplay: config.initialDisplay },horzTrackScrolled,horzUpdateScrollbar);

		el.parentNode.scrolled = el;
		StatefulResolver(el.parentNode,true);
		addEventListeners(el.parentNode,ENHANCED_SCROLLED_PARENT_EVENTS);
		el.parentNode.scrollContainer = "top";

		this.refresh(el);
	}

	EnhancedScrolled.prototype.refresh = function(el) {
		this.vert.trackScrolled(el);
		this.vert.update(el);
		this.horz.trackScrolled(el);
		this.horz.update(el);
	};

	EnhancedScrolled.prototype.layout = function(el,layout) {
		//TODO update scrollbars

		this.refresh(el);
	};

	EnhancedScrolled.prototype.discard = function(el) {
		if (this.vert) this.vert.destroy();
		if (this.horz) this.horz.destroy();
		delete this.vert;
		delete this.horz;

		callCleaners(el.parentNode);
		callCleaners(el);
	};

	DocumentRoles.enhance_scrolled = function(el,role,config) {
		StatefulResolver(el,true);
		el.style.cssText = 'position:absolute;left:0;right:0;top:0;bottom:0;overflow:scroll;';
		var r = new EnhancedScrolled(el,config);
		el.enhanced = r;

		return r;
	};

	DocumentRoles.layout_scrolled = function(el,layout,instance) {
		instance.layout(el,layout);
	};
	
	DocumentRoles.discard_scrolled = function(el,role,instance) {
		instance.discard(el);
		el.stateful.destroy();
		delete el.enhanced;
	};
	

})();