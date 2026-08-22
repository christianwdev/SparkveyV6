'use client';

import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'react-toastify';

// Components
import TextField from '@components/FormInputs/TextField/TextField';
import PrimaryButton from '@components/FormInputs/PrimaryButton/PrimaryButton';

// Hooks
import { useUser } from '@contexts/UserProvider';
import { useAdminUserQuery } from '@hooks/useAdminUsers';
import { queryKeys } from '@hooks/queryKeys';

// Utils
import { hasPermissions } from '@utils/admin';
import {
  adjustAdminUserBalanceRequest,
  banAdminUserRequest,
  revokeAllAdminUserSessionsRequest,
  unbanAdminUserRequest,
  updateAdminUserRequest,
  type AdminMutationResult,
} from '@utils/adminUsers';
import { isCurrentlyBanned, toDate, toDateTimeLocal } from '@utils/date';

// Types
import type AdminUser from 'types/AdminUser';
import type { AdminUserListItem } from 'types/AdminUser';
import { StaffPermissions } from 'types/UserPermissions/StaffPermissions';

import styles from './page.module.scss';

type PendingAction = 'account' | 'balance' | 'limits' | 'ban' | 'unban' | 'revokeAll';
type MutationErrorKey =
  | 'errors.notFound'
  | 'errors.emailInUse'
  | 'errors.forbidden'
  | 'errors.deleted'
  | 'errors.selfBan'
  | 'errors.insufficientBalance'
  | 'errors.generic';

function mutationErrorKey(code?: string): MutationErrorKey {
  switch (code) {
    case 'notFound':
      return 'errors.notFound';
    case 'emailInUse':
      return 'errors.emailInUse';
    case 'forbidden':
      return 'errors.forbidden';
    case 'deleted':
      return 'errors.deleted';
    case 'selfBan':
      return 'errors.selfBan';
    case 'insufficientBalance':
      return 'errors.insufficientBalance';
    default:
      return 'errors.generic';
  }
}

function toastMutationError(
  {
    t,
    result,
  }: {
    t: ReturnType<typeof useTranslations<'AdminUser'>>,
    result: AdminMutationResult<unknown>,
  },
): void {
  toast.error(result.message || t(mutationErrorKey(result.code)));
}

function banFormFromUser(user: AdminUser): { permanent: boolean, until: string } {
  const bannedUntil = toDate(user.bannedUntil);
  if (!bannedUntil || !isCurrentlyBanned(bannedUntil)) {
    return { permanent: true, until: '' };
  }

  return {
    permanent: bannedUntil.getUTCFullYear() >= 9999,
    until: toDateTimeLocal(bannedUntil),
  };
}

type AdminUserSettingsClientProps = {
  userID: string,
};

export default function AdminUserSettingsClient({ userID }: AdminUserSettingsClientProps) {
  const { data: user } = useAdminUserQuery({ userID });

  if (!user) return null;

  return <AdminUserSettingsForm key={user.userID} user={user} />;
}

