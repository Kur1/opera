/*
	content/popup.js
	Copyright © 2009 - 2012  WOT Services Oy <info@mywot.com>

	This file is part of WOT.

	WOT is free software: you can redistribute it and/or modify it
	under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	WOT is distributed in the hope that it will be useful, but WITHOUT
	ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
	or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
	License for more details.

	You should have received a copy of the GNU General Public License
	along with WOT. If not, see <http://www.gnu.org/licenses/>.
*/

const WOT_POPUP_HTML =
	"<div id=\"wot-logo\" class=\"{ACCESSIBLE}\"></div>" +
	"<div id=\"wot-ratings{ID}\" class=\"wot-ratings\">" +
		"<div id=\"wot-r0-stack{ID}\" class=\"wot-stack\">" +
			"<div id=\"wot-r0-header{ID}\" class=\"wot-header\">{POPUPTEXT0}</div>" +
			"<div id=\"wot-r0-rep{ID}\" class=\"wot-rep {ACCESSIBLE}\"></div>" +
			"<div id=\"wot-r0-cnf{ID}\" class=\"wot-cnf\"></div>" +
		"</div>" +
		"<div id=\"wot-r1-stack{ID}\" class=\"wot-stack\">" +
			"<div id=\"wot-r1-header{ID}\" class=\"wot-header\">{POPUPTEXT1}</div>" +
			"<div id=\"wot-r1-rep{ID}\" class=\"wot-rep {ACCESSIBLE}\"></div>" +
			"<div id=\"wot-r1-cnf{ID}\" class=\"wot-cnf\"></div>" +
		"</div>" +
		"<div id=\"wot-r2-stack{ID}\" class=\"wot-stack\">" +
			"<div id=\"wot-r2-header{ID}\" class=\"wot-header\">{POPUPTEXT2}</div>" +
			"<div id=\"wot-r2-rep{ID}\" class=\"wot-rep {ACCESSIBLE}\"></div>" +
			"<div id=\"wot-r2-cnf{ID}\" class=\"wot-cnf\"></div>" +
		"</div>" +
		"<div id=\"wot-r4-stack{ID}\" class=\"wot-stack\">" +
			"<div id=\"wot-r4-header{ID}\" class=\"wot-header\">{POPUPTEXT4}</div>" +
			"<div id=\"wot-r4-rep{ID}\" class=\"wot-rep {ACCESSIBLE}\"></div>" +
			"<div id=\"wot-r4-cnf{ID}\" class=\"wot-cnf\"></div>" +
		"</div>" +
	"</div>";

