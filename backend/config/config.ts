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
        secret: process.env.AYETSTUDIOS_POSTBACK_SECRET ?? '',
      },
    },
    lootably: {
      security: {
        secret: process.env.LOOTABLY_POSTBACK_SECRET ?? '',
      },
    },
    waxrewards: {
      security: {
        whitelistedIPs: [] as string[],
      },
    },
    adtowall: {
      security: {
        secret: process.env.ADTOWALL_POSTBACK_SECRET ?? '',
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
        secret: process.env.MONLIX_POSTBACK_SECRET ?? '',
      },
    },
    hangmyads: {
      security: {
        secret: process.env.HANGMYADS_POSTBACK_SECRET ?? '',
      },
      rate: Number(process.env.HANGMYADS_RATE ?? 0.75),
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
        secret: process.env.PLAYFINA_POSTBACK_SECRET ?? '0e23003fa4406b13307088e54bb27065',
      },
    },
    affilirise: {
      security: {
        secret: process.env.AFFILIRISE_POSTBACK_SECRET ?? '62aafbd40f6deb225356aab524416c45',
      },
    },
    kong: {
      security: {
        secret: process.env.KONG_POSTBACK_SECRET ?? '9d07d7ab37c45709ca86a61b504c41c1',
      },
    },
    bitstarz: {
      security: {
        secret: process.env.BITSTARZ_POSTBACK_SECRET ?? '509eba73d210a8195da8908fa7697cec',
      },
    },
    playid: {
      security: {
        secret: process.env.PLAYID_POSTBACK_SECRET ?? '4e6c6d2a3f50ef37ddf7981991704a4e',
      },
    },
  },
  surveys: {
    cpxresearch: {
      appId: process.env.CPX_APP_ID ?? '',
      secureHash: process.env.CPX_SECURE_HASH ?? '',
      endpoint: 'https://live-api.cpx-research.com/api/get-surveys.php',
      defaultLimit: 12,
    },
  },
};

export default SiteConfig;
