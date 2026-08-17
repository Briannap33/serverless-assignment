import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDocumentClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    // Get the movie ID from the path and the optional actor ID from the query string.
    const movieID = event.pathParameters?.movieID;
    const actorID = event.queryStringParameters?.actor;

    if (!movieID) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Missing movie ID",
        }),
      };
    }

    let commandOutput;

    // If an actor ID is included, only query for that actor's role.
    if (actorID) {
      commandOutput = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.TABLE_NAME,

          KeyConditionExpression:
            "PK = :pk AND SK = :sk",

          ExpressionAttributeValues: {
            ":pk": `m#${movieID}`,
            ":sk": `a#${actorID}`,
          },
        })
      );
      // Otherwise get every role stored for the movie.
    } else {
      commandOutput = await ddbDocClient.send(
        new QueryCommand({
          TableName: process.env.TABLE_NAME,

          KeyConditionExpression:
            "PK = :pk AND begins_with(SK, :actorPrefix)",

          ExpressionAttributeValues: {
            ":pk": `m#${movieID}`,
            ":actorPrefix": "a#",
          },
        })
      );
    }
    // Return the roles found by DynamoDB.

    return {
      statusCode: 200,

      headers: {
        "content-type": "application/json",
      },

      body: JSON.stringify({
        roles: commandOutput.Items,
      }),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));

    return {
      statusCode: 500,
      body: JSON.stringify({ error }),
    };
  }
};

// Create the DynamoDB document client used by this Lambda.
function createDocumentClient() {
  const ddbClient = new DynamoDBClient({
    region: process.env.REGION,
  });

  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };

  const unmarshallOptions = {
    wrapNumbers: false,
  };

  return DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions,
    unmarshallOptions,
  });
}