export type SocialLink = {
  id?: string,
  verifiedAt?: Date,
};

type SocialInformation = {
  google?: SocialLink & {
    emailAddress?: string,
  },
  steam?: SocialLink,
  facebook?: SocialLink,
  x?: SocialLink,
  discord?: SocialLink,
};

export default SocialInformation;
