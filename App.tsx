import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { CameraRig } from './components/CameraRig';
import { Polaroid, PhotoData } from './components/Polaroid';
import { generatePhotoCaption } from './services/geminiService';

const App: React.FC = () => {
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [topZIndex, setTopZIndex] = useState(60); // Start above camera (50) when dragged

  const handleTakePhoto = useCallback(async (imageData: string) => {
    setIsProcessing(true);
    
    const newId = uuidv4();
    const timestamp = new Date().toLocaleDateString(navigator.language, {
      year: '2-digit',
      month: 'short',
      day: 'numeric'
    });

    // 1. Create the photo object
    // Initial position: Ejecting from top of camera. 
    // Camera is at bottom: 64px, left: 64px. Size 450x450.
    const startX = 64 + (450 / 2) - (240 / 2); // Center of camera horizontally
    const startY = window.innerHeight - 64 - 450 + 50; // Slightly inside the top of the camera

    const newPhoto: PhotoData = {
      id: newId,
      imageData,
      caption: '',
      timestamp,
      x: startX,
      y: startY,
      rotation: (Math.random() * 6) - 3, // Slight random tilt
      isDeveloped: false,
      zIndex: 40, // Start behind camera (z-50)
    };

    // Add to state immediately to show ejection
    setPhotos(prev => [...prev, newPhoto]);

    // 2. Animate Ejection
    setTimeout(() => {
      setPhotos(prev => prev.map(p => 
        p.id === newId ? { ...p, y: startY - 300 } : p
      ));
    }, 50);

    setIsProcessing(false);

    // 3. Call AI for Caption
    // Strip data URI prefix for API
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const caption = await generatePhotoCaption(base64Data, navigator.language);

    // Update photo with caption
    setPhotos(prev => prev.map(p => 
      p.id === newId ? { ...p, caption } : p
    ));

  }, []);

  const handleRegenerateCaption = async (id: string) => {
    const photo = photos.find(p => p.id === id);
    if (!photo) return;

    // Set temporary loading state
    updatePhoto(id, { caption: "Thinking..." });

    try {
      const base64Data = photo.imageData.replace(/^data:image\/\w+;base64,/, "");
      const newCaption = await generatePhotoCaption(base64Data, navigator.language);
      updatePhoto(id, { caption: newCaption });
    } catch (e) {
      updatePhoto(id, { caption: "Could not think of anything..." });
    }
  };

  const updatePhoto = (id: string, updates: Partial<PhotoData>) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleDragStart = (id: string) => {
    setTopZIndex(prev => prev + 1);
    updatePhoto(id, { zIndex: topZIndex + 1 });
  };

  return (
    <div className="w-screen h-screen relative overflow-hidden text-gray-800">
      
      {/* App Title */}
      <div className="absolute top-8 left-0 right-0 text-center pointer-events-none z-10">
        <h1 className="font-handwritten text-6xl font-bold text-[#2c2c2c] drop-shadow-md">
          Bao Retro Camera
        </h1>
      </div>

      {/* Instructions */}
      <div className="fixed bottom-8 right-8 w-64 text-right font-handwritten text-xl text-gray-600 pointer-events-none select-none z-10">
        <p className="mb-2">1. Click the button to snap</p>
        <p className="mb-2">2. Wait for it to eject</p>
        <p className="mb-2">3. Drag photo to the wall</p>
        <p>4. Hover text to edit or regenerate</p>
      </div>

      {/* The "Wall" of Photos */}
      {photos.map(photo => (
        <Polaroid
          key={photo.id}
          photo={photo}
          onUpdate={updatePhoto}
          onDelete={deletePhoto}
          onDragStart={handleDragStart}
          onRegenerate={handleRegenerateCaption}
        />
      ))}

      {/* Camera UI */}
      <CameraRig 
        onTakePhoto={handleTakePhoto} 
        isProcessing={isProcessing} 
      />

    </div>
  );
};

export default App;