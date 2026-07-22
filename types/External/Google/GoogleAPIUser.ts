type GoogleAPIUser = {
  aud: string,
  sub: string,
  email?: string,
  email_verified?: boolean | string,
  picture?: string,
};

export default GoogleAPIUser;
