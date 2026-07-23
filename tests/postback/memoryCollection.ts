/** Minimal Mongo-like collection for postback credit/reversal tests. */

export class DuplicateKeyError extends Error {
  readonly code = 11000;

  constructor(message = 'E11000 duplicate key error') {
    super(message);
    this.name = 'DuplicateKeyError';
  }
}

type Filter = Record<string, unknown>;

function matchesFilter(doc: Record<string, unknown>, filter: Filter): boolean {
  for (const [ key, expected ] of Object.entries(filter)) {
    const actual = doc[key];

    if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof Date)) {
      const ops = expected as Record<string, unknown>;

      if ('$exists' in ops) {
        const present = Object.prototype.hasOwnProperty.call(doc, key);
        if (ops.$exists === true && !present) return false;
        if (ops.$exists === false && present) return false;
      }

      if ('$ne' in ops && actual === ops.$ne) return false;
      if ('$in' in ops && Array.isArray(ops.$in) && !ops.$in.includes(actual)) return false;
      if ('$gt' in ops && !(actual instanceof Date && ops.$gt instanceof Date && actual > ops.$gt)) {
        if ('$gt' in ops && !('$ne' in ops || '$in' in ops)) return false;
      }

      continue;
    }

    if (actual !== expected) return false;
  }

  return true;
}

function applyUpdate(
  doc: Record<string, unknown>,
  update: { $set?: Record<string, unknown>, $unset?: Record<string, string> },
): Record<string, unknown> {
  const next = { ...doc };

  if (update.$set) {
    Object.assign(next, update.$set);
  }

  if (update.$unset) {
    for (const key of Object.keys(update.$unset)) {
      delete next[key];
    }
  }

  return next;
}

export type MemoryCollectionOptions = {

  /** Compound unique key fields (Mongo unique compound index simulation). */
  uniqueFields?: string[],

  /** Yield before write so concurrent callers can race. */
  yieldBeforeWrite?: boolean,
};

export class MemoryCollection<T extends Record<string, unknown>> {
  docs: T[] = [];

  constructor(private readonly options: MemoryCollectionOptions = {}) {}

  reset() {
    this.docs = [];
  }

  async findOne(filter: Filter): Promise<T | null> {
    return this.docs.find(doc => matchesFilter(doc, filter)) ?? null;
  }

  async insertOne(doc: T): Promise<{ acknowledged: true }> {
    if (this.options.yieldBeforeWrite) {
      await Promise.resolve();
    }

    const fields = this.options.uniqueFields;
    if (fields?.length) {
      const duplicate = this.docs.some(existing =>
        fields.every(field => existing[field] === doc[field]));

      if (duplicate) throw new DuplicateKeyError();
    }

    this.docs.push({ ...doc });

    return { acknowledged: true };
  }

  async findOneAndUpdate(
    filter: Filter,
    update: { $set?: Record<string, unknown>, $unset?: Record<string, string> },
    options?: { returnDocument?: 'before' | 'after' },
  ): Promise<T | null> {
    // Atomic like MongoDB findOneAndUpdate — do not yield between match and write.
    const index = this.docs.findIndex(doc => matchesFilter(doc, filter));
    if (index === -1) return null;

    const before = this.docs[index];
    const after = applyUpdate(before, update) as T;
    this.docs[index] = after;

    return options?.returnDocument === 'before' ? before : after;
  }

  async updateOne(
    filter: Filter,
    update: { $set?: Record<string, unknown>, $unset?: Record<string, string> },
  ): Promise<{ acknowledged: true, matchedCount: number, modifiedCount: number }> {
    const index = this.docs.findIndex(doc => matchesFilter(doc, filter));
    if (index === -1) {
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    }

    this.docs[index] = applyUpdate(this.docs[index], update) as T;

    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }
}

export function createEarningsDb(collection: MemoryCollection<Record<string, unknown>>) {
  return {
    collection: (_name: string) => collection,
  };
}
