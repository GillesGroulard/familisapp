import React, { useState } from 'react';
import { Gift } from 'lucide-react';

interface GiftBoxAnimationProps {
  onOpen: () => void;
}

export const GiftBoxAnimation: React.FC<GiftBoxAnimationProps> = ({ onOpen }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isOpening, setIsOpening] = useState(false);

  const handleClick = () => {
    setIsOpening(true);
    setTimeout(() => {
      setIsVisible(false);
      onOpen();
    }, 800);
  };

  return isVisible ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75">
      <div 
        className={`transform ${isOpening ? 'animate-bounce-out' : 'animate-bounce-in'}`}
      >
        <button
          onClick={handleClick}
          className="bg-primary-500 text-white p-8 rounded-2xl shadow-lg
            transform transition-transform hover:scale-110
            flex flex-col items-center gap-4
            animate-float"
        >
          <Gift className="w-16 h-16" />
          <div className="text-center">
            <div className="text-2xl font-bold mb-2">Nouvelle photo !</div>
            <div className="text-lg">Appuyer pour voir</div>
          </div>
        </button>
      </div>
    </div>
  ) : null;
}
