# deploy-frontend.ps1
# Deploy React Frontend Infrastructure to AWS
# Account ID: 932453197807
# Account Name: Diyaa

$AccountID = "932453197807"
$Region = "us-east-1"
$ProjectName = "diyaa"

# Configurable variables
$BucketName = "diyaa-frontend-bucket-$AccountID"
$PipelineBucketName = "diyaa-pipeline-artifacts-$AccountID"
$BranchName = "main"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "Deploying DIYAA Frontend Infrastructure to AWS" -ForegroundColor Cyan
Write-Host "Target S3 Bucket: s3://$BucketName"
Write-Host "Target Region: $Region"
Write-Host "==================================================" -ForegroundColor Cyan

# Ensure script runs from its directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $ScriptDir) { $ScriptDir = $PSScriptRoot }

# 1. Create S3 Buckets
Write-Host "Step 1: Creating S3 buckets..." -ForegroundColor Yellow

# Check if target bucket already exists or create it
$s3Exists = aws s3api head-bucket --bucket $BucketName 2>&1
if ($s3Exists -match "An error occurred" -or $s3Exists -match "404") {
    aws s3api create-bucket --bucket $BucketName --region $Region
    Write-Host "Bucket s3://$BucketName created." -ForegroundColor Green
} else {
    Write-Host "Bucket s3://$BucketName already exists." -ForegroundColor Blue
}

# Block all public S3 access (CloudFront will access via OAC)
aws s3api put-public-access-block --bucket $BucketName --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
Write-Host "S3 Public Access Blocked for $BucketName." -ForegroundColor Green

# Create Pipeline Artifacts Bucket
$pipelineS3Exists = aws s3api head-bucket --bucket $PipelineBucketName 2>&1
if ($pipelineS3Exists -match "An error occurred" -or $pipelineS3Exists -match "404") {
    aws s3api create-bucket --bucket $PipelineBucketName --region $Region
    Write-Host "Bucket s3://$PipelineBucketName created for pipeline artifacts." -ForegroundColor Green
} else {
    Write-Host "Bucket s3://$PipelineBucketName already exists." -ForegroundColor Blue
}
aws s3api put-public-access-block --bucket $PipelineBucketName --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
aws s3api put-bucket-versioning --bucket $PipelineBucketName --versioning-configuration Status=Enabled
Write-Host "Pipeline S3 Bucket setup completed." -ForegroundColor Green

# 2. Create CloudFront Origin Access Control (OAC)
Write-Host "Step 2: Creating CloudFront Origin Access Control (OAC)..." -ForegroundColor Yellow
$oacName = "diyaa-frontend-oac"

# Check if OAC already exists
$oacCheck = aws cloudfront list-origin-access-controls | ConvertFrom-Json
$existingOac = $oacCheck.OriginAccessControlList.Items | Where-Object { $_.Name -eq $oacName }

if ($existingOac) {
    $OacID = $existingOac.Id
    Write-Host "Using existing CloudFront OAC ID: $OacID" -ForegroundColor Blue
} else {
    $oacConfig = @"
{
  "Name": "$oacName",
  "Description": "OAC for Diyaa Frontend S3 bucket",
  "SigningProtocol": "sigv4",
  "SigningBehavior": "always",
  "OriginAccessControlOriginType": "s3"
}
"@
    $oacConfigPath = Join-Path $ScriptDir "temp-oac-config.json"
    $oacConfig | Out-File -FilePath $oacConfigPath -Encoding ascii
    $oacResult = aws cloudfront create-origin-access-control --origin-access-control-config "file://$($oacConfigPath.Replace('\', '/'))" | ConvertFrom-Json
    Remove-Item $oacConfigPath -ErrorAction SilentlyContinue
    $OacID = $oacResult.OriginAccessControl.Id
    Write-Host "Created new CloudFront OAC ID: $OacID" -ForegroundColor Green
}

# 3. Create CloudFront Distribution
Write-Host "Step 3: Creating CloudFront Distribution..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$cfConfigTemplate = Get-Content -Raw -Path (Join-Path $ScriptDir "cf-dist-config.json")
$cfConfig = $cfConfigTemplate -replace '\$\{S3_BUCKET_NAME\}', $BucketName `
                              -replace '\$\{OAC_ID\}', $OacID `
                              -replace '\$\{TIMESTAMP\}', $timestamp

$cfConfigPath = Join-Path $ScriptDir "temp-cf-config.json"
$cfConfig | Out-File -FilePath $cfConfigPath -Encoding ascii

$cfResult = aws cloudfront create-distribution --distribution-config "file://$($cfConfigPath.Replace('\', '/'))" | ConvertFrom-Json
Remove-Item $cfConfigPath -ErrorAction SilentlyContinue

