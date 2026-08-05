import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from "react-router";
import DesignPlan from '@/components/DesignPlan';
import PreviewGenerated from '@/components/PreviewGenerated';
import { fetchProjectAPI } from '@/lib/mockApi';
import { retryDesign, retrySlides } from '@/lib/api';
import { TriangleAlert, Loader2, Palette, Layers, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from "sonner";

/* ─── Processing animation phrases ─── */

const DESIGN_PHRASES = [
  "Analyzing your project description…",
  "Brainstorming visual concepts…",
  "Selecting color palette & typography…",
  "Crafting slide layouts…",
  "Polishing the design plan…",
];

const SLIDES_PHRASES = [
  "Reading the design plan…",
  "Generating slide content…",
  "Applying visual styles…",
  "Assembling HTML slides…",
  "Final touches…",
];

/* ─── Processing animation component ─── */

function ProcessingAnimation({ phrases, icon: Icon, title, subtitle }) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [phrases]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-10">
      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
        <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-primary/5 border-2 border-primary/20">
          <Icon className="w-10 h-10 text-primary animate-pulse" />
        </div>
      </div>
      <h2 className="text-2xl font-semibold tracking-tight mb-2">{title}</h2>
      <p className="text-muted-foreground mb-8">{subtitle}</p>

      <div className="max-w-md w-full space-y-3">
        {phrases.map((phrase, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-700 ${
              idx === phraseIndex
                ? "bg-primary/10 text-foreground font-medium scale-100 opacity-100"
                : "text-muted-foreground/50 scale-95 opacity-40"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full transition-all duration-700 ${
                idx === phraseIndex ? "bg-primary scale-125" : "bg-muted-foreground/30"
              }`}
            />
            <span className="text-sm">{phrase}</span>
          </div>
        ))}
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
      <div className="flex items-center justify-center h-full p-10">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="text-muted-foreground animate-pulse">Loading project…</span>
        </div>
      </div>
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
      <ProcessingAnimation
        phrases={DESIGN_PHRASES}
        icon={Palette}
        title="Designing your presentation"
        subtitle="Our AI is crafting a custom design plan for your project"
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
      <ProcessingAnimation
        phrases={SLIDES_PHRASES}
        icon={Layers}
        title="Crafting your slides"
        subtitle="Generating beautiful, content-rich slides from your design plan"
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
