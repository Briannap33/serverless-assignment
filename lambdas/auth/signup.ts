import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { SignUpBody } from "../../shared/types";
import {CognitoIdentityProviderClient,SignUpCommand,SignUpCommandInput,} from "@aws-sdk/client-cognito-identity-provider";
import Ajv from "ajv";
import schema from "../../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(
  schema.definitions["SignUpBody"] || {}
);

const client = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});
