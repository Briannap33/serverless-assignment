import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as apig from "aws-cdk-lib/aws-apigateway";

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

    const getMovieRolesFn =
      new lambdanode.NodejsFunction(
        this,
        "GetMovieRolesFn",
        {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_22_X,

          entry:
            `${__dirname}/../lambdas/getMovieRoles.ts`,

          timeout: cdk.Duration.seconds(10),
          memorySize: 128,

          environment: {
            TABLE_NAME: movieCastTable.tableName,
            REGION: "eu-west-1",
          },
        }
      );

    movieCastTable.grantReadData(getMovieRolesFn);

    const api = new apig.RestApi(this, "MovieCastApi", {
      description: "Movie Cast REST API",

      deployOptions: {
        stageName: "dev",
      },

      defaultCorsPreflightOptions: {
        allowOrigins: apig.Cors.ALL_ORIGINS,
        allowMethods: apig.Cors.ALL_METHODS,
      },
    });

    const moviesEndpoint =
      api.root.addResource("movies");

    const specificMovieEndpoint =
      moviesEndpoint.addResource("{movieID}");

    const rolesEndpoint =
      specificMovieEndpoint.addResource("roles");

    rolesEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(
        getMovieRolesFn,
        { proxy: true }
      )
    );

    new cdk.CfnOutput(this, "MovieCastApiUrl", {
      value: api.url,
    });
  }
}