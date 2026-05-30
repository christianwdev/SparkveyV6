import {
  Html,
  Font,
  Body,
  Preview,
  Container,
  Row,
  Column,
  Text,
  Img,
  Heading,
  Head,
  Link,
  Hr
} from '@react-email/components';

const colors = {
  primary: '#5045d2',
  textLight: '#b6b6b6',
};

type Props = {
  verifyLink: string;
};

export default function VerifyEmail(
  {
    verifyLink,
  }: Props,
) {
  return (
    <Html>
      <Head>
        <Font
          fontFamily="Arial"
          fallbackFontFamily="Helvetica"
        />
      </Head>
      <Body>
        <Preview>Thanks for creating an account on Sparkvey, before you get started you need to verify your email.</Preview>

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
              Verify your email
            </Heading>
          </Row>
        </Container>

        <Container
          style={{
            padding: '20px 20px 20px 20px',
          }}
        >
          <Row>
            <Column>
              <Text>
              Thanks for registering on Sparkvey, all that&apos;s left for you to do is confirm your account by clicking the button below.</Text>
            </Column>
          </Row>
          <Row
            style={{
              margin: '20px 0px',
            }}
          >
            <Column>
              <Link
                href={verifyLink}
                style={{
                  color: 'white',
                  backgroundColor: colors.primary,
                  padding: '16px 24px',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  fontWeight: '600',
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                Verify your Email
              </Link>
            </Column>
          </Row>
          <Row>
            <Column>
              <Text>
              Once you&apos;ve confirmed that this is your email address, you can start earning sparks by playing games, completing tasks, or even earning sparks for shopping at your favorite stores and redeeming your favorite rewards.
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
                If this wasn&apos;t you registering, delete this email and ignore it.
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
                Have a question? Don&apos;t hesitate to <Link href="mailto:support@sparkvey.com" style={{ color: colors.primary }}>email us.</Link>.
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
                30 N Gould St, STE R, Sheridan, WY 82801, USA | support@sparkvey.com | © Sparkable LLC, All rights reserved
              </Text>
            </Column>
          </Row>
        </Container>
      </Body>
    </Html>
  );
}