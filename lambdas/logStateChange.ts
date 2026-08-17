import { DynamoDBStreamHandler, } from "aws-lambda";
import { unmarshall, } from "@aws-sdk/util-dynamodb";

// This handler runs when DynamoDB sends stream records.
export const handler:
    DynamoDBStreamHandler =
    async (event) => {

        console.log(
            "[EVENT]",
            JSON.stringify(event)
        );

        // Go through each database change in the stream event.
        for (
            const record
            of event.Records
        ) {

            // Handle newly inserted role records.
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

                // Only log items that use the movie/actor role key pattern.
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

            // Handle deleted role records.
            if (
                record.eventName ===
                "REMOVE" &&
                record.dynamodb?.OldImage
            ) {
                const item =
                    unmarshall(
                        record.dynamodb
                            .OldImage as any
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
                        `DELETE ${item.PK} | ${item.SK} | ${item.roleName} | ${item.roleDescription}`
                    );
                }
            }

        }
    };