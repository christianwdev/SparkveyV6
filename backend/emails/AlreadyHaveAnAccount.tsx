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
  redirectURL: string;
};

export default function AlreadyHaveAnAccount(
  {
    redirectURL,
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
        <Preview>You already have an account with us, if you forgot your password you can click the link below to reset it.</Preview>

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
              You already have an account with us
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
                You attempted to sign up when you already have an account with us. If you need to reset your password click the link below.
              </Text>
            </Column>
          </Row>
          <Row
            style={{
              margin: '20px 0px',
            }}
          >
            <Column>
              <Link
                href={redirectURL}
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
                Reset your Password
              </Link>
            </Column>
          </Row>
          <Row>
            <Column>
              <Text>
                If this wasn&apos;t you requesting to register an account please ignore this email and delete it.
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