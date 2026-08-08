import {APIGatewayRequestAuthorizerHandler,} from "aws-lambda";
import {createPolicy,parseCookies,verifyToken,} from "../utils";

export const handler:
  APIGatewayRequestAuthorizerHandler =
  async (event) => {

    console.log(
      "[EVENT]",
      JSON.stringify(event)
    );

    const cookies =
      parseCookies(event);

    if (!cookies?.token) {
      return {
        principalId: "",

        policyDocument:
          createPolicy(
            event,
            "Deny"
          ),
      };
    }

    return {
      principalId: "",
      policyDocument:
        createPolicy(
          event,
          "Deny"
        ),
    };
  };