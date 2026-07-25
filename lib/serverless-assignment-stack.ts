import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { seedData } from "../seed/data";
import { generateBatch } from "../shared/util";

export class ServerlessAssignmentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const movieCastTable = new dynamodb.Table(this, "MovieCastTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: "PK",
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: "SK",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new custom.AwsCustomResource(this, "MovieCastInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",

        parameters: {
          RequestItems: {
            [movieCastTable.tableName]: generateBatch(seedData),
          },
        },

        physicalResourceId:
          custom.PhysicalResourceId.of("MovieCastInitData"),
      },

      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [movieCastTable.tableArn],
      }),
    });
  }
}