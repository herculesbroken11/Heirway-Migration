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

interface MeetingRequestConfirmationEmailProps {
  fullName: string
  requestType: string
  siteUrl: string
}

export const MeetingRequestConfirmationEmail = ({
  fullName,
  requestType,
  siteUrl,
}: MeetingRequestConfirmationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your meeting request has been received</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://aepubshqohzdgpclltqb.supabase.co/storage/v1/object/public/email-assets/heirway-logo.png"
          alt="Heirway"
          width="140"
          height="auto"
          style={logo}
        />
        <Heading style={h1}>Meeting Request Received</Heading>
        <Text style={text}>
          Hi {fullName || 'there'}, we've received your <strong>{requestType || 'meeting'}</strong> request.
        </Text>
        <Text style={text}>
          Our team will review your request and reach out to schedule a time that works for you. 
          Most requests are responded to within 1–2 business days.
        </Text>
        <Button style={button} href={`${siteUrl}/login?mode=login`}>
          Track Your Request
        </Button>
        <Text style={footer}>
          You'll receive a notification when your request is updated.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MeetingRequestConfirmationEmail

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
