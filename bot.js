const TelegramBot = require('node-telegram-bot-api');
const schedule = require('node-schedule');
//const doJobWhen = [0,10,20,30,40,50];
const doJobWhen = [0,30];
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

bot.on('message', async (msg) => {
    console.log('reseve message:', msg.text);
    if (msg.text.toLowerCase().startsWith('/setid ') && msg.from.username === adminUserName) {
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
        await bot.sendMessage(msg.chat.id, `hi ${msg.from.username}, you say: ${msg.text}`);
    }
});

start();

function start() {

    console.log('app satrt');

    let rule = new schedule.RecurrenceRule();
    rule.second = doJobWhen;

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
                await sendMessage(postContent)
                _latestId = postContent.id;
            }
        }
    });
}

async function sendMessage(postContent) {
    let url = urlPost + postContent.id;
    let msg = `<b>${postContent.title}</b>
${postContent.content}

原文 <a href="${url}">${url}</a>`;
                    
    console.log('push msg: ', msg, ', to channel: ', channelName);

    let mediaMsgId = 0;
    if (postContent.mediaMeta.length > 0) {
        let flag = [];
        let output =[];
        for (let i=0; i<postContent.mediaMeta.length; i++) {
            let tmp = postContent.mediaMeta[i]
            if (tmp.normalizedUrl && tmp.type.startsWith('image')) {
                if (flag[tmp.normalizedUrl])
                    continue;
                flag[tmp.normalizedUrl] = true;
                output.push(tmp);
            }
        }

        let mediaGroup = [];
        let latestImgUrl = '';
        let mediaMsg;

        for(let j=0; j<output.length; j++) {
            latestImgUrl = output[j].normalizedUrl;

            mediaGroup.push({
                type: 'photo',
                media: latestImgUrl
            })

            //group limit is 2 ~ 10
            if (mediaGroup.length == 10) {
                mediaMsg = await bot.sendMediaGroup(channelName, mediaGroup);
                mediaGroup = [];
            }
        }

        //not enough 10        
        if (mediaGroup.length == 1) {
            //1 is not group, use sendPhoto
            mediaMsg = await bot.sendPhoto(channelName, latestImgUrl);
        }
        else if (mediaGroup.length > 1) {
            mediaMsg = await bot.sendMediaGroup(channelName, mediaGroup);
        }

        if (mediaMsg) {
            mediaMsgId = mediaMsg.message_id;
        }
    }
    if (mediaMsgId != 0) {
        await bot.sendMessage(channelName, msg,  {parse_mode : "HTML", disable_web_page_preview: true, reply_to_message_id: mediaMsgId});
    }
    else {
        await bot.sendMessage(channelName, msg,  {parse_mode : "HTML", disable_web_page_preview: true});
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