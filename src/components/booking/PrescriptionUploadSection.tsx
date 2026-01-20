import { Upload, Camera, Image as ImageIcon, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';
import MobileAuthModal from '@/components/auth/MobileAuthModal';

const PrescriptionUploadSection = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
      if (!isValid) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported format. Please upload images or PDFs.`,
          variant: "destructive",
        });
      }
      return isValid;
    });

    if (validFiles.length === 0) return;

    setSelectedFiles(prev => [...prev, ...validFiles]);

    // Generate previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviews(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    toast({
      title: "Files selected",
      description: `${validFiles.length} file(s) ready to upload`,
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleBrowseClick = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to upload prescriptions',
      });
      setShowAuthModal(true);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to upload prescriptions',
      });
      setShowAuthModal(true);
      return;
    }
    cameraInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    // Here you would implement the actual upload logic
    toast({
      title: "Upload successful",
      description: `${selectedFiles.length} file(s) uploaded successfully`,
    });

    // Scroll to cart section
    const cartElement = document.querySelector('[data-cart]');
    if (cartElement) {
      cartElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Clear files
    setSelectedFiles([]);
    setPreviews([]);
  };

  return (
    <section 
      data-prescription-upload
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
    >
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="w-full h-full object-cover"
        >
          <source src="/prescription-video.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60"></div>
      </div>

      <div className="container relative z-10 mx-auto px-4 sm:px-6 py-20">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
              Upload Your Prescription
            </h2>
            <p className="text-base text-white/90 max-w-2xl mx-auto">
              Have a prescription from your doctor? Upload it here and we'll help you book the required tests.
            </p>
          </div>

          {/* Desktop/Tablet: Drag & Drop */}
          {!isMobile && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`rounded-2xl p-12 transition-all duration-200 ${
                isDragging
                  ? 'bg-white/10 scale-105'
                  : 'bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <Upload className="w-12 h-12 text-white/80" />
                <div>
                  <p className="text-base font-semibold text-white mb-2">
                    Drag & drop your prescription here
                  </p>
                  <p className="text-sm text-white/80 mb-4">
                    or
                  </p>
                  <Button
                    onClick={handleBrowseClick}
                    variant="outline"
                    className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white text-sm"
                  >
                    <FileText className="w-4 h-4" />
                    Browse Files
                  </Button>
                </div>
                <p className="text-xs text-white/70">
                  Supported formats: JPG, PNG, PDF (Max 10MB each)
                </p>
              </div>
            </div>
          )}

          {/* Mobile: Camera & Gallery Options */}
          {isMobile && (
            <div className="flex flex-col gap-4">
              <Button
                onClick={handleCameraClick}
                size="lg"
                className="w-full h-16 gap-3 text-sm bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
                variant="outline"
              >
                <Camera className="w-6 h-6" />
                Take Photo with Camera
              </Button>
              <Button
                onClick={handleBrowseClick}
                size="lg"
                className="w-full h-16 gap-3 text-sm bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white"
                variant="outline"
              >
                <ImageIcon className="w-6 h-6" />
                Choose from Gallery
              </Button>
              <p className="text-xs text-center text-white/70">
                Supported formats: JPG, PNG, PDF
              </p>
            </div>
          )}

          {/* Preview Selected Files */}
          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-white">Selected Files ({selectedFiles.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="relative group rounded-lg overflow-hidden border-2 border-white/30 bg-white/10 aspect-square"
                  >
                    {file.type.startsWith('image/') ? (
                      <img
                        src={previews[index]}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-white/5">
                        <FileText className="w-12 h-12 text-white/80 mb-2" />
                        <p className="text-xs text-center px-2 text-white/70 truncate w-full">
                          {file.name}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={`Remove ${file.name}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleUpload}
                  className="flex-1 gap-2 bg-white text-black hover:bg-white/90 text-sm"
                  size="lg"
                >
                  <Upload className="w-5 h-5" />
                  {user ? 'Upload Prescription' : 'Sign in to Upload'}
                </Button>
                <Button
                  onClick={() => {
                    setSelectedFiles([]);
                    setPreviews([]);
                  }}
                  variant="outline"
                  size="lg"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white text-sm"
                >
                  Clear All
                </Button>
              </div>
            </div>
          )}

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Auth Modal */}
      <MobileAuthModal 
        open={showAuthModal} 
        onOpenChange={setShowAuthModal} 
      />
    </section>
  );
};

export default PrescriptionUploadSection;
