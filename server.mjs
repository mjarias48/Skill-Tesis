import express from 'express';
import Alexa, { SkillBuilders } from 'ask-sdk-core';
import { ExpressAdapter } from 'ask-sdk-express-adapter';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

const categories = ['Colores', 'Animales'];

const colorQuestions = [
  {
    question: '¿Cuál es este color?',
    correctAnswer: 'azul',
    answers: ['azul', 'rojo', 'verde', 'amarillo'],
    backgroundColor: 'rgb(0, 0, 255)', // Definir el color azul
  },
  {
    question: '¿Cuál es este color?',
    correctAnswer: 'rojo',
    answers: ['azul', 'rojo', 'verde', 'amarillo'],
    backgroundColor: 'rgb(255, 0, 0)', // Definir el color rojo
  },
  {
    question: '¿Cuál es este color?',
    correctAnswer: 'verde',
    answers: ['azul', 'rojo', 'verde', 'amarillo'],
    backgroundColor: 'rgb(0, 255, 0)', // Definir el color verde
  },
  {
    question: '¿Cuál es este color?',
    correctAnswer: 'amarillo',
    answers: ['azul', 'rojo', 'verde', 'amarillo'],
    backgroundColor: 'rgba(255, 255, 0, 1)', // Definir el color verde
  },
  // Agregar más preguntas de colores según sea necesario
];


const animalQuestions = [
  {
    question: '¿Cuál es este animal?',
    correctAnswer: 'perro',
    answers: ['perro', 'gato', 'leon', 'elefante'],
    soundURL: 'soundbank://soundlibrary/animals/amzn_sfx_dog_med_bark_growl_01',
  },
  {
    question: '¿Cuál es este animal?',
    correctAnswer: 'gato',
    answers: ['leopardo', 'elefante', 'tortuga', 'gacela'],
    soundURL: 'soundbank://soundlibrary/animals/amzn_sfx_cat_angry_meow_1x_01',
  },
  {
    question: '¿Cuál es este animal?',
    correctAnswer: 'leon',
    answers: ['leopardo', 'elefante', 'tortuga', 'gacela'],
    soundURL: 'soundbank://soundlibrary/animals/amzn_sfx_lion_roar_01',
  },
  {
    question: '¿Cuál es este animal?',
    correctAnswer: 'elefante',
    answers: ['leopardo', 'elefante', 'tortuga', 'gacela'],
    soundURL: 'soundbank://soundlibrary/animals/amzn_sfx_elephant_01',
  },
  // Agrega más preguntas de animales según sea necesario
];



const generateAPLADocument  = (soundURL) => {
  return {
    type: 'APLA',
    version: '0.91',
    mainTemplate: {
      parameters: ['payload'],
      items: [
        {
          type: 'Audio',
          source: soundURL,
        },
      ],
    },
  };
};

const generateColorAPLTemplate = (backgroundColor, question) => {
  return {
    type: 'APL',
    version: '1.8',
    theme: 'dark',
    import: [
      {
        name: 'alexa-layouts',
        version: '1.7.0',
      },
    ],
    mainTemplate: {
      items: [
        {
          type: 'AlexaHeadline',
          backgroundColor: backgroundColor,
          primaryText: question,
          secondaryText: '¡Bienvenido a Prueba!',
          id: 'AlexaHeadline',
        },
      ],
    },
  };
};
const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
};

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speakOutput = '¡Bienvenido! Soy tu asistente de juego. Di "comenzar juego" para iniciar una nueva partida.';
    const repromptOutput = 'Para comenzar una nueva partida, di "comenzar juego".';
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt(repromptOutput)
      .getResponse();
  },
};

const sendDataToServer = async (dataToSend) => {
  try {
    await axios.post('http://localhost:80/resultados', {
      ...dataToSend,
      nombreUsuario: dataToSend.nombre,
    });
    console.log('Datos enviados al servidor con éxito.');
  } catch (error) {
    console.error('Error al enviar datos al servidor:', error);
  }
};

const StartGameIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'StartGameIntent'
    );
  },
  async handle(handlerInput) {
    try {
      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

      if (!sessionAttributes.userName) {
        const speakOutput = 'Antes de comenzar, por favor, dime tu nombre.';
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt('Por favor, dime tu nombre para continuar.')
          .getResponse();
      }

      if (!sessionAttributes.category) {
        const speakOutput = '¿En qué categoría quieres jugar? Puedes elegir entre Colores y Animales.';
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .reprompt('¿En qué categoría quieres jugar? Di "Colores" o "Animales".')
          .getResponse();
      }

      if (sessionAttributes.category === 'Colores') {
        sessionAttributes.questions = [...colorQuestions];
      
        const aplDocument = generateColorAPLTemplate(sessionAttributes.questions[0].backgroundColor, sessionAttributes.questions[0].question);
      
        handlerInput.responseBuilder.addDirective({
          type: 'Alexa.Presentation.APL.RenderDocument',
          token: 'colorDocumentToken',
          document: aplDocument,
        });
      } else if (sessionAttributes.category === 'Animales') {
        sessionAttributes.questions = [...animalQuestions];
        const aplDocument = generateAPLADocument(sessionAttributes.questions[0].soundURL);
      
        handlerInput.responseBuilder.addDirective({
          type: 'Alexa.Presentation.APLA.RenderDocument',
          token: 'audioDocumentToken',
          document: aplDocument,
        });
      }

      sessionAttributes.score = 0;
      sessionAttributes.gamesPlayed = sessionAttributes.gamesPlayed ? sessionAttributes.gamesPlayed + 1 : 1;
      sessionAttributes.wrongAttempts = 0;
      sessionAttributes.startTime = Date.now();

      if (Array.isArray(sessionAttributes.questions) && sessionAttributes.questions.length > 0) {
        const currentQuestion = sessionAttributes.questions.shift();
        sessionAttributes.currentQuestion = currentQuestion;

        const speakOutput = `¡Bienvenido, ${sessionAttributes.userName}! Iniciando nuevo juego en la categoría ${sessionAttributes.category}. Primera pregunta: ${currentQuestion.question}.`;
        return handlerInput.responseBuilder
          .speak(speakOutput)
          .getResponse();
      } else {
        const speakOutput = 'Lo siento, no hay preguntas disponibles en este momento.';
        return handlerInput.responseBuilder.speak(speakOutput).getResponse();
      }
    } catch (error) {
      console.error('Error en StartGameIntentHandler:', error);
      return handlerInput.responseBuilder.speak('Hubo un problema al iniciar el juego.').getResponse();
    }
  },
};

const AnswerIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AnswerIntent'
    );
  },
  async handle(handlerInput) {
    try {
      console.log('AnswerIntentHandler:', 'Recibida una respuesta del usuario');

      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
      const currentQuestion = sessionAttributes.currentQuestion;

      if (!currentQuestion) {
        console.error('AnswerIntentHandler:', 'currentQuestion no está definido.');
        return handlerInput.responseBuilder.speak('Hubo un problema con la pregunta actual.').getResponse();
      }

      const userAnswer = Alexa.getSlotValue(handlerInput.requestEnvelope, 'answer');
      console.log('AnswerIntentHandler:', 'Respuesta del usuario:', userAnswer);

      const elapsedTime = Date.now() - sessionAttributes.startTime;

      const normalizedUserAnswer = removeAccents(userAnswer.toLowerCase());
      const normalizedCorrectAnswer = removeAccents(currentQuestion.correctAnswer.toLowerCase());

      const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer;

      if (isCorrect) {
        sessionAttributes.score += 1;
        if (sessionAttributes.questions.length > 0) {
          const nextQuestion = sessionAttributes.questions.shift();
          sessionAttributes.currentQuestion = nextQuestion;

          
          if (sessionAttributes.category === 'Colores') {
            const aplTemplate = {
              type: 'APL',
              version: '1.8',
              theme: 'dark',
              import: [
                {
                  name: 'alexa-layouts',
                  version: '1.7.0',
                },
              ],
              mainTemplate: {
                items: [
                  {
                    type: 'AlexaHeadline',
                    backgroundColor: nextQuestion.backgroundColor,
                    primaryText: nextQuestion.question,
                    secondaryText: '¡Bienvenido a Prueba!',
                    id: 'AlexaHeadline',
                  },
                ],
              },
            };

            const token = `aplTemplateToken-${new Date().getTime()}`;

            handlerInput.responseBuilder.addDirective({
              type: 'Alexa.Presentation.APL.RenderDocument',
              token: token,
              document: aplTemplate,
            });

            handlerInput.responseBuilder.addDirective({
              type: 'Alexa.Presentation.APL.ExecuteCommands',
              token: token,
              commands: [
                {
                  type: 'Sequential',
                  commands: [
                    {
                      type: 'SpeakItem',
                      componentId: 'AlexaHeadline',
                    },
                  ],
                },
              ],
            });

            
          } else if (sessionAttributes.category === 'Animales') {
            const aplDocument = generateAPLADocument(nextQuestion.soundURL);
            handlerInput.responseBuilder.addDirective({
              type: 'Alexa.Presentation.APLA.RenderDocument',
              token: 'audioDocumentToken',
              document: aplDocument,
            });
          
          }


          const speakOutput = `¡Correcto! Siguiente pregunta: ${nextQuestion.question}`;
          console.log('AnswerIntentHandler:', speakOutput);
          return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('¿Cuál es tu respuesta?')
            .getResponse();
        } else {
          const finalScore = sessionAttributes.score;
          const speakOutput = `¡Juego completado! Tu puntuación final es ${finalScore}. ¡Gracias por jugar!`;

          await sendDataToServer({
            nombre: sessionAttributes.userName,
            fecha: new Date().toISOString(),
            tiempoDuracion: elapsedTime,
            resultadoJuego: finalScore,
            category: sessionAttributes.category,
          });

          return handlerInput.responseBuilder.speak(speakOutput).getResponse();
        }
      } else {
        sessionAttributes.wrongAttempts = (sessionAttributes.wrongAttempts || 0) + 1;
        if (sessionAttributes.wrongAttempts < 3) {
          const speakOutput = `¡Incorrecto! La respuesta correcta es ${currentQuestion.correctAnswer}. `;
          if (sessionAttributes.questions.length > 0) {
            const nextQuestion = sessionAttributes.questions.shift();
            sessionAttributes.currentQuestion = nextQuestion;

            if (sessionAttributes.category === 'Colores') {
              const aplTemplate = {
                type: 'APL',
                version: '1.8',
                theme: 'dark',
                import: [
                  {
                    name: 'alexa-layouts',
                    version: '1.7.0',
                  },
                ],
                mainTemplate: {
                  items: [
                    {
                      type: 'AlexaHeadline',
                      backgroundColor: nextQuestion.backgroundColor,
                      primaryText: nextQuestion.question,
                      secondaryText: '¡Bienvenido a Prueba!',
                      id: 'AlexaHeadline',
                    },
                  ],
                },
              };
  
              const token = `aplTemplateToken-${new Date().getTime()}`;
  
              handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.RenderDocument',
                token: token,
                document: aplTemplate,
              });
  
              handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APL.ExecuteCommands',
                token: token,
                commands: [
                  {
                    type: 'Sequential',
                    commands: [
                      {
                        type: 'SpeakItem',
                        componentId: 'AlexaHeadline',
                      },
                    ],
                  },
                ],
              });
  
              
            } else if (sessionAttributes.category === 'Animales') {
              const aplDocument = generateAPLADocument(nextQuestion.soundURL);
              handlerInput.responseBuilder.addDirective({
                type: 'Alexa.Presentation.APLA.RenderDocument',
                token: 'audioDocumentToken',
                document: aplDocument,
              });
            }

            console.log('AnswerIntentHandler:', speakOutput + `Siguiente pregunta: ${nextQuestion.question}.`);
            return handlerInput.responseBuilder
              .speak(speakOutput + `Siguiente pregunta: ${nextQuestion.question}.`)
              .reprompt('¿Cuál es tu respuesta?')
              .getResponse();
          } else {
            const finalScore = sessionAttributes.score;
            const speakOutput = `¡Juego completado! Tu puntuación final es ${finalScore}. ¡Gracias por jugar!`;

            await sendDataToServer({
              nombre: sessionAttributes.userName,
              fecha: new Date().toISOString(),
              tiempoDuracion: elapsedTime,
              resultadoJuego: finalScore,
              category: sessionAttributes.category,
            });

            return handlerInput.responseBuilder.speak(speakOutput).getResponse();
          }
        } else {
          const finalScore = sessionAttributes.score;
          const speakOutput = `¡Juego completado! Tu puntuación final es ${finalScore}. La respuesta correcta era ${currentQuestion.correctAnswer}. ¡Gracias por jugar!`;

          await sendDataToServer({
            nombre: sessionAttributes.userName,
            fecha: new Date().toISOString(),
            tiempoDuracion: elapsedTime,
            resultadoJuego: finalScore,
            category: sessionAttributes.category,
          });

          return handlerInput.responseBuilder.speak(speakOutput).getResponse();
        }
      }
    } catch (error) {
      console.error('Error en AnswerIntentHandler:', error);
      return handlerInput.responseBuilder.speak('Hubo un problema con tu respuesta.').getResponse();
    }
  },
};

