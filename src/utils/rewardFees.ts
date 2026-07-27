/** Mirrors backend fee + FX-aware Sparks pricing for catalog UI. */

export function getFeeAmount(
  {
    value,
    feeRate,
  }: {
    value: number,
    feeRate: number,
  },
): number {
  if (feeRate <= 0) return 0;

  return Math.round(value * feeRate * 100) / 100;
}

export function getFaceSparksCost(
  {
    value,
    sparksPerUnit,
    sparksValues,
    denominations,
  }: {
    value: number,
    sparksPerUnit: number,
    sparksValues?: number[],
    denominations?: number[],
  },
): number {
  if (sparksValues && denominations) {
    const index = denominations.indexOf(value);

    if (index >= 0 && typeof sparksValues[index] === 'number') {
      return sparksValues[index];
    }
  }

  return Math.round(value * sparksPerUnit);
}

export function getPurchaseSparksCost(
  {
    value,
    feeRate,
    sparksPerUnit,
    sparksValues,
    denominations,
  }: {
    value: number,
    feeRate: number,
    sparksPerUnit: number,
    sparksValues?: number[],
    denominations?: number[],
  },
): number {
  const faceSparks = getFaceSparksCost({
    value,
    sparksPerUnit,
    sparksValues,
    denominations,
  });

  return Math.round(faceSparks * (1 + feeRate));
}
