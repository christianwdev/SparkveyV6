'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';
import { useUser } from '@contexts/UserProvider';
import {
  requestAccountDeletion,
  requestEmailChange,
  updateNotificationPreferencesSetting,
  updatePassword,
  updateUserPreferencesSetting,
  updateUsernameSetting,
} from '@utils/profile';
import { applyColorTheme, isColorTheme } from '@utils/theme';
import { isValidNewPassword } from 'schemas/auth';

// Components
import TextField from '@components/FormInputs/TextField/TextField';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';

import styles from './page.module.scss';

function SettingsPageContent() {
  const t = useTranslations('ProfileSettings');
  const { user, setUser } = useUser();
  const searchParams = useSearchParams();

  const [ username, setUsername ] = useState(user?.username ?? '');
  const [ email, setEmail ] = useState('');
  const [ emailPassword, setEmailPassword ] = useState('');
  const [ currentPassword, setCurrentPassword ] = useState('');
  const [ newPassword, setNewPassword ] = useState('');
  const [ confirmPassword, setConfirmPassword ] = useState('');
  const [ pending, setPending ] = useState<string | null>(null);
  const [ deleteArmed, setDeleteArmed ] = useState(false);

  const emailChange = searchParams.get('emailChange');

  useEffect(() => {
    if (!emailChange) return;

    if (emailChange === 'success') {
      toast.success(t('banners.emailChangeSuccess'), { toastId: 'email-change-status' });
    } else if (emailChange === 'taken' || emailChange === 'unavailable') {
      toast.error(t('banners.emailChangeUnavailable'), { toastId: 'email-change-status' });
    } else {
      toast.error(t('banners.emailChangeInvalid'), { toastId: 'email-change-status' });
    }
  }, [ emailChange, t ]);

  if (!user) return null;

  const notificationPreferences = {
    securityAlerts: user.notificationPreferences?.securityAlerts ?? true,
    marketingAlerts: user.notificationPreferences?.marketingAlerts ?? true,
    promotionalAlerts: user.notificationPreferences?.promotionalAlerts ?? true,
    newsletterAlerts: user.notificationPreferences?.newsletterAlerts ?? true,
  };

  const userPreferences = {
    anonymous: user.userPreferences?.anonymous ?? false,
    hideStats: user.userPreferences?.hideStats ?? false,
    colorTheme: user.userPreferences?.colorTheme,
  };

  const run = async (
    key: string,
    action: () => Promise<{ success?: boolean, message?: string, data?: typeof user } | null>,
    fallbackError: string,
    { quiet = false }: { quiet?: boolean } = {},
  ) => {
    setPending(key);

    try {
      const response = await action();
      if (!response?.success) {
        toast.error(response?.message || fallbackError, { toastId: `settings-error-${key}` });

        return;
      }

      if (response.data) {
        setUser(response.data);
        if (response.data.username) setUsername(response.data.username);
      }

      // Toggle rows already show state — skip success toasts so rapid flips don't spam.
      if (!quiet) {
        toast.success(response.message || t('success.saved'), { toastId: 'settings-saved' });
      }
    } catch {
      toast.error(fallbackError, { toastId: `settings-error-${key}` });
    } finally {
      setPending((current) => (current === key ? null : current));
    }
  };

  return (
    <div className={styles.settingsPage}>
      <div className={styles.header}>
        <h1>{t('title')}</h1>
        <p>{t('subtitle')}</p>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{t('sections.username')}</h2>
          <p>{t('sectionDescriptions.username')}</p>
        </div>
        <form
          className={styles.form}
          onSubmit={async (event) => {
            event.preventDefault();
            await run(
              'username',
              () => updateUsernameSetting({ username: username.trim() }),
              t('errors.updateUsername'),
            );
          }}
        >
          <TextField
            id="settings-username"
            label={t('labels.username')}
            value={username}
            onChange={event => setUsername(event.target.value)}
            placeholder={t('placeholders.username')}
            disabled={pending === 'username'}
            minLength={3}
            maxLength={32}
            required
            hint={t('hints.usernameLimit')}
          />
          <div className={styles.actions}>
            <PrimaryButton
              type="submit"
              disabled={pending === 'username' || username.trim() === user.username}
            >
              {t('actions.saveUsername')}
            </PrimaryButton>
          </div>
        </form>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{t('sections.email')}</h2>
          <p>{t('sectionDescriptions.email')}</p>
        </div>
        {user.hasPassword ? (
          <form
            className={styles.form}
            onSubmit={async (event) => {
              event.preventDefault();
              await run(
                'email',
                async () => {
                  const response = await requestEmailChange({
                    email: email.trim(),
                    currentPassword: emailPassword,
                  });
                  if (response?.success) {
                    setEmail('');
                    setEmailPassword('');
                  }

                  return response;
                },
                t('errors.updateEmail'),
              );
            }}
          >
            <TextField
              id="settings-current-email"
              label={t('labels.currentEmail')}
              value={user.emailInformation.emailAddress ?? ''}
              disabled
              readOnly
            />
            <TextField
              id="settings-new-email"
              label={t('labels.newEmail')}
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              placeholder={t('placeholders.newEmail')}
              disabled={pending === 'email'}
              required
              hint={t('hints.emailChange')}
            />
            <TextField
              id="settings-email-password"
              label={t('labels.currentPassword')}
              type="password"
              value={emailPassword}
              onChange={event => setEmailPassword(event.target.value)}
              disabled={pending === 'email'}
              required
              autoComplete="current-password"
              hint={t('hints.emailPasswordConfirm')}
            />
            <div className={styles.actions}>
              <PrimaryButton
                type="submit"
                disabled={pending === 'email' || !email.trim() || !emailPassword}
              >
                {t('actions.changeEmail')}
              </PrimaryButton>
            </div>
          </form>
        ) : (
          <div className={styles.form}>
            <TextField
              id="settings-current-email"
              label={t('labels.currentEmail')}
              value={user.emailInformation.emailAddress ?? ''}
              disabled
              readOnly
              hint={t('hints.oauthEmailLocked')}
            />
          </div>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{t('sections.password')}</h2>
          <p>{t('sectionDescriptions.password')}</p>
        </div>
        {user.hasPassword ? (
          <form
            className={styles.form}
            onSubmit={async (event) => {
              event.preventDefault();
              if (newPassword !== confirmPassword) {
                toast.error(t('errors.passwordMismatch'));

                return;
              }

              if (!isValidNewPassword(newPassword)) {
                toast.error(t('errors.passwordRules'));

                return;
              }

              await run(
                'password',
                async () => {
                  const response = await updatePassword({
                    currentPassword,
                    newPassword,
                  });
                  if (response?.success) {
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }

                  return response;
                },
                t('errors.updatePassword'),
              );
            }}
          >
            <TextField
              id="settings-current-password"
              label={t('labels.currentPassword')}
              type="password"
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              disabled={pending === 'password'}
              required
            />
            <TextField
              id="settings-new-password"
              label={t('labels.newPassword')}
              type="password"
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              disabled={pending === 'password'}
              required
              minLength={8}
              hint={t('hints.passwordRules')}
            />
            <TextField
              id="settings-confirm-password"
              label={t('labels.confirmPassword')}
              type="password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              disabled={pending === 'password'}
              required
              minLength={8}
            />
            <div className={styles.actions}>
              <PrimaryButton type="submit" disabled={pending === 'password'}>
                {t('actions.updatePassword')}
              </PrimaryButton>
            </div>
          </form>
        ) : (
          <p className={styles.statusMessage}>{t('hints.oauthPassword')}</p>
        )}
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>{t('sections.emailPreferences')}</h2>
          <p>{t('sectionDescriptions.emailPreferences')}</p>
        </div>
        <div className={styles.toggleGrid}>
          {(
            [
              [ 'securityAlerts', 'securityAlerts', 'securityAlertsHint' ],
              [ 'marketingAlerts', 'marketing', 'marketingHint' ],
              [ 'promotionalAlerts', 'freeGifts', 'freeGiftsHint' ],
              [ 'newsletterAlerts', 'newsletter', 'newsletterHint' ],
            ] as const
          ).map(([ key, labelKey, hintKey ]) => (
            <label key={key} className={styles.toggleRow}>
              <span className={styles.toggleCopy}>
                <span>{t(`labels.${labelKey}`)}</span>
                <small>{t(`hints.${hintKey}`)}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                className={styles.switch}
                checked={notificationPreferences[key]}
                disabled={pending === `notify-${key}`}
                onChange={(event) => {
                  const checked = event.target.checked;
                  run(
                    `notify-${key}`,
                    () => updateNotificationPreferencesSetting({ [key]: checked }),
                    t('errors.updateEmailPreferences'),
                    { quiet: true },
                  ).catch(error => {
                    console.error(error);
                  });
                }}
              />
            </label>
          ))}
        </div>
      </section>

      <div className={styles.preferencesGrid}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{t('sections.personalPreferences')}</h2>
            <p>{t('sectionDescriptions.personalPreferences')}</p>
          </div>
          <div className={styles.toggleList}>
            <label className={styles.toggleRow}>
              <span className={styles.toggleCopy}>
                <span>{t('labels.anonymous')}</span>
                <small>{t('hints.anonymous')}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                className={styles.switch}
                checked={userPreferences.anonymous}
                disabled={pending === 'pref-anonymous'}
                onChange={(event) => {
                  const checked = event.target.checked;
                  run(
                    'pref-anonymous',
                    () => updateUserPreferencesSetting({ anonymous: checked }),
                    t('errors.updatePreferences'),
                    { quiet: true },
                  ).catch(error => {
                    console.error(error);
                  });
                }}
              />
            </label>
            <label className={styles.toggleRow}>
              <span className={styles.toggleCopy}>
                <span>{t('labels.hideStats')}</span>
                <small>{t('hints.hideStats')}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                className={styles.switch}
                checked={userPreferences.hideStats}
                disabled={pending === 'pref-hideStats'}
                onChange={(event) => {
                  const checked = event.target.checked;
                  run(
                    'pref-hideStats',
                    () => updateUserPreferencesSetting({ hideStats: checked }),
                    t('errors.updatePreferences'),
                    { quiet: true },
                  ).catch(error => {
                    console.error(error);
                  });
                }}
              />
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{t('sections.appearance')}</h2>
            <p>{t('sectionDescriptions.appearance')}</p>
          </div>
          <div className={styles.toggleList}>
            <label className={styles.toggleRow}>
              <span className={styles.toggleCopy}>
                <span>{t('labels.darkMode')}</span>
                <small>{t('hints.darkMode')}</small>
              </span>
              <input
                type="checkbox"
                role="switch"
                className={styles.switch}
                checked={userPreferences.colorTheme === 'dark'}
                disabled={pending === 'pref-theme'}
                onChange={(event) => {
                  const previousTheme = userPreferences.colorTheme;
                  const colorTheme = event.target.checked ? 'dark' : 'light';
                  applyColorTheme(colorTheme);
                  run(
                    'pref-theme',
                    async () => {
                      const response = await updateUserPreferencesSetting({ colorTheme });
                      if (!response?.success) {
                        if (isColorTheme(previousTheme)) {
                          applyColorTheme(previousTheme);
                        } else {
                          applyColorTheme('light');
                        }
                      }

                      return response;
                    },
                    t('errors.updatePreferences'),
                    { quiet: true },
                  ).catch(error => {
                    console.error(error);
                  });
                }}
              />
            </label>
          </div>
        </section>
      </div>

      <section className={`${styles.section} ${styles.dangerSection}`}>
        <div className={styles.sectionHeader}>
          <h2>{t('sections.dangerZone')}</h2>
          <p>{t('sectionDescriptions.dangerZone')}</p>
        </div>
        <div className={styles.form}>
          <p className={styles.statusMessage}>{t('hints.deleteAccount')}</p>
          <div className={styles.actions}>
            {!deleteArmed ? (
              <PrimaryButton
                variant="danger"
                onClick={() => setDeleteArmed(true)}
              >
                {t('actions.deleteAccount')}
              </PrimaryButton>
            ) : (
              <>
                <PrimaryButton
                  variant="danger"
                  disabled={pending === 'delete'}
                  onClick={() => {
                    run(
                      'delete',
                      async () => {
                        const response = await requestAccountDeletion();
                        if (response?.success) setDeleteArmed(false);

                        return response;
                      },
                      t('errors.deleteAccount'),
                    ).catch(error => {
                      console.error(error);
                    });
                  }}
                >
                  {t('actions.confirmDelete')}
                </PrimaryButton>
                <PrimaryButton
                  variant="secondary"
                  onClick={() => setDeleteArmed(false)}
                >
                  {t('actions.cancel')}
                </PrimaryButton>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SettingsPageClient() {
  return (
    <Suspense fallback={null}>
      <SettingsPageContent />
    </Suspense>
  );
}
