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
  Hr,
} from '@react-email/components';

const colors = {
  primary: '#5045d2',
  textLight: '#b6b6b6',
};

type Props = {
  confirmLink: string,
};

export default function ConfirmEmailChange({ confirmLink }: Props) {
  return (
    <Html>
      <Head>
        <Font fontFamily="Arial" fallbackFontFamily="Helvetica" />
      </Head>
      <Body>
        <Preview>Confirm your new Sparkvey email address.</Preview>

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
              Confirm email change
            </Heading>
          </Row>
        </Container>

        <Container style={{ padding: '20px' }}>
          <Row>
            <Column>
              <Text>
                Someone requested to use this email for a Sparkvey account. Confirm the change by clicking the button below.
              </Text>
            </Column>
          </Row>
          <Row style={{ margin: '20px 0px' }}>
            <Column>
              <Link
                href={confirmLink}
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
                Confirm new email
              </Link>
            </Column>
          </Row>
        </Container>

        <Container style={{ padding: '0px 20px 20px 20px', color: colors.textLight }}>
          <Hr style={{ borderColor: colors.textLight, borderWidth: '1px', margin: '0px 0px 20px 0px' }} />
          <Row>
            <Column>
              <Text style={{ margin: '10px 0px 0px 0px' }}>
                If you didn&apos;t request this, you can ignore this email.
              </Text>
            </Column>
          </Row>
        </Container>
      </Body>
    </Html>
  );
}
