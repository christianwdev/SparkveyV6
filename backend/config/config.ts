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
    adgatemedia: {
      security: {
        whitelistedIPs: [] as string[],
      },
    },
    ayetstudios: {
      security: {
        whitelistedIPs: [] as string[],
        secret: readEnv('AYETSTUDIOS_POSTBACK_SECRET'),
      },
    },
    lootably: {
      security: {
        secret: readEnv('LOOTABLY_POSTBACK_SECRET'),
      },
    },
    waxrewards: {
      security: {
        whitelistedIPs: [] as string[],
      },
    },
    adtowall: {
      security: {
        secret: readEnv('ADTOWALL_POSTBACK_SECRET'),
      },
      currencyRates: {} as Record<string, number>,
    },
    mmwall: {
      security: {
        whitelistedIPs: [] as string[],
      },
    },
    torox: {
      security: {
        whitelistedIPs: [] as string[],
      },
      placementID: readEnv('TOROX_PLACEMENT_ID'),
      appToken: readEnv('TOROX_APP_TOKEN'),
    },
    timewall: {
      security: {
        whitelistedIPs: [] as string[],
      },
    },
    monlix: {
      security: {
        secret: readEnv('MONLIX_POSTBACK_SECRET'),
      },
    },
    hangmyads: {
      security: {
        secret: readEnv('HANGMYADS_POSTBACK_SECRET'),
      },
      rate: Number(readEnv('HANGMYADS_RATE')),
    },
    gemiads: {
      security: {
        whitelistedIPs: [] as string[],
      },
    },
    adscend: {
      security: {
        whitelistedIPs: [] as string[],
      },
    },
    playfina: {
      security: {
        secret: readEnv('PLAYFINA_POSTBACK_SECRET'),
      },
    },
    affilirise: {
      security: {
        secret: readEnv('AFFILIRISE_POSTBACK_SECRET'),
      },
    },
    kong: {
      security: {
        secret: readEnv('KONG_POSTBACK_SECRET'),
      },
    },
    bitstarz: {
      security: {
        secret: readEnv('BITSTARZ_POSTBACK_SECRET'),
      },
    },
    playid: {
      security: {
        secret: readEnv('PLAYID_POSTBACK_SECRET'),
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
