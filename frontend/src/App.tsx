import { Suspense } from 'react';
import { BetterPagination } from './BetterPagination';
import { DefaultPagination } from './DefaultPagination';
import { DefaultPaginationHandledByClient } from './DefaultPaginationHandledByClient';
import { SuspenseTest } from './SuspenseTest';

export function App() {
  return (
    <div>
      <section>
        <h1>Default pagination</h1>
        <DefaultPagination />
      </section>
      <section>
        <h1>Default pagination handled by the client</h1>
        <DefaultPaginationHandledByClient />
      </section>
      <section>
        <h1>Better pagination</h1>
        <BetterPagination />
      </section>
      <section>
        <h1>Suspense test ref</h1>
        <Suspense>
          <SuspenseTest />
        </Suspense>
      </section>
    </div>
  );
}
