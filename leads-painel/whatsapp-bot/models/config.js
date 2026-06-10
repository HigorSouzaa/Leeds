const mongoose = require('mongoose')

const ConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' }, // Usaremos um ID fixo 'global'
  DELAY_MIN_SEGUNDOS: { type: Number, default: 45 },
  DELAY_MAX_SEGUNDOS: { type: Number, default: 180 },
  LIMITE_DIARIO: { type: Number, default: 50 },
  PAUSA_A_CADA: { type: Number, default: 10 },
  PAUSA_MINUTOS: { type: Number, default: 15 },
})

module.exports = mongoose.model('Config', ConfigSchema)
