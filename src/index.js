const TelegramBot = require('node-telegram-bot-api')
const geolib = require('geolib')
const _ = require('lodash')

const keys = require('./keys/index')
const btns = require('./keyboard-btn')
const keyboard = require('./keyboard')
const Film = require('./model/Film')
const Cinema = require('./model/Cinema')
const User = require('./model/User')

require('./db/index')()

const bot = new TelegramBot(keys.BOT_TOKEN, { polling: true })

const ACTION_TYPE = {
  TOGGLE_FAV_FILM: 'tff',
  SHOW_CINEMAS: 'sc',
  SHOW_CINEMAS_MAP: 'scm',
  SHOW_FILMS: 'sf',
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
  Promise.all([
    Film.findOne({ uuid: filmUuid }),
    User.findOne({ telegramId: msg.from.id }),
  ]).then(([film, user]) => {
    let isFav
    if (user) {
      isFav = user.films.indexOf(film.uuid) !== -1
    }
    const favTex = isFav ? 'Delete from favorites' : 'Add to favorites'
    const caption = `Title: ${film.name}\nYear: ${film.year}\nRate: ${film.rate}\nDuration: ${film.length}\nCountry: ${film.country}`
    bot.sendPhoto(msg.chat.id, film.picture, {
      caption,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: favTex,
              callback_data: JSON.stringify({
                type: ACTION_TYPE.TOGGLE_FAV_FILM,
                filmUuid: film.uuid,
                isFav,
              }),
            },
            {
              text: 'Show cinemas',
              callback_data: JSON.stringify({
                type: ACTION_TYPE.SHOW_CINEMAS,
                cinemaUuids: film.cinemas,
              }),
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

bot.onText(/\/c(.+)/, (msg, [source, match]) => {
  const cinemaUuid = getItemUuid(source)

  Cinema.findOne({ uuid: cinemaUuid }).then((cinema) => {
    bot.sendMessage(msg.chat.id, `Cinema ${cinema.name}`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: cinema.name,
              url: cinema.url,
            },
            {
              text: 'Show on the map',
              callback_data: JSON.stringify({
                type: ACTION_TYPE.SHOW_CINEMAS_MAP,
                lat: cinema.location.latitude,
                lon: cinema.location.longitude,
              }),
            },
          ],
          [
            {
              text: 'Show films',
              callback_data: JSON.stringify({
                type: ACTION_TYPE.SHOW_FILMS,
                filmUuids: cinema.films,
              }),
            },
          ],
        ],
      },
    })
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
      bot.sendMessage(msg.chat.id, 'Send your location please', {
        reply_markup: {
          keyboard: keyboard.cinemas,
        },
      })
      break
    case btns.home.favourite:
      showFavouriteFilms(chatId, msg.from.id)
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

  if (msg.location) {
    getCinemasInCoord(msg.chat.id, msg.location)
  }
})

bot.on('callback_query', (query) => {
  let data
  try {
    data = JSON.parse(query.data)
  } catch (e) {
    throw new Error('Data is not an object')
  }
  const { type, lat, lon } = data
  if (type === ACTION_TYPE.TOGGLE_FAV_FILM) {
    toggleFavouriteFilm(query.from.id, query.id, data)
  } else if (type === ACTION_TYPE.SHOW_CINEMAS) {
    sendCinemasByQuery(query.from.id, { uuid: { '$in': data.cinemaUuids } })
  } else if (type === ACTION_TYPE.SHOW_CINEMAS_MAP) {
    bot.sendLocation(query.message.chat.id, lat, lon)
  } else if (type === ACTION_TYPE.SHOW_FILMS) {
    sendFilmsByQuery(query.message.chat.id, { uuid: { '$in': data.filmUuids } })
  }
})

bot.on('inline_query', (query) => {
  Film.find({}).then((films) => {
    const results = films.map((f) => ({
      id: f.uuid,
      type: 'photo',
      photo_url: f.picture,
      thumb_url: f.picture,
      caption: `Title: ${f.name}\nYear: ${f.year}\nRate: ${f.rate}\nDuration: ${f.length}\nCountry: ${f.country}`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `Kinopoisk ${f.name}`,
              url: f.link,
            },
          ],
        ],
      },
    }))

    bot.answerInlineQuery(query.id, results, { cache_time: 0 })
  })
})

function sendCinemasByQuery(chatId, query) {
  Cinema.find(query).then((cinemas) => {
    const html = cinemas.map((c, i) => `<b>${i + 1}.</b> ${c.name} - /c${c.uuid}`).join('\n')
    sendHTML(chatId, html, 'home')
  })
}

function showFavouriteFilms(chatId, userId) {
  User.findOne({
    telegramId: userId,
  }).then((user) => {
    if (user) {
      Film.find({ uuid: { '$in': user.films } }).then((films) => {
        let html
        if (films.length) {
          html = films.map((f, i) => `<b>${i + 1}.</b> ${f.name} - <b>${f.rate}</b> (/f${f.uuid})`).join('\n')
        } else {
          html = 'You haven\'t added anything yet'
        }
        sendHTML(chatId, html, 'home')
      })
    } else {
      sendHTML(chatId, 'You haven\'t added anything yet', 'home')
    }
  })
}

function toggleFavouriteFilm(userId, queryId, { filmUuid, isFav }) {
  let userPromise;
  User.findOne({ telegramId: userId }).then((user) => {
    if (user) {
      if (isFav) {
        user.films = user.films.filter((uuid) => uuid !== filmUuid)
      } else {
        user.films.push(filmUuid)
      }
      userPromise = user
    } else {
      userPromise = new User({
        telegramId: userId,
        films: [filmUuid],
      })
    }
    userPromise.save().then(() => {
      bot.answerCallbackQuery({
        callback_query_id: queryId,
        text: isFav ? 'Deleted' : 'Added',
      }).catch((e) => console.log(e))
    })
  })
}

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
    const html = films.map((film, idx) => `<b>${idx + 1}.</b> ${film.name} - /f${film.uuid}`).join('\n')
    sendHTML(chatId, html, 'films')
  })
}

function getCinemasInCoord(chatId, location) {
  Cinema.find({}).then((cinemas) => {
    cinemas.forEach((c) => {
      c.distance = geolib.getDistance(location, c.location) / 1000
    })
    cinemas = _.sortBy(cinemas, 'distance')
    const html = cinemas.map((c, idx) => `<b>${idx + 1}.</b> ${c.name}. <em>Distance</em> - <strong>${c.distance}</strong> km. /c${c.uuid}`).join('\n')
    sendHTML(chatId, html, 'home')
  })
}

function getItemUuid(source) {
  return source.substr(2, source.length)
}
