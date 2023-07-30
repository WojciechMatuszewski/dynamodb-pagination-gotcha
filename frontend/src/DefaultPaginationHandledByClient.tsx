import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

type BooksResponse = {
    books: { pk: string; sk: string; title: string }[];
    nextPageToken: string | undefined;
};

/**
 * Possible edge cases.
 * 1. Sharing the cache with other components that use the same component.
 * 2. How does it work with Suspense?
 */
export function DefaultPaginationHandledByClient() {
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

    if (error) {
        return (
            <div>
                <span>Error</span>
                <pre>{JSON.stringify(error)}</pre>
            </div>
        );
    }

    if (isInitialLoading || !data) {
        return (
            <div>
                <span>Loading...</span>
            </div>
        );
    }

    const allBooks = data.pages.flatMap((page) => page.books);
    const nextPageToken = data.pages[data.pages.length - 1].nextPageToken;
    return (
        <div>
            <ul>
                {allBooks.map((book) => {
                    return <li key={book.sk}>{book.title}</li>;
                })}
            </ul>
            <button
                disabled={isFetchingNextPage || !nextPageToken}
                onClick={() => {
                    fetchNextPage({
                        pageParam: nextPageToken
                    });
                }}
            >
                Fetch more
            </button>
        </div>
    );
}

const fetchPage = async (nextPageToken: string | undefined) => {
    const url = new URL(import.meta.env.VITE_DEFAULT_PAGINATION_URL);
    if (nextPageToken) {
        url.searchParams.set('nextPageToken', nextPageToken);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }

    const data = (await response.json()) as BooksResponse;
    return data;
};
