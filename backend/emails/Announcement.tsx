import {
  Body,
  Column,
  Container,
  Font,
  Head,
  Heading,
  Html,
  Hr,
  Img,
  Link,
  Preview,
  Row,
  Text,
} from '@react-email/components';

const colors = {
  primary: '#5045d2',
  textLight: '#b6b6b6',
  bgAlt: '#f7f6ff',
};

export type AnnouncementItem = {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  ctaText?: string;
  ctaUrl?: string;
};

type Props = {
  previewText?: string;
  heading?: string;
  subheading?: string;
  items: AnnouncementItem[];
};

// Image is always first in DOM so it stacks on top on mobile.
// For odd rows on desktop we use direction:rtl on the row to visually
// push the image to the right, then reset direction:ltr on each column.
function ZigZagItem({ item, index }: { item: AnnouncementItem; index: number }) {
  const isEven = index % 2 === 0;

  return (
    <Row
      style={{
        backgroundColor: isEven ? 'transparent' : colors.bgAlt,
        borderRadius: '12px',
        direction: isEven ? 'ltr' : 'rtl',
      }}
    >
      <Column
        style={{ padding: '28px 20px', direction: 'ltr' }}
      >
        {/* Inner row holds the two cells */}
        <Row>
          {/* Image column — always first in DOM, stacks on top on mobile */}
          <Column
            className="col-img"
            style={{
              width: '42%',
              verticalAlign: 'middle',
              paddingRight: '20px',
            }}
          >
            <Img
              src={item.imageUrl}
              alt={item.imageAlt}
              style={{
                width: '100%',
                maxWidth: '220px',
                borderRadius: '10px',
                display: 'block',
                margin: '0 auto',
              }}
            />
          </Column>

          {/* Text column */}
          <Column
            className="col-text"
            style={{
              width: '58%',
              verticalAlign: 'middle',
            }}
          >
            <Heading
              as="h2"
              style={{
                color: colors.primary,
                fontSize: '18px',
                fontWeight: '700',
                margin: '0px 0px 10px 0px',
                lineHeight: '1.3',
              }}
            >
              {item.title}
            </Heading>
            <Text
              style={{
                color: '#333333',
                fontSize: '14px',
                lineHeight: '1.6',
                margin: '0px 0px 16px 0px',
              }}
            >
              {item.description}
            </Text>
            {item.ctaText && item.ctaUrl ? (
              <Link
                href={item.ctaUrl}
                style={{
                  color: 'white',
                  backgroundColor: colors.primary,
                  padding: '10px 20px',
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                {item.ctaText}
              </Link>
            ) : null}
          </Column>
        </Row>
      </Column>
    </Row>
  );
}

export default function AnnouncementEmail({
  previewText = "Big news from Sparkvey — check out what's new!",
  heading = "What's New at Sparkvey",
  subheading = "We've been busy building new features and improvements just for you. Here's a look at everything that's arrived.",
  items = defaultItems,
}: Props) {
  return (
    <Html>
      <Head>
        <Font fontFamily="Arial" fallbackFontFamily="Helvetica" />
        <style>{`
          @media only screen and (max-width: 600px) {
            .col-img {
              display: block !important;
              width: 100% !important;
              padding: 0 0 16px 0 !important;
              text-align: center !important;
            }
            .col-img img {
              max-width: 80% !important;
              margin: 0 auto !important;
            }
            .col-text {
              display: block !important;
              width: 100% !important;
            }
            .footer-cta-btn {
              width: 100% !important;
              text-align: center !important;
              display: block !important;
              box-sizing: border-box !important;
            }
          }
        `}</style>
      </Head>
      <Body style={{ margin: '0px', padding: '0px', backgroundColor: '#ffffff' }}>
        <Preview>{previewText}</Preview>

        {/* Header */}
        <Container
          style={{
            backgroundColor: colors.primary,
            maxWidth: '600px',
            width: '100%',
            padding: '32px 40px 36px 40px',
            borderRadius: '0px 0px 10px 10px',
          }}
        >
          <Row>
            <Column>
              <Img
                src="https://sparkvey.com/img/logotype.svg"
                alt="Sparkvey Logo"
                height={36}
              />
            </Column>
          </Row>
          <Row>
            <Heading
              as="h1"
              style={{
                color: 'white',
                fontSize: '28px',
                fontWeight: '400',
                margin: '20px 0px 0px 0px',
                lineHeight: '1.2',
              }}
            >
              {heading}
            </Heading>
          </Row>
          {subheading ? (
            <Row>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '14px',
                  lineHeight: '1.6',
                  margin: '10px 0px 0px 0px',
                }}
              >
                {subheading}
              </Text>
            </Row>
          ) : null}
        </Container>

        {/* Zig-zag items */}
        <Container
          style={{
            maxWidth: '600px',
            width: '100%',
            padding: '20px 20px 8px 20px',
          }}
        >
          {items.map((item, index) => (
            <ZigZagItem key={index} item={item} index={index} />
          ))}
        </Container>

        {/* Footer CTA */}
        <Container
          style={{
            maxWidth: '600px',
            width: '100%',
            padding: '16px 20px 32px 20px',
            textAlign: 'center',
          }}
        >
          <Link
            href="https://sparkvey.com"
            className="footer-cta-btn"
            style={{
              color: 'white',
              backgroundColor: colors.primary,
              padding: '14px 40px',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Explore Sparkvey
          </Link>
        </Container>

        {/* Footer */}
        <Container
          style={{
            maxWidth: '600px',
            width: '100%',
            padding: '0px 20px 20px 20px',
            color: colors.textLight,
          }}
        >
          <Hr
            style={{
              borderColor: colors.textLight,
              borderWidth: '1px',
              margin: '0px 0px 20px 0px',
            }}
          />

          <Row>
            <Column>
              <Text style={{ margin: '10px 0px 0px 0px', fontSize: '13px' }}>
                Have a question? Don&apos;t hesitate to{' '}
                <Link href="mailto:support@sparkvey.com" style={{ color: colors.primary }}>
                  email us.
                </Link>
              </Text>
            </Column>
          </Row>

          <Row>
            <Column>
              <Text style={{ margin: '10px 0px 0px 0px', fontSize: '12px' }}>
                30 N Gould St, STE R, Sheridan, WY 82801, USA | support@sparkvey.com | © Sparkable LLC, All rights reserved
              </Text>
            </Column>
          </Row>
        </Container>
      </Body>
    </Html>
  );
}

const defaultItems: AnnouncementItem[] = [
  {
    title: 'New Offers Have Arrived',
    description:
      "We've added a fresh batch of earning opportunities to Sparkvey. From new games to exclusive tasks and shopping partners, there are more ways than ever to stack up your Sparks. Log in and explore the Offers page to see everything available to you right now.",
    imageUrl: 'https://sparkvey.com/img/announcements/new-offers.png',
    imageAlt: 'New offers on Sparkvey',
    ctaText: 'Browse Offers',
    ctaUrl: 'https://sparkvey.com/offers',
  },
  {
    title: 'A Fresh New Withdrawal Experience',
    description:
      "We've redesigned the withdrawal flow from the ground up. It's cleaner, faster, and easier to navigate — so getting your rewards in hand is smoother than ever. Head over and try it out for yourself.",
    imageUrl: 'https://sparkvey.com/img/announcements/withdrawal-redesign.png',
    imageAlt: 'Redesigned withdrawal experience',
    ctaText: 'Withdraw Now',
    ctaUrl: 'https://sparkvey.com/withdraw',
  },
  {
    title: 'The Leaderboard Is Back',
    description:
      "Competition is back on. The Sparkvey Leaderboard has returned — climb the ranks, show off your Sparks, and see how you stack up against the top earners in the community. The grind starts now.",
    imageUrl: 'https://sparkvey.com/img/announcements/leaderboard.png',
    imageAlt: 'Sparkvey leaderboard returning',
    ctaText: 'View Leaderboard',
    ctaUrl: 'https://sparkvey.com/leaderboard',
  },
];
