import * as cdk from '@aws-cdk/core';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apigw from "@aws-cdk/aws-apigateway";
import * as subs from '@aws-cdk/aws-sns-subscriptions';
import * as sns from '@aws-cdk/aws-sns';
import * as sqs from '@aws-cdk/aws-sqs';
import * as iam from "@aws-cdk/aws-iam";
import * as ddb from "@aws-cdk/aws-dynamodb";
import { SqsEventSource } from '@aws-cdk/aws-lambda-event-sources'

export class TicketBookingApiStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const topic = new sns.Topic(this, 'processTopic',
    {
      topicName: "processingTopic.fifo",
    });

    const cfnTopic = topic.node.defaultChild as sns.CfnTopic
    cfnTopic.addPropertyOverride("FifoTopic", true);
    cfnTopic.addPropertyOverride("ContentBasedDeduplication", false);

    const inventoryQueue = new sqs.Queue(this, 'inventoryQueue', {
      visibilityTimeout: cdk.Duration.seconds(300),
      queueName: 'inventoryQueue.fifo',
      fifo: true
    });

    const paymentQueue = new sqs.Queue(this, 'paymentQueue', {
      visibilityTimeout: cdk.Duration.seconds(300),
      queueName: 'paymentQueue.fifo',
      fifo: true
    });

    topic.addSubscription(new subs.SqsSubscription(inventoryQueue));

    topic.addSubscription(new subs.SqsSubscription(paymentQueue));

    const policy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["sns:Publish", "logs:*", "dynamodb:*"],
      resources: ["*"]
    })

    const role = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    role.addToPolicy(policy);

    const orderTable = new ddb.Table(this, "OrderTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      serverSideEncryption: true,
      stream: ddb.StreamViewType.NEW_AND_OLD_IMAGES,
      partitionKey: {name: "id", type: ddb.AttributeType.STRING}
    });

    const slotTable = new ddb.Table(this, "slotTable", {
      billingMode: ddb.BillingMode.PAY_PER_REQUEST,
      serverSideEncryption: true,
      stream: ddb.StreamViewType.NEW_AND_OLD_IMAGES,
      partitionKey: {name: "seat", type: ddb.AttributeType.NUMBER}
    });

    // slotTable.addGlobalSecondaryIndex({
    //   indexName: "query-by-seat",
    //   partitionKey: {
    //     name: "seat",
    //     type: ddb.AttributeType.STRING
    //   }
    // })

    const paymentrole = new iam.Role(this, 'paymentrole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    paymentrole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["sqs:*", "logs:*", "dynamodb:*"],
      resources: ["*"]
    }));

    const inventoryLambda = new lambda.Function(this, 'inventoryLambda', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset('lambda/inventory'),
      handler: 'index.handler',
      role: paymentrole,
      reservedConcurrentExecutions: 5,
      environment: {
        TABLE: slotTable.tableName,
        QUEUE_URL: inventoryQueue.queueUrl
      }
    });

    const PaymentLambda = new lambda.Function(this, 'PaymentLambda', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset('lambda/payment'),
      handler: 'index.handler',
      role: paymentrole,
      reservedConcurrentExecutions: 5,
      environment: {
        TABLE: orderTable.tableName,
        QUEUE_URL: paymentQueue.queueUrl
      }
    });

    const apiHandle = new lambda.Function(this, 'ApiLambdaHandler', {
      runtime: lambda.Runtime.NODEJS_12_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'index.handler',
      role: role,
      timeout: cdk.Duration.seconds(10),
      environment: {
        TOPIC_ARN: topic.topicArn,
        TABLE: orderTable.tableName
      }
    });

    PaymentLambda.addEventSource(new SqsEventSource(paymentQueue));
    inventoryLambda.addEventSource(new SqsEventSource(inventoryQueue));
    

    let api = new apigw.RestApi(this, 'bookingAPI', {
      deployOptions: {
        metricsEnabled: true,
        loggingLevel: apigw.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        stageName: 'prod'
      },
      defaultIntegration: new apigw.LambdaIntegration(apiHandle)
    });

    api.root.addMethod('POST');

    new cdk.CfnOutput(this, "OutputURL", {
      value: api.url
    })

  }
}
