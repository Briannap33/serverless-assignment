import {DynamoDBStreamHandler,} from "aws-lambda";
import {unmarshall,} from "@aws-sdk/util-dynamodb";

export const handler:
  DynamoDBStreamHandler =
  async (event) => {

    console.log(
      "[EVENT]",
      JSON.stringify(event)
    );
    for (
      const record
      of event.Records
    ) {

      if (
        record.eventName ===
          "INSERT" &&
        record.dynamodb?.NewImage
      ) {
        const item =
          unmarshall(
            record.dynamodb
              .NewImage as any
          );

        if (
          item.PK?.startsWith(
            "m#"
          ) &&
          item.SK?.startsWith(
            "a#"
          )
        ) {
          console.log(
            `POST ${item.PK} | ${item.SK} | ${item.roleName} | ${item.roleDescription}`
          );
        }
      }

    }
  };
