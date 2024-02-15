const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const Resultado = require('./models/resultado');
const path = require('path');
const moment = require('moment-timezone');
const app = express();
const port = process.env.PORT || 80;

app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/ResultadosJuego', { useNewUrlParser: true, useUnifiedTopology: true });

// Función para convertir segundos a minutos y segundos
function convertirSegundosAMinutosYSegundos(segundos) {
  const minutos = Math.floor(segundos / 60);
  const segundosRestantes = segundos % 60;
  return `${minutos} minutos y ${segundosRestantes} segundos`;
}

app.post('/resultados', async (req, res) => {
  try {
    const { nombre, fecha, tiempoDuracion, resultadoJuego, category } = req.body;

    // Asegúrate de que los datos requeridos estén presentes
    if (!nombre || !fecha || tiempoDuracion === undefined || resultadoJuego === undefined) {
      return res.status(400).json({ error: 'Faltan datos requeridos' });
    }

    // Convierte el tiempoDuracion a un número
    const tiempoDuracionNum = parseFloat(tiempoDuracion);

    // Verifica si la conversión fue exitosa
    if (isNaN(tiempoDuracionNum)) {
      return res.status(400).json({ error: 'tiempoDuracion debe ser un número' });
    }

    // Verifica si resultadoJuego es un número válido (incluyendo 0)
    if (isNaN(resultadoJuego)) {
      return res.status(400).json({ error: 'resultadoJuego debe ser un número' });
    }

    // Crea un nuevo documento en la colección "resultados"
    const nuevoResultado = new Resultado({
      nombre,
      fecha: new Date(fecha),
      tiempoDuracion: tiempoDuracionNum, // Asigna el valor convertido
      resultadoJuego,
      category,
    });

    // Guarda el nuevo resultado en la base de datos
    await nuevoResultado.save();

    // Obtener todos los resultados después de la inserción
    const resultados = await Resultado.find().select('nombre fecha tiempoDuracion resultadoJuego category');


    // Convertir la duración del juego a minutos y segundos
    resultados.forEach(resultado => {
      resultado.tiempoDuracion = convertirSegundosAMinutosYSegundos(resultado.tiempoDuracion);
    });

    // Renderizar la vista resultados y pasar los resultados
    res.render('resultados', { resultados });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ruta GET para mostrar resultados
app.get('/resultados', async (req, res) => {
  try {
    const { nombre, resultadoJuego, category, fecha } = req.query;
    const filtros = {}; // Objeto para almacenar los filtros aplicados

    const query = {}; // Objeto para construir la consulta

    // Aplicar filtros si los parámetros están presentes en la URL
    if (nombre) {
      query.nombre = { $regex: new RegExp(nombre, 'i') }; // Búsqueda insensible a mayúsculas y minúsculas
      filtros.Nombre = nombre;
    }

    if (resultadoJuego) {
      query.resultadoJuego = resultadoJuego;
      filtros['Resultado del Juego'] = resultadoJuego;
    }

    if (category) {
      query.category = category;
      filtros.Categoria = category;
    }

    if (fecha) {
      // Puedes ajustar la lógica según tus necesidades
      const fechaInicio = moment(fecha).tz('America/Guayaquil').startOf('day');
      const fechaFin = moment(fecha).tz('America/Guayaquil').endOf('day');
    
      query.fecha = { $gte: fechaInicio.toDate(), $lte: fechaFin.toDate() };
      filtros.Fecha = fecha;
    }
    

    const resultados = await Resultado.find(query).select('nombre fecha tiempoDuracion resultadoJuego category');

    // Convertir la duración del juego a minutos y segundos
    resultados.forEach(resultado => {
      resultado.tiempoDuracion = convertirSegundosAMinutosYSegundos(resultado.tiempoDuracion);
    });

    // Renderizar la vista resultados y pasar los resultados y filtros
    res.render('resultados', { resultados, filtros });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Configuración del servidor
app.listen(port, () => {
  console.log(`Servidor en funcionamiento en http://localhost:${port}`);
});

// Configuración del motor de vistas EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
