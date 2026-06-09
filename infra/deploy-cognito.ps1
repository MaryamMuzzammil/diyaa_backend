param(
    [string]$FrontendUrl = "https://d2459vrsbb1r8w.cloudfront.net"
)

$Region = "us-east-1"
$StackName = "diyaa-cognito-prod"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Deploying Cognito stack: $StackName" -ForegroundColor Cyan
aws cloudformation deploy `
  --template-file "$ScriptDir\aws-cognito-template.yaml" `
  --stack-name $StackName `
  --region $Region `
  --capabilities CAPABILITY_NAMED_IAM `
  --parameter-overrides FrontendUrl=$FrontendUrl

if ($LASTEXITCODE -ne 0) { exit 1 }

$outputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region | ConvertFrom-Json
$poolId = ($outputs.Stacks[0].Outputs | Where-Object { $_.OutputKey -eq "UserPoolId" }).OutputValue
$clientId = ($outputs.Stacks[0].Outputs | Where-Object { $_.OutputKey -eq "UserPoolClientId" }).OutputValue
$hosted = ($outputs.Stacks[0].Outputs | Where-Object { $_.OutputKey -eq "HostedUiUrl" }).OutputValue

Write-Host "User Pool ID: $poolId" -ForegroundColor Green
Write-Host "Client ID: $clientId" -ForegroundColor Green
Write-Host "Hosted UI: $hosted" -ForegroundColor Green
Write-Host "Set on Lambda: COGNITO_ENABLED=true, COGNITO_REGION=$Region, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID" -ForegroundColor Yellow
