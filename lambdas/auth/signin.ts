import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { SignInBody } from "../../shared/types";
import {CognitoIdentityProviderClient,InitiateAuthCommand,InitiateAuthCommandInput,} from "@aws-sdk/client-cognito-identity-provider";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(
  schema.definitions["SignInBody"] || {}
);

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});
