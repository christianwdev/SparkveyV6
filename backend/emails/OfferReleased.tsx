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
};

type Props = {
  offerName: string;
  offerAmount: string;
  releaseDate: string;
  offerImageUrl?: string;
};

export default function OfferReleasedEmail({
  offerName,
  offerAmount,
  releaseDate,
  offerImageUrl,
}: Props) {
  return (
    <Html>
      <Head>
        <Font fontFamily="Arial" fallbackFontFamily="Helvetica" />
        <style>{`
          @media only screen and (max-width: 600px) {
            .desktop-image {
              display: none !important;
            }
            .mobile-image {
              display: block !important;
              text-align: center !important;
              margin-bottom: 16px !important;
            }
            .content-column {
              padding-left: 0px !important;
            }
          }
          .mobile-image {
            display: none;
          }
        `}</style>
      </Head>
      <Body>
        <Preview>
          Your {offerName} offer has been released and sparks have been added to
          your balance.
        </Preview>

        <Container
          style={{
            backgroundColor: colors.primary,
            width: '100%',
            padding: '40px',
            borderRadius: '0px 0px 10px 10px',
          }}
        >
          <Row>
            <Column>
              <Img
                src="https://sparkvey.com/img/logotype.svg"
                alt="Sparkvey Logo"
                height={40}
              />
            </Column>
          </Row>
          <Row>
            <Heading
              as="h1"
              style={{
                color: 'white',
                fontSize: '2em',
                fontWeight: '400',
                margin: '20px 0px 0px 0px',
                textAlign: 'left',
              }}
            >
              Offer Released
            </Heading>
          </Row>
        </Container>

        <Container
          style={{
            padding: '20px',
          }}
        >
          {offerImageUrl ? (
            <Row className="mobile-image">
              <Column>
                <Img
                  src={offerImageUrl}
                  alt={offerName}
                  width={140}
                  style={{
                    borderRadius: '8px',
                    display: 'block',
                    margin: '0 auto',
                  }}
                />
              </Column>
            </Row>
          ) : null}
          <Row
            style={{
              verticalAlign: 'middle',
            }}
          >
            {offerImageUrl ? (
              <Column
                className="desktop-image"
                style={{
                  paddingRight: '16px',
                  textAlign: 'left',
                  width: '160px',
                }}
              >
                <Img
                  src={offerImageUrl}
                  alt={offerName}
                  width={140}
                  style={{
                    borderRadius: '8px',
                    display: 'inline-block',
                  }}
                />
              </Column>
            ) : null}
            <Column
              className="content-column"
              style={{
                paddingLeft: offerImageUrl ? '8px' : '0px',
              }}
            >
              <Heading
                as="h2"
                style={{
                  fontSize: '1.4em',
                  margin: '0px 0px 12px 0px',
                  fontWeight: '600',
                  color: '#222222',
                }}
              >
                {offerName}
              </Heading>
              <Text
                style={{
                  margin: '0px 0px 12px 0px',
                  lineHeight: '1.5',
                }}
              >
                Great news! We&apos;ve finished verifying this offer and
                released the sparks to your account.
              </Text>
              <Text
                style={{
                  margin: '0px',
                  lineHeight: '1.5',
                }}
              >
                <strong>Offer amount credited:</strong> {offerAmount}
              </Text>
              <Text
                style={{
                  margin: '4px 0px 0px 0px',
                  lineHeight: '1.5',
                }}
              >
                <strong>Released on:</strong> {releaseDate}
              </Text>
            </Column>
          </Row>
          <Row>
            <Column>
              <Text
                style={{
                  margin: '20px 0px 0px 0px',
                  lineHeight: '1.5',
                }}
              >
                You can view the full details in your Sparkvey account. Keep the
                streak going to unlock more rewards.
              </Text>
            </Column>
          </Row>
        </Container>

        <Container
          style={{
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
              <Text
                style={{
                  margin: '10px 0px 0px 0px',
                }}
              >
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
              <Text
                style={{
                  margin: '10px 0px 0px 0px',
                }}
              >
                30 N Gould St, STE R, Sheridan, WY 82801, USA
                | support@sparkvey.com | © Sparkable LLC, All rights reserved
              </Text>
            </Column>
          </Row>
        </Container>
      </Body>
    </Html>
  );
}
