export function getScope() {
  switch (process.env.NEXT_PUBLIC_ENV) {
    case 'production':
      return 'https://api.sparkvey.com';
    case 'staging':
      return 'https://api.sparkveystaging.com';
    case 'development':
      return 'http://localhost:6060';
  }
}
