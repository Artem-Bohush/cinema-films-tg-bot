const mongoose = require('mongoose')

const { Schema } = mongoose

const userSchema = new Schema({
  telegramId: {
    type: Number,
    required: true,
  },
  films: {
    type: [String],
    default: [],
  },
})

module.exports = mongoose.model('users', userSchema)
