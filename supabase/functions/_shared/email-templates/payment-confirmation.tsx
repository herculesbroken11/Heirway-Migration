/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface PaymentConfirmationEmailProps {
  fullName: string
  planName: string
  siteUrl: string
}

export const PaymentConfirmationEmail = ({
  fullName,
  planName,
  siteUrl,
}: PaymentConfirmationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Payment confirmed — your {planName} plan is active</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://aepubshqohzdgpclltqb.supabase.co/storage/v1/object/public/email-assets/heirway-logo.png"
          alt="Heirway"
          width="140"
          height="auto"
          style={logo}
        />
        <Heading style={h1}>Payment Confirmed</Heading>
        <Text style={text}>
          Hi {fullName || 'there'}, thank you for your payment! Your <strong>{planName}</strong> plan is now active.
        </Text>
        <Text style={text}>
          Your estate planning team is preparing everything for you. You'll receive updates as your trust templates are being processed.
        </Text>
        <div style={detailsBox}>
          <Text style={detailLabel}>Plan</Text>
          <Text style={detailValue}>{planName}</Text>
          <Text style={detailLabel}>Status</Text>
          <Text style={detailValue}>Active</Text>
        </div>
        <Text style={text}>
          You can view your plan details and track progress anytime from your{' '}
          <Link href={`${siteUrl}/login?mode=login`} style={link}>dashboard</Link>.
        </Text>
        <Text style={footer}>
          This is a confirmation of your payment to Heirway Estate Planning.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default PaymentConfirmationEmail

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
const link = { color: '#D4920A', textDecoration: 'underline' }
const detailsBox = {
  backgroundColor: '#FAF6EE',
  borderRadius: '12px',
  padding: '20px 24px',
  margin: '16px 0 24px',
}
const detailLabel = {
  fontSize: '12px',
  color: '#999999',
  margin: '0 0 2px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
}
const detailValue = {
  fontSize: '16px',
  color: '#2E3238',
  fontWeight: '600' as const,
  margin: '0 0 12px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
