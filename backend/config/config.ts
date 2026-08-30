import { readEnv } from '../utils/env';

const SiteConfig = {
  postback: {
    disableSecurityChecks:
      process.env.NODE_ENV === 'development'
      && readEnv('POSTBACK_DISABLE_SECURITY') === 'true',
  },
  server: {
    backendURL: readEnv('BACKEND_URL'),
    frontendURL: readEnv('FRONTEND_URL'),
    domains: readEnv('DOMAINS')?.split(','),
    cookieDomain: readEnv('COOKIE_DOMAIN'),
  },
  database: {
    name: readEnv('MONGODB_DATABASE_NAME'),
  },
  walls: {
    ayetstudios: {
      security: {
        secret: 'edf8e4ae8ec1acd4cc8b85a15ae6e0c1',
        whitelistedIPs: [ '51.79.101.241', '158.69.185.134', '158.69.185.154', '35.165.166.40', '35.166.159.131', '52.40.3.140' ],
      },
    },
    lootably: {
      security: {
        secret: readEnv('NODE_ENV') === 'production' ? 'imKri5w8AOaTmC5Xs8ddSp2I4q027nb6yJrbsXdXa3EAOD21e8ej5swxyME4pZo2kkyap1E5ycxsKaNFeUbg' : 'aE0GtVN5aSZFp160wbceWvpUy8xRuXIl81hrA201vbG99KliJtn4IkEOax6n6pfn51AUtfLzSBhwr7Uj9jiQ',
      },
    },
    waxrewards: {
      security: {
        whitelistedIPs: [ '78.46.179.15' ],
      },
    },
    adtowall: {
      security: {
        secret: 'CYq3AXZGYeHABVWRARxFrwzMr0yA6M0dU13HCXVdjuNHcyxMTP6McSfhr7fWBXjF',
      },
    },
    mmwall: {
      security: {
        whitelistedIPs: [ '63.32.127.99' ],
      },
    },
    torox: {
      security: {
        whitelistedIPs: [ '44.212.211.226' ],
      },
      rate: 0.75,
      placementID: '12164',
      appToken: 'cca23ecf04bdcefd40104dd177535d44',
    },
    timewall: {
      security: {
        secret: 'd3a6b3b4f3c168c94258ee10844ba713',
        whitelistedIPs: [ '51.81.120.73', '142.111.248.18' ],
      },
    },
    monlix: {
      security: {
        secret: '5fb0cb36c34366557074cefeb3e1205a199399015df302910d09ad0c885fb83a',
      },
    },
    hangmyads: {
      security: {
        secret: '54c5e19373ffa5611ac3c112a2dfe3c5',
        whitelistedIPs: [ '52.10.12.101', '162.254.255.120', '216.137.182.154' ],
      },
      rate: 0.75,
    },
    gemiads: {
      security: {
        whitelistedIPs: [ '64.226.92.208' ],
      },
    },
    adscend: {
      security: {
        whitelistedIPs: [ '52.117.122.183', '52.117.127.192', '52.117.121.196', '54.204.57.82', '3.235.151.36' ],
      },
    },
  },
  surveys: {
    cpxresearch: {
      appId: readEnv('CPX_APP_ID'),
      secureHash: readEnv('CPX_SECURE_HASH'),
      endpoint: 'https://live-api.cpx-research.com/api/get-surveys.php',
      defaultLimit: 12,
    },
  },
  referral: {
    /** Fraction of referred user's sparks credit paid to the referrer as pending earnings. */
    rate: 0.05,
  },
  leaderboard: {
    prizes: [
      25_000,
      12_500,
      7_500,
      2_500,
      1_250,
      500,
      300,
      250,
      200,
    ],
  },
};

export default SiteConfig;
