import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';

export default function TermsOfService() {
  useForceLightMode();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center gap-4">
        <Link to="/heirway" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </Link>
        <img src={heirwayLogo} alt="Heirway" className="h-10 w-auto" />
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 prose prose-sm">
        <h1 className="text-2xl font-display font-bold text-foreground">Terms of Service</h1>
        <p className="text-muted-foreground text-sm">Effective Date: 03/11/2026 · Last Updated: 03/11/2026</p>

        <p className="text-foreground/80 mt-4">
          Welcome to Heirway. These Terms of Service govern your access to and use of our website and services. By accessing or using our Site and Services, you agree to be bound by these Terms. If you do not agree with these Terms, please do not use our Site or Services.
        </p>

        <h2 className="text-lg font-semibold mt-8">1. Acceptance of Terms</h2>
        <p className="text-foreground/80">By using our Site or Services, you affirm that you are at least 18 years old and capable of entering into a legally binding agreement. If you are using our Site or Services on behalf of an entity, you represent and warrant that you have the authority to bind that entity to these Terms.</p>

        <h2 className="text-lg font-semibold mt-6">2. Modifications to Terms</h2>
        <p className="text-foreground/80">We reserve the right to modify these Terms at any time. We will notify you of any changes by posting the new Terms on our Site. You are advised to review these Terms periodically for any changes. Your continued use of the Site or Services following the posting of any changes constitutes acceptance of those changes.</p>

        <h2 className="text-lg font-semibold mt-6">3. Privacy Policy</h2>
        <p className="text-foreground/80">Your use of our Site and Services is also governed by our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. Please review our Privacy Policy to understand our practices regarding your personal data.</p>

        <h2 className="text-lg font-semibold mt-6">4. Use of Services</h2>
        <p className="text-foreground/80">You agree to use our Site and Services only for lawful purposes and in accordance with these Terms. You are prohibited from using our Site and Services to:</p>
        <ul className="text-foreground/80 list-disc pl-6 space-y-1">
          <li>Engage in any unlawful activity.</li>
          <li>Transmit any harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable material.</li>
          <li>Violate the rights of others, including but not limited to intellectual property rights.</li>
          <li>Interfere with or disrupt the operation of our Site or Services.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">5. Account Registration</h2>
        <p className="text-foreground/80">To access certain features of our Services, you may be required to create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete. You are responsible for safeguarding your account password and for any activities or actions under your account.</p>

        <h2 className="text-lg font-semibold mt-6">6. Intellectual Property</h2>
        <p className="text-foreground/80">All content, trademarks, service marks, trade names, logos, and icons are proprietary to Heirway or its licensors. You agree not to copy, reproduce, modify, create derivative works from, or otherwise exploit any part of our Site or Services without our prior written consent.</p>

        <h2 className="text-lg font-semibold mt-6">7. Third-Party Links</h2>
        <p className="text-foreground/80">Our Site and Services may contain links to third-party websites or services that are not owned or controlled by Heirway. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party websites or services.</p>

        <h2 className="text-lg font-semibold mt-6">8. Disclaimer of Warranties</h2>
        <p className="text-foreground/80">Our Site and Services are provided "as is" and "as available" without any warranties of any kind, whether express or implied. Heirway disclaims all warranties, including but not limited to, implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</p>

        <h2 className="text-lg font-semibold mt-6">9. Limitation of Liability</h2>
        <p className="text-foreground/80">To the maximum extent permitted by applicable law, Heirway shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses, resulting from (i) your use or inability to use the Site or Services; (ii) any unauthorized access to or use of our servers and/or any personal information stored therein; (iii) any interruption or cessation of transmission to or from our Site or Services.</p>

        <h2 className="text-lg font-semibold mt-6">10. Indemnification</h2>
        <p className="text-foreground/80">You agree to defend, indemnify, and hold harmless Heirway, its affiliates, and their respective officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including, without limitation, reasonable legal and accounting fees, arising out of or in any way connected with your access to or use of the Site or Services, or your violation of these Terms.</p>

        <h2 className="text-lg font-semibold mt-6">11. Governing Law</h2>
        <p className="text-foreground/80">These Terms shall be governed and construed in accordance with the laws of the court of equity, without regard to its conflict of law provisions.</p>

        <h2 className="text-lg font-semibold mt-6">12. Contact Us</h2>
        <p className="text-foreground/80">
          If you have any questions about these Terms, please contact us at:<br />
          Heirway<br />
          info@assetsmartconsulting.com<br />
          507-50 ASSET
        </p>
      </main>
    </div>
  );
}
