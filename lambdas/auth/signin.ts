import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { SignInBody } from "../../shared/types";
import { CognitoIdentityProviderClient, InitiateAuthCommand, InitiateAuthCommandInput, } from "@aws-sdk/client-cognito-identity-provider";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json";

const ajv = new Ajv();

const isValidBodyParams = ajv.compile(
    schema.definitions["SignInBody"] || {}
);

const client = new CognitoIdentityProviderClient({
    region: process.env.REGION,
});

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));

        const body = event.body
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
                        "Incorrect type. Must match SignInBody schema",
                    schema:
                        schema.definitions["SignInBody"],
                }),
            };
        }

        const signInBody =
            body as SignInBody;

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Signin body is valid",
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