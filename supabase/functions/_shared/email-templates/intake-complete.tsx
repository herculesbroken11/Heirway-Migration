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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface IntakeCompleteEmailProps {
  fullName: string
  siteUrl: string
}

export const IntakeCompleteEmail = ({
  fullName,
  siteUrl,
}: IntakeCompleteEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your intake is complete — here's what happens next</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://aepubshqohzdgpclltqb.supabase.co/storage/v1/object/public/email-assets/heirway-logo.png"
          alt="Heirway"
          width="140"
          height="auto"
          style={logo}
        />
        <Heading style={h1}>Intake Complete!</Heading>
        <Text style={text}>
          Great work, {fullName || 'there'}! You've completed your intake questionnaire. Our team will review your information and begin preparing your estate plan.
        </Text>
        <Text style={text}>
          <strong>What happens next:</strong>
        </Text>
        <Text style={listItem}>1. Our team reviews your intake details</Text>
        <Text style={listItem}>2. We'll prepare your trust templates</Text>
        <Text style={listItem}>3. You'll be notified when templates are ready for review</Text>
        <Button style={button} href={`${siteUrl}/login?mode=login`}>
          View Your Dashboard
        </Button>
        <Text style={footer}>
          You'll receive updates as your plan progresses. Questions? Reach out through your dashboard.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default IntakeCompleteEmail

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
