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
        const username =
            verifiedJwt[
            "cognito:username"
            ] ??
            verifiedJwt.email ??
            verifiedJwt.sub;

        let requestPath =
            event.path;

        const query =
            event.queryStringParameters;

        if (query) {
            const search =
                new URLSearchParams(
                    Object.entries(query)
                        .filter(
                            (
                                entry
                            ): entry is [
                                string,
                                string,
                            ] =>
                                entry[1] !==
                                undefined
                        )
                ).toString();

            if (search) {
                requestPath +=
                    `?${search}`;
            }
        }
        console.log(
            `${username} ${requestPath}`
        );

        return {
            principalId:
                verifiedJwt.sub,
            policyDocument:
                createPolicy(
                    event,
                    "Allow"
                ),
        };
    };