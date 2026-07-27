import type OfferWallType from 'types/Offer/OfferWallType';

type OfferwallLink = {
  baseLink: string,
  wallLink: string,
  additionalParameters?: Record<string, string>,
  supportLink?: string,
};

const OfferwallLinks: Record<
  Exclude<OfferWallType, 'monlix' | 'mmwall' | 'playid'>,
  OfferwallLink
> = {
  adgatemedia: {
    baseLink: 'https://adgatemedia.com/',
    wallLink: 'https://wall.adgaterewards.com/n6yUrg/{userID}',
  },
  adscend: {
    baseLink: 'https://adscend.com/',
    wallLink: 'https://asmwall.com/adwall/publisher/116834/profile/20550?subid1={userID}',
    additionalParameters: {
      allow: 'camera https://asmwall.com',
    },
  },
  ayetstudios: {
    baseLink: 'https://ayetstudios.com/',
    wallLink: 'https://www.ayetstudios.com/offers/web_offerwall/3523?external_identifier={userID}',
    supportLink: 'https://support.ayet.io/offers?externalIdentifier={userID}&placementId=3087',
  },
  adtowall: {
    baseLink: 'https://adtowall.com/',
    wallLink: 'https://adtowall.com/5463/{userID}',
  },
  lootably: {
    baseLink: 'https://lootably.com/',
    wallLink: 'https://wall.lootably.com/?placementID=ckqe52rkc002e01yl9yc8gj0p&sid={userID}',
  },
  timewall: {
    baseLink: 'https://timewall.io/',
    wallLink: 'https://timewall.io/users/login?oid=527a2a8c5c921a2e&uid={userID}',
  },
  torox: {
    baseLink: 'https://torox.io/',
    wallLink: process.env.NODE_ENV === 'development'
      ? 'http://localhost:6060/walls/torox'
      : 'https://api.sparkvey.com/walls/torox',
  },
  waxrewards: {
    baseLink: 'https://waxrewards.com/',
    wallLink: 'https://offerwall.fastask.net?pub=IY8J5vy9tVIC4cFv&uid={userID}',
  },
  hangmyads: {
    baseLink: 'https://hangmyads.com/',
    wallLink: 'https://offerwall.hangmyads.com/ow?pubid=5695&subid={userID}',
  },
  cpxresearch: {
    baseLink: 'https://cpxresearch.com/',
    wallLink: 'https://offers.cpx-research.com/index.php?app_id=8680&ext_user_id={userID}',
  },
  gemiads: {
    baseLink: 'https://gemiads.com/',
    wallLink: 'https://gemiwall.com/69952ca4d95123da0637b259/{userID}',
  },
};

export default OfferwallLinks;
