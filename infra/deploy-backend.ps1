# deploy-backend.ps1
# Deploy React Backend Serverless Infrastructure to AWS
# Account ID: 932453197807
# Account Name: Diyaa

$AccountID = "932453197807"
$Region = "us-east-1"
$ProjectName = "diyaa-backend"
$Stage = "prod"

$PipelineBucketName = "diyaa-pipeline-artifacts-$AccountID"
$BranchName = "main"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Deploying DIYAA Backend Infrastructure to AWS Serverless" -ForegroundColor Cyan
Write-Host "Target Account: $AccountID"
Write-Host "Target Region: $Region"
Write-Host "==================================================" -ForegroundColor Cyan

# Ensure script runs from its directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = $PSScriptRoot }

# 1. Ensure Pipeline Bucket exists
Write-Host "Step 1: Checking S3 pipeline bucket..." -ForegroundColor Yellow
$pipelineS3Exists = aws s3api head-bucket --bucket $PipelineBucketName 2>&1
if ($pipelineS3Exists -match "An error occurred" -or $pipelineS3Exists -match "404") {
    aws s3api create-bucket --bucket $PipelineBucketName --region $Region
    Write-Host "Bucket s3://$PipelineBucketName created." -ForegroundColor Green
} else {
    Write-Host "Bucket s3://$PipelineBucketName already exists." -ForegroundColor Blue
}
aws s3api put-public-access-block --bucket $PipelineBucketName --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
aws s3api put-bucket-versioning --bucket $PipelineBucketName --versioning-configuration Status=Enabled
Write-Host "Pipeline S3 Bucket setup completed." -ForegroundColor Green

# 2. Deploy CloudFormation Stack (RDS, Secrets, Lambda, API Gateway)
Write-Host "Step 2: Deploying CloudFormation Stack (Provisions RDS PostgreSQL, Lambda, and API Gateway. This may take 5-10 minutes)..." -ForegroundColor Yellow
$templatePath = Join-Path $ScriptDir "aws-backend-template.yaml"
aws cloudformation deploy `
  --template-file $templatePath `
  --stack-name "$ProjectName-$Stage" `
  --capabilities CAPABILITY_NAMED_IAM `
  --parameter-overrides ProjectName=$ProjectName Stage=$Stage GitHubBranch=$BranchName

if ($LASTEXITCODE -ne 0) {
    Write-Error "CloudFormation deployment failed."
    exit 1
}
Write-Host "CloudFormation stack deployed successfully!" -ForegroundColor Green

# 3. Retrieve Stack Outputs
Write-Host "Step 3: Retrieving Stack outputs..." -ForegroundColor Yellow
$stackDesc = aws cloudformation describe-stacks --stack-name "$ProjectName-$Stage" | ConvertFrom-Json
$outputs = $stackDesc.Stacks[0].Outputs

$ApiEndpoint = ($outputs | Where-Object { $_.OutputKey -eq "ApiEndpoint" }).OutputValue
$SecretsARN = ($outputs | Where-Object { $_.OutputKey -eq "SecretsARN" }).OutputValue
$DatabaseEndpoint = ($outputs | Where-Object { $_.OutputKey -eq "DatabaseEndpoint" }).OutputValue

Write-Host "API Gateway Endpoint: $ApiEndpoint" -ForegroundColor Green
Write-Host "Secrets Manager ARN: $SecretsARN" -ForegroundColor Green
Write-Host "RDS Endpoint: $DatabaseEndpoint" -ForegroundColor Green

# 4. Create / Retrieve CodeStar Connection
Write-Host "Step 4: Creating / Retrieving AWS CodeStar Connection to GitHub..." -ForegroundColor Yellow
$connectionName = "diyaa-github-connection"
$connCheck = aws codestar-connections list-connections | ConvertFrom-Json
$existingConn = $connCheck.Connections | Where-Object { $_.ConnectionName -eq $connectionName }

if ($existingConn) {
    $ConnectionARN = $existingConn.ConnectionArn
    Write-Host "Using existing Connection ARN: $ConnectionARN" -ForegroundColor Blue
} else {
    $connResult = aws codestar-connections create-connection --provider-type GitHub --connection-name $connectionName | ConvertFrom-Json
    $ConnectionARN = $connResult.ConnectionArn
    Write-Host "Created Connection: $ConnectionARN" -ForegroundColor Green
    Write-Host "ACTION REQUIRED: Go to Console -> Connections and update pending connection." -ForegroundColor Red
}

# 5. Configure IAM roles for CodeBuild & CodePipeline
Write-Host "Step 5: Updating IAM roles and policies..." -ForegroundColor Yellow
$codebuildRoleName = "diyaa-codebuild-service-role"
$codepipelineRoleName = "diyaa-pipeline-service-role"

