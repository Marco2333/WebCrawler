var http = require("http")
,https = require("https")
,urlUtil = require("url")
,events = require('events');

var urlReg = /<a.*?href=['"]([^"']*)['"][^>]*>/img;

var openQueue = []
,closeQueue = []
,crawlCount = {
	total: 0,
	success: 0,
	failure: 0
};

var crawlEmitter = new events.EventEmitter();

var Util = (function() {
	function Util() {}
	Util.prototype.extend = function(custom, defaults) {
		var key, value;
		for(key in custom) {
			if((value = custom[key]) != null) {
				defaults[key] = value;
			}
		}
		return defaults;
	};
	Util.prototype.extractUrl = function(htmlString) {
		var urlArr = []
		,match = null;
		while( match = urlReg.exec(htmlString)) {
			urlArr.push(match[1]);
		}
		return urlArr;
	}
	return Util;
})();

crawlEmitter.on("crawl",function(wc) {
	var url;
	if(openQueue.length) {
		url = openQueue.shift();
		closeQueue.push(url);
		wc.sendRequest(url);
	} else {
		console.log("ending...Results are as follows:");
		console.log(crawlCount);
	}
});

crawlEmitter.on("success",function(wc,url,data) {
	console.log("Request " + url + " successfully");
	crawlCount.success++;

	var urlArr = wc.util().extractUrl(data);

	urlArr.forEach(function(perUrl) {
		if(WebCrawler.filterUrl(perUrl,wc)) {
			openQueue.push(perUrl)
		}
	})
	wc.config.htmlParser(data);
	wc.crawl();
});

crawlEmitter.on("error",function(wc,url,err) {
	console.log("Request" + url + "failure");
	console.log("log: " + err);
	crawlCount.failure++;
	wc.crawl();
});

function WebCrawler(options) {
	if(options == null) {
		options = {};
	}
	this.config = this.util().extend(options,this.defaults);

	if(this.config.firstUrl) {
		openQueue.push(this.config.firstUrl);
	}
}

WebCrawler.prototype.defaults = {
	depth: 3,
	firstUrl: '',
	urlFilter: function() {
		return true;
	},
	htmlParser: function() {}
};

WebCrawler.prototype.util = function() {
	return this._util || (this._util = new Util());
}

WebCrawler.filterUrl = function(url, wc) {
	var urlObj,depth;
	if(closeQueue.indexOf(url) > -1 || openQueue.indexOf(url) > -1) {
		return false;
	}
	urlObj = urlUtil.parse(url);
	if(urlObj.hash) {
		return false;
	}
	if(urlObj.path) {
		depth = urlObj.path.replace(/[^\/]/g,"").length;
		if(depth >= wc.config.depth) {
			return false;
		}
	}
	return wc.config.urlFilter(url);
}

WebCrawler.prototype.crawl = function() {
	crawlEmitter.emit("crawl",this);
}

WebCrawler.prototype.sendRequest = function(url) {
	var req = null,
	    reqObj = urlUtil.parse(url);
	reqObj.headers = {
		"User-Agent":"Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.108 Safari/537.36"
	};
	if(url.indexOf("https") > -1) {
		req = https.request(reqObj);
	} else if(url.indexOf("http") > -1) {
		req = http.request(reqObj);
	} else {
		this.crawl();
		return;
	}
	var that = this;
	req.on("response",function(res){
		var data = '';
		res.setEncoding('utf-8');
		res.on("data",function(chunk){
			data += chunk;
		});
		res.on("end",function() {
			crawlEmitter.emit("success",that,url,data);
			data = '';
		});
	});

	req.on("error", function(error) {
		crawlEmitter.emit("error",that,url,err)
	});

	req.on("finish",function() {
		console.log("Request " + url);
		crawlCount.total++;
	});

	req.end();
}

module.exports = WebCrawler;