import { APIGatewayProxyEventV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocument.from(new DynamoDBClient({}));

export const handler = async (event: APIGatewayProxyEventV2) => {
  const limit = parseInt(event.queryStringParameters?.limit ?? "20", 10);
  const nextPageToken = event.queryStringParameters?.nextPageToken;

  console.log({ limit, nextPageToken });

  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error("TABLE_NAME is not defined");
  }

  const { Items, LastEvaluatedKey } = await client.query({
    TableName: tableName,
    Limit: limit,
    ExclusiveStartKey: nextPageToken
      ? JSON.parse(Buffer.from(nextPageToken, "base64").toString("utf8"))
      : undefined,
    KeyConditions: {
      pk: {
        ComparisonOperator: "EQ",
        AttributeValueList: ["Book"]
      }
    }
  });

  return {
    books: Items,
    /**
     * On production, you should encrypt the `nextPageToken`.
     */
    nextPageToken: LastEvaluatedKey
      ? Buffer.from(JSON.stringify(LastEvaluatedKey)).toString("base64")
      : undefined
  };
};
