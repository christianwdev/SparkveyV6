type SteamAPIUser = {
  _json: unknown,
  steamid: string,
  username: string,
  name: string,
  profile: string,
  avatar: {
      small: string,
      medium: string,
      large: string
  }
};

export default SteamAPIUser;