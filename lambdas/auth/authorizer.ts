import { APIGatewayRequestAuthorizerHandler, } from "aws-lambda";
import { createPolicy, parseCookies, verifyToken, } from "../utils";

export const handler:
    APIGatewayRequestAuthorizerHandler =
    async (event) => {

        console.log(
            "[EVENT]",
            JSON.stringify(event)
        );

        // Read the login cookie from the incoming request.
        const cookies =
            parseCookies(event);

        // Deny the request if there is no Cognito token.
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

        // Verify the Cognito token before allowing access.
        const verifiedJwt =
            await verifyToken(
                cookies.token,
                process.env.USER_POOL_ID,
                process.env.REGION!
            );

        // Deny the request if the token could not be verified.
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

        // Work out which username to write to the activity log.
        const username =
            verifiedJwt[
            "cognito:username"
            ] ??
            verifiedJwt.email ??
            verifiedJwt.sub;

        let requestPath =
            event.path;

        // Add the query string so the full request path is logged.
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

        // Log the authenticated user and the path they requested.
        console.log(
            `${username} ${requestPath}`
        );

        // Allow API Gateway to continue with the request.
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