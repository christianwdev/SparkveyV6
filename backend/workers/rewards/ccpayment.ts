// Types
import type { CCPaymentReward } from 'types/Reward/CCPaymentReward';
import type InternalReward from 'types/Reward/InternalReward';

type PredefinedCrypto = Omit<CCPaymentReward, 'status' | 'createdAt' | 'updatedAt'>;

const PREDEFINED_CRYPTOS: PredefinedCrypto[] = [
  {
    rewardID: 'sol',
    rewardName: 'Solana',
    description: 'Redeem your Sparks for Solana (SOL).',
    disclosure: '',
    countries: [],
    categories: [ 'crypto' ],
    providerName: 'ccpayment',
    meta: {
      currencyCode: 'SOL',
      currencySymbol: 'SOL',
      currencyNetwork: 'SOL',
      minimumAmount: 1,
      maximumAmount: 1000,
    },
  },
  {
    rewardID: 'ltc',
    rewardName: 'Litecoin',
    description: 'Redeem your Sparks for Litecoin (LTC).',
    disclosure: '',
    countries: [],
    categories: [ 'crypto' ],
    providerName: 'ccpayment',
    meta: {
      currencyCode: 'LTC',
      currencySymbol: 'LTC',
      currencyNetwork: 'LTC',
      minimumAmount: 1,
      maximumAmount: 1000,
    },
  },
];

export default async function CCPaymentWorker(): Promise<[ error: true ] | [ error: false, data: InternalReward[] ]> {
  try {
    const now = new Date();

    const rewards: InternalReward[] = PREDEFINED_CRYPTOS.map((crypto) => ({
      ...crypto,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }));

    return [ false, rewards ];
  } catch (err) {
    console.error(`We encountered an error when trying to build CCPayment rewards ${err}`);

    if (process.env.NODE_ENV === 'development') console.error(err);

    return [ true ];
  }
}
