import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Presentation,
  ArrowRight,
  Monitor,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

function ScaledSlide({ html, className, interactive = true, fit = 'width' }) {
  const wrapperRef = useRef(null);
  const iframeRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!iframeRef.current || !html) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const update = () => {
      const rect = wrapperRef.current.getBoundingClientRect();
      const scaleW = rect.width / SLIDE_WIDTH;
      const scaleH = rect.height / SLIDE_HEIGHT;
      setScale(fit === 'contain' ? Math.min(scaleW, scaleH) : scaleW);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [fit]);

  const isContain = fit === 'contain';

  return (
    <div
      ref={wrapperRef}
      className={`relative overflow-hidden ${className}`}
      style={isContain ? undefined : { aspectRatio: `${SLIDE_WIDTH}/${SLIDE_HEIGHT}` }}
    >
      <iframe
        ref={iframeRef}
        title="slide"
        className={`absolute border-0 ${interactive ? '' : 'pointer-events-none'}`}
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: isContain
            ? `translate(-50%, -50%) scale(${scale})`
            : `scale(${scale})`,
          transformOrigin: isContain ? 'center center' : 'top left',
          left: isContain ? '50%' : '0',
          top: isContain ? '50%' : '0',
        }}
        sandbox="allow-same-origin"
      />
    </div>
  );
}

function SlideThumbnail({ slide, index, isActive, onClick }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative w-full rounded-lg border-2 transition-all overflow-hidden bg-white select-none cursor-pointer ${
        isActive
          ? 'border-primary ring-1 ring-primary'
          : 'border-transparent hover:border-muted-foreground/30'
      }`}
    >
      <ScaledSlide html={slide?.content} className="w-full" interactive={false} />
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground bg-background/80 px-1.5 rounded select-none">
        {index + 1}
      </div>
    </div>
  );
}

function SlideViewer({ slide }) {
  return (
    <div className="flex items-center justify-center bg-muted/30 p-6 overflow-hidden">
      <div className="w-full max-w-5xl h-full flex items-center justify-center">
        <ScaledSlide html={slide?.content} className="w-full h-full" fit="contain" />
      </div>
    </div>
  );
}

function EndScreen() {
  return (
    <div className="w-full h-full bg-black flex flex-col items-center justify-center text-white">
      <p className="text-3xl font-semibold mb-4">End of Presentation</p>
      <p className="text-white/60 text-lg">Press ESC to exit</p>
    </div>
  );
}

function PresentationMode({ slides, startIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(startIndex);
  const containerRef = useRef(null);
  const totalSlides = slides.length + 1; // +1 for end screen

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(totalSlides - 1, i + 1));
  }, [totalSlides]);

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        goPrev();
      } else if (e.key === 'ArrowRight') {
        goNext();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goPrev, goNext, onClose]);

  useEffect(() => {
    if (containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {});
    }
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        onClose();
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onClose]);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSlides - 1;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center"
    >
      <div className="relative w-full h-full flex items-center justify-center">
        {/* Slide container with aspect ratio preservation */}
        <div
          className="relative w-full"
          style={{
            maxWidth: `calc(100vh * ${SLIDE_WIDTH} / ${SLIDE_HEIGHT})`,
            aspectRatio: `${SLIDE_WIDTH}/${SLIDE_HEIGHT}`,
          }}
        >
          {currentIndex < slides.length ? (
            <ScaledSlide html={slides[currentIndex]?.content} className="w-full h-full" />
          ) : (
            <EndScreen />
          )}
        </div>

        {/* Navigation overlays */}
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white transition"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button
          onClick={goNext}
          disabled={isLast}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 text-white transition"
        >
          <ChevronRight className="w-8 h-8" />
        </button>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-linear-to-b from-black/60 to-transparent">
          <span className="text-white/80 text-sm font-medium">
            {currentIndex < slides.length
              ? `Slide ${currentIndex + 1} / ${slides.length}`
              : 'End'}
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 text-sm flex items-center gap-2">
          <span>Use arrow keys to navigate</span>
          <span className="mx-1">|</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
}

function PreviewGenerated({ data }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [presenting, setPresenting] = useState(false);
  const slides = data?.slides || [];
  const projectTitle = data?.project?.title || 'Untitled Project';

  const activeSlide = slides[activeIndex];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-[16rem_1fr] grid-rows-[auto_1fr] h-full bg-background">
        {/* Top bar */}
        <div className="col-span-2 flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold tracking-tight">{projectTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPresenting(true)}
                >
                  <Presentation className="w-4 h-4 mr-2" />
                  Present
                </Button>
              </TooltipTrigger>
              <TooltipContent>Start presentation</TooltipContent>
            </Tooltip>
            <Button size="sm">
              Export
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Left thumbnail panel */}
        <div className="flex flex-col border-r bg-muted/20 overflow-hidden">
          <div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider shrink-0">
            Slides
          </div>
          <Separator className="shrink-0" />
          <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3">
            <div className="space-y-3">
              {slides.map((slide, idx) => (
                <SlideThumbnail
                  key={slide.index ?? idx}
                  slide={slide}
                  index={idx}
                  isActive={idx === activeIndex}
                  onClick={() => setActiveIndex(idx)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Main slide viewer */}
        <SlideViewer slide={activeSlide} />

        {/* Presentation mode */}
        {presenting && (
          <PresentationMode
            slides={slides}
            startIndex={activeIndex}
            onClose={() => setPresenting(false)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

export default PreviewGenerated;
