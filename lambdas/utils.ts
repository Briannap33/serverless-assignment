import {APIGatewayRequestAuthorizerEvent,APIGatewayAuthorizerEvent,PolicyDocument,APIGatewayProxyEvent,StatementEffect,} from "aws-lambda";
import axios from "axios";
import jwt from "jsonwebtoken";
import jwkToPem from "jwk-to-pem";

export type CookieMap =
  { [key: string]: string } |
  undefined;

export type JwtToken =
  | {
      sub: string;
      email?: string;
      "cognito:username"?: string;
    }
  | null;

export type Jwk = {
  keys: {
    alg: string;
    e: string;
    kid: string;
    kty: string;
    n: string;
    use: string;
  }[];
};
