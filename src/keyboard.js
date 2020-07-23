const btns = require('./keyboard-btn')

module.exports = {
  home: [
    [btns.home.films, btns.home.cinemas],
    [btns.home.favourite],
  ],
  films: [
    [btns.films.random],
    [btns.films.action, btns.films.comedy],
    [btns.back],
  ],
}
