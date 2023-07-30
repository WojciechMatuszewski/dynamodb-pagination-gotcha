import { CloudFormationCustomResourceEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";

const client = DynamoDBDocument.from(new DynamoDBClient({}));

export const handler = async (event: CloudFormationCustomResourceEvent) => {
  if (event.RequestType === "Delete") {
    return;
  }

  const tableName = process.env.TABLE_NAME;
  if (!tableName) {
    throw new Error("TABLE_NAME is not defined");
  }

  const books = Array.from(Array(40).keys()).map((i) => ({
    pk: `Book`,
    sk: `Book#${i}`,
    title: `Book ${i}`
  }));

  const booksChunks = books.reduce((chunks, book, index) => {
    const chunkIndex = Math.floor(index / 25);
    if (!chunks[chunkIndex]) {
      chunks[chunkIndex] = [];
    }

    chunks[chunkIndex].push(book);
    return chunks;
  }, [] as (typeof books)[number][][]);

  const batchWrites = booksChunks.map((booksChunk) => {
    return client.batchWrite({
      RequestItems: {
        [tableName]: booksChunk.map((book) => ({
          PutRequest: {
            Item: book
          }
        }))
      }
    });
  });

  await Promise.all(batchWrites);
};
