import { getTranslations } from 'next-intl/server';
import styles from './FrequentlyAskedQuestions.module.scss';

const FAQ_IDS = [
  'whatIsSparkvey',
  'howDoIEarn',
  'whatAreSparks',
  'howToCashOut',
  'minimumWithdrawal',
  'withdrawalTime',
  'isItFree',
  'missingCredit',
  'isSparkveyLegit',
  'whoCanJoin',
] as const;

export default async function FrequentlyAskedQuestions() {
  const t = await getTranslations('Landing.faq');

  return (
    <div className={styles.frequentlyAskedQuestionsContainer} id="frequently-asked-questions">
      <div className={styles.titleContainer}>
        <h3>{t('eyebrow')}</h3>
        <h2>
          {t.rich('title', {
            highlight: (chunks) => <span>{chunks}</span>,
          })}
        </h2>
        <p>{t('description')}</p>
      </div>

      <div className={styles.questionsContainer}>
        {FAQ_IDS.map((id) => (
          <details key={id} className={styles.question}>
            <summary className={styles.summary}>
              <span className={styles.toggle} aria-hidden="true" />
              <h3>{t(`questions.${id}.title`)}</h3>
            </summary>
            <div className={styles.answer}>
              <p>{t(`questions.${id}.answer`)}</p>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
