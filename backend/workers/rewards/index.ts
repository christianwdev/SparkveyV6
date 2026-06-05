import CCPaymentWorker from './ccpayment';
import TremendousWorker from './tremendous';

// Utils
import { processConvertedWorkersRewards } from '../../utils/rewards';

// Types
import type InternalReward from 'types/Reward/InternalReward';

let lastPollDate: number = Date.now();
const POLLING_INTERVAL = 60 * 60 * 1000; // 1 Hour

async function ingestRewards() {
  console.info('Ingesting rewards');

  const [
    [ tremendousErr, tremendousRewards ],
    [ ccpaymentErr, ccpaymentRewards ],
  ] = await Promise.all([
    TremendousWorker(),
    CCPaymentWorker(),
  ]);

  const ingestedRewards: InternalReward[] = [];

  if (!tremendousErr) ingestedRewards.push(...tremendousRewards);
  if (!ccpaymentErr) ingestedRewards.push(...ccpaymentRewards);

  const { upserted, modified, failed } = await processConvertedWorkersRewards({
    convertedRewards: ingestedRewards,
  });

  console.info(`Reward ingest complete — ${upserted} upserted, ${modified} updated, ${failed} failed.`);

  return tremendousRewards;
}

export default async function startRewardsWorkers() {
  await ingestRewards();

  lastPollDate = Date.now();

  setInterval(async () => {
    if (lastPollDate + POLLING_INTERVAL > Date.now()) return;

    lastPollDate = Date.now();

    await ingestRewards();
  }, 60_000);
}
