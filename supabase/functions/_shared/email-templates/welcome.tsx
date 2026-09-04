/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface WelcomeEmailProps {
  fullName: string
  siteUrl: string
  loginUrl: string
}

export const WelcomeEmail = ({
  fullName,
  siteUrl,
  loginUrl,
}: WelcomeEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to Heirway — your estate planning journey begins</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://yyypaywmjowbicammdnp.supabase.co/storage/v1/object/public/email-assets/heirway-logo.png"
          alt="Heirway"
          width="140"
          height="auto"
          style={logo}
        />
        <Heading style={h1}>Welcome to Heirway, {fullName || 'there'}!</Heading>
        <Text style={text}>
          Your account has been verified and you're all set to begin your estate planning journey.
        </Text>
        <Text style={text}>
          Here's what you can do next:
        </Text>
        <Text style={listItem}>• <strong>Complete your intake</strong> — Tell us about your family and goals</Text>
        <Text style={listItem}>• <strong>Explore the learning center</strong> — Build your trust knowledge</Text>
        <Text style={listItem}>• <strong>Track your progress</strong> — See your trust milestones</Text>
        <Button style={button} href={loginUrl}>
          Go to Your Dashboard
        </Button>
        <Text style={footer}>
          If you have any questions, our team is here to help.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const logo = { margin: '0 0 24px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#2E3238',
  margin: '0 0 20px',
  fontFamily: "'DM Sans', Arial, sans-serif",
}
const text = {
  fontSize: '15px',
  color: '#676B7E',
  lineHeight: '1.6',
  margin: '0 0 16px',
}
const listItem = {
  fontSize: '15px',
  color: '#676B7E',
  lineHeight: '1.6',
  margin: '0 0 8px',
  paddingLeft: '8px',
}
const button = {
  backgroundColor: '#D4920A',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  marginTop: '8px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
