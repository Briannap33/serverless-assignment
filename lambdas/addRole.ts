import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 =
    async (event) => {
        try {
            console.log(
                "[EVENT]",
                JSON.stringify(event)
            );

            // Read the role details sent in the request body.
            const body = event.body
                ? JSON.parse(event.body)
                : undefined;

            // Make sure all of the required role fields were provided.
            if (
                !body ||
                body.movieId === undefined ||
                body.actorId === undefined ||
                !body.roleName ||
                !body.roleDescription
            ) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({
                        message: "Invalid role data",
                    }),
                };
            }

            // Build the role item using the single-table PK and SK format.
            const item = {
                PK: `m#${body.movieId}`,
                SK: `a#${body.actorId}`,

                movieId:
                    body.movieId,
                actorId:
                    body.actorId.toString(),
                roleName:
                    body.roleName,
                roleDescription:
                    body.roleDescription,
            };

            // Save the new role in DynamoDB.
            await ddbDocClient.send(
                new PutCommand({
                    TableName:
                        process.env.TABLE_NAME,

                    Item: item,
                })
            );

            return {
                statusCode: 201,

                headers: {
                    "content-type":
                        "application/json",
                },

                body: JSON.stringify({
                    message: "Role added",
                    role: item,
                }),
            };
        } catch (error: any) {
            return {
                statusCode: 500,
                body: JSON.stringify({
                    error,
                }),
            };
        }
    };

// Create the DynamoDB document client.
function createDocumentClient() {
    const client =
        new DynamoDBClient({
            region: process.env.REGION,
        });

    return DynamoDBDocumentClient.from(client);
}