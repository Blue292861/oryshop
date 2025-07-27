import { useState, useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Preload the image
    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.src = '/lovable-uploads/5b0b265a-94d3-4527-9e7f-d4e08446e2b1.png';
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500); // Wait for fade out animation
    }, 2000); // Show for 2 seconds

    return () => clearTimeout(timer);
  }, [isLoaded, onComplete]);

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