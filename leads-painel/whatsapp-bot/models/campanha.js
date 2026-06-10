// whatsapp-bot/models/campanha.js
const mongoose = require('mongoose')

const disparoSchema = new mongoose.Schema({
  leadId:    { type: String, required: true },
  nome:      { type: String },
  telefone:  { type: String, required: true },
  status:    { type: String, enum: ['pendente', 'enviado', 'erro', 'sem_wpp'], default: 'pendente' },
  erro:      { type: String },
  enviadoEm: { type: Date },
})

const campanhaSchema = new mongoose.Schema({
  nome:        { type: String, required: true },
  mensagem:    { type: String, required: true },
  status:      { type: String, enum: ['rascunho', 'em_andamento', 'pausada', 'finalizada'], default: 'rascunho' },
  disparos:    [disparoSchema],
  totalLeads:  { type: Number, default: 0 },
  totalEnviados: { type: Number, default: 0 },
  totalErros:  { type: Number, default: 0 },
  criadoEm:    { type: Date, default: Date.now },
  iniciadoEm:  { type: Date },
  finalizadoEm: { type: Date },
})

module.exports = mongoose.model('Campanha', campanhaSchema)
