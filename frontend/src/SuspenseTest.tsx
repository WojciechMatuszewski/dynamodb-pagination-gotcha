
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRef } from 'react';

type BooksResponse = {
    books: { pk: string; sk: string; title: string }[];
    nextPageToken: string | undefined;
};

export function SuspenseTest() {
    const testRef = useRef<number | null>(null);
    if (!testRef.current) {
        console.log("initializing")
        testRef.current = 0;
    }

    const { isInitialLoading, fetchNextPage, isFetchingNextPage, data, error } =
        useInfiniteQuery<BooksResponse>({
            queryKey: ['default-pagination'],
            queryFn: async ({ pageParam }) => {
                const url = new URL(import.meta.env.VITE_DEFAULT_PAGINATION_URL);
                if (pageParam) {
                    url.searchParams.set('nextPageToken', pageParam);
                }

                const response = await fetch(url.toString());
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                return data;
            },
            getNextPageParam: (lastPage) => lastPage.nextPageToken,
            suspense: true
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
