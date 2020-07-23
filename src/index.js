const TelegramBot = require('node-telegram-bot-api')

const keys = require('./keys/index')
const btns = require('./keyboard-btn')
const keyboard = require('./keyboard')

require('./db/index')()

const bot = new TelegramBot(keys.BOT_TOKEN, { polling: true })

bot.onText(/\/start/, (msg) => {
  const greet = `Hello, ${msg.from.first_name}!\nChoose the command to start:`

  bot.sendMessage(msg.chat.id, greet, {
    reply_markup: {
      keyboard: keyboard.home,
    },
  })
})

bot.on('message', (msg) => {
  const chatId = msg.chat.id
  switch (msg.text) {
    case btns.home.films:
      bot.sendMessage(chatId, 'Choose genre', {
        reply_markup: {
          keyboard: keyboard.films,
        },
      })
      break
    case btns.home.cinemas:
      break
    case btns.home.favourite:
      break
    default:
      bot.sendMessage(chatId, 'Choose the command to start:', {
        reply_markup: {
          keyboard: keyboard.home,
        },
      })
  }
})
