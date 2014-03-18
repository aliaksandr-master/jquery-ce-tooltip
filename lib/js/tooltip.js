define(['require', 'exports', 'module', 'jquery', 'underscore', 'css!../css/tooltip'],  function (require, exports, module) {
  // uRequire: start body of original nodejs module
"use strict";

var $ = require("jquery");

var _ = require("underscore");

require("css!../css/tooltip");

var stdOptions = {
    message: "",
    theme: "default",
    size: "default",
    position: "bottom right",
    closeText: "&times;",
    zIndex: 9901,
    style: "",
    message_css: {},
    animation: true,
    animationSpeed: 300,
    animationDelay: 200,
    ajaxUrl: "",
    ajaxData: "",
    ajaxOnComplete: function() {},
    ajaxPreResponse: function(ajaxResponse, $tooltip, $element) {
        return ajaxResponse;
    },
    isClosed: false,
    eventShow: "mouseenter",
    eventHide: "mouseleave",
    eventClose: "click",
    onShow: function() {},
    onHide: function() {},
    onClose: function() {},
    onLeave: function() {},
    onOver: function() {}
};

function getElmClass(n, f) {
    return (f ? "." : "") + "ce-tooltip" + (n ? "-" + n : "");
}

var C_ELM = getElmClass();

var C_INIT = getElmClass("init");

var A_ID = "data-tooltip_id";

var A_SID = "data-tooltip_selfid";

var TESTING = false, tooltip_counter = 0, tooltips = {}, parsedMemory = {};

function CeTooltip(element, options, mode) {
    this._options = $.extend({}, stdOptions, options || {});
    ++tooltip_counter;
    if (element.hasClass(C_INIT)) {
        return;
    }
    this.element = $(element);
    this.tooltip = $([]);
    this.id = this._options.id || tooltip_counter;
    tooltips[this.id] = this;
    this.stateIsActive = false;
    this._mode = mode || "default";
    this._memory = {};
    this._lock = {};
    this.idString = getElmClass(this.id);
    if (this.isMode("fixed")) {
        this.setOption("eventShow", "click");
        this.setOption("isClosed", true);
        this.lock("onClose", false);
        this.lock("onHide", true);
        this.lock("onLeave", true);
        this.lock("onOver", true);
    }
    if (this.isMode("constant")) {
        this.setOption("isClosed", true);
        this.lock("onClose", false);
        this.lock("onShow", true);
        this.lock("onHide", true);
        this.lock("onLeave", true);
        this.lock("onOver", true);
    }
    this._setMark();
    this._bindElement();
    if (this.isMode("constant")) {
        this.show();
    }
}

CeTooltip.prototype = {
    update: function(options) {
        if (!this.tooltip.length) {
            return;
        }
        if (typeof options === "object") {
            if (options.message) {
                this.getElement("message").html(options.message);
            }
        }
    },
    getOption: function(name) {
        if (name === undefined) {
            throw new Error("option NAME is UNDEFINED!");
        }
        if (this._options[name] === undefined) {
            throw new Error("options['" + name + "'] is UNDEFINED!");
        }
        if (name === "position" && typeof this._options.position === "string") {
            var p_str = this._options.position;
            if (parsedMemory[p_str] === undefined) {
                var a = p_str.split(" "), b = a[0];
                a[0] = a[1] ? a[0] : "bottom";
                a[1] = a[1] || b;
                a[0] = a[0] && a[0].match(/(top|right|bottom|left)/) ? a[0] : "bottom";
                a[1] = a[1] && a[1].match(/(top|right|bottom|left|center|middle)/) ? a[1] : "center";
                parsedMemory[p_str] = {
                    orient: a[0].charAt(0),
                    point: a[1].charAt(0)
                };
            }
            this._options.position = parsedMemory[p_str];
        }
        return this._options[name];
    },
    init: function() {
        if (this.tooltip.length) {
            return;
        }
        this._create();
        this._bindTooltip();
    },
    isMode: function(mode) {
        return this._mode === mode;
    },
    setOption: function(name, v) {
        if (this._options[name] === undefined) {
            throw new Error('setOption["' + name + '"] is UNDEFINED');
        }
        this._options[name] = v;
    },
    lock: function(name, v) {
        if (v !== undefined) {
            this._lock[name] = !!v;
        }
        return !!this._lock[name];
    },
    log: function(message) {
        TESTING && console.log("Tooltip #", this.id, " : ", message);
    },
    getElement: function(name) {
        if (name) {
            if (this._memory[name] !== undefined) {
                return this._memory[name];
            }
            this._memory[name] = this.getElement().find(getElmClass(name, 1));
            return this._memory[name];
        }
        return this.tooltip;
    },
    getIdString: function() {
        return this.idString;
    },
    _setMark: function() {
        if (!this.element.length) {
            return;
        }
        this.element.attr(A_ID, this.id);
        this.element.addClass(C_INIT);
    },
    _unsetMark: function() {
        if (!this.element.length) {
            return;
        }
        this.element.removeAttr(A_ID);
        this.element.removeClass(C_INIT);
    },
    _actionCallback: function(name, func) {
        if (this.lock(name)) {
            this.log(name + " was LOCKED !");
            return false;
        }
        var clbck = this.getOption(name);
        var res;
        if (_.isFunction(clbck)) {
            res = clbck(this, name);
        } else if (_.isString(clbck)) {
            if (/\./.test(clbck)) {
                var k = clbck.split(".");
                if (_.isFunction(window[k[0]][k[1]])) {
                    res = window[k[0]][k[1]].call(window[k[0]], this, name);
                }
            } else if (_.isFunction(window[clbck])) {
                res = window[clbck](this, name);
            }
        }
        this.log(name + " callback : " + res);
        if (res || res == null) {
            func.call(this, name);
        }
        return res;
    },
    show: function() {
        this.init();
        if (!this.tooltip.length) {
            return;
        }
        if (this.stateIsActive) {
            return;
        }
        var self = this, css = {
            display: "block",
            zIndex: this.getOption("zIndex")
        };
        if (this.isMode("constant")) {
            css.opacity = .01;
        }
        self.refresh();
        this.getElement().css(css);
        this.getElement().stop(1, 1).delay(this.getOption("animationDelay")).fadeTo(this.getOption("animationSpeed"), 1, function() {
            self.refresh();
            self.stateIsActive = true;
        });
    },
    hide: function() {
        if (!this.tooltip.length) {
            return;
        }
        var self = this;
        this.getElement().delay(this.getOption("animationDelay")).stop(1, 0).fadeTo(this.getOption("animationSpeed"), 0, function() {
            self.getElement().css({
                zIndex: self.getOption("zIndex") / 2,
                left: -1e3
            });
            self.stateIsActive = false;
        });
    },
    over: function() {
        if (!this.tooltip.length) {
            return;
        }
        this.getElement().stop(1, 0).fadeTo(0, 1);
    },
    ajaxLoad: function(url, data, callback) {
        if (this.lock("ajax")) {
            return;
        }
        var self = this;
        url = url || this.getOption("ajaxUrl");
        if (!url) {
            return;
        }
        data = data || this.getOption("ajaxData") || "";
        callback = callback || this.getOption("ajaxOnComplete");
        this.log("ajaxUrl: " + url);
        this.log("ajaxData: " + data);
        $.ajax({
            type: "POST",
            dataType: "html",
            url: url,
            data: data,
            beforeSend: function() {
                self.lock("ajax", true);
            },
            success: function(response) {
                var res = response, f = window[self.getOption("ajaxPreResponse")];
                if (_.isFunction(f)) {
                    res = f.call(window, response, self.tooltip, self.element);
                }
                if (res !== false) {
                    response = res;
                    self.getElement("message").html(response);
                }
                self.refresh();
            },
            complete: function() {
                callback(self);
            }
        });
    },
    actionShow: function() {
        this._actionCallback("onShow", function() {
            if (this.getOption("ajaxUrl")) {
                this.ajaxLoad();
            }
            this.show();
        });
    },
    actionHide: function() {
        this._actionCallback("onHide", this.hide);
    },
    actionClose: function() {
        this._actionCallback("onClose", function() {
            if (this.isMode("constant") || this.isMode("fixed")) {
                this.hide();
            } else {
                this.actionHide();
            }
        });
    },
    actionOver: function() {
        this._actionCallback("onOver", this.over);
    },
    actionLeave: function() {
        this._actionCallback("onLeave", this.hide);
    },
    refresh: function() {
        if (!this.tooltip.length) {
            return;
        }
        var $this = this.element, tooltip = this.getElement(), tooltip_params = {
            height: tooltip.height(),
            width: tooltip.width()
        }, offset = $this.offset(), eo = {
            height: _.isNumber($this.outerHeight()) ? $this.outerHeight() : $this.height(),
            width: _.isNumber($this.outerWidth()) ? $this.outerWidth() : $this.width(),
            top: offset.top,
            left: offset.left
        };
        var ccso = {};
        switch (this.getOption("position").orient) {
          case "t":
            ccso.top = eo.top - tooltip_params.height;
            break;
          case "b":
            ccso.top = eo.top + eo.height;
            break;
          case "l":
            ccso.left = eo.left - tooltip_params.width;
            break;
          case "r":
            ccso.left = eo.left + eo.width;
            break;
        }
        switch (this.getOption("position").point) {
          case "r":
            ccso.left = eo.left + eo.width / 2;
            break;
          case "l":
            ccso.left = eo.left + eo.width / 2 - tooltip_params.width;
            break;
          case "c":
            ccso.left = eo.left - (tooltip_params.width - eo.width) / 2;
            break;
          case "m":
            ccso.top = eo.top - (tooltip_params.height - eo.height) / 2;
            break;
          case "t":
            ccso.top = eo.top - tooltip_params.height + eo.height / 2;
            break;
          case "b":
            ccso.top = eo.top + eo.height / 2;
            break;
        }
        this._replaceClasses(this.getElement(), /ce-tooltip-(t|r|b|l)-(t|r|b|l|c|m)/g, getElmClass("p-" + this.getOption("position").orient + this.getOption("position").point));
        tooltip.css(ccso);
    },
    _replaceClasses: function($element, regexp, replace_class) {
        $element.attr("class", $element.attr("class").replace(regexp, replace_class));
    },
    _create: function() {
        if (this.tooltip.length) {
            return;
        }
        var classes = C_ELM + " ce-theme-" + this.getOption("theme") + " " + getElmClass("size-" + this.getOption("size")) + " " + getElmClass(this.getOption("position").orient + this.getOption("position").point) + (this.getOption("isClosed") ? " " + getElmClass("closed") : "");
        $("body").append('<div id="' + this.getIdString() + '" ' + A_SID + '="' + this.id + '" class="' + classes + '" style="' + this.getOption("style") + '">' + '<div class="' + getElmClass("block") + '">' + '<span class="ceb_tr1 ceb_tr"></span>' + '<span class="ceb_tr2 ceb_tr"></span>' + '<div class="' + getElmClass("message") + '">' + this.getOption("message") + "</div>" + '<div class="' + getElmClass("close") + '">' + this.getOption("closeText") + "</div>" + "</div>" + "</div>");
        this.tooltip = $("#" + this.getIdString());
        var css = this.getOption("message_css");
        css && this.getElement("message").css(css);
    },
    _bindElement: function() {
        if (!this.element.length) {
            return;
        }
        var self = this;
        this._unbindElement();
        this.element.on(this.getOption("eventShow") + ".tooltip", function() {
            self.actionShow();
        });
        this.element.children().on(this.getOption("eventShow") + ".tooltip", function() {
            self.actionShow();
        });
        this.element.on(this.getOption("eventHide") + ".tooltip", function() {
            self.actionHide();
        });
    },
    _bindTooltip: function() {
        if (!this.tooltip.length) {
            return;
        }
        var self = this;
        this._unbindTooltip();
        this.getElement().on("mouseenter.tooltip", function() {
            self.actionOver();
        });
        this.getElement().on("mouseleave.tooltip", function() {
            self.actionLeave();
        });
        this.getElement("close").on(this.getOption("eventClose") + ".tooltip", function() {
            self.actionClose();
        });
    },
    _unbindElement: function() {
        if (!this.element.length) {
            return;
        }
        this.element.unbind(".tooltip");
        this.element.children().unbind(".tooltip");
    },
    _unbindTooltip: function() {
        if (!this.tooltip.length) {
            return;
        }
        this.getElement().unbind(".tooltip");
        this.getElement("close").unbind(".tooltip");
    },
    remove: function() {
        this.detach();
        this.tooltip.remove();
    },
    detach: function() {
        this._unbindElement();
        this._unbindTooltip();
        this._unsetMark();
        this.lock = function() {
            return true;
        };
    }
};

function findTooltipId($this) {
    var id = false, $e;
    if ($this.hasClass(C_ELM)) {
        id = $this.attr(A_SID);
    } else if ($this.hasClass(C_INIT)) {
        id = $this.attr(A_ID);
    } else {
        $e = $this.closest("." + C_ELM);
        if ($e.length) {
            id = $e.attr(A_SID);
        } else {
            $e = $this.closest("." + C_INIT);
            id = $e.length ? $e.attr(A_ID) : false;
        }
    }
    return id;
}

var _emptyTooltipLock = null;

var emptyTooltip = function() {
    if (_emptyTooltipLock) {
        return _emptyTooltipLock;
    }
    var r = new CeTooltip($([]));
    r.detach();
    _emptyTooltipLock = r;
    return r;
};

$.fn.ceTooltip = function(options) {
    var $this = $(this);
    if (!$this.length) {
        return emptyTooltip();
    }
    if (arguments.length) {
        options.message = options.message || "";
        return this.each(function() {
            var $this = $(this);
            $this.hasClass(C_INIT) || new CeTooltip($this, options);
        });
    } else {
        var id = findTooltipId($this.eq(0));
        return id ? tooltips[id] : emptyTooltip();
    }
};

module.exports = CeTooltip;
// uRequire: end body of original nodejs module


return module.exports;
});