$DistributionID = $cfResult.Distribution.Id
$CFDomainName = $cfResult.Distribution.DomainName
Write-Host "CloudFront Distribution created successfully!" -ForegroundColor Green
Write-Host "Distribution ID: $DistributionID" -ForegroundColor Green
Write-Host "Domain Name: https://$CFDomainName" -ForegroundColor Green

# 4. Apply S3 Bucket Policy
Write-Host "Step 4: Applying S3 Bucket Policy for CloudFront OAC..." -ForegroundColor Yellow
$bucketPolicyTemplate = Get-Content -Raw -Path (Join-Path $ScriptDir "s3-bucket-policy.json")
$bucketPolicy = $bucketPolicyTemplate -replace '\$\{S3_BUCKET_NAME\}', $BucketName `
                                      -replace '\$\{CLOUDFRONT_DISTRIBUTION_ID\}', $DistributionID

$bucketPolicyPath = Join-Path $ScriptDir "temp-s3-policy.json"
$bucketPolicy | Out-File -FilePath $bucketPolicyPath -Encoding ascii
aws s3api put-bucket-policy --bucket $BucketName --policy "file://$($bucketPolicyPath.Replace('\', '/'))"
Remove-Item $bucketPolicyPath -ErrorAction SilentlyContinue
Write-Host "S3 Bucket Policy applied successfully." -ForegroundColor Green

# 5. Create IAM Roles for CodeBuild and CodePipeline
Write-Host "Step 5: Creating IAM Roles and Policies..." -ForegroundColor Yellow

$codebuildRoleName = "diyaa-codebuild-service-role"
$codepipelineRoleName = "diyaa-pipeline-service-role"

# Create CodeBuild Role
$cbRoleCheck = aws iam get-role --role-name $codebuildRoleName 2>&1
if ($cbRoleCheck -match "NoSuchEntity" -or $cbRoleCheck -match "not found") {
    $cbTrustPath = Join-Path $ScriptDir "codebuild-trust-policy.json"
    aws iam create-role --role-name $codebuildRoleName --assume-role-policy-document "file://$($cbTrustPath.Replace('\', '/'))"
    Write-Host "Created CodeBuild IAM Role." -ForegroundColor Green
} else {
    Write-Host "CodeBuild IAM Role already exists." -ForegroundColor Blue
}

# Attach custom inline policy to CodeBuild role
$cbPolicyTemplate = Get-Content -Raw -Path (Join-Path $ScriptDir "codebuild-policy.json")
$cbPolicy = $cbPolicyTemplate -replace '\$\{S3_BUCKET_NAME\}', $BucketName `
                              -replace '\$\{CLOUDFRONT_DISTRIBUTION_ID\}', $DistributionID
$cbPolicyPath = Join-Path $ScriptDir "temp-cb-policy.json"
$cbPolicy | Out-File -FilePath $cbPolicyPath -Encoding ascii
aws iam put-role-policy --role-name $codebuildRoleName --policy-name "diyaa-codebuild-policy" --policy-document "file://$($cbPolicyPath.Replace('\', '/'))"
Remove-Item $cbPolicyPath -ErrorAction SilentlyContinue
Write-Host "CodeBuild IAM policies configured." -ForegroundColor Green

# Create CodePipeline Role
$cpRoleCheck = aws iam get-role --role-name $codepipelineRoleName 2>&1
if ($cpRoleCheck -match "NoSuchEntity" -or $cpRoleCheck -match "not found") {
    $cpTrustPath = Join-Path $ScriptDir "codepipeline-trust-policy.json"
    aws iam create-role --role-name $codepipelineRoleName --assume-role-policy-document "file://$($cpTrustPath.Replace('\', '/'))"
    Write-Host "Created CodePipeline IAM Role." -ForegroundColor Green
} else {
    Write-Host "CodePipeline IAM Role already exists." -ForegroundColor Blue
}

# Attach custom inline policy to CodePipeline role
$cpPolicyTemplate = Get-Content -Raw -Path (Join-Path $ScriptDir "codepipeline-policy.json")
$cpPolicyPath = Join-Path $ScriptDir "temp-cp-policy.json"
$cpPolicyTemplate | Out-File -FilePath $cpPolicyPath -Encoding ascii
aws iam put-role-policy --role-name $codepipelineRoleName --policy-name "diyaa-codepipeline-policy" --policy-document "file://$($cpPolicyPath.Replace('\', '/'))"
Remove-Item $cpPolicyPath -ErrorAction SilentlyContinue
Write-Host "CodePipeline IAM policies configured." -ForegroundColor Green

# 6. Create CodeStar Connection (GitHub connection)
Write-Host "Step 6: Creating AWS CodeStar Connection to GitHub..." -ForegroundColor Yellow
$connectionName = "diyaa-github-connection"
$connCheck = aws codestar-connections list-connections | ConvertFrom-Json
$existingConn = $connCheck.Connections | Where-Object { $_.ConnectionName -eq $connectionName }

