const TelegramBot = require('node-telegram-bot-api');
const token = process.env.BotToken;
const bot = new TelegramBot(token, {polling: true});

