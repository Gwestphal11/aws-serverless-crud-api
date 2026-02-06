const AWS = require('aws-sdk');
const docClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event));

    const tableName = process.env.TABLE_NAME;
    const method = event.httpMethod;
    const path = event.path; // full path like /items or /items/123
    const pathParams = event.pathParameters || {};
    let body = {};

    if (event.body) {
        try {
            body = JSON.parse(event.body);
        } catch (err) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid JSON body' }),
            };
        }
    }

    try {
        if (path === '/items' && method === 'POST') {
            // CREATE
            const id = body.id || new Date().toISOString(); // use provided id or timestamp
            const item = { id, ...body };

            await docClient.put({
                TableName: tableName,
                Item: item,
            }).promise();

            return {
                statusCode: 201,
                body: JSON.stringify(item),
            };
        }

        if (path.startsWith('/items/') && method === 'GET') {
            // READ single item
            const id = pathParams.id;
            const result = await docClient.get({
                TableName: tableName,
                Key: { id },
            }).promise();

            if (!result.Item) {
                return { statusCode: 404, body: JSON.stringify({ message: 'Item not found' }) };
            }

            return { statusCode: 200, body: JSON.stringify(result.Item) };
        }

        if (path.startsWith('/items/') && method === 'PUT') {
            // UPDATE
            const id = pathParams.id;
            const updateExpression = [];
            const expressionAttributeValues = {};

            for (const key of Object.keys(body)) {
                if (key !== 'id') { // never update the ID
                    updateExpression.push(`${key} = :${key}`);
                    expressionAttributeValues[`:${key}`] = body[key];
                }
            }

            if (updateExpression.length === 0) {
                return { statusCode: 400, body: JSON.stringify({ message: 'Nothing to update' }) };
            }

            const result = await docClient.update({
                TableName: tableName,
                Key: { id },
                UpdateExpression: `SET ${updateExpression.join(', ')}`,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW',
            }).promise();

            return { statusCode: 200, body: JSON.stringify(result.Attributes) };
        }

        if (path.startsWith('/items/') && method === 'DELETE') {
    const id = pathParams.id;
    await docClient.delete({
        TableName: tableName,
        Key: { id },
    }).promise();

    return {
        statusCode: 200,
        body: JSON.stringify({
            id,
            message: 'Item deleted',
        }),
    };
}


        if (path === '/items' && method === 'GET') {
            // LIST all items
            const result = await docClient.scan({ TableName: tableName }).promise();
            return { statusCode: 200, body: JSON.stringify(result.Items) };
        }

        // Default: method/path not supported
        return { statusCode: 404, body: JSON.stringify({ message: 'Not Found' }) };
    } catch (err) {
        console.error('Error:', err);
        return { statusCode: 500, body: JSON.stringify({ message: err.message }) };
    }
};
