const askNextQuestion = async (handlerInput, previousOutput = '') => {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  const currentQuestion = sessionAttributes.currentQuestion;

  if (currentQuestion) {
    sessionAttributes.currentQuestion = currentQuestion;

    if (sessionAttributes.category === 'Colores') {
      const colorAPLTemplate = {
        type: 'APL',
        version: '1.8',
        theme: 'dark',
        import: [
          {
            name: 'alexa-layouts',
            version: '1.7.0',
          },
        ],
        mainTemplate: {
          items: [
            {
              type: 'AlexaHeadline',
              backgroundColor: currentQuestion.backgroundColor,
              primaryText: currentQuestion.question,
              secondaryText: '¡Bienvenido a Prueba!',
              id: 'AlexaHeadline',
            },
          ],
        },
      };

      const token = `colorAPLTemplateToken-${new Date().getTime()}`;
      console.log('Token APL:', token);

      handlerInput.responseBuilder.addDirective({
        type: 'Alexa.Presentation.APL.RenderDocument',
        token: token,
        document: colorAPLTemplate,
      });

      handlerInput.responseBuilder.addDirective({
        type: 'Alexa.Presentation.APL.ExecuteCommands',
        token: token,
        commands: [
          {
            type: 'Sequential',
            commands: [
              {
                type: 'SpeakItem',
                componentId: 'AlexaHeadline',
              },
            ],
          },
        ],
      });

      // Log APL Directives
      console.log('APL Directives:', JSON.stringify(handlerInput.responseBuilder.getResponse().directives));

    } else if (sessionAttributes.category === 'Animales') {
      handlerInput.responseBuilder.addDirective({
        type: 'Alexa.Presentation.APLA.RenderDocument',
        token: 'audioDocumentToken',
        document: generateAPLADocument(currentQuestion.soundURL),
      });
    }

    const speakOutput = `${previousOutput} Pregunta: ${currentQuestion.question}. ¿Cuál es tu respuesta?`;

    console.log('askNextQuestion:', `Mostrando nueva pregunta: ${currentQuestion.question}`);
    console.log('askNextQuestion:', 'speakOutput:', speakOutput);

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt('¿Cuál es tu respuesta?')
      .getResponse();
  } else {

    const finalScore = sessionAttributes.score;
    if (sessionAttributes.questions.length === 0) {
      const speakOutput = `Juego completado. Tu puntuación final es ${finalScore}. ¡Gracias por jugar!`;

      await sendDataToServer({
        nombre: sessionAttributes.userName,
        fecha: new Date().toISOString(),
        tiempoDuracion: elapsedTime,
        resultadoJuego: finalScore,
        category: sessionAttributes.category,
      });

      return handlerInput.responseBuilder.speak(speakOutput).getResponse();
    } else  {
      return askNextQuestion(handlerInput, 'No hay más preguntas. ');
    }
  }
};

const CaptureNameIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'CaptureNameIntent'
    );
  },
  handle(handlerInput) {
    const { requestEnvelope, attributesManager } = handlerInput;
    const userName = Alexa.getSlotValue(requestEnvelope, 'userName');

    if (userName) {
      const sessionAttributes = attributesManager.getSessionAttributes();
      sessionAttributes.userName = userName;

      const speakOutput = `¡Hola, ${userName}! ¿En qué categoría quieres jugar? Puedes elegir entre Colores y Animales.`;
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt('¿En qué categoría quieres jugar? Di "Colores" o "Animales".')
        .getResponse();
    } else {
      const speakOutput = 'Lo siento, no pude capturar tu nombre. ¿Puedes repetirlo?';
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt('Por favor, di tu nombre para continuar.')
        .getResponse();
    }
  },
};

const ColorCategoryIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'ColorCategoryIntent'
    );
  },
  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.category = 'Colores';

    return StartGameIntentHandler.handle(handlerInput);
  },
};

const AnimalCategoryIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'AnimalCategoryIntent'
    );
  },
  async handle(handlerInput) {
    const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
    sessionAttributes.category = 'Animales';

    return StartGameIntentHandler.handle(handlerInput);
  },
};

const EndGameIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'EndGameIntent'
    );
  },
  async handle(handlerInput) {
    try {
      console.log('EndGameIntentHandler:', 'Entró en el manejador EndGameIntentHandler');

      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
      const finalScore = sessionAttributes.score;

      await sendDataToServer({
            nombre: sessionAttributes.userName,
            fecha: new Date().toISOString(),
            tiempoDuracion: elapsedTime,
            resultadoJuego: finalScore,
          });

      console.log('EndGameIntentHandler:', 'Datos a enviar al servidor:', dataToSend);

      await sendDataToServer(dataToSend);

      return askNextQuestion(handlerInput);
    } catch (error) {
      console.error('Error en EndGameIntentHandler:', error);
      return handlerInput.responseBuilder.speak('Hubo un problema al finalizar el juego.').getResponse();
    }
  },
};
const UpdateScreenIntentHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      Alexa.getIntentName(handlerInput.requestEnvelope) === 'UpdateScreenIntent'
    );
  },
  handle(handlerInput) {
    try {
      const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
      const currentQuestion = sessionAttributes.currentQuestion;

      if (!currentQuestion) {
        console.error('UpdateScreenIntentHandler:', 'currentQuestion no está definido.');
        return handlerInput.responseBuilder.speak('Hubo un problema con la pregunta actual.').getResponse();
      }

      // Log current question and color
      console.log('Current Question:', currentQuestion);
      console.log('Color actualizado:', currentQuestion.backgroundColor);

      const colorAPLTemplate = {
        type: 'APL',
        version: '1.8',  // Update to the latest version
        theme: 'dark',
        import: [
          {
            name: 'alexa-layouts',
            version: '1.7.0',
          },
        ],
        mainTemplate: {
          items: [
            {
              type: 'AlexaHeadline',
              backgroundColor: currentQuestion.backgroundColor,
              primaryText: currentQuestion.question,
              secondaryText: '¡Bienvenido a APL para audio!',
              id: 'AlexaHeadline',
            },
          ],
        },
      };

      const token = `colorAPLTemplateToken-${new Date().getTime()}`;
      console.log('Token APL:', token);

      handlerInput.responseBuilder.addDirective({
        type: 'Alexa.Presentation.APL.RenderDocument',
        token: token,
        document: colorAPLTemplate,
      });

      handlerInput.responseBuilder.addDirective({
        type: 'Alexa.Presentation.APL.ExecuteCommands',
        token: token,
        commands: [
          {
            type: 'Sequential',
            commands: [
              {
                type: 'SpeakItem',
                componentId: 'AlexaHeadline',
              },
            ],
          },
        ],
      });

      // Log APL Directives
      console.log('APL Directives:', JSON.stringify(handlerInput.responseBuilder.getResponse().directives));

      const speakOutput = `Pregunta: ${currentQuestion.question}. ¿Cuál es tu respuesta?`;

      return handlerInput.responseBuilder.speak(speakOutput).reprompt('¿Cuál es tu respuesta?').getResponse();
    } catch (error) {
      console.error('Error en UpdateScreenIntentHandler:', error);
      return handlerInput.responseBuilder.speak('Hubo un problema al mostrar la siguiente pregunta.').getResponse();
    }
  },
};
// Agrega UpdateScreenIntentHandler a la lista de manejadores
const skillBuilder = SkillBuilders.custom().addRequestHandlers(
  LaunchRequestHandler,
  CaptureNameIntentHandler,
  ColorCategoryIntentHandler,
  AnimalCategoryIntentHandler,
  StartGameIntentHandler,
  AnswerIntentHandler,
  EndGameIntentHandler,
  UpdateScreenIntentHandler  // Agrega esta línea
);

const skill = skillBuilder.create();
const adapter = new ExpressAdapter(skill, false, false);

app.post('/api/v1/webhook-alexa', adapter.getRequestHandlers());

app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 

