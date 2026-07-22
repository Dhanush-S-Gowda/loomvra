import { useState, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Upload, ImageIcon, X, Loader2, ArrowLeft } from 'lucide-react';

const PEXELS_API_KEY = import.meta.env.VITE_PEXELS_API_KEY;
const PEXELS_API_URL = 'https://api.pexels.com/v1/search';

export default function ImagePickerDialog({ open, onOpenChange, onSelect }) {
  const [activeTab, setActiveTab] = useState('upload');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const fileInputRef = useRef(null);

  const resetState = useCallback(() => {
    setActiveTab('upload');
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    setUploadPreview(null);
    setIsDragging(false);
    setPreviewPhoto(null);
  }, []);

  const handleClose = (openState) => {
    if (!openState) {
      resetState();
    }
    onOpenChange(openState);
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      alert('Please select a JPEG or PNG image.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setUploadPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleConfirmUpload = () => {
    if (uploadPreview) {
      onSelect(uploadPreview);
      resetState();
      onOpenChange(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    setPreviewPhoto(null);
    try {
      const response = await fetch(
        `${PEXELS_API_URL}?query=${encodeURIComponent(searchQuery.trim())}&per_page=24`,
        {
          headers: {
            Authorization: PEXELS_API_KEY,
          },
        }
      );
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        }
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your .env configuration.');
        }
        throw new Error('Failed to fetch images from Pexels.');
      }
      const data = await response.json();
      setSearchResults(data.photos || []);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelectPexelsImage = (photo) => {
    onSelect(photo.src.large || photo.src.original);
    resetState();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="flex flex-col p-0 gap-0 overflow-hidden"
        style={{ maxWidth: '70vw', width: '70vw', maxHeight: '90vh' }}
      >
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Add Image</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b px-6">
          <button
            onClick={() => {
              setActiveTab('upload');
              setPreviewPhoto(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'upload'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="size-4" />
            Upload
          </button>
          <button
            onClick={() => {
              setActiveTab('search');
              setPreviewPhoto(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'search'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Search className="size-4" />
            Search Pexels
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[320px]">
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {!uploadPreview ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors ${
                    isDragging
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-center size-12 rounded-full bg-muted">
                    <ImageIcon className="size-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">
                      Drag & drop an image here
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      or click to browse
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Supports JPEG, PNG
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files[0])}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden ring-1 ring-border mx-auto max-w-lg">
                    <img
                      src={uploadPreview}
                      alt="Upload preview"
                      className="w-full h-auto max-h-[400px] object-contain"
                    />
                    <button
                      onClick={() => setUploadPreview(null)}
                      className="absolute top-2 right-2 flex items-center justify-center size-7 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="flex justify-center gap-2">
                    <Button variant="outline" onClick={() => setUploadPreview(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleConfirmUpload}>Use this image</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'search' && (
            <div className="space-y-4">
              {previewPhoto ? (
                <div className="space-y-4">
                  <button
                    onClick={() => setPreviewPhoto(null)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="size-4" />
                    Back to results
                  </button>
                  <div className="rounded-xl overflow-hidden ring-1 ring-border mx-auto">
                    <img
                      src={previewPhoto.src.large2x || previewPhoto.src.large || previewPhoto.src.original}
                      alt={previewPhoto.alt || 'Preview'}
                      className="w-full h-auto max-h-[60vh] object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Photo by{' '}
                      <a
                        href={previewPhoto.photographer_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        {previewPhoto.photographer}
                      </a>{' '}
                      on{' '}
                      <a
                        href="https://www.pexels.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        Pexels
                      </a>
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setPreviewPhoto(null)}>
                        Cancel
                      </Button>
                      <Button onClick={() => handleSelectPexelsImage(previewPhoto)}>
                        Use this image
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search for images..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching || !searchQuery.trim()}
                      className="gap-2"
                    >
                      {isSearching ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Search className="size-4" />
                      )}
                      Search
                    </Button>
                  </div>

                  {searchError && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                      {searchError}
                    </div>
                  )}

                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                        {searchResults.map((photo) => (
                          <button
                            key={photo.id}
                            onClick={() => setPreviewPhoto(photo)}
                            className="group relative aspect-square overflow-hidden rounded-lg ring-1 ring-border hover:ring-primary/50 transition-all focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <img
                              src={photo.src.medium}
                              alt={photo.alt || 'Pexels image'}
                              className="h-full w-full object-cover transition-transform group-hover:scale-105"
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform bg-black/60 px-2 py-1">
                              <p className="text-[10px] text-white truncate">
                                {photo.photographer}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Photos provided by{' '}
                        <a
                          href="https://www.pexels.com"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground"
                        >
                          Pexels
                        </a>
                      </p>
                    </div>
                  )}

                  {!isSearching && !searchError && searchResults.length === 0 && searchQuery && (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      No results found. Try a different search term.
                    </div>
                  )}

                  {!searchQuery && !isSearching && searchResults.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      Enter a search term to find images from Pexels.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
