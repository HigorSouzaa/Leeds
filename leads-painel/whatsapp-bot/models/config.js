const mongoose = require('mongoose')

const ConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' }, // Usaremos um ID fixo 'global'
  DELAY_MIN_SEGUNDOS: { type: Number, default: 60 },
  DELAY_MAX_SEGUNDOS: { type: Number, default: 240 },
  LIMITE_DIARIO: { type: Number, default: 35 },
  PAUSA_A_CADA: { type: Number, default: 8 },
  PAUSA_MINUTOS: { type: Number, default: 20 },
})

module.exports = mongoose.model('Config', ConfigSchema)
