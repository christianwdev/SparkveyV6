import type { CreateOrder200Response, CreateOrderRequest, ListRewards200ResponseRewardsInnerValueCurrencyCodeEnum } from 'tremendous';
import { Configuration, Environments, OrdersApi } from 'tremendous';

// Types
import type FunctionResponse from 'types/FunctionResponse';

const configuration = new Configuration({
  basePath: Environments.production,
  accessToken: process.env.TREMENDOUS_API_KEY,
});

const orders = new OrdersApi(configuration);

export type CreateTremendousOrderError = 'internalServerError';

export async function createTremendousOrder(
  {
    name,
    email,
    amount,
    currencyCode,
    rewardID,
    externalID,
  }: {
    name: string,
    email?: string,
    amount: number,
    currencyCode: ListRewards200ResponseRewardsInnerValueCurrencyCodeEnum,
    rewardID: string,
    externalID?: string,
  },
): Promise<FunctionResponse<CreateOrder200Response, CreateTremendousOrderError>> {
  try {
    const requestPayload: CreateOrderRequest = {
      external_id: externalID,
      payment: {
        funding_source_id: 'balance',
      },
      reward: {
        delivery: {
          method: 'LINK',
        },
        recipient: {
          name,
          email,
        },
        value: {
          denomination: amount,
          currency_code: currencyCode,
        },
        products: [
          rewardID,
        ],
        campaign_id: process.env.TREMENDOUS_CAMPAIGN_ID,
      },
    };
    const { data } = await orders.createOrder(requestPayload);

    if (!data.order) {
      return { ok: false, error: 'internalServerError' };
    }

    return { ok: true, data };
  } catch (err) {
    console.error(err);

    return { ok: false, error: 'internalServerError' };
  }
}
