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

export const parseCookies = (
  event:
    | APIGatewayRequestAuthorizerEvent
    | APIGatewayProxyEvent
) => {
  if (!event.headers) {
    return undefined;
  }

  const cookiesStr =
    event.headers.Cookie ??
    event.headers.cookie;

  if (!cookiesStr) {
    return undefined;
  }

  const cookiesArr =
    cookiesStr.split(";");

  const cookieMap: CookieMap = {};

  for (const cookie of cookiesArr) {
    const cookieSplit =
      cookie.trim().split("=");

    cookieMap[cookieSplit[0]] =
      cookieSplit.slice(1).join("=");
  }
  return cookieMap;
};