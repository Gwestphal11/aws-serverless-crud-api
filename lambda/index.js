const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { randomUUID } = require('crypto');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Serverless CRUD Lambda Handler
 * - POST   /items       → create item
 * - GET    /items       → list all items
 * - GET    /items/{id}  → read single item
 * - PUT    /items/{id}  → update item
 * - DELETE /items/{id}  → delete item
 */

// --- Headers for CORS + JSON ---
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
};

// --- Helper to standardize responses ---
const response = (statusCode, body) => ({
  statusCode,
  headers,
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
    console.log('Event received:', JSON.stringify(event));

    const tableName = process.env.TABLE_NAME;
    const method = event.httpMethod;
    const path = event.resource; // safer than event.path
    const pathParams = event.pathParameters || {};
    let body = {};

    // --- Handle OPTIONS preflight ---
    if (method === 'OPTIONS') {
        return response(200, {});
    }

    // --- Parse JSON body ---
    if (event.body) {
        try {
            body = JSON.parse(event.body);
        } catch (err) {
            return response(400, { message: 'Invalid JSON body' });
        }
    }

    try {
        // --- CREATE ---
        if (path === '/items' && method === 'POST') {
            const id = body.id || randomUUID();
            const item = { id, ...body };

            await docClient.send(new PutCommand({ TableName: tableName, Item: item }));
            return response(201, item);
        }

        // --- READ single item ---
        if (path === '/items/{id}' && method === 'GET') {
            const id = pathParams.id;
            const result = await docClient.send(new GetCommand({ TableName: tableName, Key: { id } }));

            if (!result.Item) return response(404, { message: 'Item not found' });
            return response(200, result.Item);
        }

        // --- UPDATE ---
        if (path === '/items/{id}' && method === 'PUT') {
            const id = pathParams.id;
            const updateExpression = [];
            const expressionValues = {};

            for (const key of Object.keys(body)) {
                if (key !== 'id') {
                    updateExpression.push(`${key} = :${key}`);
                    expressionValues[`:${key}`] = body[key];
                }
            }

            if (updateExpression.length === 0) return response(400, { message: 'Nothing to update' });

            const result = await docClient.send(new UpdateCommand({
                TableName: tableName,
                Key: { id },
                UpdateExpression: `SET ${updateExpression.join(', ')}`,
                ExpressionAttributeValues: expressionValues,
                ReturnValues: 'ALL_NEW',
            }));

            return response(200, result.Attributes);
        }

        // --- DELETE ---
        if (path === '/items/{id}' && method === 'DELETE') {
            const id = pathParams.id;
            await docClient.send(new DeleteCommand({ TableName: tableName, Key: { id } }));
            return response(200, { id, message: 'Item deleted successfully' });
        }

        // --- LIST all items ---
        if (path === '/items' && method === 'GET') {
            const result = await docClient.send(new ScanCommand({ TableName: tableName, Limit: 25 }));
            return response(200, result.Items);
        }

        // --- Unsupported route ---
        return response(404, { message: 'Not Found' });

    } catch (err) {
        console.error('Internal Error:', err);
        return response(500, { message: err.message });
    }
};

















