// Utils
import { pollExpiredHeldOfferEarnings } from 'backend/utils/earnings';

const POLLING_INTERVAL = 15_000; // idle polls are a cheap indexed find

export default function startHoldsWorker() {
  console.log('Starting offer holds polling worker.');

  let lastPollDate = Date.now();
  let polling = false;

  setInterval(() => {
    if (polling) return;
    if (lastPollDate + POLLING_INTERVAL > Date.now()) return;

    polling = true;
    lastPollDate = Date.now();

    pollExpiredHeldOfferEarnings()
      .then(failed => {
        if (failed) lastPollDate = 0;
      })
      .catch(error => {
        console.error(error);
        lastPollDate = 0;
      })
      .finally(() => {
        polling = false;
      });
  }, 1000);

  polling = true;
  pollExpiredHeldOfferEarnings()
    .catch(error => {
      console.error(error);
    })
    .finally(() => {
      polling = false;
    });
}
