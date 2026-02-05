import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AwsProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- DynamoDB table ---
    const table = new dynamodb.Table(this, 'MyTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // only for dev/test; not recommended in prod
    });

    // --- Lambda function ---
    const helloLambda = new lambda.Function(this, 'HelloLambda', {
  runtime: lambda.Runtime.NODEJS_18_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('lambda'),
  environment: {
    TABLE_NAME: table.tableName,
  },
  memorySize: 256,
  timeout: cdk.Duration.seconds(10),
  
});


    // --- Grant Lambda access to the table ---
    table.grantReadWriteData(helloLambda);

    // Optional: Add inline policy for future enhancements (e.g., querying, backups)
    helloLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: [
        "dynamodb:DescribeTable",
        "dynamodb:Query",
        "dynamodb:BatchGetItem",
        "dynamodb:BatchWriteItem"
      ],
      resources: [table.tableArn],
    }));

    // --- API Gateway CloudWatch Logs Role (account-level setting) ---
    const apiGatewayLoggingRole = new iam.Role(this, 'ApiGatewayCloudWatchRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs'),
      ],
    });

    const cfnAccount = new apigw.CfnAccount(this, 'ApiGatewayAccount', {
      cloudWatchRoleArn: apiGatewayLoggingRole.roleArn,
    });

    // --- API Gateway ---
    const api = new apigw.RestApi(this, 'HelloApi', {
      restApiName: 'Hello Service',
      description: 'Serverless CRUD API for demonstration and portfolio projects',
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
    });

    // Ensure account settings are applied before the API deploys
    api.node.addDependency(cfnAccount);

    // --- Lambda proxy integration ---
    const lambdaIntegration = new apigw.LambdaIntegration(helloLambda, { proxy: true });

    const items = api.root.addResource('items');
items.addMethod('GET', lambdaIntegration);
items.addMethod('POST', lambdaIntegration);

const item = items.addResource('{id}');
item.addMethod('GET', lambdaIntegration);
item.addMethod('PUT', lambdaIntegration);
item.addMethod('DELETE', lambdaIntegration);

  }
}



