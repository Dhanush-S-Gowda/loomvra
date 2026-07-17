import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowRight, CircleQuestionMark } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

function NewProject() {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Base background */}
      <div className="absolute inset-0 bg-background" />

      {/* Grainy textured overlay - stronger */}
      <div
        className="absolute inset-0 opacity-40 dark:opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px 256px',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Gradient blobs - positioned behind content */}
      {/* Top-left blob - Warm coral/peach */}
      <div
        className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-[140px] opacity-60 dark:opacity-45"
        style={{
          background: 'radial-gradient(circle, var(--blob-coral) 0%, transparent 70%)',
        }}
      />

      {/* Top-right blob - Soft purple/indigo */}
      <div
        className="absolute -top-20 -right-32 w-[550px] h-[550px] rounded-full blur-[130px] opacity-55 dark:opacity-40"
        style={{
          background: 'radial-gradient(circle, var(--blob-purple) 0%, transparent 70%)',
        }}
      />

      {/* Bottom-right blob - Teal/cyan accent */}
      <div
        className="absolute -bottom-20 -right-20 w-[500px] h-[500px] rounded-full blur-[140px] opacity-50 dark:opacity-35"
        style={{
          background: 'radial-gradient(circle, var(--blob-teal) 0%, transparent 70%)',
        }}
      />

      {/* Bottom-left blob - Soft amber/gold */}
      <div
        className="absolute -bottom-32 -left-20 w-[450px] h-[450px] rounded-full blur-[120px] opacity-45 dark:opacity-30"
        style={{
          background: 'radial-gradient(circle, var(--blob-amber) 0%, transparent 70%)',
        }}
      />

      {/* Center blob - subtle warm glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full blur-[180px] opacity-30 dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, var(--blob-purple) 0%, var(--blob-coral) 50%, transparent 70%)',
        }}
      />

      {/* Main content - centered vertically and horizontally */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="w-full max-w-2xl space-y-10">
          {/* Welcome heading with Instrument Serif */}
          <h1 className="font-serif text-6xl md:text-7xl lg:text-8xl font-normal text-foreground tracking-tight">
            Welcome John.
          </h1>

          {/* Form section */}
          <div className="space-y-8">
            {/* Project name input */}
            <div className="space-y-3">
              <label
                htmlFor="project-name"
                className="flex items-center text-sm font-medium text-muted-foreground uppercase tracking-wider"
              >
                <span>
                What do you want to call your project?
                </span>
                <Tooltip>
                  <TooltipTrigger className="ml-2">
                    <CircleQuestionMark className="w-3.5 h-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This name will be used to identify your project only. PPT title will be generated automatically.</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Input
                id="project-name"
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter your project name"
                className="h-14 text-lg bg-background/30 backdrop-blur-md border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all"
              />
            </div>

            {/* Description textarea */}
            <div className="space-y-3">
              <label
                htmlFor="description"
                className="flex items-center text-sm font-medium text-muted-foreground uppercase tracking-wider"
              >
                <span>
                What do you wanna build?
                </span>
                <Tooltip>
                  <TooltipTrigger className="ml-2">
                    <CircleQuestionMark className="w-3.5 h-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Give as much context as possible to help the AI generate a PPT title.<br />You can specify number of slides and key points to include in the PPT.</p>
                  </TooltipContent>
                </Tooltip>
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project idea..."
                className="min-h-[200px] text-base bg-background/30 backdrop-blur-md border-border/60 focus:border-primary/50 focus:ring-primary/20 resize-y overflow-auto transition-all"
              />
            </div>

            {/* Start crafting button */}
            <div className="flex justify-center pt-4">
              <Button
                size="lg"
                className="group gap-3 px-8 py-6 text-lg font-medium hover:scale-105 hover:shadow-lg transition-all duration-300 ease-out rounded-xl"
              >
                Start crafting
                <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewProject;
