import type GlobalObject from 'types/GlobalObject';

export function getGlobalObject(): GlobalObject {
  const { globalObject } = global;

  if (!globalObject) {
    throw new Error('globalObject is not initialized');
  }

  return globalObject;
}
