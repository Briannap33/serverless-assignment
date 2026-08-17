import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as events from "aws-cdk-lib/aws-lambda-event-sources";

import { seedData } from "../seed/data";
import { generateBatch } from "../shared/util";
import { UserPool } from "aws-cdk-lib/aws-cognito";

export class ServerlessAssignmentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Creates the main DynamoDB table for movies, actors and roles.
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
      stream:
        dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy:
        cdk.RemovalPolicy.DESTROY,
    });

    // Add the starter data when the table is first created.
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

    // Lambda used to get roles for a movie.
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

    // Lambda used to get an actor and their role details.
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

    // Lambda used to add a new role.
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

    // Lambda used to delete a role.
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

    // Lambda that logs role changes from the DynamoDB stream.
    const logStateChangeFn =
      new lambdanode.NodejsFunction(
        this,
        "LogStateChangeFn",
        {
          architecture:
            lambda.Architecture.ARM_64,
          runtime:
            lambda.Runtime.NODEJS_22_X,
          entry:
            `${__dirname}/../lambdas/logStateChange.ts`,
          timeout:
            cdk.Duration.seconds(10),
          memorySize: 128,
        }
      );

    // Connect the DynamoDB stream to the logging Lambda.
    logStateChangeFn.addEventSource(
      new events.DynamoEventSource(
        movieCastTable,
        {
          startingPosition:
            lambda.StartingPosition.LATEST,

          batchSize: 5,
        }
      )
    );

    // Set up Cognito for user accounts and login.
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

    // Create the separate API used for authentication.
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

    // Reuse the same setup for each authentication route.
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

    // Lambda authorizer used to check logged-in users.
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

    // Use the cookie header when authorizing requests.
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

    // Create the main movie cast API.
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

    // Create the API key used for admin requests.
    const adminApiKey =
      api.addApiKey(
        "AdminApiKey"
      );

    // Attach the admin API key to the deployed API stage.
    const usagePlan =
      api.addUsagePlan(
        "AdminUsagePlan",
        {
          name:
            "Administrator Usage Plan",
        }
      );

    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });
    usagePlan.addApiKey(
      adminApiKey
    );

    const moviesEndpoint =
      api.root.addResource("movies");

    const movieRolesEndpoint =
      moviesEndpoint.addResource("roles");

    // POST /movies/roles - admin only.
    movieRolesEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(
        addRoleFn,
        { proxy: true }
      ),
      {
        apiKeyRequired: true,
      }
    );

    const specificMovieEndpoint =
      moviesEndpoint.addResource("{movieID}");

    const rolesEndpoint =
      specificMovieEndpoint.addResource("roles");

    // GET /movies/{movieID}/roles - requires a logged-in user.
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

    // DELETE /movies/{movieID}/roles/{actorID} - admin only.
    specificRoleEndpoint.addMethod(
      "DELETE",
      new apig.LambdaIntegration(
        deleteRoleFn,
        { proxy: true }
      ),

      {
        apiKeyRequired: true,
      }
    );

    const actorsEndpoint =
      api.root.addResource("actors");

    const specificActorEndpoint =
      actorsEndpoint.addResource("{actorID}");

    // GET /actors/{actorID} - requires a logged-in user.
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