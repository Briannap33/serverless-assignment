import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient,PutCommand,} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 =
  async (event) => {
    try {
      console.log(
        "[EVENT]",
        JSON.stringify(event)
      );

      const body = event.body
        ? JSON.parse(event.body)
        : undefined;

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

      return {
        statusCode: 200,
        body: JSON.stringify({
          message: "Role data is valid",
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

function createDocumentClient() {
  const client =
    new DynamoDBClient({
      region: process.env.REGION,
    });

  return DynamoDBDocumentClient.from(client);
}