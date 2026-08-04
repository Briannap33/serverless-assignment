import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import {CognitoIdentityProviderClient,ConfirmSignUpCommand,ConfirmSignUpCommandInput,} from "@aws-sdk/client-cognito-identity-provider";
import { ConfirmSignUpBody } from "../../shared/types";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(
  schema.definitions["ConfirmSignUpBody"] || {}
);

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});
