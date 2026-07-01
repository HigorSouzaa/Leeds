// whatsapp-bot/models/chip.js
const mongoose = require('mongoose')

const ChipSchema = new mongoose.Schema({
  chipId: { type: String, required: true, unique: true },
  apelido: { type: String, default: 'Chip' },
  criadoEm: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Chip', ChipSchema)
