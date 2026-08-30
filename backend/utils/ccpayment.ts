import crypto from 'crypto';

// Utils
import { readEnv } from './env';
import { isIPWhitelisted } from './ip';
import { secretsEqual } from './secrets';

// Types
import type { CCPaymentAddressValidity } from 'types/External/CCPayment/Address';
import type { CCPaymentBalance } from 'types/External/CCPayment/Balance';
import type { CCPaymentFee } from 'types/External/CCPayment/Fee';
import type { CCPaymentResponse } from 'types/External/CCPayment/Response';
import type { CCPaymentWebhookPayload } from 'types/External/CCPayment/Webhook';
import type {
  CCPaymentWithdrawRecordResponse,
  CCPaymentWithdrawRequest,
  CCPaymentWithdrawResponse,
} from 'types/External/CCPayment/Withdraw';
import type FunctionResponse from 'types/FunctionResponse';

const appID = readEnv('CCPAYMENT_APP_ID');
const appSecret = readEnv('CCPAYMENT_APP_SECRET');
const baseURL = 'https://ccpayment.com/ccpayment/v2/';
const WEBHOOK_SOURCE_IPS = [ '54.150.123.157' ] as const; // Official CCPayment webhook sender

export type CCPaymentRequestError = 'internalServerError';

export type ProcessCCPWebhookError =
  | 'missingHeaders'
  | 'invalidAppId'
  | 'invalidSignature'
  | 'invalidBody'
  | 'invalidIP';

function generateSignature(timestamp: string, body: string): string {
  const signText = `${appID}${timestamp}${body}`;

  return crypto.createHmac('sha256', appSecret ?? '').update(signText)
    .digest('hex');
}

async function ccpRequest<T>(
  endpoint: string,
  body: object = {},
): Promise<FunctionResponse<T, CCPaymentRequestError>> {
  if (!appID || !appSecret) {
    return { ok: false, error: 'internalServerError' };
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyStr = JSON.stringify(body);
  const sign = generateSignature(timestamp, bodyStr);
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${baseURL}${cleanEndpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Appid: appID,
        Timestamp: timestamp,
        Sign: sign,
        'User-Agent': 'CCPayment-Client/1.0',
      },
      body: bodyStr,
    });

    if (!response.ok) {
      throw new Error(`CCPayment HTTP error: ${response.status} ${response.statusText}`);
    }

    const resData = (await response.json()) as CCPaymentResponse<T>;

    if (resData.code !== 10000) {
      throw new Error(`CCPayment API Error ${resData.code}: ${resData.msg}`);
    }

    return { ok: true, data: resData.data };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'internalServerError' };
  }
}

export async function getCCPBalance(): Promise<FunctionResponse<CCPaymentBalance[], CCPaymentRequestError>> {
  return ccpRequest<CCPaymentBalance[]>('getUserCoinAssetList');
}

export async function withdrawCCP(
  request: CCPaymentWithdrawRequest,
): Promise<FunctionResponse<CCPaymentWithdrawResponse, CCPaymentRequestError>> {
  return ccpRequest<CCPaymentWithdrawResponse>('applyAppWithdrawToNetwork', request);
}

export async function getCCPFees(
  {
    tokenId,
  }: {
    tokenId?: string,
  } = {},
): Promise<FunctionResponse<CCPaymentFee[], CCPaymentRequestError>> {
  const body = tokenId ? { token_id: tokenId } : {};

  return ccpRequest<CCPaymentFee[]>('network_fee', body);
}

export async function checkCCPAddressValidity(
  {
    chain,
    address,
  }: {
    chain: string,
    address: string,
  },
): Promise<FunctionResponse<CCPaymentAddressValidity, CCPaymentRequestError>> {
  return ccpRequest<CCPaymentAddressValidity>('checkWithdrawalAddressValidity', {
    chain,
    address,
  });
}

export async function getCoinList(): Promise<FunctionResponse<unknown, CCPaymentRequestError>> {
  return ccpRequest<unknown>('getCoinList');
}

export async function getAppWithdrawRecord(
  {
    recordId,
    orderId,
  }: {
    recordId?: string,
    orderId?: string,
  },
): Promise<FunctionResponse<CCPaymentWithdrawRecordResponse, CCPaymentRequestError>> {
  const body: Record<string, string> = {};
  if (recordId) body.recordId = recordId;
  if (orderId) body.orderId = orderId;

  return ccpRequest<CCPaymentWithdrawRecordResponse>('getAppWithdrawRecord', body);
}

function webhookHeader(
  headers: Record<string, string | string[] | undefined>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = headers[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
    if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim().length > 0) {
      return value[0].trim();
    }
  }

  return undefined;
}

export async function processCCPWebhook(
  {
    rawBody,
    headers,
    remoteIP,
  }: {
    rawBody: string,
    headers: Record<string, string | string[] | undefined>,
    remoteIP?: string,
  },
): Promise<FunctionResponse<CCPaymentWebhookPayload, ProcessCCPWebhookError>> {
  if (process.env.NODE_ENV !== 'development' && !isIPWhitelisted(remoteIP, WEBHOOK_SOURCE_IPS)) {
    return { ok: false, error: 'invalidIP' };
  }

  const timestamp = webhookHeader(headers, [ 'timestamp', 'Timestamp' ]);
  const sign = webhookHeader(headers, [ 'sign', 'Sign' ]);
  const appIdHeader = webhookHeader(headers, [ 'appid', 'Appid' ]);

  if (!timestamp || !sign || !appIdHeader) {
    return { ok: false, error: 'missingHeaders' };
  }

  if (!secretsEqual(appIdHeader, appID)) {
    return { ok: false, error: 'invalidAppId' };
  }

  const generatedSign = generateSignature(timestamp, rawBody);

  if (!secretsEqual(generatedSign, sign)) {
    return { ok: false, error: 'invalidSignature' };
  }

  try {
    const payload = JSON.parse(rawBody) as CCPaymentWebhookPayload;

    return { ok: true, data: payload };
  } catch (error) {
    console.error(error);

    return { ok: false, error: 'invalidBody' };
  }
}
