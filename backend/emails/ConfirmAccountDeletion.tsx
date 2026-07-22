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

export default function ConfirmAccountDeletion({ confirmLink }: Props) {
  return (
    <Html>
      <Head>
        <Font fontFamily="Arial" fallbackFontFamily="Helvetica" />
      </Head>
      <Body>
        <Preview>Confirm permanent deletion of your Sparkvey account.</Preview>

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
              Delete your account
            </Heading>
          </Row>
        </Container>

        <Container style={{ padding: '20px' }}>
          <Row>
            <Column>
              <Text>
                You requested to delete your Sparkvey account. This will remove your personal information from the account. Click below to confirm.
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
                Confirm account deletion
              </Link>
            </Column>
          </Row>
          <Row>
            <Column>
              <Text>
                If you did not request this, ignore this email and your account will remain active.
              </Text>
            </Column>
          </Row>
        </Container>

        <Container style={{ padding: '0px 20px 20px 20px', color: colors.textLight }}>
          <Hr style={{ borderColor: colors.textLight, borderWidth: '1px', margin: '0px 0px 20px 0px' }} />
          <Row>
            <Column>
              <Text style={{ margin: '10px 0px 0px 0px' }}>
                Have a question? <Link href="mailto:support@sparkvey.com" style={{ color: colors.primary }}>Email support</Link>.
              </Text>
            </Column>
          </Row>
        </Container>
      </Body>
    </Html>
  );
}