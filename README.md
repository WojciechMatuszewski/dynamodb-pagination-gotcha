# Different ways to handle DynamoDB pagination

## The problem

When you paginate through the dataset in DynamoDB, the `LastEvaluatedKey` can be defined even though you fetched all the resources. Upon the next request, the returned data will be empty, and the `LastEvaluatedKey` will be `undefined`.

This is quite problematic for the UI, as it would appear the UI is making another request, only to return no results. There are at least two ways to handle this.

1. Fetch two pages in the UI. Trick the user to only display the first fetched page. Upon the next request to "fetch more", instantly show the data from the second fetched page. (See notes below, I think this approach is not very good).

2. Parse the pagination token on the backend. Depending on the result, re-compute a new pagination token or return with no token at all (indicating that the are no more results).

## To run

1. Install the dependencies in both `backend` and `frontend` via `pnpm`.

2. Bootstrap and deploy the backend. Take a note of the `ApiUrl` output – you are going to need it.

3. Create `.env.local` in the `frontend` folder.

4. Add the following values in the `.env.local` you have just created.

    ```text
    VITE_DEFAULT_PAGINATION_URL=${ApiUrlOutput}/default-pagination
    VITE_BETTER_PAGINATION_URL=${ApiUrlOutput}/better-pagination
    ```

5. Run the frontend – `pnpm run dev`

## Structure

In the `backend` directory, you will find two AWS Lambda handlers – the `default-pagination.ts` and `better-pagination.ts`.

The `default-pagination.ts` is the "naive" implementation of the pagination. We are forwarding the data returned from the DynamoDB. This causes the issue mentioned in [The problem](#the-problem).

Then, there is the `better-pagination.ts` that employs logic to "fix" the issue. Instead of returning the `nextPageToken` from DynamoDB as is, we compute a new one, based on the fetch result.

## Learnings

- There are two ways one could use the `aws-sdk@v3`.

  - First uses the commands with the `.send` method. This is the preferred method when you are bundling your code. It enables better tree-shaking.

    ```ts
        client.send(new QueryCommand({}))
    ```

  - The second resembles the `v2` usage. There you have to use the class that does not end with `Client`. This method will cause a bigger bundle since it is harder for bundlers to tree-shake.

    ```ts
        client.query({})
    ```

- While I could make the "solution" no.1 work, I do not think it's a good solution (and that is okay, I would only consider it if I do not have any other choice).

    ```tsx
        const queryClient = useQueryClient();

    const { isInitialLoading, fetchNextPage, isFetchingNextPage, data, error } =
        useInfiniteQuery<BooksResponse>({
            queryKey: ['default-pagination-handled-by-client'],
            queryFn: async ({ pageParam }) => {
                const nextFetchedPage = queryClient.getQueryData<BooksResponse>([
                    'default-pagination-handled-by-client-cache',
                    pageParam
                ]);

                const currentRequestedPage =
                    nextFetchedPage ?? (await fetchPage(pageParam));
                const nextToBeRequestedPage = await fetchPage(
                    currentRequestedPage.nextPageToken
                );
                if (nextToBeRequestedPage.books.length === 0) {
                    return {
                        books: currentRequestedPage.books,
                        nextPageToken: undefined
                    };
                }

                await queryClient.setQueryData<BooksResponse>(
                    [
                        'default-pagination-handled-by-client-cache',
                        nextToBeRequestedPage.nextPageToken
                    ],
                    nextToBeRequestedPage
                );
                return nextToBeRequestedPage;
            },
            getNextPageParam: (lastPage) => lastPage.nextPageToken
        });
    ```

  - First, you have to make two requests to the backend. One for the requested page, and another for the page yet to be requested. This assumes that the page will be requested, which might or might not be true. This might lead to over-fetching.

  - Then, you run a risk of failing the second network call for the "to be requested" page. Should you ignore it? It it failed, it might happen when the user actually fetches that page. IDK

  - You also have to mind the `Suspense` and how it interacts with `tanstack-query`.

    - You cannot use the `useRef` for the "to be requested page" as the `useRef` will be re-initialized when component suspends. Instead you have to use a "suspense-safe" data structure, like the `queryClient.cache`.

  - What is not so bad about this solution is that you will yield to the request of the user instantly when they actually request the page you "over-fetched". Having said that, I'm not sure how that would interact with caching.

- The ultimate solution to the problem is, in my humble opinion, adding some logic related to computing the `nextPageToken` on the backend.

    ```ts
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
    ```

  - First, you over-fetch a single item. This enables you to check if you are at the end of the pagination.

  - Then, based on that information, you re-compute the `nextPageToken`.

  - **Encrypting the `nextPageToken` is very much recommended**. The end-user should not be able to derive the indexes of your database based on the `nextPageToken` (the default for DynamoDB). If you do not, you give away a lot of information to the potential attacker.
