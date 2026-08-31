import type { ReactNode } from 'react';
import styles from './AdminDetailsList.module.scss';

export type AdminDetailsListRow = {
  label: string,
  value: ReactNode,
  mono?: boolean,
};

type AdminDetailsListProps = {
  rows: AdminDetailsListRow[],
};

export default function AdminDetailsList({ rows }: AdminDetailsListProps) {
  return (
    <dl className={styles.root}>
      {rows.map(row => (
        <div key={row.label} className={styles.row}>
          <dt>{row.label}</dt>
          <dd className={row.mono ? styles.mono : undefined}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
