# Serverless Movie Cast API

A serverless Web API for managing movie cast information on AWS.

## Project Overview

This project implements a serverless movie cast API on AWS using AWS CDK.

The application uses API Gateway and Lambda to handle requests, with DynamoDB storing movie, actor, and role data. Amazon Cognito provides user authentication, while CloudWatch is used for logging.

Users can view movie roles and actor information, while administrators can add and delete roles.

---

## Main Features

- View movie roles and actor information.
- Add and delete movie roles.
- Single-table DynamoDB design.
- Cognito user authentication.
- API key protection for administrator requests.
- CloudWatch logging for user activity and database changes.
- AWS CDK deployment.

---

## Architecture

The application has two APIs:

- **Auth API** – handles signup, confirmation, signin, and signout.
- **Movie Cast API** – handles movie, actor, and role requests.

Lambda functions process the API requests and DynamoDB stores the data. A custom authorizer protects authenticated requests, while DynamoDB Streams are used to record role changes in CloudWatch.

```text
Client
  |
  +-- Auth API --> Lambda --> Cognito
  |
  +-- Movie Cast API --> Lambda --> DynamoDB
           |                    |
           |                    +--> Stream --> Lambda --> CloudWatch
           |
           +--> Authorizer --> Cognito
```

---

## DynamoDB Design

Movies, actors, and roles are stored in one DynamoDB table.

The **PK** and **SK** values use the prefixes **m#** for movies and **a#** for actors. Roles use the movie as the **PK** and the actor as the **SK**, which connects an actor to a movie.

| Type | PK | SK |
|---|---|---|
| Movie | **m#movieID** | **m#movieID** |
| Actor | **a#actorID** | **a#actorID** |
| Role | **m#movieID** | **a#actorID** |

Roles for the same movie share the same **PK**, making it possible to retrieve all roles for that movie.

The table is also filled with initial movie, actor, and role data during deployment.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| **GET** | **/movies/{movieID}/roles** | Get movie roles |
| **GET** | **/movies/{movieID}/roles?actor={actorID}** | Get an actor's role |
| **GET** | **/actors/{actorID}** | Get actor details |
| **GET** | **/actors/{actorID}?movie={movieID}** | Get actor and role |
| **POST** | **/movies/roles** | Add a role |
| **DELETE** | **/movies/{movieID}/roles/{actorID}** | Delete a role |

**GET** requests require Cognito authentication. **POST** and **DELETE** requests require an administrator API key.

### Example POST

```json
{
  "movieId": 1234,
  "actorId": 4321,
  "roleName": "Ellis Boyd Red Redding",
  "roleDescription": "A long-term inmate who becomes Andy Dufresne's close friend."
}
```

The API also handles invalid requests and returns appropriate errors when actors or roles cannot be found.

---

## Authentication

Amazon Cognit handles signup, account confirmation, signin, and signout.

The Auth API provides **/auth/signup**, **/auth/confirm_signup**, **/auth/signin**, and **/auth/signout** endpoints.

Users register with a username, password, and email address. Cognito sends a confirmation code to the user's email, which is used to confirm the account before signin.

After signin, the Cognito token is stored in a Secure, HttpOnly cookie and checked by a custom authorizer before allowing **GET** requests.

Signup, confirmation, and signin requests are validated using **AJV** with a manually created JSON schema.

Administrator **POST** and **DELETE** requests require an **API key**.

---

## Logging

**User activity:** Authenticated **GET** requests are logged to CloudWatch with the username and requested path. Query parameters are also included when present.

```text
testuser /movies/5678/roles
movieuser /actors/8765?movie=5678
```

**Database changes:** When a role is added or deleted, DynamoDB Streams trigger a Lambda function which logs the change to CloudWatch.

```text
POST m#1234 | a#4321 | Ellis Boyd Red Redding | <role description>
DELETE m#1234 | a#4321 | Ellis Boyd Red Redding | <role description>
```

---

## Project Structure

```text
bin/
  serverless-assignment.ts

lib/
  serverless-assignment-stack.ts

lambdas/
  getMovieRoles.ts
  getActor.ts
  addRole.ts
  deleteRole.ts
  logStateChange.ts
  utils.ts

  auth/
    signup.ts
    confirm-signup.ts
    signin.ts
    signout.ts
    authorizer.ts

seed/
  data.ts

shared/
  types.ts
  types.schema.json
  util.ts
```

---

## Deployment

### Requirements

Before deploying, have the following installed and configured:

- **Node.js**
- **AWS CDK CLI**
- **AWS CLI**
- **AWS credentials**

### Install Dependencies

```bash
npm install
```

This installs the required project dependencies from package.json.

### Build the CDK Stack

```bash
cdk synth
```

### Deploy

```bash
cdk deploy
```

After deployment, CDK outputs the URLs for the **Auth API** and **Movie Cast API**, which can then be used to test the application.

### Remove the Stack

```bash
cdk destroy
```

---

## References

The project mainly follows the assignment specification and lecturer lab material. The following AWS documentation was used for additional implementation details:

1. **Amazon Cognito – Verifying JSON Web Tokens**  
   Used for JWT and JWKS verification in the custom authorizer.  
   https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html

2. **Amazon DynamoDB – DeleteItem**  
   Used for ReturnValues: ALL_OLD when deleting a role.  
   https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html
