import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {DynamoDBDocumentClient,GetCommand,} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

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

function createDocumentClient() {
  const client =
    new DynamoDBClient({
      region: process.env.REGION,
    });

  return DynamoDBDocumentClient.from(client);
}