# CodeBuild IAM role policy needs additional Lambda permissions to run 'update-function-code'
$cbBackendPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudWatchLogsAccess",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:932453197807:log-group:/aws/codebuild/*"
    },
    {
      "Sid": "S3PipelineBucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:GetObjectVersion",
        "s3:ListBucket",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::$PipelineBucketName",
        "arn:aws:s3:::$PipelineBucketName/*"
      ]
    },
    {
      "Sid": "LambdaDeployAccess",
      "Effect": "Allow",
      "Action": [
        "lambda:UpdateFunctionCode"
      ],
      "Resource": "arn:aws:lambda:us-east-1:932453197807:function:diyaa-backend-prod-function"
    }
  ]
}
"@

$cbPolicyPath = Join-Path $ScriptDir "temp-cb-backend-policy.json"
$cbBackendPolicy | Out-File -FilePath $cbPolicyPath -Encoding ascii
aws iam put-role-policy --role-name $codebuildRoleName --policy-name "diyaa-codebuild-backend-policy" --policy-document "file://$($cbPolicyPath.Replace('\', '/'))"
Remove-Item $cbPolicyPath -ErrorAction SilentlyContinue
Write-Host "CodeBuild IAM policies configured." -ForegroundColor Green

# 6. Create CodeBuild Project
Write-Host "Step 6: Creating CodeBuild Project..." -ForegroundColor Yellow
$cbConfigTemplate = Get-Content -Raw -Path (Join-Path $ScriptDir "codebuild-backend-config.json")
$cbConfig = $cbConfigTemplate -replace '\$\{PIPELINE_BUCKET_NAME\}', $PipelineBucketName

$cbConfigPath = Join-Path $ScriptDir "temp-cb-backend-config.json"
$cbConfig | Out-File -FilePath $cbConfigPath -Encoding ascii

$cbProjCheck = aws codebuild batch-get-projects --names "diyaa-backend-build" | ConvertFrom-Json
if ($cbProjCheck.Projects) {
    aws codebuild update-project --cli-input-json "file://$($cbConfigPath.Replace('\', '/'))"
    Write-Host "CodeBuild project 'diyaa-backend-build' updated." -ForegroundColor Green
} else {
    aws codebuild create-project --cli-input-json "file://$($cbConfigPath.Replace('\', '/'))"
    Write-Host "CodeBuild project 'diyaa-backend-build' created." -ForegroundColor Green
}
Remove-Item $cbConfigPath -ErrorAction SilentlyContinue

# 7. Create CodePipeline
Write-Host "Step 7: Creating CodePipeline..." -ForegroundColor Yellow
$pipelineConfigTemplate = Get-Content -Raw -Path (Join-Path $ScriptDir "pipeline-backend-config.json")
$pipelineConfig = $pipelineConfigTemplate -replace '\$\{CONNECTION_ARN\}', $ConnectionARN `
                                          -replace '\$\{BRANCH_NAME\}', $BranchName

$pipelineConfigPath = Join-Path $ScriptDir "temp-pipeline-backend-config.json"
$pipelineConfig | Out-File -FilePath $pipelineConfigPath -Encoding ascii

$pipelineCheck = aws codepipeline get-pipeline --name "diyaa-backend-pipeline" 2>&1
if ($pipelineCheck -match "PipelineNotFoundException" -or $pipelineCheck -match "not found") {
    aws codepipeline create-pipeline --cli-input-json "file://$($pipelineConfigPath.Replace('\', '/'))"
    Write-Host "CodePipeline 'diyaa-backend-pipeline' created." -ForegroundColor Green
} else {
    $pipeData = Get-Content $pipelineConfigPath | ConvertFrom-Json
    $pipeJson = $pipeData.pipeline | ConvertTo-Json -Depth 10
    $pipeUpdatePath = Join-Path $ScriptDir "temp-pipeline-backend-update.json"
    $pipeJson | Out-File -FilePath $pipeUpdatePath -Encoding ascii
    aws codepipeline update-pipeline --pipeline "file://$($pipeUpdatePath.Replace('\', '/'))"
    Remove-Item $pipeUpdatePath -ErrorAction SilentlyContinue
    Write-Host "CodePipeline 'diyaa-backend-pipeline' updated." -ForegroundColor Green
}
Remove-Item $pipelineConfigPath -ErrorAction SilentlyContinue

Write-Host "==================================================" -ForegroundColor Green
Write-Host "DIYAA Backend Serverless Provisioning Complete!" -ForegroundColor Green
Write-Host "API Gateway endpoint URL: $ApiEndpoint" -ForegroundColor Green
Write-Host "PostgreSQL Database endpoint: $DatabaseEndpoint" -ForegroundColor Green
Write-Host "Secrets Manager Secrets: $SecretsARN" -ForegroundColor Green
Write-Host "Please authorize GitHub connection if you haven't already!" -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green
