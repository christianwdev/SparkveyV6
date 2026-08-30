// Utils
import { SPARKS_PER_USD } from 'backend/utils/rewards';

// Types
import type { CCPaymentReward } from 'types/Reward/CCPaymentReward';
import type InternalReward from 'types/Reward/InternalReward';

const CRYPTO_MINIMUM_USD = 1;
const CRYPTO_MAXIMUM_USD = 1000;
const CRYPTO_MINIMUM_SPARKS = CRYPTO_MINIMUM_USD * SPARKS_PER_USD;
const CRYPTO_MAXIMUM_SPARKS = CRYPTO_MAXIMUM_USD * SPARKS_PER_USD;

type PredefinedCrypto = Omit<CCPaymentReward, 'status' | 'createdAt' | 'updatedAt'>;

const PREDEFINED_CRYPTOS: PredefinedCrypto[] = [
  {
    rewardID: 'sol',
    rewardName: 'Solana',
    description: 'Solana is a high-performance blockchain platform that enables fast and scalable decentralized applications.',
    image: [
      {
        src: 'https://imagedelivery.net/oHD0oLOHVpmE-9Vp-RXuVg/7bd3cdbe-0484-4ebe-d65c-2444f0e3aa00/public',
        type: 'card',
      },
    ],
    disclosure: '',
    countries: [],
    categories: [ 'crypto' ],
    feeRate: 0,
    providerName: 'ccpayment',
    meta: {
      currencyCode: 'SOL',
      currencySymbol: 'SOL',
      currencyNetwork: 'SOL',
      minimumAmount: CRYPTO_MINIMUM_SPARKS,
      maximumAmount: CRYPTO_MAXIMUM_SPARKS,
    },
  },
  {
    rewardID: 'ltc',
    rewardName: 'Litecoin',
    description: 'Litecoin is a peer-to-peer electronic cash system that is decentralized without a central authority.',
    image: [
      {
        src: 'https://imagedelivery.net/oHD0oLOHVpmE-9Vp-RXuVg/997af3dd-1460-46de-5555-8915a0f13a00/public',
        type: 'card',
      },
    ],
    disclosure: '',
    countries: [],
    categories: [ 'crypto' ],
    feeRate: 0,
    providerName: 'ccpayment',
    meta: {
      currencyCode: 'LTC',
      currencySymbol: 'LTC',
      currencyNetwork: 'LTC',
      minimumAmount: CRYPTO_MINIMUM_SPARKS,
      maximumAmount: CRYPTO_MAXIMUM_SPARKS,
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
