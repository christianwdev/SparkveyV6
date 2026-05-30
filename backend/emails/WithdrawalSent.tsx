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
  withdrawalAmount: string;
  withdrawalMethod: string;
  estimatedArrival?: string;
  tremendousRedeemUrl?: string;
  kinguinKeys?: Array<{
    mimeType: string;
    keyData: string;
  }>;
  kinguinDeliveryState?: 'pending' | 'delivered';
  kinguinDeliveredAt?: string;
};

export default function WithdrawalSentEmail({
  withdrawalAmount,
  withdrawalMethod,
  estimatedArrival,
  tremendousRedeemUrl,
  kinguinKeys = [],
  kinguinDeliveryState,
  kinguinDeliveredAt,
}: Props) {
  const isTremendous = typeof tremendousRedeemUrl === 'string' && tremendousRedeemUrl.length > 0;
  const isKinguinPending = kinguinDeliveryState === 'pending';
  const hasKinguinKeys = kinguinDeliveryState === 'delivered' && kinguinKeys.length > 0;
  const normalizedKeys = kinguinKeys.slice(0, 10).map((key, idx) => {
    const isImage = key.mimeType.startsWith('image/');
    const imageSrc = isImage && !key.keyData.startsWith('data:')
      ? `data:${key.mimeType};base64,${key.keyData}`
      : key.keyData;

    return {
      id: `${idx}-${key.mimeType}`,
      isImage,
      imageSrc,
      mimeType: key.mimeType,
      keyData: key.keyData,
    };
  });

  return (
    <Html>
      <Head>
        <Font fontFamily="Arial" fallbackFontFamily="Helvetica" />
      </Head>
      <Body>
        <Preview>
          Your withdrawal of {withdrawalAmount} via {withdrawalMethod} is on its
          way.
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
              Withdrawal Sent
            </Heading>
          </Row>
        </Container>

        <Container
          style={{
            padding: '20px',
          }}
        >
          <Row>
            <Column>
              <Text
                style={{
                  margin: '0px 0px 12px 0px',
                  lineHeight: '1.5',
                }}
              >
                We&apos;ve processed your withdrawal and it&apos;s now on its
                way to you.
              </Text>
              <Text
                style={{
                  margin: '0px',
                  lineHeight: '1.5',
                }}
              >
                <strong>Amount:</strong> {withdrawalAmount}
              </Text>
              <Text
                style={{
                  margin: '4px 0px 0px 0px',
                  lineHeight: '1.5',
                }}
              >
                <strong>Method:</strong> {withdrawalMethod}
              </Text>
              {estimatedArrival ? (
                <Text
                  style={{
                    margin: '4px 0px 0px 0px',
                    lineHeight: '1.5',
                  }}
                >
                  <strong>Estimated arrival:</strong> {estimatedArrival}
                </Text>
              ) : null}
            </Column>
          </Row>
          {isTremendous ? (
            <Row
              style={{
                margin: '24px 0px 0px 0px',
              }}
            >
              <Column>
                <Link
                  href={tremendousRedeemUrl}
                  style={{
                    color: 'white',
                    backgroundColor: colors.primary,
                    padding: '16px 24px',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    fontWeight: '600',
                    textAlign: 'center',
                    display: 'inline-block',
                    textDecoration: 'none',
                  }}
                >
                  Redeem your reward
                </Link>
                <Text
                  style={{
                    margin: '12px 0px 0px 0px',
                    color: '#555555',
                    fontSize: '0.9em',
                    lineHeight: '1.4',
                  }}
                >
                  Use the link above to access your Tremendous reward and choose
                  how you&apos;d like to receive it.
                </Text>
              </Column>
            </Row>
          ) : null}
          <Row>
            <Column>
              <Text
                style={{
                  margin: '24px 0px 0px 0px',
                  lineHeight: '1.5',
                }}
              >
                If you have any questions about this withdrawal, reply to this
                email and our team will be happy to help.
              </Text>
            </Column>
          </Row>
          {isKinguinPending ? (
            <Row>
              <Column>
                <Text
                  style={{
                    margin: '18px 0px 0px 0px',
                    lineHeight: '1.5',
                  }}
                >
                  Your code delivery is still being processed by our supplier.
                  We&apos;ll automatically email you as soon as your key is ready.
                </Text>
              </Column>
            </Row>
          ) : null}
          {hasKinguinKeys ? (
            <Row>
              <Column>
                <Text
                  style={{
                    margin: '18px 0px 8px 0px',
                    lineHeight: '1.5',
                  }}
                >
                  Your key has been delivered. Please save these details now.
                  {kinguinDeliveredAt ? ` Delivered on ${kinguinDeliveredAt}.` : ''}
                </Text>
                {normalizedKeys.map(key => (
                  <Container
                    key={key.id}
                    style={{
                      border: '1px solid #dddddd',
                      borderRadius: '8px',
                      padding: '12px',
                      margin: '0px 0px 12px 0px',
                    }}
                  >
                    {key.isImage ? (
                      <Img
                        src={key.imageSrc}
                        alt="Delivered key image"
                        style={{
                          maxWidth: '100%',
                          borderRadius: '6px',
                        }}
                      />
                    ) : (
                      <Text
                        style={{
                          margin: '0px',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {key.keyData}
                      </Text>
                    )}
                  </Container>
                ))}
              </Column>
            </Row>
          ) : null}
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
