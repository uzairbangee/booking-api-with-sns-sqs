export {};
import * as AWS from 'aws-sdk';

const client = new AWS.DynamoDB.DocumentClient();

const sqs = new AWS.SQS();

const tableName = process.env.TABLE || "";
const queue_url = process.env.QUEUE_URL || "";

exports.handler = async (event: any) => {
    console.log(event.Records);
    for (const record of event.Records) {
        const {Message} = JSON.parse(record.body)
        const message = JSON.parse(Message);
        console.log(Message);
        // const params = {
        //     TableName: tableName,
        //     FilterExpression : 'seat = :seat_no and booking_date = :bd',
        //     ExpressionAttributeValues : {':seat_no' : message.seat, ":bd": message.booking_date}
        // }
        // const params = {
        //     TableName: tableName,
        //     // IndexName: 'query-by-seat',
        //     KeyConditionExpression: 'seat = :seat_no',
        //     FilterExpression : 'booking_date = :bd',
        //     ExpressionAttributeValues: {
        //         ':seat_no': message.seat,
        //         ':bd': message.booking_date
        //     }
        // }
        // console.log(params);
        // try{
            // const data = await client.query(params).promise();
            // console.log("data ", data);
            // if(data.Items && data.Items.length >= 1){
                const updateparams = {
                    TableName: tableName,
                    Key: { seat : message.seat },
                    UpdateExpression: 'set #booked = :ps',
                    ConditionExpression: 'booking_date = :bd',
                    ExpressionAttributeNames: {'#booked' : "booked"},
                    ExpressionAttributeValues: {
                        ':ps' : true,
                        ":bd" : message.booking_date
                    }
                }

                console.log(updateparams);

                try {
                    const res = await client.update(updateparams).promise();
                    console.log("Repsonse ", res)
                }
                catch(err){
                    console.log('DynamoDB error: ', err);
                    // throw Error("Inventory Management Failed");
                }
            // }
            // else{
            //     // throw Error("Inventory Management Failed");
            // }
        // }
        // catch(err) {
        //     console.log('DynamoDB error: ', err);
        // }

        await sqs.deleteMessage({
            QueueUrl: queue_url,
            ReceiptHandle: record.receiptHandle
        }).promise();
    }

    return "done";
}