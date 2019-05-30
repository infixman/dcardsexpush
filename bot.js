const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BotToken;
const bot = new TelegramBot(token, {polling: true});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (msg.chat.text) {
        bot.sendMessage(chatId, `${msg.from.username}: ${msg.chat.text}`);
    };
});