import { getTranslations } from 'next-intl/server';
import LandingSectionHeader from '@components/LandingSectionHeader/LandingSectionHeader';
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
      <LandingSectionHeader
        eyebrow={t('eyebrow')}
        title={t.rich('title', {
          highlight: (chunks) => <span>{chunks}</span>,
        })}
        description={t('description')}
      />

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
