import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { createProject } from '@/lib/api';

function NewProject() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    setSubmitting(true);
    try {
      const result = await createProject(projectName.trim(), description.trim());
      toast.success(result.message || "Project created!");
      navigate(`/dashboard/project/${result.projectId}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative min-h-screen w-full overflow-hidden">
      {/* Base background — same brand language as the home page */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-28 size-96 rounded-full bg-[radial-gradient(circle,var(--blob-coral),transparent_68%)] opacity-30 blur-3xl dark:opacity-20" />
        <div className="absolute right-[-9rem] top-28 size-[32rem] rounded-full bg-[radial-gradient(circle,var(--blob-purple),transparent_68%)] opacity-25 blur-3xl dark:opacity-15" />
        <div className="absolute bottom-[-15rem] left-1/3 size-[34rem] rounded-full bg-[radial-gradient(circle,var(--blob-teal),transparent_68%)] opacity-20 blur-3xl dark:opacity-12" />
        <div className="bg-noise absolute inset-0 opacity-[0.035]" />
      </div>

      {/* Single, focused composer column — left aligned like a document */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-16">
        {/* Eyebrow + heading reuse the home page's exact voice */}
        <p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
          <span className="size-2 rounded-full bg-primary" /> New project
        </p>
        <h1 className="font-heading text-5xl leading-[0.95] tracking-tight sm:text-6xl">
          Describe what you want to <span className="text-primary">say.</span>
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">
          Give it a name and a short brief. We'll turn the direction into a story, then a deck you can edit.
        </p>

        {/* Inputs — no card, no tooltips, just clean fields */}
        <div className="mt-12 space-y-8">
          <div className="space-y-2.5">
            <label
              htmlFor="project-name"
              className="block text-sm font-medium text-foreground"
            >
              Project name
            </label>
            <Input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Q3 Product Strategy Review"
              className="h-12 text-base bg-background/40 backdrop-blur-md border-border/60 focus:border-primary/50 focus:ring-primary/20 transition-all"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2.5">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-foreground"
            >
              What's it about?
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A few sentences on the audience, the key points, and the outcome you want…"
              className="min-h-40 text-base leading-7 bg-background/40 backdrop-blur-md border-border/60 focus:border-primary/50 focus:ring-primary/20 resize-y overflow-auto transition-all"
              disabled={submitting}
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Button
              type="submit"
              size="lg"
              className="group gap-2.5 px-6 py-5 text-base font-medium shadow-lg shadow-primary/15 transition-all duration-300 ease-out rounded-xl"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Start crafting
                  <ArrowRight className="size-5 transition-transform duration-300 group-hover:translate-x-1" />
                </>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              Your next good draft starts here.
            </span>
          </div>
        </div>
      </div>
    </form>
  );
}

export default NewProject;
