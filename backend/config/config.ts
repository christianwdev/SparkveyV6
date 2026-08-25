type WallIpSecurity = {
  whitelistedIPs: string[],
};

type WallSecretSecurity = {
  secret: string | undefined,
};

type AdtowallCurrencyRates = Record<string, number>;

type SiteConfig = {
  postback: {
    disableSecurityChecks: boolean,
  },
  server: {
    backendURL: string | undefined,
    frontendURL: string | undefined,
    domains: string[] | undefined,
    cookieDomain: string | undefined,
  },
  database: {
    name: string | undefined,
  },
  walls: {
    adgatemedia: {
      security: WallIpSecurity,
    },
    ayetstudios: {
      security: WallIpSecurity & WallSecretSecurity,
    },
    lootably: {
      security: WallSecretSecurity,
    },
    waxrewards: {
      security: WallIpSecurity,
    },
    adtowall: {
      security: WallSecretSecurity,
      currencyRates: AdtowallCurrencyRates,
    },
    mmwall: {
      security: WallIpSecurity,
    },
    torox: {
      security: WallIpSecurity,
      placementID: string | undefined,
      appToken: string | undefined,
    },
    timewall: {
      security: WallIpSecurity,
    },
    monlix: {
      security: WallSecretSecurity,
    },
    hangmyads: {
      security: WallSecretSecurity,
      rate: number,
    },
    gemiads: {
      security: WallIpSecurity,
    },
    adscend: {
      security: WallIpSecurity,
    },
    playfina: {
      security: WallSecretSecurity,
    },
    affilirise: {
      security: WallSecretSecurity,
    },
    kong: {
      security: WallSecretSecurity,
    },
    bitstarz: {
      security: WallSecretSecurity,
    },
    playid: {
      security: WallSecretSecurity,
    },
  },
  surveys: {
    cpxresearch: {
      appId: string | undefined,
      secureHash: string | undefined,
      endpoint: string,
      defaultLimit: number,
    },
  },
  referral: {
    rate: number,
  },
  leaderboard: {
    prizes: number[],
  },
};

const adtowallCurrencyRates: AdtowallCurrencyRates = {};

const SiteConfig: SiteConfig = {
  postback: {
    /** Local dev only: requires NODE_ENV !== 'production' and POSTBACK_DISABLE_SECURITY=true */
    disableSecurityChecks:
      process.env.NODE_ENV !== 'production'
      && process.env.POSTBACK_DISABLE_SECURITY === 'true',
  },
  server: {
    backendURL: process.env.BACKEND_URL,
    frontendURL: process.env.FRONTEND_URL,
    domains: process.env.DOMAINS?.split(','),
    cookieDomain: process.env.COOKIE_DOMAIN,
  },
  database: {
    name: process.env.MONGODB_DATABASE_NAME,
  },
  walls: {
    adgatemedia: {
      security: {
        whitelistedIPs: [],
      },
    },
    ayetstudios: {
      security: {
        whitelistedIPs: [],
        secret: process.env.AYETSTUDIOS_POSTBACK_SECRET,
      },
    },
    lootably: {
      security: {
        secret: process.env.LOOTABLY_POSTBACK_SECRET,
      },
    },
    waxrewards: {
      security: {
        whitelistedIPs: [],
      },
    },
    adtowall: {
      security: {
        secret: process.env.ADTOWALL_POSTBACK_SECRET,
      },
      currencyRates: adtowallCurrencyRates,
    },
    mmwall: {
      security: {
        whitelistedIPs: [],
      },
    },
    torox: {
      security: {
        whitelistedIPs: [],
      },
      placementID: process.env.TOROX_PLACEMENT_ID,
      appToken: process.env.TOROX_APP_TOKEN,
    },
    timewall: {
      security: {
        whitelistedIPs: [],
      },
    },
    monlix: {
      security: {
        secret: process.env.MONLIX_POSTBACK_SECRET,
      },
    },
    hangmyads: {
      security: {
        secret: process.env.HANGMYADS_POSTBACK_SECRET,
      },
      rate: Number(process.env.HANGMYADS_RATE),
    },
    gemiads: {
      security: {
        whitelistedIPs: [],
      },
    },
    adscend: {
      security: {
        whitelistedIPs: [],
      },
    },
    playfina: {
      security: {
        secret: process.env.PLAYFINA_POSTBACK_SECRET,
      },
    },
    affilirise: {
      security: {
        secret: process.env.AFFILIRISE_POSTBACK_SECRET,
      },
    },
    kong: {
      security: {
        secret: process.env.KONG_POSTBACK_SECRET,
      },
    },
    bitstarz: {
      security: {
        secret: process.env.BITSTARZ_POSTBACK_SECRET,
      },
    },
    playid: {
      security: {
        secret: process.env.PLAYID_POSTBACK_SECRET,
      },
    },
  },
  surveys: {
    cpxresearch: {
      appId: process.env.CPX_APP_ID,
      secureHash: process.env.CPX_SECURE_HASH,
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
