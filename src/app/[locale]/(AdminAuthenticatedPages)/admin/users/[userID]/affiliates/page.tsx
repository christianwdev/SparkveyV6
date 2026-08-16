import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { serverRequest } from '@utils/serverRequest';
import { createQueryClient } from '@contexts/queryClient';
import { adminUserAffiliatesQueryOptions } from '@hooks/adminUserQueries';
import AdminUserAffiliatesClient from './page.client';

type PageProps = {
  params: Promise<{ locale: string, userID: string }>,
};

export default async function AdminUserAffiliatesPage({ params }: PageProps) {
  const { userID } = await params;
  const queryClient = createQueryClient();

  await queryClient.prefetchQuery(adminUserAffiliatesQueryOptions({
    request: serverRequest,
    userID,
    page: 1,
  }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AdminUserAffiliatesClient userID={userID} />
    </HydrationBoundary>
  );
}
