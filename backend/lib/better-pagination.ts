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

  const { Items = [] } = await client.query({
    TableName: tableName,
    Limit: limit + 1,
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

  if (Items.length > limit) {
    const itemsToReturn = Items.slice(0, limit);
    const lastItem = itemsToReturn[itemsToReturn.length - 1];

    /**
     * On production, you should encrypt the `nextPageToken`.
     */
    const nextPageToken = Buffer.from(
      JSON.stringify({ pk: lastItem.pk, sk: lastItem.sk })
    ).toString("base64");

    return {
      books: itemsToReturn,
      nextPageToken
    };
  }

  return {
    books: Items,
    nextPageToken: undefined
  };
};
