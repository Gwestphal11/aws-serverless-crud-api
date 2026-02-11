import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AwsProjectStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- DynamoDB Table ---
    const table = new dynamodb.Table(this, 'MyTable', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // --- Lambda Function ---
    const crudLambda = new lambda.Function(this, 'CrudLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda'),
      environment: {
        TABLE_NAME: table.tableName,
      },
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
    });

    table.grantReadWriteData(crudLambda);

    crudLambda.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:DescribeTable",
          "dynamodb:Query",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem",
        ],
        resources: [table.tableArn],
      })
    );

    // --- API Gateway ---
    const api = new apigw.RestApi(this, 'CrudApi', {
      restApiName: 'CRUD Service',
      description: 'Serverless CRUD API',
      deployOptions: {
        stageName: 'prod',
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
      },
    });

    const lambdaIntegration = new apigw.LambdaIntegration(crudLambda, { proxy: true });

    const items = api.root.addResource('items');
    items.addMethod('GET', lambdaIntegration);
    items.addMethod('POST', lambdaIntegration);

    const item = items.addResource('{id}');
    item.addMethod('GET', lambdaIntegration);
    item.addMethod('PUT', lambdaIntegration);
    item.addMethod('DELETE', lambdaIntegration);

    // --- S3 Bucket for Frontend ---
   const siteBucket = new s3.Bucket(this, 'FrontendBucket', {
  websiteIndexDocument: 'index.html',
  publicReadAccess: true,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
  blockPublicAccess: new s3.BlockPublicAccess({
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
  }),
});


    // --- CloudFront Distribution ---
    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
  defaultBehavior: {
    origin: new origins.S3StaticWebsiteOrigin(siteBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
  },
});


    // --- Deploy Frontend ---
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset('./frontend')],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // --- Outputs ---
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'FrontendURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Frontend URL',
    });
  }
}
