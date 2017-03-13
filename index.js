var Crawler = require("./bin/Crawler");

var options = {
	urlFilter: function(url) {
		if (url.indexOf("github") !== -1) return false;
		return true;
	},
	htmlParser: function(html) {
		console.log(html);
	},
	depth: 5,
	firstUrl: "http://heimalanshi.com/"
}

var wc = new Crawler(options);
wc.crawl();