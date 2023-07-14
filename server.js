const express = require("express");
const axios = require("axios").default;
const { v4: uuidv4, stringify } = require("uuid");
const app = express();
const port = 8000;
const bodyParser = require("body-parser");
const config = require("config");
app.use(bodyParser.json());
const jsonParser = bodyParser.json();

const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const cors = require("cors");

const options = {
  swaggerDefinition: {
    info: {
      title: "Text Translator API",
      version: "1.0.0",
      description: "Text Translator API",
    },
    host: "localhost:8000",
    basePath: "/",
  },
  apis: ["./server.js"],
};

const specs = swaggerJsdoc(options);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(specs));
app.use(cors());
const { check, validationResult, body } = require("express-validator");

// Get the list of supported languages for scope = translation or transliteration or dictionary

/**
 * @swagger
 * /api/language_code/{scope}:
 *    get:
 *      description: Return language codes for scope = translation or transliteration or dictionary
 *      parameters:
 *          - in: path
 *            name: scope
 *            schema:
 *              type: string
 *            required: true
 *            description: Scope for language codes and scripts
 *      produces: 
 *          - application/json
 *      responses:
 *          200:
 *              description: Language scope obtained
 *          400: 
 *              description: Request failed with status code 400
 */
app.get("/api/language_code/:scope", async (req, res) => {
  axios({
    baseURL: config.get("translator.endpoint"),
    url: "/languages",
    method: "get",
    headers: {
      "Ocp-Apim-Subscription-Key": config.get("translator.subscriptionKey"),
      "Ocp-Apim-Subscription-Region": config.get("translator.location"),
      "Content-type": "application/json",
      "X-ClientTraceId": uuidv4().toString(),
    },
    params: {
      "api-version": "3.0",
      "scope": req.params.scope
    },
    responseType: "json",
  }).then(function (response) {
    res.status(200).json(response.data, null, 4);
  }).catch((err) => {
    if(!req.params.scope)
      res.status(400).json(err.message+": Missing request parameter 'scope'")
    res.status(400).json(err.message);
  });
});

// Text Translation and detection of language code for input text with Profanity Marking

/**
 * @swagger
 * definitions:
 *   Translate:
 *     properties:
 *       text:
 *         type: string
 *         description: Input text to be translated
 *       to:
 *         type: string
 *         description: Language code of the language the text is to be translated in
 */
/**
/**
 * @swagger
 * /api/translate:
 *        post:
 *          description: Translate and Detect input text       
 *          produces:
 *            - application/json
 *          responses:
 *            200:
 *              description: Text Translated
 *            400:
 *              description: Request failed with status code 400
 *          parameters:
 *            - name: Translate
 *              description: Translation Object
 *              in: body
 *              required: true
 *              schema: 
 *                $ref: '#/definitions/Translate'
 */
app.post(
  "/api/translate",
  jsonParser,
  [
    check("text")
      .trim()
      .not()
      .isEmpty()
      .isString()
      .withMessage("Please enter valid text"),
    check("to")
      .trim()
      .not()
      .isEmpty()
      .isString()
      .withMessage("Please enter valid language code"),
  ],
  async (req, res) => {
    var translate = [
      {
        detectedLanguage: {},
        translations: [{}],
      },
    ];
    axios({
      baseURL: config.get("translator.endpoint"),
      url: "/translate",
      method: "post",
      headers: {
        "Ocp-Apim-Subscription-Key": config.get("translator.subscriptionKey"),
        "Ocp-Apim-Subscription-Region": config.get("translator.location"),
        "Content-type": "application/json",
        "X-ClientTraceId": uuidv4().toString(),
      },
      params: {
        "api-version": "3.0",
        to: req.body.to,
        profanityAction: "Marked",
      },
      data: [
        {
          text: req.body.text,
        },
      ],
      responseType: "json",
    })
      .then(function (response) {
        for (var i = 0; i < response.data.length; i++) {
          translate[0].detectedLanguage.language =
            response.data[0].detectedLanguage.language;
          translate[0].detectedLanguage.score =
            response.data[0].detectedLanguage.score;
          translate[0].translations = response.data[i].translations;
        }
        res.status(200).json(translate, null, 4);
      })
      .catch((err) => {
        if (!req.body.text)
          res.status(400).json(err.message + " Missing attribute 'text'");
        if (!req.body.to)
          res.status(400).json(err.message + ": Missing attribute 'to'");
        res.status(400).json(err.message);
      });
  }
);

// Language Code detection for the given input text

/**
 * @swagger
 * definitions:
 *   Detect:
 *     properties:
 *       text:
 *         type: string
 *         description: Input text whose language is to be detected
 */
