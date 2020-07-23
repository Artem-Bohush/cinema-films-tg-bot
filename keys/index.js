const devMod = require('./keys.dev')
const prodMod = require('./keys.prod')

if (process.env.NODE_ENV === 'production') {
  module.exports = prodMod
} else {
  module.exports = devMod
}