if ($existingConn) {
    $ConnectionARN = $existingConn.ConnectionArn
    Write-Host "Using existing connection ARN: $ConnectionARN" -ForegroundColor Blue
} else {
    $connResult = aws codestar-connections create-connection --provider-type GitHub --connection-name $connectionName | ConvertFrom-Json
    $ConnectionARN = $connResult.ConnectionArn
    Write-Host "Created Connection: $ConnectionARN" -ForegroundColor Green
    Write-Host "=========================================================================" -ForegroundColor Yellow
    Write-Host "ACTION REQUIRED: You must authorize this GitHub connection in the AWS console." -ForegroundColor Red
    Write-Host "1. Open AWS Developer Tools -> Connections in your browser." -ForegroundColor Red
    Write-Host "2. Select '$connectionName' (it will be in PENDING status)." -ForegroundColor Red
    Write-Host "3. Click 'Update pending connection' and follow the prompts to authorize AWS to read from GitHub." -ForegroundColor Red
    Write-Host "=========================================================================" -ForegroundColor Yellow
}

# 7. Create CodeBuild Project
Write-Host "Step 7: Creating AWS CodeBuild Project..." -ForegroundColor Yellow
$cbConfigTemplate = Get-Content -Raw -Path (Join-Path $ScriptDir "codebuild-config.json")
$cbConfig = $cbConfigTemplate -replace '\$\{S3_BUCKET_NAME\}', $BucketName `
                              -replace '\$\{CLOUDFRONT_DISTRIBUTION_ID\}', $DistributionID

$cbConfigPath = Join-Path $ScriptDir "temp-cb-config.json"
$cbConfig | Out-File -FilePath $cbConfigPath -Encoding ascii

$cbProjCheck = aws codebuild batch-get-projects --names "diyaa-frontend-build" | ConvertFrom-Json
if ($cbProjCheck.Projects) {
    aws codebuild update-project --cli-input-json "file://$($cbConfigPath.Replace('\', '/'))"
    Write-Host "CodeBuild project 'diyaa-frontend-build' updated." -ForegroundColor Green
} else {
    aws codebuild create-project --cli-input-json "file://$($cbConfigPath.Replace('\', '/'))"
    Write-Host "CodeBuild project 'diyaa-frontend-build' created." -ForegroundColor Green
}
Remove-Item $cbConfigPath -ErrorAction SilentlyContinue

# 8. Create CodePipeline
Write-Host "Step 8: Creating AWS CodePipeline..." -ForegroundColor Yellow
$pipelineConfigTemplate = Get-Content -Raw -Path (Join-Path $ScriptDir "pipeline-config.json")
$pipelineConfig = $pipelineConfigTemplate -replace '\$\{CONNECTION_ARN\}', $ConnectionARN `
                                          -replace '\$\{BRANCH_NAME\}', $BranchName

$pipelineConfigPath = Join-Path $ScriptDir "temp-pipeline-config.json"
$pipelineConfig | Out-File -FilePath $pipelineConfigPath -Encoding ascii

$pipelineCheck = aws codepipeline get-pipeline --name "diyaa-frontend-pipeline" 2>&1
if ($pipelineCheck -match "PipelineNotFoundException" -or $pipelineCheck -match "not found") {
    aws codepipeline create-pipeline --cli-input-json "file://$($pipelineConfigPath.Replace('\', '/'))"
    Write-Host "CodePipeline 'diyaa-frontend-pipeline' created." -ForegroundColor Green
} else {
    # Extract just the pipeline block from config
    $pipeData = Get-Content $pipelineConfigPath | ConvertFrom-Json
    $pipeJson = $pipeData.pipeline | ConvertTo-Json -Depth 10
    $pipeUpdatePath = Join-Path $ScriptDir "temp-pipeline-update.json"
    $pipeJson | Out-File -FilePath $pipeUpdatePath -Encoding ascii
    aws codepipeline update-pipeline --pipeline "file://$($pipeUpdatePath.Replace('\', '/'))"
    Remove-Item $pipeUpdatePath -ErrorAction SilentlyContinue
    Write-Host "CodePipeline 'diyaa-frontend-pipeline' updated." -ForegroundColor Green
}
Remove-Item $pipelineConfigPath -ErrorAction SilentlyContinue

Write-Host "==================================================" -ForegroundColor Green
Write-Host "DIYAA Frontend AWS Infrastructure Provisions Complete!" -ForegroundColor Green
Write-Host "CloudFront URL: https://$CFDomainName" -ForegroundColor Green
Write-Host "S3 Bucket: s3://$BucketName" -ForegroundColor Green
Write-Host "Pipeline Name: diyaa-frontend-pipeline" -ForegroundColor Green
Write-Host "CodeBuild Project: diyaa-frontend-build" -ForegroundColor Green
Write-Host "Make sure to connect AWS to GitHub using connection '$connectionName' via console." -ForegroundColor Yellow
Write-Host "==================================================" -ForegroundColor Green
