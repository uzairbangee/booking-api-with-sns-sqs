export {};
import * as AWS from 'aws-sdk';

const client = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();

const tableName = process.env.TABLE || "";
const queue_url = process.env.QUEUE_URL || "";

exports.handler = async (event: any) => {
    console.log(event.Records);

    for (const record of event.Records) {
        let failed = false;
        const {Message} = JSON.parse(record.body);
        const message = JSON.parse(Message);
        try{
            const result = await saveToDB(message);
            console.log(result);

        }
        catch(err){
            console.log(err);
            failed = true;
        }

        if(!failed){
            console.log("message deleteing")
            await sqs.deleteMessage({
                QueueUrl: queue_url,
                ReceiptHandle: record.receiptHandle
            }).promise();
        }
    }

    return "done";
}

const saveToDB = async (data: any) => {
    if(data.payment.code === "123"){
        const params = {
            TableName: tableName,
            Key: { id : data.id },
            UpdateExpression: 'set #paymentStatus = :ps',
            ExpressionAttributeNames: {'#paymentStatus' : "paymentStatus"},
            ExpressionAttributeValues: {
                ':ps' : true,
            }
        }
        try {
           const res = await client.update(params).promise();
            return res;
        }
        catch(err){
            console.log(err);
            return Error("Payment Failed");
        }
    }
    return Error("Payment Failed");
}