import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from "react-router";
import DesignPlan from '@/components/DesignPlan';
import GridLoadingScreen, { GridPulse } from '@/components/GridLoadingScreen';
import PreviewGenerated from '@/components/PreviewGenerated';
import { fetchProjectAPI } from '@/lib/mockApi';
import { retryDesign, retrySlides } from '@/lib/api';
import { TriangleAlert, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";

function LiveSlidePreview({ slide }) {
  const previewRef = useRef(null);
  const [scale, setScale] = useState(0.4);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return undefined;
    const resize = () => setScale(preview.clientWidth / 1280);
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(preview);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={previewRef}
      role="img"
      aria-label={slide ? `Blurred live preview of generated slide ${slide.index}` : "Preview of the first generated slide"}
      className="generated-slide-enter relative aspect-video w-full max-w-[520px] overflow-hidden rounded-2xl border border-border/70 bg-muted/50 shadow-2xl shadow-primary/10"
    >
      {slide?.content ? (
        <iframe
          title={`Live preview of generated slide ${slide.index}`}
          srcDoc={slide.content}
          sandbox=""
          tabIndex={-1}
          className="pointer-events-none absolute left-0 top-0 h-[720px] w-[1280px] origin-top-left blur-[2px] opacity-80"
          style={{ transform: `scale(${scale})` }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/15 via-background to-primary/5">
          <span className="rounded-full border border-border/70 bg-background/70 px-4 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
            Your first slide will appear here
          </span>
        </div>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-br from-background/10 via-transparent to-primary/10" />
    </div>
  );
}

function SlidesProcessingAnimation({ progress = 0, progressMessage, slides = [] }) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const safeProgress = Math.max(0, Math.min(100, Number(progress) || 0));
  const slideMatch = progressMessage?.match(/slide\s+(\d+)\s+of\s+(\d+)/i);
  const currentSlide = slideMatch ? Number(slideMatch[1]) : null;
  const totalSlides = slideMatch ? Number(slideMatch[2]) : null;
  const activeSlide = slides[activeSlideIndex] ?? slides[0];

  useEffect(() => {
    if (!slides.length) {
      setActiveSlideIndex(0);
      return undefined;
    }
    setActiveSlideIndex((index) => index % slides.length);
    if (slides.length < 2) return undefined;
    const interval = setInterval(() => {
      setActiveSlideIndex((index) => (index + 1) % slides.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="relative flex h-full min-h-[440px] flex-col items-center justify-center overflow-hidden px-6 pb-32 pt-12 sm:px-10">
      <div className="mb-5 text-center">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-primary/80">Building your presentation</p>
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Crafting your slides</h2>
        <p className="mt-2 text-sm text-muted-foreground">New pages join the preview as they are finished.</p>
      </div>

      <GridPulse size="medium" className="my-5" />

      <div className="relative flex w-full justify-center px-4 py-2">
        <div aria-hidden="true" className="absolute inset-x-1/4 inset-y-8 rounded-full bg-primary/15 blur-3xl" />
        <LiveSlidePreview key={activeSlide?.index ?? activeSlideIndex} slide={activeSlide} />
      </div>
      <div aria-live="polite" className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        {currentSlide && totalSlides
          ? slides.length
            ? `Previewing slide ${activeSlide?.index ?? activeSlideIndex + 1} of ${slides.length} ready · crafting slide ${currentSlide} of ${totalSlides}`
            : `Crafting slide ${currentSlide} of ${totalSlides}`
          : slides.length ? `Previewing slide ${activeSlide?.index ?? activeSlideIndex + 1} of ${slides.length} · crafting the next one` : "Preparing your first slide"}
      </div>

      <div className="absolute inset-x-0 bottom-0 border-t border-border/70 bg-background/90 px-6 pb-7 pt-5 backdrop-blur-sm sm:px-10">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>{progressMessage || "Preparing your slides"}</span>
          <span className="tabular-nums">{safeProgress}%</span>
        </div>
        <div className="mx-auto mt-2.5 h-1.5 w-full max-w-3xl overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out" style={{ width: `${safeProgress}%` }} />
        </div>
      </div>
    </div>
  );
}

/* ─── Project page ─── */

function Project() {
  const { pid } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pollingRef = useRef(null);
  const pollImpl = useRef(null);

  // Set up the poll implementation once
  useEffect(() => {
    pollImpl.current = (id, cancelledRef) => {
      fetchProjectAPI(id)
        .then((res) => {
          if (cancelledRef?.current) return;
          setData(res);
          setLoading(false);
          setError(null);

          if (
            res.state === "design_processing" ||
            res.state === "slides_processing"
          ) {
            pollingRef.current = setTimeout(
              () => pollImpl.current?.(id, cancelledRef),
              2000
            );
          } else {
            if (pollingRef.current) {
              clearTimeout(pollingRef.current);
              pollingRef.current = null;
            }
          }
        })
        .catch((err) => {
          if (cancelledRef?.current) return;
          setError(err.message);
          setLoading(false);
          if (pollingRef.current) {
            clearTimeout(pollingRef.current);
            pollingRef.current = null;
          }
        });
    };
  }, []);

  const poll = useCallback((id, cancelledRef) => {
    pollImpl.current?.(id, cancelledRef);
  }, []);

  useEffect(() => {
    let cancelled = { current: false };

    const startPoll = () => {
      if (cancelled.current) return;
      setLoading(true);
      setData(null);
      setError(null);
      poll(pid, cancelled);
    };

    startPoll();
    return () => {
      cancelled.current = true;
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, [pid, poll]);

  const handleRetryDesign = async () => {
    try {
      toast.info("Retrying design generation…");
      await retryDesign(pid);
      setLoading(true);
      poll(pid, { current: false });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleRetrySlides = async () => {
    try {
      toast.info("Retrying slide generation…");
      await retrySlides(pid);
      setLoading(true);
      poll(pid, { current: false });
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading && !data) {
    return (
      <GridLoadingScreen
        eyebrow="Opening project"
        title="Loading project"
        subtitle="Getting your presentation ready."
        showProgress={false}
      />
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 gap-4">
        <TriangleAlert className="w-12 h-12 text-destructive" />
        <span className="text-destructive text-lg font-medium">Failed to load project</span>
        <span className="text-muted-foreground text-sm">{error}</span>
        <Button variant="outline" onClick={() => { setLoading(true); poll(pid, { current: false }); }}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <span className="text-muted-foreground">No data found.</span>
      </div>
    );
  }

  // ── Design processing ──
  if (data.state === "design_processing" || data.state === "design_pending") {
    return (
      <GridLoadingScreen
        title="Designing your presentation"
        subtitle="Choosing a visual direction and shaping the slide plan."
        progress={data.progress}
        progressMessage={data.progressMessage}
        progressLabel="Design plan generation progress"
      />
    );
  }

  // ── Design failed ──
  if (data.state === "design_failed") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 gap-4">
        <TriangleAlert className="w-12 h-12 text-destructive" />
        <span className="text-destructive text-lg font-medium">Design generation failed</span>
        <span className="text-muted-foreground text-sm max-w-md text-center">
          {data.error || "Something went wrong while generating the design plan."}
        </span>
        <div className="flex gap-3 mt-2">
          <Button onClick={handleRetryDesign}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Design
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/")}>
            New Project
          </Button>
        </div>
      </div>
    );
  }

  // ── Design ready (show design plan) ──
  if (data.state === "design") {
    return <DesignPlan data={data} projectId={pid} />;
  }

  // ── Slides processing ──
  if (data.state === "slides_processing" || data.state === "slides_pending") {
    return (
      <SlidesProcessingAnimation
        progress={data.progress}
        progressMessage={data.progressMessage}
        slides={data.slides || []}
      />
    );
  }

  // ── Slides failed ──
  if (data.state === "slides_failed") {
    return (
      <div className="flex flex-col items-center justify-center h-full p-10 gap-4">
        <TriangleAlert className="w-12 h-12 text-destructive" />
        <span className="text-destructive text-lg font-medium">Slide generation failed</span>
        <span className="text-muted-foreground text-sm max-w-md text-center">
          {data.error || "Something went wrong while generating slides."}
        </span>
        <div className="flex gap-3 mt-2">
          <Button onClick={handleRetrySlides}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Slides
          </Button>
        </div>
      </div>
    );
  }

  // ── Generated (slides ready) ──
  if (data.state === "generated") {
    return <PreviewGenerated data={data} />;
  }

  // ── Unknown state ──
  return (
    <div className="flex flex-col justify-center h-full">
      <div className="flex flex-col items-center justify-center h-full text-destructive">
        <div className='flex items-center justify-center pb-2'>
          <TriangleAlert className="inline-block mr-2" />
          <span className='text-2xl'>Error from server</span>
        </div>
        <div className='text-foreground'>Unknown keyword: {data.state}</div>
      </div>
    </div>
  );
}

export default Project;
