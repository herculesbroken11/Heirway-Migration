import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useForceLightMode } from '@/hooks/useForceLightMode';
import heirwayLogo from '@/assets/heirway-logo-transparent.png';

export default function PrivacyPolicy() {
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
        <h1 className="text-2xl font-display font-bold text-foreground">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm">Effective Date: 03/11/2026 · Last Updated: 03/11/2026</p>

        <p className="text-foreground/80 mt-4">
          At Heirway ("we," "our," "us"), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services. Please read this Privacy Policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the Site or use our Services.
        </p>

        <h2 className="text-lg font-semibold mt-8">1. Information We Collect</h2>
        <p className="text-foreground/80">We may collect information about you in a variety of ways. The information we may collect on the Site includes:</p>
        <p className="text-foreground/80"><strong>Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us when you register with the Site or our Services or when you choose to participate in various activities related to the Site and our Services, such as online chat and message boards.</p>
        <p className="text-foreground/80"><strong>Derivative Data:</strong> Information our servers automatically collect when you access the Site, such as your IP address, your browser type, your operating system, your access times, and the pages you have viewed directly before and after accessing the Site.</p>
        <p className="text-foreground/80"><strong>Financial Data:</strong> Financial information, such as data related to your payment method (e.g., valid credit card number, card brand, expiration date) that we may collect when you purchase, order, return, exchange, or request information about our services from the Site. We store only very limited, if any, financial information that we collect. Otherwise, our payment processor stores all financial information, and you are encouraged to review their privacy policy and contact them directly for responses to your questions.</p>
        <p className="text-foreground/80"><strong>Mobile Device Data:</strong> Device information, such as your mobile device ID, model, and manufacturer, and information about the location of your device, if you access the Site from a mobile device.</p>

        <h2 className="text-lg font-semibold mt-6">2. Use of Your Information</h2>
        <p className="text-foreground/80">Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:</p>
        <ul className="text-foreground/80 list-disc pl-6 space-y-1">
          <li>Create and manage your account.</li>
          <li>Process your transactions and send you related information, including purchase confirmations and invoices.</li>
          <li>Manage and respond to your inquiries or requests.</li>
          <li>Personalize your experience and deliver content and product and service offerings relevant to your interests.</li>
          <li>Improve our Site and Services.</li>
          <li>Administer promotions, surveys, and other Site features.</li>
          <li>Communicate with you, including sending you notices about your account or transactions, updates, and promotional materials.</li>
          <li>Detect, prevent, and address technical issues.</li>
          <li>Monitor and analyze trends, usage, and activities in connection with our Site and Services.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">3. Disclosure of Your Information</h2>
        <p className="text-foreground/80">We may share information we have collected about you in certain situations. Your information may be disclosed as follows:</p>
        <p className="text-foreground/80"><strong>By Law or to Protect Rights:</strong> If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.</p>
        <p className="text-foreground/80"><strong>Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.</p>
        <p className="text-foreground/80"><strong>Business Transfers:</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</p>
        <p className="text-foreground/80"><strong>Affiliates:</strong> We may share your information with our affiliates, in which case we will require those affiliates to honor this Privacy Policy.</p>
        <p className="text-foreground/80"><strong>Other Third Parties:</strong> We may share your information with advertisers and investors for the purpose of conducting general business analysis. We may also share your information with such third parties for marketing purposes, as permitted by law.</p>

        <h2 className="text-lg font-semibold mt-6">4. Security of Your Information</h2>
        <p className="text-foreground/80">We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other types of misuse.</p>

        <h2 className="text-lg font-semibold mt-6">5. Policy for Children</h2>
        <p className="text-foreground/80">We do not knowingly solicit information from or market to children under the age of 13. If we learn that we have collected personal information from a child under age 13 without verification of parental consent, we will delete that information as quickly as possible. If you believe we might have any information from or about a child under 13, please contact us at info@assetsmartconsulting.com.</p>

        <h2 className="text-lg font-semibold mt-6">6. Your Privacy Rights</h2>
        <p className="text-foreground/80">You have certain rights regarding your personal information, subject to local data protection laws. These may include the rights to:</p>
        <ul className="text-foreground/80 list-disc pl-6 space-y-1">
          <li>Access your personal information.</li>
          <li>Correct the information we hold about you.</li>
          <li>Delete your personal information.</li>
          <li>Restrict our use of your personal information.</li>
          <li>Object to our use of your personal information.</li>
          <li>Withdraw your consent for the use of your personal information.</li>
        </ul>
        <p className="text-foreground/80">To exercise any of these rights, please contact us at info@assetsmartconsulting.com.</p>

        <h2 className="text-lg font-semibold mt-6">7. Contact Us</h2>
        <p className="text-foreground/80">
          If you have questions or comments about this Privacy Policy, please contact us at:<br />
          Heirway<br />
          info@assetsmartconsulting.com<br />
          507-50 ASSET
        </p>
      </main>
    </div>
  );
}
