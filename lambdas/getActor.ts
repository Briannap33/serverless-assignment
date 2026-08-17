import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    // Get the actor ID and optional movie ID from the request.
    const actorID =
      event.pathParameters?.actorID;
    const movieID =
      event.queryStringParameters?.movie;

    if (!actorID) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Missing actor ID",
        }),
      };
    }

    // Look up the actor using the actor PK and SK.
    const actorOutput =
      await ddbDocClient.send(
        new GetCommand({
          TableName:
            process.env.TABLE_NAME,

          Key: {
            PK: `a#${actorID}`,
            SK: `a#${actorID}`,
          },
        })
      );

    if (!actorOutput.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          message: "Actor not found",
        }),
      };
    }

    // If no movie was requested, just return the actor details.
    if (!movieID) {
      return {
        statusCode: 200,

        headers: {
          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          actor: actorOutput.Item,
        }),
      };
    }

    // If a movie was supplied, look up this actor's role in that movie.
    const roleOutput =
      await ddbDocClient.send(
        new GetCommand({
          TableName:
            process.env.TABLE_NAME,

          Key: {
            PK: `m#${movieID}`,
            SK: `a#${actorID}`,
          },
        })
      );

    // Return the actor and include the role when one is found.
    return {
      statusCode: 200,

      headers: {
        "content-type":
          "application/json",
      },

      body: JSON.stringify({
        actor: actorOutput.Item,

        role: roleOutput.Item
          ? {
            roleName:
              roleOutput.Item.roleName,

            roleDescription:
              roleOutput.Item.roleDescription,
          }
          : undefined,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
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