import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

export type TimeSeriesBucketConfig = {
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  bucketKey: (date: dayjs.Dayjs) => string,
  label: (date: dayjs.Dayjs) => string,
  stepUnit: dayjs.ManipulateType,
  stepAmount: number,
  truncateUnit: dayjs.OpUnitType,
};

export type TimeSeriesBucket = {
  date: string,
  label: string,
};

export type TimeSeriesPoint<TValue> = TimeSeriesBucket & {
  value: TValue,
};

export function buildTimeSeriesBuckets(config: TimeSeriesBucketConfig): TimeSeriesBucket[] {
  const buckets: TimeSeriesBucket[] = [];
  const iterationStart = config.start.clone().startOf(config.truncateUnit);
  const iterationEnd = config.end.clone().startOf(config.truncateUnit);

  for (
    let cursor = iterationStart.clone();
    cursor.isBefore(iterationEnd) || cursor.isSame(iterationEnd);
    cursor = cursor.add(config.stepAmount, config.stepUnit)
  ) {
    buckets.push({
      date: config.bucketKey(cursor),
      label: config.label(cursor),
    });
  }

  return buckets;
}

export function fillTimeSeries<TValue>(
  {
    config,
    valuesByBucket,
    emptyValue,
  }: {
    config: TimeSeriesBucketConfig,
    valuesByBucket: Map<string, TValue>,
    emptyValue: TValue,
  },
): TimeSeriesPoint<TValue>[] {
  return buildTimeSeriesBuckets(config).map(bucket => ({
    date: bucket.date,
    label: bucket.label,
    value: valuesByBucket.has(bucket.date)
      ? valuesByBucket.get(bucket.date) as TValue
      : emptyValue,
  }));
}

export function countEventsByBucket<TEvent>(
  {
    config,
    events,
    getDate,
  }: {
    config: TimeSeriesBucketConfig,
    events: TEvent[],
    getDate: (event: TEvent) => Date,
  },
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const event of events) {
    const key = config.bucketKey(dayjs.utc(getDate(event)));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

export function sumValuesByBucket<TEvent>(
  {
    config,
    events,
    getDate,
    getValue,
  }: {
    config: TimeSeriesBucketConfig,
    events: TEvent[],
    getDate: (event: TEvent) => Date,
    getValue: (event: TEvent) => number,
  },
): Map<string, number> {
  const sums = new Map<string, number>();

  for (const event of events) {
    const key = config.bucketKey(dayjs.utc(getDate(event)));
    sums.set(key, (sums.get(key) ?? 0) + getValue(event));
  }

  return sums;
}
