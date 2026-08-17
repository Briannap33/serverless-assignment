import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2, } from "aws-lambda";
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

export const handler = async (event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
    try {
        console.log("[EVENT]", JSON.stringify(event));

        // Read the username and password from the request.
        const body = event.body
            ? JSON.parse(event.body)
            : undefined;

        // Check that the signin body matches the expected schema.
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

        // Set up Cognito username/password authentication.
        const params: InitiateAuthCommandInput = {
            ClientId:
                process.env.CLIENT_ID!,

            AuthFlow:
                "USER_PASSWORD_AUTH",

            AuthParameters: {
                USERNAME:
                    signInBody.username,

                PASSWORD:
                    signInBody.password,
            },
        };

        const command =
            new InitiateAuthCommand(params);

        // Send the signin request to Cognito.
        const {
            AuthenticationResult,
        } = await client.send(command);

        if (!AuthenticationResult) {
            return {
                statusCode: 400,

                body: JSON.stringify({
                    message:
                        "User signin failed",
                }),
            };
        }

        // Get the Cognito ID token returned after a successful signin.
        const token =
            AuthenticationResult.IdToken;

        // Return the token in a secure HTTP-only cookie.
        return {
            statusCode: 200,

            headers: {
                "Access-Control-Allow-Headers":
                    "*",
                "Access-Control-Allow-Origin":
                    "*",
                "Set-Cookie":
                    `token=${token}; SameSite=None; Secure; HttpOnly; Path=/; Max-Age=3600;`,
            },

            body: JSON.stringify({
                message:
                    "Auth successfull",

                token: token,
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