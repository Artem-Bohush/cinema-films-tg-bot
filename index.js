const TelegramBot = require('node-telegram-bot-api')

const keys = require('./keys/index')

const bot = new TelegramBot(keys.BOT_TOKEN, { polling: true })

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 'work!')
})
