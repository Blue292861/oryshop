import { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  isAppReady: boolean;
}

const SplashScreen = ({ onComplete, isAppReady }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    // Preload the image
    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.src = '/lovable-uploads/5b0b265a-94d3-4527-9e7f-d4e08446e2b1.png';

    // Ensure minimum display time of 1.5 seconds
    const minTimer = setTimeout(() => setMinTimeElapsed(true), 1500);
    return () => clearTimeout(minTimer);
  }, []);

  useEffect(() => {
    if (!isLoaded || !isAppReady || !minTimeElapsed) return;

    // Start fade out when everything is ready
    setIsVisible(false);
    const timer = setTimeout(onComplete, 600); // Wait for fade out animation to complete

    return () => clearTimeout(timer);
  }, [isLoaded, isAppReady, minTimeElapsed, onComplete]);

  if (!isLoaded) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <img 
        src="/lovable-uploads/5b0b265a-94d3-4527-9e7f-d4e08446e2b1.png" 
        alt="Neptune Group Logo"
        className="max-w-md w-full h-auto animate-fade-in"
      />
    </div>
  );
};

export default SplashScreen;