/**
/**
 * @swagger
 * /api/detect:
 *        post:
 *          description: Detect Language Code for input text       
 *          produces:
 *            - application/json
 *          responses:
 *            200:
 *              description: Text Language Code Detected
 *            400:
 *              description: Request failed with status code 400
 *          parameters:
 *            - name: Detect
 *              description: Detection Object
 *              in: body
 *              required: true
 *              schema: 
 *                $ref: '#/definitions/Detect'
 */
app.post(
  "/api/detect",
  jsonParser,
  [
    check("text")
      .trim()
      .not()
      .isEmpty()
      .isString()
      .withMessage("Please enter valid text"),
  ],
  async (req, res) => {
    var detect = [
      {
        language: "",
        score: "",
        alternatives: [
          {
            language: "",
            score: "",
          },
        ],
      },
    ];
    axios({
      baseURL: config.get("translator.endpoint"),
      url: "/detect",
      method: "post",
      headers: {
        "Ocp-Apim-Subscription-Key": config.get("translator.subscriptionKey"),
        "Ocp-Apim-Subscription-Region": config.get("translator.location"),
        "Content-type": "application/json",
        "X-ClientTraceId": uuidv4().toString(),
      },
      params: {
        "api-version": "3.0",
      },
      data: [
        {
          text: req.body.text,
        },
      ],
      responseType: "json",
    })
      .then(function (response) {
        for (var i = 0; i < response.data.length; i++) {
          detect[i].language = response.data[i].language;
          detect[i].score = response.data[i].score;
          if (response.data[i].alternatives) {
            detect[i].alternatives[i].language =
              response.data[i].alternatives[i].language;
            detect[i].alternatives[i].score =
              response.data[i].alternatives[i].score;
          }
        }
        res.status(200).json(detect, null, 4);
      })
      .catch((err) => {
        if (!req.body.text)
          res.status(400).json(err.message + ": Missing attribute 'text'");
        res.status(400).json(err.message);
      });
  }
);

// Get positioning of sentence boundaries

/**
 * @swagger
 * definitions:
 *   Sentence:
 *     properties:
 *       text:
 *         type: string
 *         description: Input text whose sentence boundaries are to be identified
 */
/**
/**
 * @swagger
 * /api/break_sentence:
 *        post:
 *          description: Identify the positioning of sentence boundaries for the input text provided.       
 *          produces:
 *            - application/json
 *          responses:
 *            200:
 *              description: Sentence Boundaries identified
 *            400:
 *              description: Request failed with status code 400
 *          parameters:
 *            - name: Sentence
 *              description: Sentence Object
 *              in: body
 *              required: true
 *              schema: 
 *                $ref: '#/definitions/Sentence'
 */
app.post(
  "/api/break_sentence",
  jsonParser,
  [
    check("text")
      .trim()
      .not()
      .isEmpty()
      .isString()
      .withMessage("Please enter valid text"),
  ],
  async (req, res) => {
    var sentLen = [
      {
        sent: "",
      },
    ];
    var breakSentence = [
      {
        sentLen: [],
      },
    ];
    axios({
      baseURL: config.get("translator.endpoint"),
      url: "/breaksentence",
      method: "post",
      headers: {
        "Ocp-Apim-Subscription-Key": config.get("translator.subscriptionKey"),
        "Ocp-Apim-Subscription-Region": config.get("translator.location"),
        "Content-type": "application/json",
        "X-ClientTraceId": uuidv4().toString(),
      },
      params: {
        "api-version": "3.0",
      },
      data: [
        {
          text: req.body.text,
        },
      ],
      responseType: "json",
    })
      .then(function (response) {
        for (var i = 0; i < response.data[0].sentLen.length; i++) {
          sentLen[i] =
            "Sentence " + [i + 1] + " : " + response.data[0].sentLen[i];
        }
        for (var i = 0; i < response.data.length; i++) {
          breakSentence[i].detectedLanguage = response.data[0].detectedLanguage;
          breakSentence[i].sentLen = sentLen;
        }
        res.status(200).json(breakSentence, null, 4);
      })
      .catch((err) => {
        if (!req.body.text)
          res.status(400).json(err.message + ": Missing attribute 'text'");
        res.status(400).json(err.message);
      });
  }
);

// Phonetic translation --> Transliteration

/**
 * @swagger
 * definitions:
 *   Transliterate:
 *     properties:
 *       text:
 *         type: string
 *         description: Input text to be transliterated
 *       language:
 *         type: string
 *         description: Language code of the input text provided.
 *       fromScript:
 *         type: string
 *         description: Name of the script of the input text.
 *       toScript:
 *          type: string
 *          description: Name of the script the input text should be transliterated to.
 */
