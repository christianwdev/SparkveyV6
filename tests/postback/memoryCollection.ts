/** Minimal Mongo-like collection for postback credit/reversal tests. */

export class DuplicateKeyError extends Error {
  readonly code = 11000;

  constructor(message = 'E11000 duplicate key error') {
    super(message);
    this.name = 'DuplicateKeyError';
  }
}

type MemoryScalar = string | number | boolean | Date | null;
type MemoryList = MemoryScalar[];

export type MemoryDocument = {
  [key: string]: MemoryField | undefined,
};

type MemoryField = MemoryScalar | MemoryList | MemoryDocument;

type MemoryFilterOperator = {
  $exists?: boolean,
  $ne?: MemoryField,
  $in?: MemoryField[],
  $gt?: Date,
};

type MemoryFilter = {
  [key: string]: MemoryField | MemoryFilterOperator | undefined,
};

type MemoryUnset = {
  [key: string]: string,
};

type MemoryUpdate = {
  $set?: MemoryDocument,
  $unset?: MemoryUnset,
};

function isFilterOperator(value: MemoryField | MemoryFilterOperator | undefined): value is MemoryFilterOperator {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value) || value instanceof Date) return false;
  if (value.constructor !== Object) return false;

  return '$exists' in value || '$ne' in value || '$in' in value || '$gt' in value;
}

function matchesFilter(doc: MemoryDocument, filter: MemoryFilter): boolean {
  for (const key of Object.keys(filter)) {
    const expected = filter[key];
    const actual = doc[key];

    if (isFilterOperator(expected)) {
      if ('$exists' in expected) {
        const present = Object.prototype.hasOwnProperty.call(doc, key);
        if (expected.$exists === true && !present) return false;
        if (expected.$exists === false && present) return false;
      }

      if ('$ne' in expected && actual === expected.$ne) return false;
      if ('$in' in expected && Array.isArray(expected.$in) && (actual === undefined || !expected.$in.includes(actual))) {
        return false;
      }
      if ('$gt' in expected && !(actual instanceof Date && expected.$gt instanceof Date && actual > expected.$gt)) {
        if ('$gt' in expected && !('$ne' in expected || '$in' in expected)) return false;
      }

      continue;
    }

    if (actual !== expected) return false;
  }

  return true;
}

function applyUpdate(doc: MemoryDocument, update: MemoryUpdate) {
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

export class MemoryCollection {
  docs: MemoryDocument[] = [];

  constructor(private readonly options: MemoryCollectionOptions = {}) {}

  reset() {
    this.docs = [];
  }

  async findOne(filter: MemoryFilter): Promise<MemoryDocument | null> {
    return this.docs.find(doc => matchesFilter(doc, filter)) ?? null;
  }

  async insertOne(doc: MemoryDocument): Promise<{ acknowledged: true }> {
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
    filter: MemoryFilter,
    update: MemoryUpdate,
    options?: { returnDocument?: 'before' | 'after' },
  ): Promise<MemoryDocument | null> {
    // Atomic like MongoDB findOneAndUpdate — do not yield between match and write.
    const index = this.docs.findIndex(doc => matchesFilter(doc, filter));
    if (index === -1) return null;

    const before = this.docs[index];
    const after = applyUpdate(before, update);
    this.docs[index] = after;

    return options?.returnDocument === 'before' ? before : after;
  }

  async updateOne(
    filter: MemoryFilter,
    update: MemoryUpdate,
  ): Promise<{ acknowledged: true, matchedCount: number, modifiedCount: number }> {
    const index = this.docs.findIndex(doc => matchesFilter(doc, filter));
    if (index === -1) {
      return { acknowledged: true, matchedCount: 0, modifiedCount: 0 };
    }

    this.docs[index] = applyUpdate(this.docs[index], update);

    return { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
  }
}

export function createEarningsDb(collection: MemoryCollection) {
  return {
    collection: (_name: string) => collection,
  };
}
