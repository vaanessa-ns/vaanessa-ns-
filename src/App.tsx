import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { QuickAddModal } from './components/QuickAddModal';
import { PinLockScreen } from './components/PinLockScreen';
import { OnboardingModal } from './components/OnboardingModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { AuthModal } from './components/AuthModal';
import { ConnectBankModal } from './components/ConnectBankModal';

// Views
import { DashboardView } from './views/DashboardView';
import { TransactionsView } from './views/TransactionsView';
import { FixedBillsView } from './views/FixedBillsView';
import { CreditCardsView } from './views/CreditCardsView';
import { GoalsView } from './views/GoalsView';
import { BudgetsView } from './views/BudgetsView';
import { AccountsView } from './views/AccountsView';
import { CalendarView } from './views/CalendarView';
import { DebtsView } from './views/DebtsView';
import { AiAdvisorView } from './views/AiAdvisorView';
import { ProfileView } from './views/ProfileView';

const MainLayout: React.FC = () => {
  const {
    activeTab,
    isPinLocked,
    user,
    isQuickAddOpen,
    setIsQuickAddOpen,
    quickAddDefaultType,
    isAuthModalOpen,
    setIsAuthModalOpen,
    isConnectBankOpen,
    setIsConnectBankOpen,
  } = useFinance();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(!user.onboarded);

  // If locked by PIN
  if (isPinLocked) {
    return <PinLockScreen />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'transactions':
        return <TransactionsView />;
      case 'bills':
        return <FixedBillsView />;
      case 'cards':
        return <CreditCardsView />;
      case 'goals':
        return <GoalsView />;
      case 'budgets':
        return <BudgetsView />;
      case 'accounts':
        return <AccountsView />;
      case 'calendar':
        return <CalendarView />;
      case 'debts':
        return <DebtsView />;
      case 'ai-advisor':
        return <AiAdvisorView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0A0A0B] text-slate-900 dark:text-slate-200 flex flex-col font-sans transition-colors duration-200 selection:bg-emerald-500 selection:text-black">
      {/* App Header */}
      <Header onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Navigation Top Tabs (Desktop) */}
      <Navigation />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-12">
        {renderActiveView()}
      </main>

      {/* Global Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        initialTab={quickAddDefaultType}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Supabase Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Open Finance Connect Bank Modal */}
      <ConnectBankModal
        isOpen={isConnectBankOpen}
        onClose={() => setIsConnectBankOpen(false)}
      />

      {/* Onboarding Wizard (first run) */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <MainLayout />
      </FinanceProvider>
    </AuthProvider>
  );
}
