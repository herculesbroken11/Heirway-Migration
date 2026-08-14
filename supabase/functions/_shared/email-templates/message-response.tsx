/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Img, Preview, Text } from 'npm:@react-email/components@0.0.22'

interface MessageResponseEmailProps {
  fullName?: string
  loginUrl: string
}

export const MessageResponseEmail = ({ fullName, loginUrl }: MessageResponseEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Heirway has responded to your message</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img
          src="https://aepubshqohzdgpclltqb.supabase.co/storage/v1/object/public/email-assets/heirway-logo.png"
          alt="Heirway"
          width="140"
          height="auto"
          style={logo}
        />
        <Heading style={h1}>We responded to your message{fullName ? `, ${fullName}` : ''}.</Heading>
        <Text style={text}>
          The Heirway team has replied to your inquiry. To protect your information, please log in or create your account to view the response in Messages.
        </Text>
        <Button style={button} href={loginUrl}>View Messages</Button>
        <Text style={footer}>If you did not contact Heirway, you can ignore this email.</Text>
      </Container>
    </Body>
  </Html>
)

export default MessageResponseEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '30px 25px' }
const logo = { margin: '0 0 24px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#2E3238', margin: '0 0 20px', fontFamily: "'DM Sans', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#676B7E', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: '#D4920A', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', marginTop: '8px' }
const footer = { fontSize: '12px', color: '#999999', margin: '32px 0 0' }
