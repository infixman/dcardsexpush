const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
const util = require('util');
const request = require('request');
const requestPromise = util.promisify(request);
const token = process.env.BotToken;
const channelName = process.env.TelegramChannel;
const adminUserName = process.env.AdminUserName;
const apiList = 'https://www.dcard.tw/_api/forums/sex/posts?popular=false';
const apiPost = 'https://www.dcard.tw/_api/posts/';
const urlPost = 'http://www.dcard.tw/f/sex/p/';
const bot = new TelegramBot(token, {polling: true});

let _latestId = 0;

bot.on('message', (msg) => {
    console.log('reseve message:', msg.text);
    if (msg.text.startsWith('/SetId ') && msg.from.username === adminUserName) {
        let id = msg.text.split(' ')[1];
        var parsed = parseInt(id, 10);
        if (isNaN(parsed)) {
            bot.sendMessage(msg.chat.id, `${id} 不是一個合法的數字`);
        }
        else {
            _latestId = parsed;
            bot.sendMessage(msg.chat.id, `已將最後PO文ID重設為 ${id}`);
        }
    }
    else {
        bot.sendMessage(msg.chat.id, `hi ${msg.from.username}, you say: ${msg.text}`);
    }
});

start();

function start() {

    console.log('app satrt');

    let rule = new schedule.RecurrenceRule();
    rule.second = [0, 30];

    let job = schedule.scheduleJob(rule, async function() {
        console.log(`job: ${(new Date()).toLocaleTimeString()}`)
        
        let postList = await getPostList();
        if (_latestId === 0 && postList.length > 0) {
            _latestId = postList[0].id;
        }

        postList = postList.reverse();

        for (let i=0; i<postList.length; i++) {
            
            let postContent = await getPostContent(postList[i].id);
            if (postContent.id > _latestId) {
                sendMessage(postContent)
                _latestId = postContent.id;
            }
        }
    });
}

function sendMessage(postContent) {
    let msg = `**${postContent.title}**
${postContent.content}

原文 [${urlPost}${postContent.id}](${urlPost}${postContent.id})`;
                    
    console.log('push msg: ', msg, ', to channel: ', channelName);
    bot.sendMessage(channelName, msg,  {parse_mode : "Markdown"});

    if (postContent.mediaMeta.length > 0) {
        let mediaGroup = [];
        let latestImgUrl = '';
        for(let j=0; j<postContent.mediaMeta.length; j++) {
            let media = postContent.mediaMeta[j];
            if (media.normalizedUrl && media.type.startsWith('image')) {
                mediaGroup.push({
                    type: 'photo',
                    media: media.normalizedUrl
                })

                latestImgUrl = media.normalizedUrl;

                //group limit is 2 ~ 10; 1 is not group
                if (mediaGroup.length == 10) {
                    bot.sendMediaGroup(channelName, mediaGroup);
                    mediaGroup = [];
                }
            }
        }

        //not enough 10
        if (mediaGroup.length == 1) {
            latestImgUrl
            bot.sendPhoto(channelName, latestImgUrl);
        }
        else if (mediaGroup.length > 1) {
            bot.sendMediaGroup(channelName, mediaGroup);
        }
    }
}

async function getPostList() {
    let url = apiList;
    
    if (_latestId === 0) {
        url = url + '&limit=2';
    }
    else {
        url = url + '&after=' + _latestId;
    }

    let body = await execGet(url, false);
    return body;
}

async function getPostContent(id) {
    let url = apiPost + id;
    let body = await execGet(url, true);
    return body;
}

async function execGet(url) {

    const {res, body} = await requestPromise(getOption(url));
    return body;
}

function getOption(url) {
    return {
        method: 'GET',
        url: url,
        headers: getHeader(),
        encoding: 'utf8',
        json: true
    };
}

function getHeader() {
    return {};

    // return {
    //     'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    //     'Accept-Encoding': 'gzip, deflate, br',
    //     'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    //     'Cache-Control': 'no-cache',
    //     'Connection': 'keep-alive',
    //     'Host': 'www.dcard.tw',
    //     'Pragma': 'no-cache',
    //     'Upgrade-Insecure-Requests': '1',
    //     'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36'
    // };
}