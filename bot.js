const TelegramBot = require('node-telegram-bot-api');
var schedule = require('node-schedule');
const request = require('request');
const token = process.env.BotToken;
const channelName = process.env.TelegramChannel;
const bot = new TelegramBot(token, {polling: true});

bot.on('message', (msg) => {
    bot.sendMessage(msg.chat.id, `hi ${msg.from.username}`);
});

const apiList = 'https://www.dcard.tw/_api/forums/sex/posts?popular=false';
const apiPost = 'https://www.dcard.tw/_api/posts/';
const urlPost = 'http://www.dcard.tw/f/sex/p/';
let lastPostId = 0;
let postList = [];

getPostList();

if (postList.length > 0) {
    lastPostId = postList[0].id;
    bot.sendMessage(channelName, `bot start, push after id: ${lastPostId}.`);
}

let rule = new schedule.RecurrenceRule();
rule.second = [0, 30];

let job = schedule.scheduleJob(rule, function() {
    getPostList();
    for (let i=0; i<postList.length; i++) {
        let content = getPostContent(postList[i].id);
        if (content !== '') {
            bot.sendMessage(channelName, `${content.excerpt}

[原文](${urlPost}${postList[i].id})`,  {parse_mode : "Markdown"});

            if (content.media) {
                for(let j=0; j<content.media.length; j++) {
                    if (content.media.url) {
                        bot.sendPhoto(channelName, content.media.url);
                    }
                }
            }
        }
    }
});

function getPostList() {
    let url = apiList;
    
    if (lastPostId === 0) {
        url = url + '&limit=2';
    }
    else {
        url = url + '&after=' + lastPostId;
    }

    let body = execGet(url);
    if (body !== '') {
        postList = JSON.parse(body);
        return;
    }

    postList = [];
    return;
}

function getPostContent(id) {
    let url = apiPost + id;
    let body = execGet(url);
    if (body !== '') {
        return JSON.parse(body);
    }

    return '';
}

function execGet(url) {
    let result = '';
    request(getOption(url), (error, response, body) => {
        if (error) {
            console.log('error from: ', url, ', err: ', err);
        }

        if (response.statusCode === 200) {
            console.log('get from: ', url, ', response.statusCode: ', response.statusCode);
            console.log('body: ', body);
            console.log('JSON(body): ', JSON.stringify(JSON.parse(body)));
            result = body;
        }
    });

    return result;
}

function getOption(url) {
    return {
        method: 'GET',
        url: url,
        headers: getHeader()
    };
}

function getHeader() {
    return {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Host': 'www.dcard.tw',
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
    };
}