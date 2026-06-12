import crypto from 'crypto';

// Types
import type { CCPaymentAddressValidity } from 'types/External/CCPayment/Address';
import type { CCPaymentBalance } from 'types/External/CCPayment/Balance';
import type { CCPaymentFee } from 'types/External/CCPayment/Fee';
import type { CCPaymentResponse } from 'types/External/CCPayment/Response';
import type { CCPaymentWebhookPayload } from 'types/External/CCPayment/Webhook';
import type {
  CCPaymentWithdrawRequest,
  CCPaymentWithdrawResponse,
} from 'types/External/CCPayment/Withdraw';
import type FunctionResponse from 'types/FunctionResponse';

const appID = process.env.CCPAYMENT_APP_ID;
const appSecret = process.env.CCPAYMENT_APP_SECRET;
const baseURL = 'https://ccpayment.com/ccpayment/v2/';

export type CCPaymentRequestError = 'internalServerError';

export type ProcessCCPWebhookError =
  | 'missingHeaders'
  | 'invalidAppId'
  | 'invalidSignature'
  | 'invalidBody';

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

export async function processCCPWebhook(
  {
    rawBody,
    headers,
  }: {
    rawBody: string,
    headers: Record<string, string | string[] | undefined>,
  },
): Promise<FunctionResponse<CCPaymentWebhookPayload, ProcessCCPWebhookError>> {
  const timestamp = headers.timestamp || headers.Timestamp;
  const sign = headers.sign || headers.Sign;
  const appIdHeader = headers.appid || headers.Appid;

  if (!timestamp || !sign || !appIdHeader) {
    return { ok: false, error: 'missingHeaders' };
  }

  if (appIdHeader !== appID) {
    return { ok: false, error: 'invalidAppId' };
  }

  const generatedSign = generateSignature(timestamp.toString(), rawBody);

  if (generatedSign !== sign) {
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
