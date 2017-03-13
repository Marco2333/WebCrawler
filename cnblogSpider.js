var superagent = require('superagent'),
	eventproxy = require('eventproxy'),
	async = require('async'),
	fs = require('fs'),
	cheerio = require('cheerio');

var i, pageNum = 200,
	ep = new eventproxy(),
	blogCount = new Map(), //用户发博客数量统计
	articalUrls = [], //博客入口地址
	repeatArr = [], //重复作者
	pageUrls = [], //页面url
	userInfoArr = []; //结果统计

for (i = 1; i <= pageNum; i++) {
	pageUrls.push('http://www.cnblogs.com/?CategoryId=808&CategoryType=%22SiteHome%22&ItemListActionName=%22PostList%22&PageIndex=' + i + '&ParentCategoryId=0');
}

ep.after('pagefinish', pageNum, function() {
	// console.log(articalUrls.length);
	// articalUrls = unique(articalUrls);
	// console.log(articalUrls.length);
	ep.after('articalfinish', articalUrls.length, function() {
		console.log('用户个人信息统计:')
		console.log(userInfoArr);
		console.log('用户博客数量统计：')
		console.log(blogCount);
	});
	onRequest();
});

// 数组去重
function unique(a) {
	return a.concat().sort().filter(function(item, pos, ary) {
		return !pos || item != ary[pos - 1];
	});
}

// 判断是否重复
function isRepeat(user) {
	if (!repeatArr[user]) {
		repeatArr[user] = true;
		return false;
	}
	return true;
}

function start() {
	pageUrls.forEach(function(url) {
		superagent.get(url).end(function(err, pageInfo) {
			if (err) {
				console.log(err);
				return;
			}
			var $ = cheerio.load(pageInfo.text),
				i, len, curPageUrls = $('.titlelnk');

			for (i = 0, len = curPageUrls.length; i < len; i++) {
				articalUrls.push(curPageUrls.eq(i).attr('href'));
			}
			ep.emit('pagefinish');
		})
	})
}

function onRequest() {
	async.each(articalUrls, function(url, callback) {
		getArtical(url);
	});
}

function getArtical(url) {
	var user = url.split('/p/')[0].split('/')[3],
		id = url.split('/p/')[1].split('.')[0];

	if (isRepeat(user)) {
		blogCount.set(user, blogCount.get(user) + 1);
		ep.emit('articalfinish');
		return;
	}

	var appUrl = "http://www.cnblogs.com/mvc/blog/news.aspx?blogApp=" + user;
	userInfo(appUrl);
	blogCount.set(user, 1);
}

// 统计用户信息
function userInfo(url) {
	superagent.get(url).end(function(err, res) {

		if (err) {
			console.log(err);
			return;
		}

		var $ = cheerio.load(res.text),
			info = $("#profile_block a");

		var infoArr = {
			name: info.eq(0).text(),
			fans: info.eq(2).text(),
			focus: info.eq(3).text()
		};

		try {
			infoArr.age = info.eq(1).attr('title').split("：")[1];
		} catch (e) {
			infoArr.age = "2016-6-20";
		}
		userInfoArr.push(infoArr);
		ep.emit('articalfinish');
	})
}

exports.start = start;