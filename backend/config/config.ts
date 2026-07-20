const SiteConfig = {
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
        whitelistedIPs: [] as string[],
      },
    },
    ayetstudios: {
      security: {
        whitelistedIPs: [] as string[],
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
        whitelistedIPs: [] as string[],
      },
    },
    adtowall: {
      security: {
        secret: process.env.ADTOWALL_POSTBACK_SECRET,
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
    },
    timewall: {
      security: {
        whitelistedIPs: [] as string[],
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
};

export default SiteConfig;