wot.popup = {
	cache:			{},
	version:		0,
	offsety:		15,
	offsetx:		0,
	height:			235,
	width:			137,
	ratingheight:	52,
	areaheight:		214,
	barsize:		20,
	offsetheight:	0,
	postfix:		"-" + Date.now(),
	id:				"wot-popup-layer",
	onpopup:		false,

	add: function(frame, parentelem)
	{
		try {
			if (!wot.search.settings.show_search_popup) {
				return;
			}

			var id = this.id + this.postfix;

			if (frame.document.getElementById(id)) {
				return;
			}

			parentelem = parentelem || frame.document.body;

			if (!parentelem) {
				return;
			}

			var style = frame.document.createElement("style");

			style.setAttribute("type", "text/css");
			style.innerText = wot.styles["skin/include/popup.css"];

			var head = frame.document.getElementsByTagName("head");

			if (head && head.length) {
				head[0].appendChild(style);
			} else {
				return;
			}

			var layer = frame.document.createElement("div");

			layer.setAttribute("id", id);
			layer.setAttribute("class", "wot-popup-layer");
			layer.setAttribute("style", "display: none; cursor: pointer;");

			var accessible = wot.search.settings.accessible ?
								"accessible" : "";

			var replaces = [ {
					from: "ID",
					to: wot.popup.postfix
				}, {
					from: "ACCESSIBLE",
					to: accessible
				} ];

			wot.components.forEach(function(item) {
				replaces.push({
					from: "POPUPTEXT" + item.name,
					to: wot.i18n("components", item.name, true)
				});
			});

			layer = parentelem.appendChild(layer);

			layer.innerHTML = wot.warning.processhtml(WOT_POPUP_HTML, replaces);
			layer.addEventListener("click", function(event) {
					wot.popup.onclick(frame, event);
				}, false);

			frame.document.addEventListener("mousemove", function(event) {
					wot.popup.onmousemove(frame, event);
				}, false);
		} catch (e) {
			wot.log("popup.add: failed with " + e, true);
		}
	},

	updatecontents: function(frame, cached)
	{
		try {
			if (!cached ||
					(cached.status != wot.cachestatus.ok &&
					 cached.status != wot.cachestatus.link)) {
				return false;
			}

			var bottom = null;
			this.offsetheight = 0;

			wot.components.forEach(function(item) {

				var cachedv = cached.value[item.name];

				var r = (cachedv && cachedv.r != null) ? cachedv.r : -1;

				var elem = frame.document.getElementById("wot-r" + item.name +
							"-rep" + wot.popup.postfix);

				if (elem) {
					elem.setAttribute("reputation",
						wot.getlevel(wot.reputationlevels, r).name);
				}

				var c = (cachedv && cachedv.c != null) ? cachedv.c : -1;

				elem = frame.document.getElementById("wot-r" + item.name +
							"-cnf" + wot.popup.postfix);

				if (elem) {
					elem.setAttribute("confidence",
						wot.getlevel(wot.confidencelevels, c).name);
				}

				elem = frame.document.getElementById("wot-r" + item.name + "-stack" +
							wot.popup.postfix);

				if (elem) {
					if (wot.search.settings["show_application_" + item.name]) {
						bottom = elem;
						bottom.style.display = "block";
					} else {
						wot.popup.offsetheight -= wot.popup.ratingheight;
						elem.style.display = "none";
					}
				}
			});

			if (bottom) {
				bottom.style.borderBottom = "0";
			}

			var ratings = frame.document.getElementById("wot-ratings" +
							this.postfix);

			if (ratings) {
				ratings.style.height = wot.popup.offsetheight +
					wot.popup.areaheight + "px";
			}

			return true;
		} catch (e) {
			wot.log("popup.updatecontents: failed with " + e, true);
		}

		return false;
	},

	update: function(frame, target, oncomplete)
	{
		oncomplete = oncomplete || function() {};

		if (this.cache[target]) {
			if (this.updatecontents(frame, this.cache[target])) {
				oncomplete();
			}
		} else {
			wot.cache.get(target, function(name, cached) {
				wot.popup.cache[target] = cached;

				if (wot.popup.updatecontents(frame, cached)) {
					oncomplete();
				}
			});
		}
	},

	delayedshow: function(layer, posy, posx)
	{
		var version = this.version;

		window.setTimeout(function() {
				if (wot.popup.target && version == wot.popup.version) {
					layer.style.top  = posy + "px";
					layer.style.left = posx + "px";
					layer.style.display = "block";

					wot.log("popup.delayedshow: x = " + posx + ", y = " +
						posy + ", version = " + version);
				}
			}, wot.search.settings.popup_show_delay || 200);
	},

	show: function(frame, layer)
	{
		try {
			var popupheight = this.height + this.offsetheight;

			layer.style.height = popupheight + "px";
			layer.style.width  = this.width  + "px";

			var height = frame.innerHeight - this.barsize;
			var width  = frame.innerWidth  - this.barsize;

			if (height < popupheight ||	width < this.width) {
				this.hide(frame);
				return;
			}

			var vscroll = frame.pageYOffset;
			var hscroll = frame.pageXOffset;

			// more accurate way to calc position
			// got from http://javascript.ru/ui/offset
			var elem = this.target;
			var box = elem.getBoundingClientRect();
			var body = document.body;
			var docElem = document.documentElement;
			var scrollTop = window.pageYOffset || docElem.scrollTop || body.scrollTop;
			var scrollLeft = window.pageXOffset || docElem.scrollLeft || body.scrollLeft;
			var clientTop = docElem.clientTop || body.clientTop || 0;
			var clientLeft = docElem.clientLeft || body.clientLeft || 0;
			var y  = box.top +  scrollTop - clientTop;
			var x = box.left + scrollLeft - clientLeft;

			var posy = this.offsety + y;// + this.target.offsetHeight;
			var posx = this.offsetx + x + this.target.offsetWidth;

			if (posy + popupheight > height + vscroll) {
				posy = y - popupheight - this.offsety;
			}

			if (posx - hscroll < 0) {
				posx = hscroll;
			} else if ((posx + this.width) > (width + hscroll)) {
				posx = width - this.width + hscroll;
			}

			var version = ++this.version;

			if (layer.style.display != "none") {
				layer.style.top  = posy + "px";
				layer.style.left = posx + "px";
			} else {
				this.delayedshow(layer, posy, posx);
			}
		} catch (e) {
			wot.log("popup.show: failed with " + e, true);
		}
	},

	delayedhide: function(frame, layer)
	{
		if (layer.style.display != "none" && !this.waitingforhide) {
			this.waitingforhide = true;
			var version = this.version;

			window.setTimeout(function() {
					wot.popup.hide(frame, version);
					wot.popup.waitingforhide = false;
				}, wot.search.settings.popup_hide_delay || 1000);
		}
	},

	hide: function(frame, version, force)
	{
		try {
			var layer = frame.document.getElementById(this.id + this.postfix);

			if (layer && (!version || version == this.version) &&
					(force || !this.onpopup)) {
				layer.style.display = "none";
				wot.log("popup.hide: version = " + version);
			}
		} catch (e) {
			wot.log("popup.hide: failed with " + e, true);
		}
	},

	findelem: function(event)
	{
		try {
			var elem = event.target;
			var attr = null;
			var attrname = wot.search.getattrname("target");
			var onpopup = false;

			while (elem) {
				if (elem.attributes) {
					attr = elem.getAttribute(attrname);

					if (attr) {
						break;
					}

					attr = null;

					if (elem.id == (this.id + this.postfix)) {
						onpopup = true;
					}
				}

				elem = elem.parentNode;
			}

			this.onpopup = onpopup;
			return (elem && attr) ? elem : null;
		} catch (e) {
			wot.log("popup.findelem: failed with " + e, true);
		}

		return null;
	},

	onmousemove: function(frame, event)
	{
		try {
			var layer = frame.document.getElementById(this.id + this.postfix);

			if (layer) {
				this.target = this.findelem(event);

				if (this.target) {
					var attr = wot.search.getattrname("target");
					var target = this.target.getAttribute(attr);

					if (target) {
						if (layer.style.display != "block" ||
								layer.getAttribute(attr + this.postfix) !=
									target) {
							layer.setAttribute(attr + this.postfix, target);

							this.update(frame, target, function() {
								wot.popup.show(frame, layer);
							});
						}
					} else {
						this.target = null;
						this.delayedhide(frame, layer);
					}
				} else {
					this.delayedhide(frame, layer);
				}
			}
		} catch (e) {
			wot.log("popup.onmousemove: failed with " + e, true);
		}
	},

	onclick: function(frame, event)
	{
		try {
			var layer = frame.document.getElementById(wot.popup.id + wot.popup.postfix);

			if (layer) {
				var target = layer.getAttribute(wot.search.getattrname("target") +
									wot.popup.postfix);

				if (target) {
					wot.post("search", "openscorecard", { target: target,
						ctx: wot.urls.contexts.popupviewsc });

					wot.popup.hide(frame, wot.popup.version, true);
				}
			}
		} catch (e) {
			wot.log("popup.onclick: failed with " + e, true);
		}
	}
};
