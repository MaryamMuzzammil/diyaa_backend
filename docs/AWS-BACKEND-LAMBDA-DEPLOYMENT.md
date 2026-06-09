# DIYAA Backend AWS Lambda Deployment

This guide preserves the existing NestJS APIs exactly. Controllers, DTOs, request bodies, response shapes, headers, validation, and JWT guards stay in the NestJS app.

## Architecture Used

GitHub -> CodePipeline -> CodeBuild -> Lambda -> API Gateway HTTP API -> RDS PostgreSQL

Important: this backend currently uses PostgreSQL TypeORM and custom JWT auth. Do not deploy `infra/aws-diyaa-serverless.yaml` for this app unless you are ready for a backend rewrite, because that file uses separate inline Lambdas, DynamoDB, and a different auth contract.

## Before You Start

1. Rotate any AWS access keys that were pasted in chat or stored anywhere unsafe.
2. Confirm AWS Console region is `us-east-1`.
3. Confirm your GitHub repo full name, for example `MaryamMuzzammil/diyaa_backend`.
4. Confirm your branch name, usually `main`.
5. Confirm frontend URL for CORS. Current production frontend origin: `https://d2459vrsbb1r8w.cloudfront.net`.

## Files That Matter

- `src/lambda.ts`: Lambda handler using `@codegenie/serverless-express`.
- `src/app.setup.ts`: shared local/Lambda middleware, CORS, validation, and seeding.
- `infra/aws-backend-template.yaml`: CloudFormation for RDS, Lambda, API Gateway, Secrets Manager, IAM.
- `infra/buildspec-backend.yml`: CodeBuild build/package/deploy steps.
- `infra/deploy-backend.ps1`: one-shot AWS provisioning script.
- `infra/pipeline-backend-config.json`: GitHub -> CodeBuild pipeline.

## Step 1: Verify Local Build

From the repo root:

```powershell
npm.cmd run build
```

Expected result: `nest build` finishes without TypeScript errors.

## Step 2: Configure AWS CLI

Install AWS CLI v2 if needed, then run:

```powershell
aws configure
```

Use:

- Region: `us-east-1`
- Output format: `json`

Do not commit AWS keys and do not paste them in chat.

## Step 3: Deploy Backend Infrastructure

From the repo root, run:

```powershell
.\infra\deploy-backend.ps1 `
  -GitHubRepoFullName "MaryamMuzzammil/diyaa_backend" `
  -BranchName "main" `
  -CorsOrigins "https://d2459vrsbb1r8w.cloudfront.net"
```

For production frontend CORS, use your deployed frontend origin instead:

```powershell
.\infra\deploy-backend.ps1 `
  -GitHubRepoFullName "MaryamMuzzammil/diyaa_backend" `
  -BranchName "main" `
  -CorsOrigins "https://YOUR-FRONTEND-DOMAIN"
```

The script creates or updates:

- S3 artifact bucket
- CodeBuild service role
- CodePipeline service role
- CloudFormation stack
- RDS PostgreSQL database
- Lambda function
- API Gateway HTTP API
- CodeStar GitHub connection
- CodeBuild project
- CodePipeline pipeline

## Step 4: Approve GitHub Connection

If the script says the CodeStar connection is pending:

1. Open AWS Console.
2. Go to Developer Tools.
3. Open Settings -> Connections.
4. Select `diyaa-github-connection`.
5. Click `Update pending connection`.
6. Authorize GitHub.
7. Select the repository.
8. Save.

After this, rerun the deploy script once so CodePipeline is created/updated with the active connection.

## Step 5: Update Production Secrets

Open AWS Console:

1. Go to Lambda.
2. Open `diyaa-backend-prod-function`.
3. Go to Configuration -> Environment variables.
4. Update these before real production use:

- `JWT_SECRET`: use a long random value, at least 32 characters.
- `GROQ_API_KEY`: set the real chatbot API key if chatbot is used.
- `SUPERADMIN_PASSWORD`: change from the placeholder before first production seed.
- `SUPERADMIN_SYNC_PASSWORD`: keep `false` unless intentionally resetting the superadmin password.
- `CORS_ORIGINS`: set the exact frontend origin.

Then click `Deploy` or `Save`.

## Step 6: Trigger CI/CD

Push to GitHub:

```powershell
git push origin main
```

Then in AWS Console:

1. Go to CodePipeline.
2. Open `diyaa-backend-pipeline`.
3. Watch Source -> Build.
4. Open CodeBuild logs if the build fails.

Successful build uploads `diyaa-backend.zip` and updates `diyaa-backend-prod-function`.

## Step 7: Verify API Behavior

Use the API endpoint printed by the deploy script.

Health check:

```powershell
curl.exe https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/health
```

Login request body stays exactly the same:

```powershell
curl.exe -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/auth/login `
  -H "Content-Type: application/json" `
  -d "{\"email\":\"test@gmail.com\",\"password\":\"123456\"}"
```

Protected route example:

```powershell
curl.exe https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/users/me `
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Troubleshooting

- `req.body undefined`: verify API Gateway integration is HTTP API proxy with payload format `2.0`; this template already does that.
- CORS error: set `CorsOrigins` / `CORS_ORIGINS` to the exact frontend URL, not a random domain.
- Lambda timeout: check CloudWatch Logs for database connection or seed delays.
- `JWT_SECRET must be set`: set a 32+ character `JWT_SECRET` in Lambda environment variables.
- Database connection error: verify RDS status is `Available` and Lambda env vars match CloudFormation outputs.
- Pipeline source fails: approve the CodeStar GitHub connection.

## What Stayed Unchanged

- Existing controllers
- Existing routes
- Existing DTOs
- Existing `@Body()` behavior
- Existing validation pipe behavior
- Existing custom JWT login response
- Existing guards and role checks
