const mongoose = require('mongoose')

const keys = require('../keys/index')

module.exports = async () => {
  try {
    await mongoose.connect(
      keys.MONGODB_URI, {
        useCreateIndex: true,
        useNewUrlParser: true,
        useUnifiedTopology: true,
      },
    );
    console.log('MongoDB Atlas successfully connected!')
  } catch (error) {
    console.log(error)
  }
}
