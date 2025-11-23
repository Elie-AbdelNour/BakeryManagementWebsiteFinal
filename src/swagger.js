const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Bakery Ordering API",
      version: "1.0.0",
      description: "API documentation for the Bakery Ordering Web Application",
    },
    servers: [
      {
        url: "http://localhost:5173",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./src/Routes/*.js"], // path to route files
};

const swaggerSpec = swaggerJsdoc(options);

function swaggerDocs(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("Swagger Docs available at: http://localhost:5173/api-docs");
}

module.exports = swaggerDocs;
