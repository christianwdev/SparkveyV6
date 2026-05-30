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
  primaryLight: '#eeecfb',
  textLight: '#b6b6b6',
};

export type WhatsNewItem = {
  title: string;
  description: string;
  url?: string;
};

type Props = {
  firstName?: string;
  bonusPercent?: number;
  bonusCode?: string;
  ctaUrl?: string;
  whatsNew?: WhatsNewItem[];
  previewText?: string;
};

export default function WeAreMissingYouEmail({
  firstName,
  bonusPercent = 5,
  bonusCode,
  ctaUrl = 'https://sparkvey.com',
  whatsNew = defaultWhatsNew,
  previewText,
}: Props) {
  const preview =
    previewText ??
    `We miss you${firstName ? `, ${firstName}` : ''} — come back and get a ${bonusPercent}% bonus on your next task.`;

  const greeting = firstName ? `We miss you, ${firstName}.` : 'We miss you.';

  return (
    <Html>
      <Head>
        <Font fontFamily="Arial" fallbackFontFamily="Helvetica" />
        <style>{`
          @media only screen and (max-width: 600px) {
            .cta-btn {
              display: block !important;
              width: 100% !important;
              text-align: center !important;
              box-sizing: border-box !important;
            }
            .bonus-code {
              font-size: 22px !important;
              letter-spacing: 4px !important;
            }
          }
        `}</style>
      </Head>
      <Body style={{ margin: '0px', padding: '0px', backgroundColor: '#ffffff' }}>
        <Preview>{preview}</Preview>

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
              {greeting}
            </Heading>
          </Row>
          <Row>
            <Text
              style={{
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                lineHeight: '1.6',
                margin: '10px 0px 0px 0px',
              }}
            >
              It&apos;s been a while since we&apos;ve seen you on Sparkvey. We
              wanted to reach out with a little something to welcome you back.
            </Text>
          </Row>
        </Container>

        {/* Bonus offer */}
        <Container
          style={{
            maxWidth: '600px',
            width: '100%',
            padding: '28px 20px 0px 20px',
          }}
        >
          <Row>
            <Column>
              <Container
                style={{
                  backgroundColor: colors.primaryLight,
                  borderRadius: '12px',
                  border: `2px solid ${colors.primary}`,
                  padding: '24px 28px',
                  textAlign: 'center',
                }}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: '13px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    margin: '0px 0px 6px 0px',
                  }}
                >
                  Your exclusive offer
                </Text>
                <Heading
                  as="h2"
                  style={{
                    color: colors.primary,
                    fontSize: '42px',
                    fontWeight: '800',
                    margin: '0px 0px 4px 0px',
                    lineHeight: '1',
                  }}
                >
                  {bonusPercent}% Bonus
                </Heading>
                <Text
                  style={{
                    color: '#444444',
                    fontSize: '15px',
                    margin: '6px 0px 20px 0px',
                    lineHeight: '1.5',
                  }}
                >
                  on your next completed task — just for coming back.
                </Text>

                {bonusCode ? (
                  <>
                    <Text
                      style={{
                        color: '#555555',
                        fontSize: '13px',
                        margin: '0px 0px 8px 0px',
                      }}
                    >
                      Use code at checkout:
                    </Text>
                    <Text
                      className="bonus-code"
                      style={{
                        color: colors.primary,
                        fontSize: '26px',
                        fontWeight: '800',
                        letterSpacing: '6px',
                        margin: '0px 0px 20px 0px',
                        fontFamily: 'monospace',
                      }}
                    >
                      {bonusCode}
                    </Text>
                  </>
                ) : null}

                <Link
                  href={ctaUrl}
                  className="cta-btn"
                  style={{
                    color: 'white',
                    backgroundColor: colors.primary,
                    padding: '13px 36px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: '700',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  Claim My Bonus
                </Link>
              </Container>
            </Column>
          </Row>
        </Container>

        {/* What's new divider */}
        {whatsNew.length > 0 ? (
          <Container
            style={{
              maxWidth: '600px',
              width: '100%',
              padding: '32px 20px 0px 20px',
            }}
          >
            <Row>
              <Column>
                <Heading
                  as="h2"
                  style={{
                    color: '#222222',
                    fontSize: '18px',
                    fontWeight: '700',
                    margin: '0px 0px 4px 0px',
                  }}
                >
                  Here&apos;s what&apos;s new this week
                </Heading>
                <Text
                  style={{
                    color: '#666666',
                    fontSize: '13px',
                    margin: '0px 0px 20px 0px',
                    lineHeight: '1.5',
                  }}
                >
                  A lot has happened while you&apos;ve been away. Here&apos;s a
                  quick catch-up.
                </Text>
              </Column>
            </Row>

            {whatsNew.map((item, index) => (
              <Row
                key={index}
                style={{
                  marginBottom: '0px',
                }}
              >
                <Column>
                  <Container
                    style={{
                      borderLeft: `3px solid ${colors.primary}`,
                      paddingLeft: '16px',
                      marginBottom: '20px',
                    }}
                  >
                    <Text
                      style={{
                        color: '#222222',
                        fontSize: '15px',
                        fontWeight: '700',
                        margin: '0px 0px 4px 0px',
                        lineHeight: '1.3',
                      }}
                    >
                      {item.url ? (
                        <Link
                          href={item.url}
                          style={{ color: colors.primary, textDecoration: 'none' }}
                        >
                          {item.title}
                        </Link>
                      ) : (
                        item.title
                      )}
                    </Text>
                    <Text
                      style={{
                        color: '#555555',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        margin: '0px',
                      }}
                    >
                      {item.description}
                    </Text>
                  </Container>
                </Column>
              </Row>
            ))}

            {/* Final CTA after what's new */}
            <Row style={{ marginTop: '8px' }}>
              <Column style={{ textAlign: 'center' }}>
                <Link
                  href={ctaUrl}
                  className="cta-btn"
                  style={{
                    color: 'white',
                    backgroundColor: colors.primary,
                    padding: '13px 36px',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    display: 'inline-block',
                  }}
                >
                  Take Me Back to Sparkvey
                </Link>
              </Column>
            </Row>
          </Container>
        ) : null}

        {/* Footer */}
        <Container
          style={{
            maxWidth: '600px',
            width: '100%',
            padding: '28px 20px 20px 20px',
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
                <Link
                  href="mailto:support@sparkvey.com"
                  style={{ color: colors.primary }}
                >
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

const defaultWhatsNew: WhatsNewItem[] = [
  {
    title: 'New Offers Added',
    description:
      'We\'ve brought in fresh earning opportunities across games, surveys, and shopping. There are more ways to earn Sparks than ever before.',
    url: 'https://sparkvey.com/offers',
  },
  {
    title: 'Redesigned Withdrawal Flow',
    description:
      'Getting your rewards is now faster and easier with our completely rebuilt withdrawal experience.',
    url: 'https://sparkvey.com/withdraw',
  },
  {
    title: 'The Leaderboard Is Back',
    description:
      'Compete with the top earners in the community. Climb the ranks and show off your Sparks on the returning leaderboard.',
    url: 'https://sparkvey.com/leaderboard',
  },
];
