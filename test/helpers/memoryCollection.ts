/** Minimal Mongo-like collection for postback credit/reversal tests. */

export class DuplicateKeyError extends Error {
  readonly code = 11000;

  constructor(message = 'E11000 duplicate key error') {
    super(message);
    this.name = 'DuplicateKeyError';
  }
}

type Filter = Record<string, unknown>;

function getDotted(doc: Record<string, unknown>, path: string): unknown {
  if (!path.includes('.')) return doc[path];

  let current: unknown = doc;

  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object') return undefined;

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function hasDotted(doc: Record<string, unknown>, path: string): boolean {
  let current: unknown = doc;

  for (const part of path.split('.')) {
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, part)) {
      return false;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return true;
}

function matchesFilter(doc: Record<string, unknown>, filter: Filter): boolean {
  if (Array.isArray(filter.$and)) {
    if (!(filter.$and as Filter[]).every(part => matchesFilter(doc, part))) return false;
  }

  if (Array.isArray(filter.$or)) {
    if (!(filter.$or as Filter[]).some(part => matchesFilter(doc, part))) return false;
  }

  for (const [ key, expected ] of Object.entries(filter)) {
    if (key === '$and' || key === '$or') continue;

    const actual = getDotted(doc, key);

    if (expected && typeof expected === 'object' && !Array.isArray(expected) && !(expected instanceof Date)) {
      const ops = expected as Record<string, unknown>;

      if ('$exists' in ops) {
        const present = hasDotted(doc, key);
        if (ops.$exists === true && !present) return false;
        if (ops.$exists === false && present) return false;
      }

      if ('$ne' in ops && actual === ops.$ne) return false;
      if ('$in' in ops && Array.isArray(ops.$in) && !ops.$in.includes(actual)) return false;
      if ('$regex' in ops) {
        const pattern = String(ops.$regex);
        const flags = typeof ops.$options === 'string' ? ops.$options : '';
        if (!new RegExp(pattern, flags).test(String(actual ?? ''))) return false;
      }
      if ('$gt' in ops && !(actual instanceof Date && ops.$gt instanceof Date && actual > ops.$gt)) {
        if ('$gt' in ops && !('$ne' in ops || '$in' in ops || '$regex' in ops)) return false;
      }

      continue;
    }

    if (actual !== expected) return false;
  }

  return true;
}

function setDotted(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const parts = path.split('.');
  let current = target;

  for (let index = 0; index < parts.length - 1; index++) {
    const key = parts[index];
    if (!key) continue;

    const existing = current[key];
    current[key] = existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...existing as Record<string, unknown> }
      : {};
    current = current[key] as Record<string, unknown>;
  }

  const leaf = parts[parts.length - 1];
  if (leaf) current[leaf] = value;
}

function applyUpdate(
  doc: Record<string, unknown>,
  update: {
    $set?: Record<string, unknown>,
    $unset?: Record<string, string>,
    $inc?: Record<string, number>,
  },
): Record<string, unknown> {
  const next = { ...doc };

  if (update.$set) {
    for (const [ key, value ] of Object.entries(update.$set)) {
      if (key.includes('.')) {
        setDotted(next, key, value);
      } else {
        next[key] = value;
      }
    }
  }

  if (update.$inc) {
    for (const [ key, value ] of Object.entries(update.$inc)) {
      const current = getDotted(next, key);
      const nextValue = (typeof current === 'number' ? current : 0) + Number(value);
      if (key.includes('.')) {
        setDotted(next, key, nextValue);
      } else {
        next[key] = nextValue;
      }
    }
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

  find(filter: Filter = {}) {
    const matched = this.docs.filter(doc => matchesFilter(doc, filter));

    return {
      limit: (_count: number) => ({
        toArray: async () => matched,
      }),
      toArray: async () => matched,
    };
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
    update: {
      $set?: Record<string, unknown>,
      $unset?: Record<string, string>,
      $inc?: Record<string, number>,
    },
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
    update: {
      $set?: Record<string, unknown>,
      $unset?: Record<string, string>,
      $inc?: Record<string, number>,
    },
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

export function createMemoryDb(
  collections: Record<string, MemoryCollection<Record<string, unknown>>>,
) {
  return {
    collection: (name: string) => {
      const existing = collections[name];
      if (existing) return existing;

      const created = new MemoryCollection<Record<string, unknown>>();
      collections[name] = created;

      return created;
    },
  };
}
