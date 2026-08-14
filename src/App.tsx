import { Toaster } from "@/components/ui/toaster";
import HeirwayCheckout from "./pages/HeirwayCheckout";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import AdminHeirway from "./pages/AdminHeirway";
import AdminClientDetail from "./pages/AdminClientDetail";
import Dashboard from "./pages/Dashboard";
import NewAssessment from "./pages/NewAssessment";
import AssessmentResults from "./pages/AssessmentResults";
import AssessmentsList from "./pages/AssessmentsList";
import ProspectsList from "./pages/ProspectsList";
import ProspectDetail from "./pages/ProspectDetail";
import PublicAssessment from "./pages/PublicAssessment";
import AssessmentComplete from "./pages/AssessmentComplete";
import HeirwayLanding from "./pages/HeirwayLanding";
import HeirwayAbout from "./pages/HeirwayAbout";
import HeirwayPricing from "./pages/HeirwayPricing";
import HeirwayQuiz from "./pages/HeirwayQuiz";
import HeirwayRecommendation from "./pages/HeirwayRecommendation";
import HeirwayQuizResults from "./pages/HeirwayQuizResults";
import HeirwayDashboard from "./pages/HeirwayDashboard";
import HeirwayMessages from "./pages/HeirwayMessages";
import HeirwayTrustMap from "./pages/HeirwayTrustMap";
import HeirwayLearning from "./pages/HeirwayLearning";
import HeirwayDocuments from "./pages/HeirwayDocuments";
import HeirwayIntake from "./pages/HeirwayIntake";
import ResetPassword from "./pages/ResetPassword";
import HeirwaySettings from "./pages/HeirwaySettings";
import HeirwayMemberPortal from "./pages/HeirwayMemberPortal";
import HeirwayFamilyGovernance from "./pages/HeirwayFamilyGovernance";
import HeirwayBeneficiaryProfile from "./pages/HeirwayBeneficiaryProfile";
import HeirwayMeetingRequest from "./pages/HeirwayMeetingRequest";
import HeirwayOnboardingCall from "./pages/HeirwayOnboardingCall";
import HeirwayKnowledgebase from "./pages/HeirwayKnowledgebase";
import HeirwayPayoff from "./pages/HeirwayPayoff";
import HeirwayTrustQuestionnaire from "./pages/HeirwayTrustQuestionnaire";
import HeirwaySuccessorVault from "./pages/HeirwaySuccessorVault";
import EmailVerification from "./pages/EmailVerification";
import SetPassword from "./pages/SetPassword";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Public routes */}
          <Route path="/diagnostic" element={<PublicAssessment />} />
          <Route path="/diagnostic/complete" element={<AssessmentComplete />} />
          
          {/* Unified login & public pages */}
          <Route path="/heirway" element={<HeirwayLanding />} />
          <Route path="/heirway/about" element={<HeirwayAbout />} />
          <Route path="/about" element={<Navigate to="/heirway/about" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/heirway/signup" element={<Navigate to="/login" replace />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/email-verification" element={<EmailVerification />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/heirway/pricing" element={<HeirwayPricing />} />
          <Route path="/heirway/quiz" element={<HeirwayQuiz />} />
          <Route path="/heirway/recommendation" element={<HeirwayRecommendation />} />
          <Route path="/heirway/quiz-results" element={<HeirwayQuizResults />} />
          <Route path="/heirway/trust-questionnaire" element={<ProtectedRoute><HeirwayTrustQuestionnaire /></ProtectedRoute>} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          
          {/* Protected client routes */}
          <Route path="/heirway/intake" element={<ProtectedRoute><HeirwayIntake /></ProtectedRoute>} />
          <Route path="/heirway/enhance" element={<Navigate to="/heirway/checkout" replace />} />
          <Route path="/heirway/checkout" element={<ProtectedRoute><HeirwayCheckout /></ProtectedRoute>} />
          <Route path="/heirway/meeting-request" element={<HeirwayMeetingRequest />} />
          <Route path="/heirway/onboarding-call" element={<ProtectedRoute><HeirwayOnboardingCall /></ProtectedRoute>} />
          <Route path="/heirway/dashboard" element={<ProtectedRoute><HeirwayDashboard /></ProtectedRoute>} />
          <Route path="/heirway/messages" element={<ProtectedRoute><HeirwayMessages /></ProtectedRoute>} />
          <Route path="/heirway/trust-map" element={<ProtectedRoute><HeirwayTrustMap /></ProtectedRoute>} />
          <Route path="/heirway/learning" element={<ProtectedRoute><HeirwayLearning /></ProtectedRoute>} />
          <Route path="/heirway/documents" element={<ProtectedRoute><HeirwayDocuments /></ProtectedRoute>} />
          <Route path="/heirway/settings" element={<ProtectedRoute><HeirwaySettings /></ProtectedRoute>} />
          <Route path="/heirway/member-portal" element={<ProtectedRoute><HeirwayMemberPortal /></ProtectedRoute>} />
          <Route path="/heirway/family-governance" element={<ProtectedRoute><HeirwayFamilyGovernance /></ProtectedRoute>} />
          <Route path="/heirway/family-governance/:beneficiaryName" element={<ProtectedRoute><HeirwayBeneficiaryProfile /></ProtectedRoute>} />
          <Route path="/heirway/knowledgebase" element={<ProtectedRoute><HeirwayKnowledgebase /></ProtectedRoute>} />
          <Route path="/heirway/payoff" element={<ProtectedRoute><HeirwayPayoff /></ProtectedRoute>} />
          <Route path="/heirway/successor-vault" element={<ProtectedRoute><HeirwaySuccessorVault /></ProtectedRoute>} />
          
          {/* Admin routes */}
          <Route path="/" element={<HeirwayLanding />} />
          <Route path="/admin/heirway" element={<ProtectedRoute requireAdmin><AdminHeirway /></ProtectedRoute>} />
          <Route path="/admin/heirway/client/:clientId" element={<ProtectedRoute requireAdmin><AdminClientDetail /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute requireAdmin><Dashboard /></ProtectedRoute>} />
          <Route path="/assessment/new" element={<ProtectedRoute requireAdmin><NewAssessment /></ProtectedRoute>} />
          <Route path="/assessment/:id/results" element={<ProtectedRoute requireAdmin><AssessmentResults /></ProtectedRoute>} />
          <Route path="/assessments" element={<ProtectedRoute requireAdmin><AssessmentsList /></ProtectedRoute>} />
          <Route path="/prospects" element={<ProtectedRoute requireAdmin><ProspectsList /></ProtectedRoute>} />
          <Route path="/prospects/:id" element={<ProtectedRoute requireAdmin><ProspectDetail /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
