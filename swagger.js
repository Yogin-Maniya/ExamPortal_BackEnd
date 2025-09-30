const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Exam Portal API",
      version: "1.0.0",
      description: "API documentation for Exam Portal",
    },
    servers: [
      { url: "https://exam-portal-flame.vercel.app" }
    ],
  },
  apis: ["./routes/**/*.js"] // include all your route files
};

const specs = swaggerJsDoc(options);

module.exports = { swaggerUi, specs };
