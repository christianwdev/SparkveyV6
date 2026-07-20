import type { clientRequest } from "./clientRequest";
import type { serverRequest } from "./serverRequest";
import { getScope } from "./scope";
import type SanitizedUser from "types/User/SanitizedUser";
import type APIResponse from "types/APIResponse";

type RequestFn = typeof clientRequest | typeof serverRequest;

export async function getUser({ request }: { request: RequestFn }): Promise<SanitizedUser | null> {
  const response = await request<APIResponse<SanitizedUser>>({ url: `${getScope()}/user/get` });

  if (!response.data?.success) return null;

  return response.data.data ?? null;
}