const mongoose = require('mongoose');
const moment = require('moment-timezone');

const resultadoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  fecha: {
    type: Date,
    required: true,
    default: () => moment().tz('America/Guayaquil').format(), // Establecer la zona horaria de Quito
  },
  tiempoDuracion: { type: Number, required: true },
  resultadoJuego: { type: Number, required: true },
  category: { type: String, required: true },
});

const Resultado = mongoose.model('Resultado', resultadoSchema);

module.exports = Resultado;