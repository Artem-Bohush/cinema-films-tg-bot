const TelegramBot = require('node-telegram-bot-api')

const keys = require('./keys/index')
const btns = require('./keyboard-btn')
const keyboard = require('./keyboard')
const data = require('./db/info.json')
const Film = require('./model/Film')
const Cinema = require('./model/Cinema')
const keysProd = require('./keys/keys.prod')

// data.films.forEach((film) => {
//   new Film(film).save().catch(err => console.log(err))
// })
// data.cinemas.forEach((cinema) => {
//   new Cinema(cinema).save().catch(err => console.log(err))
// })

require('./db/index')()

const bot = new TelegramBot(keys.BOT_TOKEN, { polling: true })

function getItemUuid(source) {
  return source.substr(2, source.length)
}

bot.onText(/\/start/, (msg) => {
  const greet = `Hello, ${msg.from.first_name}!\nChoose the command to start:`

  bot.sendMessage(msg.chat.id, greet, {
    reply_markup: {
      keyboard: keyboard.home,
    },
  })
})

bot.onText(/\/f(.+)/, (msg, [source, match]) => {
  const filmUuid = getItemUuid(source)
  Film.findOne({ uuid: filmUuid }).then((film) => {
    const caption = `Title: ${film.name}\nYear: ${film.year}\nRate: ${film.rate}\nDuration: ${film.length}\nCountry: ${film.country}`
    bot.sendPhoto(msg.chat.id, film.picture, {
      caption,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: 'Add to favourite',
              callback_data: 'favourite',
            },
            {
              text: 'Show cinemas',
              callback_data: 'cinemas',
            },
          ],
          [
            {
              text: `Kinopoisk ${film.name}`,
              url: film.link,
            },
          ],
        ],
      },
    })
  })
})

function sendHTML(chatId, html, kbName = null) {
  const options = {
    parse_mode: 'HTML',
  }
  if (kbName) {
    options.reply_markup = {
      keyboard: keyboard[kbName],
    }
  }
  bot.sendMessage(chatId, html, options)
}

function sendFilmsByQuery(chatId, query) {
  Film.find(query).then((films) => {
    const html = films.map((film, idx) => `<b>${idx + 1}</b> ${film.name} - /f${film.uuid}`).join('\n')
    sendHTML(chatId, html, 'films')
  })
}

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
    case btns.films.random:
      sendFilmsByQuery(chatId, {})
      break
    case btns.films.action:
      sendFilmsByQuery(chatId, { type: 'action' })
      break
    case btns.films.comedy:
      sendFilmsByQuery(chatId, { type: 'comedy' })
      break
    case btns.back:
      bot.sendMessage(chatId, 'Choose the command to start:', {
        reply_markup: {
          keyboard: keyboard.home,
        },
      })
      break
    default:
  }
})
