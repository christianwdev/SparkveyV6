'use client';

import { useFormatter } from 'next-intl';

type CurrencyAmountProps = {
  amount: number,
  currencyCode?: string,
};

export default function CurrencyAmount(
  {
    amount,
    currencyCode = 'USD',
  }: CurrencyAmountProps,
) {
  const formatter = useFormatter();

  return (
    <>
      {formatter.number(amount, {
        style: 'currency',
        currency: currencyCode,
        maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
      })}
    </>
  );
}
