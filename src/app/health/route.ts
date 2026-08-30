export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { success: true },
    {
      status: 200,
      headers: {
        'cache-control': 'no-store',
      },
    },
  );
}
