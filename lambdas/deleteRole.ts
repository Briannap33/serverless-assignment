import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient,DeleteCommand,} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 =
  async (event) => {
    try {
      console.log(
        "[EVENT]",
        JSON.stringify(event)
      );

      const movieID =
        event.pathParameters?.movieID;

      const actorID =
        event.pathParameters?.actorID;

      if (!movieID || !actorID) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            message:
              "Missing path parameters",
          }),
        };
      }

      const result =
        await ddbDocClient.send(
          new DeleteCommand({
            TableName:
              process.env.TABLE_NAME,

            Key: {
              PK: `m#${movieID}`,
              SK: `a#${actorID}`,
            },

            ReturnValues: "ALL_OLD",
          })
        );

      return {
        statusCode: 200,

        body: JSON.stringify({
          message:
            "Role deleted",
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