/**
/**
 * @swagger
 * /api/transliterate:
 *        post:
 *          description: Give a phonetic translation from of the input text from one language to another.       
 *          produces:
 *            - application/json
 *          responses:
 *            200:
 *              description: Input Text Transliterated
 *            400:
 *              description: Request failed with status code 400
 *          parameters:
 *            - name: Transliterate
 *              description: Transliterate Object
 *              in: body
 *              required: true
 *              schema: 
 *                $ref: '#/definitions/Transliterate'
 */
app.post(
  "/api/transliterate",
  jsonParser,
  [
    check("text")
      .trim()
      .not()
      .isEmpty()
      .isString()
      .withMessage("Please enter valid text"),
    check("language")
      .trim()
      .not()
      .isEmpty()
      .isString()
      .withMessage("Please enter valid language code"),
    check("fromScript")
      .trim()
      .not()
      .isEmpty()
      .isString()
      .withMessage("Please enter valid language script"),
    check("toScript")
      .trim()
      .not()
      .isEmpty()
      .isString()
      .withMessage("Please enter valid language script"),
  ],
  async (req, res) => {
    axios({
      baseURL: config.get("translator.endpoint"),
      url: "/transliterate",
      method: "post",
      headers: {
        "Ocp-Apim-Subscription-Key": config.get("translator.subscriptionKey"),
        "Ocp-Apim-Subscription-Region": config.get("translator.location"),
        "Content-type": "application/json",
        "X-ClientTraceId": uuidv4().toString(),
      },
      params: {
        "api-version": "3.0",
        language: req.body.language,
        fromScript: req.body.fromScript,
        toScript: req.body.toScript,
      },
      data: [
        {
          text: req.body.text,
        },
      ],
      responseType: "json",
    })
      .then(function (response) {
        res.status(200).json(response.data, null, 4);
      })
      .catch((err) => {
        if (!req.body.text)
          res.status(400).json(err.message + ": Missing attribute 'text'");
        if (!req.body.language)
          res.status(400).json(err.message + ": Missing attribute 'language'");
        if (!req.body.fromScript)
          res.status(400).json(err.message + ": Missing attribute 'fromScript'");
        if (!req.body.toScript)
          res.status(400).json(err.message + " Missing attribute 'toScript'");
        res.status(400).json(err.message);
      });
  }
);

// Get alternate translations for given text i.e Provide synonyms of the input text in the input language provided

/**
 * @swagger
 * definitions:
 *   Alternate_Translation:
 *     properties:
 *       text:
 *         type: string
 *         description: Input text to be translated
 *       from:
 *         type: string
 *         description: Language code of the input text provided.
 *       to:
 *         type: string
 *         description: Language code of the language the input text is to translated to.
 */
/**
/**
 * @swagger
 * /api/alt_translations:
 *        post:
 *          description: Get alternate translations or synonyms of the input text in the language provided.       
 *          produces:
 *            - application/json
 *          responses:
 *            200:
 *              description: Input Text Translated
 *            400:
 *              description: Request failed with status code 400
 *          parameters:
 *            - name: Alternate_Translation
 *              description: Alternate_Translation Object
 *              in: body
 *              required: true
 *              schema: 
 *                $ref: '#/definitions/Alternate_Translation'
 */
app.post("/api/alt_translations", jsonParser,
[
  check("text")
    .trim()
    .not()
    .isEmpty()
    .isString()
    .withMessage("Please enter valid text"),
  check("from")
    .trim()
    .not()
    .isEmpty()
    .isString()
    .withMessage("Please enter valid language code"),
  check("to")
    .trim()
    .not()
    .isEmpty()
    .isString()
    .withMessage("Please enter valid language code")], async (req, res) => {
  axios({
    baseURL: config.get("translator.endpoint"),
    url: "/dictionary/lookup",
    method: "post",
    headers: {
      "Ocp-Apim-Subscription-Key": config.get("translator.subscriptionKey"),
      "Ocp-Apim-Subscription-Region": config.get("translator.location"),
      "Content-type": "application/json",
      "X-ClientTraceId": uuidv4().toString(),
    },
    params: {
      "api-version": "3.0",
      from: req.body.from,
      to: req.body.to,
    },
    data: [
      {
        text: req.body.text,
      },
    ],
    responseType: "json",
  })
    .then(function (response) {
      res.status(200).json(response.data[0].translations, null, 4);
    })
    .catch((err) => {
      if (!req.body.text)
        res.status(400).json(err.message + ": Missing attribute 'text'");
      if (!req.body.from)
        res.status(400).json(err.message + ": Missing attribute 'from'");
      if (!req.body.to)
        res.status(400).json(err.message + ": Missing attribute 'to'");
      res.status(400).json(err.message);
    });
});


app.listen(port, () => {
  console.log(`API deployed on ${port}`);
});