function AdminUserSettingsForm({ user }: { user: AdminUser }) {
  const t = useTranslations('AdminUser');
  const queryClient = useQueryClient();
  const { user: actor } = useUser();
  const canModify = hasPermissions({
    userPermissions: actor?.staffPermissions,
    required: StaffPermissions.MODIFY_USERS,
  });
  const userID = user.userID;

  const initialBan = banFormFromUser(user);

  const [ username, setUsername ] = useState<string>(user.username ?? '');
  const [ email, setEmail ] = useState<string>(user.emailInformation?.emailAddress ?? '');
  const [ emailVerified, setEmailVerified ] = useState<boolean>(!!user.emailInformation?.verifiedAt);
  const [ balanceAmount, setBalanceAmount ] = useState<string>('');
  const [ instantEarnOfferLimit, setInstantEarnOfferLimit ] = useState<number>(user.userConfiguration.instantEarnOfferLimit);
  const [ dailyInstantWithdrawalLimit, setDailyInstantWithdrawalLimit ] = useState<number>(user.userConfiguration.dailyInstantWithdrawalLimit);
  const [ maxAffiliateCodes, setMaxAffiliateCodes ] = useState<number>(user.userConfiguration.maxAffiliateCodes);
  const [ banUntil, setBanUntil ] = useState<string>(initialBan.until);
  const [ banPermanent, setBanPermanent ] = useState<boolean>(initialBan.permanent);
  const [ pending, setPending ] = useState<PendingAction | null>(null);

  const banned = isCurrentlyBanned(user.bannedUntil);
  const readOnly = !canModify || !!user.deletedAt;

  function applyUser(next: AdminUser) {
    queryClient.setQueryData<AdminUserListItem>(
      queryKeys.admin.users.detail(userID),
      current => {
        const flags = current?.flags ?? {
          activeFlagCount: 0,
          flagTypes: [],
        };

        return {
          ...next,
          flags,
        };
      },
    );
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() }).catch(error => {
      console.error(error);
    });

    const nextBan = banFormFromUser(next);
    setUsername(next.username ?? '');
    setEmail(next.emailInformation?.emailAddress ?? '');
    setEmailVerified(!!next.emailInformation?.verifiedAt);
    setInstantEarnOfferLimit(next.userConfiguration.instantEarnOfferLimit);
    setDailyInstantWithdrawalLimit(next.userConfiguration.dailyInstantWithdrawalLimit);
    setMaxAffiliateCodes(next.userConfiguration.maxAffiliateCodes);
    setBanPermanent(nextBan.permanent);
    setBanUntil(nextBan.until);
  }

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload: {
      username?: string,
      email?: string,
      emailVerified?: boolean,
    } = {};

    if (username.trim() !== user.username) payload.username = username.trim();
    if (email.trim() !== (user.emailInformation?.emailAddress ?? '')) payload.email = email.trim();
    if (emailVerified !== !!user.emailInformation?.verifiedAt) payload.emailVerified = emailVerified;

    if (payload.username === undefined && payload.email === undefined && payload.emailVerified === undefined) {
      toast.success(t('success.saved'));

      return;
    }

    setPending('account');

    try {
      const result = await updateAdminUserRequest({
        userID,
        username: payload.username,
        email: payload.email,
        emailVerified: payload.emailVerified,
      });
      if (!result.success) {
        toastMutationError({ t, result });

        return;
      }

      if (result.data) applyUser(result.data);
      toast.success(t('success.saved'));
    } catch (error) {
      console.error(error);
      toast.error(t('errors.generic'));
    } finally {
      setPending(current => (current === 'account' ? null : current));
    }
  }

  async function applyBalance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amount = Number(balanceAmount);
    if (!Number.isInteger(amount) || amount === 0) {
      toast.error(t('errors.invalidAmount'));

      return;
    }

    setPending('balance');

    try {
      const result = await adjustAdminUserBalanceRequest({ userID, amount });
      if (!result.success) {
        toastMutationError({ t, result });

        return;
      }

      if (result.data?.user) applyUser(result.data.user);
      setBalanceAmount('');
      toast.success(t('success.saved'));
    } catch (error) {
      console.error(error);
      toast.error(t('errors.generic'));
    } finally {
      setPending(current => (current === 'balance' ? null : current));
    }
  }

  async function saveLimits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      !Number.isInteger(instantEarnOfferLimit)
      || instantEarnOfferLimit < 0
      || !Number.isInteger(dailyInstantWithdrawalLimit)
      || dailyInstantWithdrawalLimit < 0
      || !Number.isInteger(maxAffiliateCodes)
      || maxAffiliateCodes < 0
      || maxAffiliateCodes > 100
    ) {
      toast.error(t('errors.invalidAmount'));

      return;
    }

    setPending('limits');

    try {
      const result = await updateAdminUserRequest({
        userID,
        userConfiguration: {
          instantEarnOfferLimit,
          dailyInstantWithdrawalLimit,
          maxAffiliateCodes,
        },
      });
      if (!result.success) {
        toastMutationError({ t, result });

        return;
      }

      if (result.data) applyUser(result.data);
      toast.success(t('success.saved'));
    } catch (error) {
      console.error(error);
      toast.error(t('errors.generic'));
    } finally {
      setPending(current => (current === 'limits' ? null : current));
    }
  }

  async function banUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending('ban');

    try {
      const result = await banAdminUserRequest({
        userID,
        until: banPermanent ? undefined : banUntil,
      });
      if (!result.success) {
        toastMutationError({ t, result });

        return;
      }

      if (result.data) applyUser(result.data);
      toast.success(t('success.saved'));
    } catch (error) {
      console.error(error);
      toast.error(t('errors.generic'));
    } finally {
      setPending(current => (current === 'ban' ? null : current));
    }
  }

  async function unbanUser() {
    setPending('unban');

    try {
      const result = await unbanAdminUserRequest({ userID });
      if (!result.success) {
        toastMutationError({ t, result });

        return;
      }

      if (result.data) applyUser(result.data);
      toast.success(t('success.saved'));
    } catch (error) {
      console.error(error);
      toast.error(t('errors.generic'));
    } finally {
      setPending(current => (current === 'unban' ? null : current));
    }
  }

  async function revokeAllSessions() {
    setPending('revokeAll');

    try {
      const result = await revokeAllAdminUserSessionsRequest({ userID });
      if (!result.success) {
        toastMutationError({ t, result });

        return;
      }

      toast.success(t('success.saved'));
    } catch (error) {
      console.error(error);
      toast.error(t('errors.generic'));
    } finally {
      setPending(current => (current === 'revokeAll' ? null : current));
    }
  }

  return (
    <div className={styles.settings}>
      {!canModify ? (
        <p className={styles.notice}>{t('settings.readOnly')}</p>
      ) : null}
      {user.deletedAt ? (
        <p className={styles.notice}>{t('settings.deleted')}</p>
      ) : null}

      <div className={styles.grid}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{t('settings.accountTitle')}</h2>
            <p>{t('settings.accountDescription')}</p>
          </div>
          <form
            className={styles.form}
            onSubmit={event => {
              saveAccount(event).catch(error => {
                console.error(error);
              });
            }}
          >
            <TextField
              id="admin-username"
              label={t('fields.username')}
              value={username}
              onChange={event => setUsername(event.target.value)}
              disabled={readOnly || pending === 'account'}
              minLength={3}
              maxLength={32}
              required
            />
            <TextField
              id="admin-email"
              label={t('fields.email')}
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              disabled={readOnly || pending === 'account'}
              required
            />
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={emailVerified}
                onChange={event => setEmailVerified(event.target.checked)}
                disabled={readOnly || pending === 'account'}
              />
              {t('fields.emailVerified')}
            </label>
            <div className={styles.actions}>
              <PrimaryButton type="submit" disabled={readOnly || pending === 'account'}>
                {t('actions.saveAccount')}
              </PrimaryButton>
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{t('settings.balanceTitle')}</h2>
            <p>{t('settings.balanceDescription')}</p>
          </div>
          <form
            className={styles.form}
            onSubmit={event => {
              applyBalance(event).catch(error => {
                console.error(error);
              });
            }}
          >
            <TextField
              id="admin-balance"
              label={t('fields.balanceAdjustment')}
              type="number"
              step="1"
              value={balanceAmount}
              onChange={event => setBalanceAmount(event.target.value)}
              disabled={readOnly || pending === 'balance'}
              hint={t('settings.balanceHint')}
              required
            />
            <div className={styles.actions}>
              <PrimaryButton type="submit" disabled={readOnly || pending === 'balance'}>
                {t('actions.applyBalance')}
              </PrimaryButton>
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{t('settings.limitsTitle')}</h2>
            <p>{t('settings.limitsDescription')}</p>
          </div>
          <form
            className={styles.form}
            onSubmit={event => {
              saveLimits(event).catch(error => {
                console.error(error);
              });
            }}
          >
            <TextField
              id="admin-instant-earn"
              label={t('fields.instantEarnOfferLimit')}
              type="number"
              min={0}
              value={instantEarnOfferLimit}
              onChange={event => {
                const value = event.target.valueAsNumber;
                if (Number.isFinite(value)) setInstantEarnOfferLimit(value);
              }}
              disabled={readOnly || pending === 'limits'}
              required
            />
            <TextField
              id="admin-daily-withdraw"
              label={t('fields.dailyInstantWithdrawalLimit')}
              type="number"
              min={0}
              value={dailyInstantWithdrawalLimit}
              onChange={event => {
                const value = event.target.valueAsNumber;
                if (Number.isFinite(value)) setDailyInstantWithdrawalLimit(value);
              }}
              disabled={readOnly || pending === 'limits'}
              required
            />
            <TextField
              id="admin-max-codes"
              label={t('fields.maxAffiliateCodes')}
              type="number"
              min={0}
              max={100}
              value={maxAffiliateCodes}
              onChange={event => {
                const value = event.target.valueAsNumber;
                if (Number.isFinite(value)) setMaxAffiliateCodes(value);
              }}
              disabled={readOnly || pending === 'limits'}
              required
            />
            <div className={styles.actions}>
              <PrimaryButton type="submit" disabled={readOnly || pending === 'limits'}>
                {t('actions.saveLimits')}
              </PrimaryButton>
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>{t('settings.moderationTitle')}</h2>
            <p>{t('settings.moderationDescription')}</p>
          </div>
          <form
            className={styles.form}
            onSubmit={event => {
              banUser(event).catch(error => {
                console.error(error);
              });
            }}
          >
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={banPermanent}
                onChange={event => setBanPermanent(event.target.checked)}
                disabled={readOnly || pending === 'ban'}
              />
              {t('settings.permanentBan')}
            </label>
            {banPermanent ? null : (
              <TextField
                id="admin-ban-until"
                label={t('fields.bannedUntil')}
                type="datetime-local"
                value={banUntil}
                onChange={event => setBanUntil(event.target.value)}
                disabled={readOnly || pending === 'ban'}
                required
              />
            )}
            <div className={styles.actions}>
              <PrimaryButton
                type="submit"
                variant="danger"
                disabled={readOnly || pending === 'ban'}
              >
                {t('actions.ban')}
              </PrimaryButton>
              <PrimaryButton
                type="button"
                variant="secondary"
                disabled={readOnly || !banned || pending === 'unban'}
                onClick={() => {
                  unbanUser().catch(error => {
                    console.error(error);
                  });
                }}
              >
                {t('actions.unban')}
              </PrimaryButton>
              <PrimaryButton
                type="button"
                variant="secondary"
                disabled={readOnly || pending === 'revokeAll'}
                onClick={() => {
                  revokeAllSessions().catch(error => {
                    console.error(error);
                  });
                }}
              >
                {t('actions.revokeAllSessions')}
              </PrimaryButton>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
