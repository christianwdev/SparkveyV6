const SiteConfig = {
  server: {
    backendURL: process.env.BACKEND_URL,
    frontendURL: process.env.FRONTEND_URL,
    domains: process.env.DOMAINS?.split(','),
    cookieDomain: process.env.COOKIE_DOMAIN,
  },
  database: {
    name: process.env.DATABASE_NAME,
  },
};

export default SiteConfig;
