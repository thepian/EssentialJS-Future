/*jslint white: true */
!function () {
	"use strict"; // Enable ECMAScript "strict" operation for this function. See more: http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/

	var essential = Resolver("essential",{}),
		ObjectType = essential("ObjectType"),
		console = essential("console"),
		MutableEvent = essential("MutableEvent"),
		StatefulResolver = essential("StatefulResolver"),
		ApplicationConfig = essential("ApplicationConfig"),
		pageResolver = Resolver("page"),
		getActiveArea = essential("getActiveArea"),
		arrayContains = essential("arrayContains"),
		statefulCleaner = essential("statefulCleaner"),
		HTMLElement = essential("HTMLElement"),
		HTMLScriptElement = essential("HTMLScriptElement"),
		baseUrl = location.href.substring(0,location.href.split("?")[0].lastIndexOf("/")+1),
		serverUrl = location.protocol + "//" + location.host,
		callCleaners = essential("callCleaners"),
		enhancedElements = essential("enhancedElements"),
		maintainedElements = essential("maintainedElements"),
		enhancedWindows = essential("enhancedWindows");

	function delayedScriptOnload(scriptRel) {
		function delayedOnload(ev) {
			var el = this;
			var name = el.getAttribute("name");
			if (name) {
				ApplicationConfig().modules[name] = true;
			}
			setTimeout(function(){
				// make sure it's not called before script executes
				var scripts = pageResolver(["state","loadingScriptsUrl"]);
				if (scripts[el.src.replace(baseUrl,"")] != undefined) {
					// relative url
					pageResolver.set(["state","loadingScriptsUrl",el.src.replace(baseUrl,"")],false);
				} else if (scripts[el.src.replace(serverUrl,"")] != undefined) {
					// absolute url
					pageResolver.set(["state","loadingScriptsUrl",el.src.replace(serverUrl,"")],false);
				}
			},0);
		}
		return delayedOnload;       
	}

	function _queueDelayedAssets()
	{
		//TODO move this to pageResolver("state.ready")
		var config = ApplicationConfig();//TODO move the state transitions here
		var links = document.getElementsByTagName("link");

		//TODO differentiate on type == "text/javascript"
		for(var i=0,l; l=links[i]; ++i) switch(l.rel) {
			case "stylesheet":
				config.resources().push(l);
				break;			
			case "pastload":
			case "preload":
				//TODO differentiate on lang
				var attrsStr = l.getAttribute("attrs");
				var attrs = {};
				if (attrsStr) {
					try {
						eval("attrs = {" + attrsStr + "}");
					} catch(ex) {
						//TODO
					}
				}
				attrs["type"] = l.getAttribute("type") || "text/javascript";
				attrs["src"] = l.getAttribute("src");
				attrs["name"] = l.getAttribute("data-name") || l.getAttribute("name") || undefined;
				attrs["base"] = baseUrl;
				attrs["subpage"] = (l.getAttribute("subpage") == "false" || l.getAttribute("data-subpage") == "false")? false:true;
				//attrs["id"] = l.getAttribute("script-id");
				attrs["onload"] = delayedScriptOnload(l.rel);

				var relSrc = attrs["src"].replace(baseUrl,"");
				l.attrs = attrs;
				if (l.rel == "preload") {
					var langOk = true;
					if (l.lang) langOk = (l.lang == pageResolver("state.lang"));
					if (langOk) {
						pageResolver.set(["state","preloading"],true);
						pageResolver.set(["state","loadingScripts"],true);
						pageResolver.set(["state","loadingScriptsUrl",relSrc],l); 
						document.body.appendChild(HTMLScriptElement(attrs));
						l.added = true;
					} 
				} else {
					var langOk = true;
					if (l.lang) langOk = (l.lang == pageResolver("state.lang"));
					if (langOk) {
						pageResolver.set(["state","loadingScripts"],true);
						pageResolver.set(["state","loadingScriptsUrl",relSrc],l); 
					} 
				}
				break;
		}
		if (! pageResolver(["state","preloading"])) {
			var scripts = pageResolver(["state","loadingScriptsUrl"]);
			for(var n in scripts) {
				var link = scripts[n];
				if (link.rel == "pastload") {
					var langOk = true;
					if (link.lang) langOk = (link.lang == pageResolver("state.lang"));
					if (langOk) {
						document.body.appendChild(HTMLScriptElement(link.attrs));
						link.added = true;
					} 
				}
			}
		}

		// var scripts = document.head.getElementsByTagName("script");
		// for(var i=0,s; s = scripts[i]; ++i) {

		// }

		if (pageResolver(["state","loadingScripts"])) console.debug("loading phased scripts");

		var metas = document.getElementsByTagName("meta");
		for(var i=0,m; m = metas[i]; ++i) {
			switch((m.getAttribute("name") || "").toLowerCase()) {
				case "enhanced roles":
					DocumentRoles.useBuiltins((m.getAttribute("content") || "").split(" "));
					break;
			}
		}
	}
	essential.set("_queueDelayedAssets",_queueDelayedAssets);


	function configRequired(url)
	{
		pageResolver.set(["state","loadingConfig"],true);
		pageResolver.set(["state","loadingConfigUrl",url],true);
	}
	essential.set("configRequired",configRequired);

	function configLoaded(url)
	{
		pageResolver.set(["state","loadingConfigUrl",url],false);
	}
	essential.set("configLoaded",configLoaded);


	function _DialogAction(actionName) {
		this.actionName = actionName;
	} 
	_DialogAction.prototype.activateArea = essential("activateArea"); // shortcut to global essential function
	var DialogAction = essential.set("DialogAction",Generator(_DialogAction));


	function resizeTriggersReflow(ev) {
		// debugger;
		DocumentRoles()._resize_descs();
		for(var i=0,w; w = enhancedWindows[i]; ++i) {
			w.notify(ev);
		}
	}

	/*
		action buttons not caught by enhanced dialogs/navigations
	*/
	function defaultButtonClick(ev) {
		ev = MutableEvent(ev).withActionInfo();
		if (ev.commandElement && ev.commandElement == ev.actionElement) {

			//TODO action event filtering
			//TODO disabled
			fireAction(ev);
		}
	}

	function fireAction(ev) 
	{
		var el = ev.actionElement, action = ev.action, name = ev.commandName;
		if (! el.actionVariant) {
			if (action) {
				action = action.replace(baseUrl,"");
			} else {
				action = "submit";
			}

			el.actionVariant = DialogAction.variant(action)(action);
		}

		if (el.actionVariant[name]) el.actionVariant[name](el,ev);
		else {
			var sn = name.replace("-","_").replace(" ","_");
			if (el.actionVariant[sn]) el.actionVariant[sn](el,ev);
		}
		//TODO else dev_note("Submit of " submitName " unknown to DialogAction " action)
	}
	essential.declare("fireAction",fireAction);


	function _StatefulField(name,el) {
		var stateful = StatefulResolver(el,true);
		return stateful;
	}
	var StatefulField = essential.declare("StatefulField",Generator(_StatefulField, { alloc:false }));

	StatefulField.prototype.destroy = function() {};
	StatefulField.prototype.discard = function() {};

	function _TextField() {

	}
	StatefulField.variant("input[type=text]",Generator(_TextField,_StatefulField));

	function _CheckboxField() {

	}
	StatefulField.variant("input[type=checkbox]",Generator(_CheckboxField,_StatefulField));

	function _TimeField() {

	}
	StatefulField.variant("input[type=time]",Generator(_TimeField,_StatefulField));

	function _CommandField(name,el,role) {

	}
	var CommandField = StatefulField.variant("*[role=link]",Generator(_CommandField,_StatefulField));
	StatefulField.variant("*[role=button]",Generator(_CommandField,_StatefulField));


	/* Enhance all stateful fields of a parent */
	function enhanceStatefulFields(parent) {

		for(var el = parent.firstChild; el; el = el.nextSibling) {
			//TODO avoid non elements, firstChildNode. Skip non type 1 (comments) on old IE
			//TODO do not enhance nested enhanced roles

			var name = el.name || el.getAttribute("data-name") || el.getAttribute("name");
			if (name) {
				var role = el.getAttribute("role");
				var variants = [];
				if (role) {
					//TODO support multiple roles
					if (el.type) variants.push("*[role="+role+",type="+el.type+"]");
					variants.push("*[role="+role+"]");
				} else {
					if (el.type) variants.push(el.tagName.toLowerCase()+"[type="+el.type+"]");
					variants.push(el.tagName.toLowerCase());
				}

				var stateful = StatefulField.variant(variants)(name,el,role);
			}

			enhanceStatefulFields(el); // enhance children
		}
	}
	essential.declare("enhanceStatefulFields",enhanceStatefulFields);

	function _DocumentRoles(handlers,page) {
		this.handlers = handlers || this.handlers || { enhance:{}, discard:{}, layout:{} };
		this._on_event = [];
		this.page = page || ApplicationConfig(); // Ensure that config is present
		
		//TODO configure reference as DI arg

		if (window.addEventListener) {
			window.addEventListener("resize",resizeTriggersReflow,false);
			this.page.body.addEventListener("orientationchange",resizeTriggersReflow,false);
			this.page.body.addEventListener("click",defaultButtonClick,false);
		} else {
			window.attachEvent("onresize",resizeTriggersReflow);
			this.page.body.attachEvent("onclick",defaultButtonClick);
		}

		var descs = this.page.resolver("descriptors");
		this._enhance_descs(descs);
		//this.enhanceBranch(doc);
	}
	var DocumentRoles = essential.set("DocumentRoles",Generator(_DocumentRoles));
	
	_DocumentRoles.args = [
		ObjectType({ name:"handlers" })
	];

/*
	_DocumentRoles.prototype.enhanceBranch = function(el) {
		var descs;
		if (el.querySelectorAll) {
			descs = this._role_descs(el.querySelectorAll("*[role]"));
		} else {
			descs = this._role_descs(el.getElementsByTagName("*"));
		}
		this._enhance_descs(descs);
		//TODO reflow on resize etc
	};

	_DocumentRoles.prototype.discardBranch = function(el) {
		//TODO
	};
*/

	_DocumentRoles.prototype._enhance_descs = function(descs) 
	{
		var incomplete = false, enhancedCount = 0;

		for(var n in descs) {
			var desc = descs[n];

			//TODO speed up outstanding enhance check

			StatefulResolver(desc.el,true);
			if (!desc.enhanced) {
				desc._tryEnhance(this.handlers);
				++enhancedCount;	//TODO only increase if enhance handler?
			} 
			if (! desc.enhanced) incomplete = true;

			desc._tryMakeLayouter(""); //TODO key?
			desc._tryMakeLaidout(""); //TODO key?
		}

		//TODO enhance additional descriptors created during this instead of double call on loading = false


		// notify enhanced listeners
		if (! incomplete && enhancedCount > 0) {
			for(var i=0,oe; oe = this._on_event[i]; ++i) {
				if (oe.type == "enhanced") {
					var descs2 = [];

					// list of relevant descs
					for(var n in descs) {
						var desc = descs[n];
						if (desc.role) if (oe.role== null || oe.role==desc.role) descs2.push(desc);
					}

					oe.func.call(this, this, descs2);
				}
			}
		} 
	};

	_DocumentRoles.discarded = function(instance) {
		for(var n in enhancedElements) {
			var desc = enhancedElements[n];
			if (desc.role && desc.enhanced && !desc.discarded) {

				callCleaners(desc.el);
				delete desc.el;
				delete enhancedElements[n];
			}
		}
	};

	_DocumentRoles.prototype._resize_descs = function() {
		//TODO migrate to desc.refresh
		for(var n in maintainedElements) { //TODO maintainedElements
			var desc = maintainedElements[n];
			var ow = desc.el.offsetWidth, oh  = desc.el.offsetHeight;

			if (desc.enhanced && !this.discarded && desc.layout.enableRefresh) {
				if (desc.layout.width != ow || desc.layout.height != oh) {
					desc.layout.width = ow;
					desc.layout.height = oh;
					var now = (new Date()).getTime();
					var throttle = desc.layout.throttle;
					if (desc.layout.delayed) {
						// set dimensions and let delayed do it
					} else if (typeof throttle != "number" || (desc.layout.lastDirectCall + throttle < now)) {
						// call now
						desc.refresh();
						desc.layout.lastDirectCall = now;
						if (desc.layouterParent) desc.layouterParent.flaggedLayout = true;
					} else {
						// call in a bit
						var delay = now + throttle - desc.layout.lastDirectCall;
						// console.log("resizing in",delay);
						(function(desc){
							desc.layout.delayed = true;
							setTimeout(function(){
								desc.refresh();
								desc.layout.lastDirectCall = now;
								desc.layout.delayed = false;
								if (desc.layouterParent) desc.layouterParent.flaggedLayout = true;
							},delay);
						})(desc);
					}
				}
			}
		}
	};

	_DocumentRoles.prototype._area_changed_descs = function() {
		//TODO only active pages
		for(var n in maintainedElements) {
			var desc = maintainedElements[n];

			if (desc.enhanced && desc.layout.enableRefresh) {
				// desc.layout.area = getActiveArea();
				desc.refresh();
				if (desc.layouterParent) desc.layouterParent.flaggedLayout = true;
				// this.handlers.layout[desc.role].call(this,desc.el,desc.layout,desc.instance);
			}
		}
	};

	_DocumentRoles.prototype.on = function(name,role,func) {
		if (arguments.length == 2) func = role;
		
		//TODO
		this._on_event.push({ "type":name,"func":func,"name":name,"role":role });
	}
	
	// Element specific handlers
	DocumentRoles.presets.declare("handlers.init", pageResolver("handlers.init"));
	DocumentRoles.presets.declare("handlers.enhance", pageResolver("handlers.enhance"));
	DocumentRoles.presets.declare("handlers.layout", pageResolver("handlers.layout"));
	DocumentRoles.presets.declare("handlers.discard", pageResolver("handlers.discard"));


	_DocumentRoles.default_enhance = function(el,role,config) {
		
		return {};
	};

	_DocumentRoles.default_layout = function(el,layout,instance) {
		
	};
	
	_DocumentRoles.default_discard = function(el,role,instance) {
		
	};

	DocumentRoles.useBuiltins = function(list) {
		DocumentRoles.restrict({ singleton: true, lifecycle: "page" });
		for(var i=0,r; r = list[i]; ++i) {
			if (this["init_"+r]) this.presets.declare(["handlers","init",r], this["init_"+r]);
			if (this["enhance_"+r]) this.presets.declare(["handlers","enhance",r], this["enhance_"+r]);
			if (this["layout_"+r]) this.presets.declare(["handlers","layout",r], this["layout_"+r]);
			if (this["discard_"+r]) this.presets.declare(["handlers","discard",r], this["discard_"+r]);
		}
	};

	var _scrollbarSize;
	function scrollbarSize() {
		if (_scrollbarSize === undefined) {
			var div = HTMLElement("div",{ style: "width:50px;height:50px;overflow:scroll;position:absolute;top:-200px;left:-200px;" },
				'<div style="height:100px;"></div>');
			document.body.appendChild(div);
			_scrollbarSize = (div.offsetWidth - div.clientWidth) || /* OSX Lion */7; 
			document.body.removeChild(div);
		}

		return _scrollbarSize;
	}
	essential.declare("scrollbarSize",scrollbarSize);

}();

