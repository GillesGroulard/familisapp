import React from 'react';
import { Home, ImagePlus, Users, UserCircle, PlaySquare } from 'lucide-react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  primary?: boolean;
}

const NavItem = ({ icon, label, active, onClick, primary }: NavItemProps) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center justify-center py-2 transition-colors ${
      primary 
        ? 'flex-1 -mt-6 bg-primary-500 text-white rounded-full mx-4 py-4 shadow-lg hover:bg-primary-600'
        : `flex-1 ${active ? 'text-primary-500' : 'text-gray-500 hover:text-primary-500'}`
    }`}
  >
    <div className={`h-6 w-6 ${primary ? 'scale-110' : ''}`}>{icon}</div>
    <span className={`text-xs mt-1 font-medium ${primary ? 'text-white' : ''}`}>{label}</span>
  </button>
);

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const BottomNav = ({ activeTab, setActiveTab }: BottomNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 pb-safe">
      <div className="flex items-end justify-between">
        <NavItem
          icon={<Home className="w-6 h-6" />}
          label="Feed"
          active={activeTab === 'feed'}
          onClick={() => setActiveTab('feed')}
        />
        <NavItem
          icon={<Users className="w-6 h-6" />}
          label="Paramètre de famille"
          active={activeTab === 'join'}
          onClick={() => setActiveTab('join')}
        />
        <NavItem
          icon={<ImagePlus className="w-6 h-6" />}
          label="Ajouter des Photos"
          active={activeTab === 'photos'}
          onClick={() => setActiveTab('photos')}
          primary
        />
        <NavItem
          icon={<UserCircle className="w-6 h-6" />}
          label="Profil"
          active={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
        />
        <NavItem
          icon={<PlaySquare className="w-6 h-6" />}
          label="Diaporama"
          active={activeTab === 'slideshow'}
          onClick={() => setActiveTab('slideshow')}
        />
      </div>
    </div>
  );
};
