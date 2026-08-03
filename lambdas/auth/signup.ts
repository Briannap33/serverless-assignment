import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { SignUpBody } from "../../shared/types";

import Ajv from "ajv";
import schema from "../../shared/types.schema.json";

const ajv = new Ajv();

const isValidBodyParams =
  ajv.compile(
    schema.definitions["SignUpBody"] || {}
  );

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const body =
      event.body
        ? JSON.parse(event.body)
        : undefined;

    if (!isValidBodyParams(body)) {
      return {
        statusCode: 500,

        headers: {
          "content-type": "application/json",
        },

        body: JSON.stringify({
          message:
            "Incorrect type. Must match SignUpBody schema",

          schema:
            schema.definitions["SignUpBody"],
        }),
      };
    }

    const signUpBody =
      body as SignUpBody;

    return {
      statusCode: 200,

      headers: {
        "content-type": "application/json",
      },

      body: JSON.stringify({
        message: "Signup body is valid",
      }),
    };

  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,

      body: JSON.stringify({
        message: err,
      }),
    };
  }
};