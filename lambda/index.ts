export {};
import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const client = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

const tableName = process.env.TABLE || "";

exports.handler = async (event: any) => {
    const body = JSON.parse(event.body);
    const orderID = uuidv4();
    console.log(orderID);
    const params = {
        Message: JSON.stringify({
            ...body,
            id: orderID,
            paymentStatus: false
        }),
        MessageDeduplicationId: uuidv4(),
        MessageGroupId: 'orderID',
        TopicArn: process.env.TOPIC_ARN
    };
    console.log(params);

    const paramsDynamoDb = {
        TableName: tableName,
        Item: {
            ...body,
            id: orderID,
            orderStatus: "not-confirm",
            paymentStatus: false
        }
    }

    try{
        await client.put(paramsDynamoDb).promise();
        await sns.publish(params).promise();

        return {
            statusCode : 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...body,
                id: orderID,
                orderStatus: "not-confirm",
                paymentStatus: false
            })
        }
    }
    catch(err){
        console.log("err", err);

        return {
            statusCode : 502,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(err)
        }
    }
}