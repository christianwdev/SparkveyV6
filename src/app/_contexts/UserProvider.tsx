'use client';

import { createContext, useContext, useEffect, useState } from 'react';

// Constants
import SocketEmits from '@constants/SocketEmits';
import { useSocket } from '@contexts/SocketContext';

// Types
import type { ReactNode } from 'react';
import type SanitizedUser from 'types/User/SanitizedUser';
import type InternalUser from 'types/User/InternalUser';
type UserContextType = {
  user: SanitizedUser | null,
  setUser: React.Dispatch<React.SetStateAction<SanitizedUser | null>>,
};

const UserContext = createContext<UserContextType | undefined>(undefined);

type UserProviderProps = {
  children: ReactNode,
  initialUser: SanitizedUser | null,
};

function removeProxyDetectPdLibScripts(): void {
  document.querySelectorAll('script[data-proxydetect-pd-lib="1"]').forEach(el => el.remove());
}

export const UserProvider = (props: UserProviderProps) => {
  const [ user, setUser ] = useState<SanitizedUser | null>(props.initialUser);
  const { socket } = useSocket();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(props.initialUser);
  }, [
    props.initialUser,
  ]);

  useEffect(() => {
    const theme = user?.userPreferences?.colorTheme;
    if (theme === 'dark' || theme === 'light') {
      document.documentElement.dataset.theme = theme;

      return;
    }

    delete document.documentElement.dataset.theme;
  }, [ user?.userPreferences?.colorTheme ]);

  useEffect(() => {
    if (!socket) return;

    socket.on(SocketEmits.userUpdate, (user: SanitizedUser) => {
      setUser(user);
    });

    socket.on(SocketEmits.balanceUpdate, (newBalance: InternalUser['balance']) => {
      setUser((user: SanitizedUser | null) => {
        if (!user) return null;

        return {
          ...user,
          balance: newBalance,
        };
      });
    });

    socket.on(SocketEmits.balanceIncrease, (toAdd: InternalUser['balance']) => {
      setUser(user => {
        if (!user) return null;

        const newBalance = {
          sparks: user.balance.sparks + toAdd.sparks,
        };

        return {
          ...user,
          balance: newBalance,
        };
      });
    });
  }, [
    socket,
  ]);

  useEffect(() => {
    removeProxyDetectPdLibScripts();

    const userID = user?.userID;
    const qs =
      userID &&
      new URLSearchParams({
        pdKey: '9ece36747a8812e36453',
        pdVal: userID,
      }).toString();
    const src = qs ? `https://engine.proxydetect.live/pd-lib.js?${qs}` : null;

    if (!src) {
      return removeProxyDetectPdLibScripts;
    }

    const script = document.createElement('script');
    script.dataset.proxydetectPdLib = '1';
    script.async = true;
    script.src = src;
    script.onerror = () => {
      console.warn('[ProxyDetect] Failed to load pd-lib (VPN/adblock often blocks vendor domains).');
    };
    document.head.appendChild(script);

    return removeProxyDetectPdLibScripts;
  }, [ user?.userID ]);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {props.children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);

  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return context;
};
