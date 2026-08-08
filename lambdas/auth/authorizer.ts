import { APIGatewayRequestAuthorizerHandler, } from "aws-lambda";
import { createPolicy, parseCookies, verifyToken, } from "../utils";

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

        const verifiedJwt =
            await verifyToken(
                cookies.token,
                process.env.USER_POOL_ID,
                process.env.REGION!
            );

        if (!verifiedJwt) {
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
            principalId:
                verifiedJwt.sub,

            policyDocument:
                createPolicy(
                    event,
                    "Deny"
                ),
        };
    };