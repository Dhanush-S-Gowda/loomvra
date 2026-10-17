import { useState, useRef, useEffect, useCallback, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { downloadProjectExport } from '@/lib/api';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Presentation,
  FileText,
  FileDown,
  ArrowRight,
  Monitor,
  ChevronLeft,
  ChevronRight,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import { AIChatPanel } from './AIChatPanel';
import { toast } from 'sonner';

const SLIDE_WIDTH = 1280;
const SLIDE_HEIGHT = 720;

function ScaledSlide({
  html,
  className,
  interactive = true,
  fit = 'width',
  scale: controlledScale,
  iframeRef: externalIframeRef,
}) {
  const wrapperRef = useRef(null);
  const localIframeRef = useRef(null);
  const iframeRef = externalIframeRef || localIframeRef;
  const [autoScale, setAutoScale] = useState(1);

  useEffect(() => {
    if (!iframeRef.current || !html) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  useEffect(() => {
    if (controlledScale !== undefined || !wrapperRef.current) return;
    const update = () => {
      const rect = wrapperRef.current.getBoundingClientRect();
      const scaleW = rect.width / SLIDE_WIDTH;
      const scaleH = rect.height / SLIDE_HEIGHT;
      setAutoScale(fit === 'contain' ? Math.min(scaleW, scaleH) : scaleW);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [fit, controlledScale]);

  const scale = controlledScale !== undefined ? controlledScale : autoScale;
  const isContain = fit === 'contain';
  const isControlled = controlledScale !== undefined;

  return (
    <div
      ref={wrapperRef}
      className={`relative ${isControlled ? '' : 'overflow-hidden'} ${className}`}
      style={{
        ...(!isContain && !isControlled
          ? { aspectRatio: `${SLIDE_WIDTH}/${SLIDE_HEIGHT}` }
          : {}),
        ...(isControlled
          ? { width: SLIDE_WIDTH * scale, height: SLIDE_HEIGHT * scale }
          : {}),
      }}
    >
      {/* Static frame: border stays crisp at 1px and exactly wraps the scaled slide */}
      <div className="absolute inset-0 overflow-hidden rounded-[3px] border border-border">
        <iframe
          ref={iframeRef}
          title="slide"
          className={`absolute ${interactive ? '' : 'pointer-events-none'}`}
          style={{
            width: SLIDE_WIDTH,
            height: SLIDE_HEIGHT,
            transform:
              isContain && !isControlled
                ? `translate(-50%, -50%) scale(${scale})`
                : `scale(${scale})`,
            transformOrigin: isContain && !isControlled ? 'center center' : 'top left',
            left: isContain && !isControlled ? '50%' : '0',
            top: isContain && !isControlled ? '50%' : '0',
          }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}

const SlideThumbnail = forwardRef(function SlideThumbnail(
  { slide, index, isActive, onClick, className },
  ref
) {
  return (
    <div
      ref={ref}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group relative rounded-lg border-2 transition-all overflow-hidden bg-card select-none cursor-pointer shrink-0 ${
        isActive
          ? 'border-primary ring-1 ring-primary'
          : 'border-transparent hover:border-muted-foreground/30'
      } ${className || 'w-full'}`}
    >
      <ScaledSlide html={slide?.content} className="w-full" interactive={false} />
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-muted-foreground bg-background/80 px-1.5 rounded select-none">
        {index + 1}
      </div>
    </div>
  );
});

function SlideViewer({ slide, zoom, onZoomIn, onZoomOut, className, style, iframeRef }) {
  const containerRef = useRef(null);
  const [baseScale, setBaseScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      const rect = containerRef.current.getBoundingClientRect();
      const pad = 48; // p-6 = 24px * 2
      const scaleW = (rect.width - pad) / SLIDE_WIDTH;
      const scaleH = (rect.height - pad) / SLIDE_HEIGHT;
      setBaseScale(Math.min(scaleW, scaleH));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const finalScale = baseScale * zoom;

  return (
    <div className={`relative flex-1 overflow-hidden ${className || ''}`} style={style}>
      <div ref={containerRef} className="absolute inset-0 overflow-auto p-6">
        <div className="flex min-w-full min-h-full">
          <ScaledSlide
            html={slide?.content}
            className="shrink-0 m-auto"
            fit="contain"
            scale={finalScale}
            iframeRef={iframeRef}
          />
        </div>
      </div>

      {/* Zoom controls */}
      <div className="absolute bottom-4 right-4 flex items-center bg-background/90 backdrop-blur border rounded-lg shadow-sm overflow-hidden z-10">
        <button
          onClick={onZoomOut}
          className="px-3 py-2 hover:bg-muted text-sm font-medium flex items-center justify-center"
          aria-label="Zoom out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="px-3 py-2 text-sm font-medium border-x min-w-[3rem] text-center tabular-nums">
          {Math.round(zoom * 100)}
        </div>
        <button
          onClick={onZoomIn}
          className="px-3 py-2 hover:bg-muted text-sm font-medium flex items-center justify-center"
          aria-label="Zoom in"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function EndScreen() {
  return (
    <div className="w-full h-full bg-presentation flex flex-col items-center justify-center text-presentation-foreground">
      <p className="text-3xl font-semibold mb-4">End of Presentation</p>
      <p className="text-presentation-foreground/60 text-lg">Press ESC to exit</p>
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
      className="fixed inset-0 z-50 bg-presentation text-presentation-foreground flex flex-col items-center justify-center"
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
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-presentation-foreground/10 hover:bg-presentation-foreground/20 disabled:opacity-30 disabled:hover:bg-presentation-foreground/10 text-presentation-foreground transition"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button
          onClick={goNext}
          disabled={isLast}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-presentation-foreground/10 hover:bg-presentation-foreground/20 disabled:opacity-30 disabled:hover:bg-presentation-foreground/10 text-presentation-foreground transition"
        >
          <ChevronRight className="w-8 h-8" />
        </button>

        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-linear-to-b from-overlay/60 to-transparent">
          <span className="text-presentation-foreground/80 text-sm font-medium">
            {currentIndex < slides.length
              ? `Slide ${currentIndex + 1} / ${slides.length}`
              : 'End'}
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-presentation-foreground/10 hover:bg-presentation-foreground/20 text-presentation-foreground transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Bottom hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-presentation-foreground/50 text-sm flex items-center gap-2">
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
  const [zoom, setZoom] = useState(1);
  const [editedState, setEditedState] = useState(null);
  const [exporting, setExporting] = useState(null);
  const slides = editedState?.source === data ? editedState.slides : data?.slides || [];
  const projectTitle = data?.name || data?.project?.title || data?.projectId || 'Untitled Project';
  const activeThumbRef = useRef(null);
  const activeSlideFrameRef = useRef(null);
  const [isSelectingSlideImage, setIsSelectingSlideImage] = useState(false);
  const [selectedSlideImage, setSelectedSlideImage] = useState(null);

  useEffect(() => {
    if (!isSelectingSlideImage) return undefined;
    const doc = activeSlideFrameRef.current?.contentDocument;
    if (!doc) return undefined;

    const hoverStyle = doc.createElement('style');
    doc.documentElement.style.setProperty(
      '--brand-green',
      getComputedStyle(document.documentElement).getPropertyValue('--brand-green').trim()
    );
    hoverStyle.textContent = `
      body { cursor: crosshair !important; }
      img[data-ai-reference-hover] { outline: 3px solid var(--brand-green) !important; outline-offset: 2px; cursor: crosshair !important; }
    `;
    doc.head.appendChild(hoverStyle);
    let hoveredImage = null;
    const clearHighlight = () => {
      if (hoveredImage) hoveredImage.removeAttribute('data-ai-reference-hover');
      hoveredImage = null;
    };
    const handleMouseOver = (event) => {
      const image = event.target.closest?.('img');
      if (image === hoveredImage) return;
      clearHighlight();
      hoveredImage = image;
      hoveredImage?.setAttribute('data-ai-reference-hover', 'true');
    };
    const handleClick = (event) => {
      const image = event.target.closest?.('img');
      if (!image) return;
      event.preventDefault();
      event.stopPropagation();
      setSelectedSlideImage({
        src: image.currentSrc || image.src,
        alt: image.alt || '',
        slideNumber: activeIndex + 1,
      });
      setIsSelectingSlideImage(false);
    };
    doc.addEventListener('mouseover', handleMouseOver, true);
    doc.addEventListener('click', handleClick, true);
    return () => {
      doc.removeEventListener('mouseover', handleMouseOver, true);
      doc.removeEventListener('click', handleClick, true);
      clearHighlight();
      hoverStyle.remove();
    };
  }, [isSelectingSlideImage, activeIndex, slides[activeIndex]?.content]);

  const captureCurrentSlide = useCallback(async () => {
    const doc = activeSlideFrameRef.current?.contentDocument;
    if (!doc?.documentElement) throw new Error('The current slide is not ready to capture.');
    const serializer = new XMLSerializer();
    const styles = [...doc.querySelectorAll('style')]
      .map((style) => serializer.serializeToString(style))
      .join('');
    const body = doc.body ? serializer.serializeToString(doc.body) : '';
    const markup = `${styles}${body}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SLIDE_WIDTH}" height="${SLIDE_HEIGHT}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${SLIDE_WIDTH}px;height:${SLIDE_HEIGHT}px;overflow:hidden">${markup}</div></foreignObject></svg>`;
    const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    try {
      const image = new Image();
      image.src = svgUrl;
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error('The current slide could not be rendered as an image.'));
      });
      const canvas = document.createElement('canvas');
      canvas.width = SLIDE_WIDTH;
      canvas.height = SLIDE_HEIGHT;
      canvas.getContext('2d').drawImage(image, 0, 0, SLIDE_WIDTH, SLIDE_HEIGHT);
      return canvas.toDataURL('image/png');
    } finally {
      URL.revokeObjectURL(svgUrl);
    }
  }, []);

  const activeSlide = slides[activeIndex];

  const handleSlidesUpdated = useCallback((changes) => {
    if (!changes.length) return;
    setEditedState((current) => {
      const next = [...(current?.source === data ? current.slides : data?.slides || [])];
      for (const change of changes) {
        const index = next.findIndex((slide) => slide.index === change.slideNumber);
        if (index >= 0) next[index] = { ...next[index], content: change.content };
      }
      return { source: data, slides: next };
    });
  }, [data]);

  // Keep active thumbnail visible
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activeIndex]);

  // Arrow key navigation outside presentation mode
  useEffect(() => {
    function handleKeyDown(e) {
      if (presenting) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(slides.length - 1, i + 1));
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slides.length, presenting]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));

  const handleExport = async (format) => {
    try {
      setExporting(format);
      await downloadProjectExport(data.projectId, format);
    } catch (error) {
      toast.error(error.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="grid h-full bg-background grid-rows-[auto_1fr_auto] grid-cols-[1fr_auto]"
      >
        {/* Top bar */}
        <div className="col-span-full flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <Monitor className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold tracking-tight">{projectTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
              <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setPresenting(true)}>
                  <Presentation className="w-4 h-4 mr-2" />
                  Present
                </Button>
              </TooltipTrigger>
              <TooltipContent>Start presentation</TooltipContent>
            </Tooltip>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" disabled={Boolean(exporting)}>
                  {exporting ? `Exporting ${exporting.toUpperCase()}…` : 'Export'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="mr-2 h-4 w-4" /> Export PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pptx')}>
                  <FileDown className="mr-2 h-4 w-4" /> Export PowerPoint
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main slide viewer */}
        <SlideViewer
          slide={activeSlide}
          zoom={zoom}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          iframeRef={activeSlideFrameRef}
          style={{ background: 'var(--preview-bg)' }}
        />

        {/* AI Chat Panel — right sidebar (fixed narrow width, collapses to a slim rail) */}
        <div className="col-start-2 row-span-2 w-fit overflow-hidden border-l bg-background flex flex-col">
          <AIChatPanel
            projectId={data?.projectId}
            slideCount={slides.length}
            onSlidesUpdated={handleSlidesUpdated}
            onCaptureCurrentSlide={captureCurrentSlide}
            onImageReferenceModeChange={setIsSelectingSlideImage}
            selectedSlideImage={selectedSlideImage}
            isSelectingImageReference={isSelectingSlideImage}
          />
        </div>

        {/* Bottom thumbnail panel */}
        <div
          className="flex items-center gap-4 px-4 py-2 border-t overflow-hidden"
          style={{ background: 'var(--preview-thumb-bg)' }}
        >
          <div className="shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Slides
          </div>
          <div className="flex-1 overflow-x-auto min-w-0">
            <div className="flex gap-3 py-1">
              {slides.map((slide, idx) => (
                <SlideThumbnail
                  key={slide.index ?? idx}
                  ref={idx === activeIndex ? activeThumbRef : null}
                  slide={slide}
                  index={idx}
                  isActive={idx === activeIndex}
                  onClick={() => setActiveIndex(idx)}
                  className="w-36"
                />
              ))}
            </div>
          </div>
        </div>

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
