import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { FeedScreen } from './screens/FeedScreen';
import { PhotosScreen } from './screens/PhotosScreen';
import { JoinScreen } from './screens/JoinScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SlideshowScreen } from './screens/SlideshowScreen';
import { AuthScreen } from './screens/AuthScreen';
import { FamilySidebar } from './components/FamilySidebar';
import { supabase } from './lib/supabase';
import { useFamilies } from './hooks/useFamilies';

function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [session, setSession] = useState(null);
  const { families } = useFamilies();
  const [currentFamilyId, setCurrentFamilyId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (families.length > 0 && !currentFamilyId) {
      setCurrentFamilyId(families[0].id);
    }
  }, [families]);

  if (!session) {
    return <AuthScreen />;
  }

  const renderScreen = () => {
    switch (activeTab) {
      case 'feed':
        return <FeedScreen familyId={currentFamilyId} />;
      case 'photos':
        return <PhotosScreen />;
      case 'slideshow':
        return <SlideshowScreen familyId={currentFamilyId} setActiveTab={setActiveTab} />;
      case 'join':
        return <JoinScreen onSuccess={() => setActiveTab('feed')} />;
      case 'profile':
        return <ProfileScreen />;
      default:
        return <FeedScreen familyId={currentFamilyId} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {activeTab !== 'slideshow' && <Header currentFamilyId={currentFamilyId} />}
      <div className={activeTab === 'slideshow' ? 'h-screen' : 'pt-16 pb-20'}>
        {(activeTab === 'feed' || activeTab === 'photos') && (
          <FamilySidebar
            currentFamilyId={currentFamilyId}
            onFamilyChange={setCurrentFamilyId}
            onJoinFamily={() => setActiveTab('join')}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        )}
        <main className={`mx-auto max-w-2xl transition-all duration-300 ${
          (activeTab === 'feed' || activeTab === 'photos') && !isSidebarCollapsed 
            ? 'pl-16' 
            : ''
        }`}>
          {renderScreen()}
        </main>
      </div>
      {activeTab !== 'slideshow' && (
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
      )}
    </div>
  );
}

export default App;