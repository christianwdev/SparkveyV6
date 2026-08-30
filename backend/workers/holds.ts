// Utils
import { pollExpiredHeldOfferEarnings } from 'backend/utils/earnings';
import { isShuttingDown, trackInFlight } from 'backend/utils/shutdown';

const POLLING_INTERVAL = 15_000; // idle polls are a cheap indexed find

export default function startHoldsWorker() {
  console.log('Starting offer holds polling worker.');

  let lastPollDate = Date.now();
  let polling = false;

  setInterval(() => {
    if (isShuttingDown()) return;
    if (polling) return;
    if (lastPollDate + POLLING_INTERVAL > Date.now()) return;

    polling = true;
    lastPollDate = Date.now();

    trackInFlight(pollExpiredHeldOfferEarnings())
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
  trackInFlight(pollExpiredHeldOfferEarnings())
    .catch(error => {
      console.error(error);
    })
    .finally(() => {
      polling = false;
    });
}
