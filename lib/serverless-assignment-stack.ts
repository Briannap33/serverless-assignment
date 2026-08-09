import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as apig from "aws-cdk-lib/aws-apigateway";

import { seedData } from "../seed/data";
import { generateBatch } from "../shared/util";
import { UserPool } from "aws-cdk-lib/aws-cognito";

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

    const getActorFn =
      new lambdanode.NodejsFunction(
        this,
        "GetActorFn",
        {
          architecture: lambda.Architecture.ARM_64,
          runtime: lambda.Runtime.NODEJS_22_X,

          entry:
            `${__dirname}/../lambdas/getActor.ts`,

          timeout: cdk.Duration.seconds(10),
          memorySize: 128,

          environment: {
            TABLE_NAME: movieCastTable.tableName,
            REGION: "eu-west-1",
          },
        }
      );

    movieCastTable.grantReadData(getActorFn);

    const addRoleFn =
      new lambdanode.NodejsFunction(
        this,
        "AddRoleFn",
        {
          architecture:
            lambda.Architecture.ARM_64,

          runtime:
            lambda.Runtime.NODEJS_22_X,

          entry:
            `${__dirname}/../lambdas/addRole.ts`,

          timeout:
            cdk.Duration.seconds(10),

          memorySize: 128,

          environment: {
            TABLE_NAME:
              movieCastTable.tableName,

            REGION: "eu-west-1",
          },
        }
      );

    movieCastTable.grantReadWriteData(addRoleFn);

    const deleteRoleFn =
      new lambdanode.NodejsFunction(
        this,
        "DeleteRoleFn",
        {
          architecture:
            lambda.Architecture.ARM_64,

          runtime:
            lambda.Runtime.NODEJS_22_X,

          entry:
            `${__dirname}/../lambdas/deleteRole.ts`,

          timeout:
            cdk.Duration.seconds(10),

          memorySize: 128,

          environment: {
            TABLE_NAME:
              movieCastTable.tableName,

            REGION: "eu-west-1",
          },
        }
      );

    movieCastTable.grantReadWriteData(deleteRoleFn);

    const userPool =
      new UserPool(
        this,
        "UserPool",
        {
          signInAliases: {
            username: true,
            email: true,
          },

          selfSignUpEnabled: true,

          removalPolicy:
            cdk.RemovalPolicy.DESTROY,
        }
      );

    const userPoolId =
      userPool.userPoolId;

    const appClient =
      userPool.addClient(
        "AppClient",
        {
          authFlows: {
            userPassword: true,
          },
        }
      );

    const userPoolClientId =
      appClient.userPoolClientId;

    const authApi =
      new apig.RestApi(
        this,
        "AuthApi",
        {
          description:
            "Authentication API",

          endpointTypes: [
            apig.EndpointType.REGIONAL,
          ],

          defaultCorsPreflightOptions: {
            allowOrigins:
              apig.Cors.ALL_ORIGINS,
          },
        }
      );

    const auth =
      authApi.root.addResource("auth");

    new cdk.CfnOutput(this, "AuthApiUrl", {
      value: authApi.url,
    });

    const addAuthRoute = (
      resourceName: string,
      method: string,
      fnName: string,
      fnEntry: string
    ): void => {
      const commonFnProps = {
        architecture: lambda.Architecture.ARM_64,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        runtime: lambda.Runtime.NODEJS_22_X,
        handler: "handler",

        environment: {
          USER_POOL_ID: userPoolId,
          CLIENT_ID: userPoolClientId,
          REGION: cdk.Aws.REGION,
        },
      };

      const resource =
        auth.addResource(resourceName);

      const fn =
        new lambdanode.NodejsFunction(
          this,
          fnName,
          {
            ...commonFnProps,
            entry:
              `${__dirname}/../lambdas/auth/${fnEntry}`,
          }
        );

      resource.addMethod(
        method,
        new apig.LambdaIntegration(fn)
      );
    };

    addAuthRoute(
      "signup",
      "POST",
      "SignupFn",
      "signup.ts"
    );

    addAuthRoute(
      "confirm_signup",
      "POST",
      "ConfirmFn",
      "confirm-signup.ts"
    );

    addAuthRoute(
      "signin",
      "POST",
      "SigninFn",
      "signin.ts"
    );

    addAuthRoute(
      "signout",
      "GET",
      "SignoutFn",
      "signout.ts"
    );

    const authorizerFn =
      new lambdanode.NodejsFunction(
        this,
        "AuthorizerFn",
        {
          architecture:
            lambda.Architecture.ARM_64,
          runtime:
            lambda.Runtime.NODEJS_22_X,
          entry:
            `${__dirname}/../lambdas/auth/authorizer.ts`,
          timeout:
            cdk.Duration.seconds(10),
          memorySize: 128,
          environment: {
            USER_POOL_ID:
              userPoolId,
            CLIENT_ID:
              userPoolClientId,
            REGION:
              cdk.Aws.REGION,
          },
        }
      );
    const requestAuthorizer =
      new apig.RequestAuthorizer(
        this,
        "RequestAuthorizer",
        {
          identitySources: [
            apig.IdentitySource.header(
              "cookie"
            ),
          ],

          handler:
            authorizerFn,

          resultsCacheTtl:
            cdk.Duration.minutes(0),
        }
      );

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

    const adminApiKey =
      api.addApiKey(
        "AdminApiKey"
      );

    const usagePlan =
      api.addUsagePlan(
        "AdminUsagePlan",
        {
          name:
            "Administrator Usage Plan",
        }
      );

    const moviesEndpoint =
      api.root.addResource("movies");

    const movieRolesEndpoint =
      moviesEndpoint.addResource("roles");

    movieRolesEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(
        addRoleFn,
        { proxy: true }
      )
    );

    const specificMovieEndpoint =
      moviesEndpoint.addResource("{movieID}");

    const rolesEndpoint =
      specificMovieEndpoint.addResource("roles");

    rolesEndpoint.addMethod(
      "GET",

      new apig.LambdaIntegration(
        getMovieRolesFn,
        { proxy: true }
      ),
      {
        authorizer:
          requestAuthorizer,
        authorizationType:
          apig.AuthorizationType.CUSTOM,
      }
    );

    const specificRoleEndpoint =
      rolesEndpoint.addResource("{actorID}");

    specificRoleEndpoint.addMethod(
      "DELETE",
      new apig.LambdaIntegration(
        deleteRoleFn,
        { proxy: true }
      )
    );

    const actorsEndpoint =
      api.root.addResource("actors");

    const specificActorEndpoint =
      actorsEndpoint.addResource("{actorID}");

    specificActorEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(
        getActorFn,
        { proxy: true }
      ),
      {
        authorizer:
          requestAuthorizer,
        authorizationType:
          apig.AuthorizationType.CUSTOM,
      }
    );

    new cdk.CfnOutput(this, "MovieCastApiUrl", {
      value: api.url,
    });
  }
}