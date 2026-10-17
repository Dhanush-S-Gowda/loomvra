import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronDown, ImagePlus, Palette, X } from 'lucide-react';
import { GridPulse } from '@/components/GridLoadingScreen';
import { toast } from "sonner";
import { createProject } from '@/lib/api';

function NewProject() {
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [brandPalette, setBrandPalette] = useState({ primary: '', secondary: '', tertiary: '' });
  const [brandFonts, setBrandFonts] = useState({ heading: '', body: '' });
  const [brandGuidance, setBrandGuidance] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoData, setLogoData] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
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
      const result = await createProject(projectName.trim(), description.trim(), {
        brand: {
          palette: Object.fromEntries(Object.entries(brandPalette).filter(([, value]) => value.trim())),
          fonts: Object.fromEntries(Object.entries(brandFonts).filter(([, value]) => value.trim())),
          guidance: brandGuidance.trim() || undefined,
        },
        logoData: logoData || undefined,
      });
      toast.success(result.message || "Project created!");
      navigate(`/dashboard/project/${result.projectId}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Choose a PNG, JPEG, or WebP logo.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setLogoFile(file);
      setLogoData(String(reader.result));
      setLogoPreview(String(reader.result));
    };
    reader.onerror = () => toast.error('Could not read the logo file.');
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoData('');
    setLogoPreview('');
  };

  return (
    <form onSubmit={handleSubmit} className="relative h-full min-h-0 w-full overflow-x-hidden overflow-y-auto overscroll-contain">
      {/* Base background — same brand language as the home page */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-28 size-96 rounded-full bg-[radial-gradient(circle,var(--blob-green),transparent_68%)] opacity-25 blur-3xl dark:opacity-20" />
        <div className="absolute right-[-9rem] top-28 size-[32rem] rounded-full bg-[radial-gradient(circle,var(--blob-slate),transparent_68%)] opacity-20 blur-3xl dark:opacity-15" />
        <div className="absolute bottom-[-15rem] left-1/3 size-[34rem] rounded-full bg-[radial-gradient(circle,var(--blob-green),transparent_68%)] opacity-15 blur-3xl dark:opacity-10" />
        <div className="bg-noise absolute inset-0 opacity-[0.035]" />
      </div>

      {/* Single, focused composer column — left aligned like a document */}
      <div className="relative z-10 mx-auto flex min-h-full max-w-2xl flex-col justify-center px-6 py-12 sm:py-16">
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

          <details className="group rounded-xl border border-border/60 bg-background/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 [&::-webkit-details-marker]:hidden">
              <span>
                <span className="block text-sm font-medium">Branding <span className="font-normal text-muted-foreground">(optional)</span></span>
                <span className="mt-1 block text-sm text-muted-foreground">Add only the colors, fonts, or logo you want the plan to use.</span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="space-y-5 border-t border-border/60 p-4">
              <div>
                <p className="mb-3 text-sm font-medium">Palette</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    ['primary', 'Primary'],
                    ['secondary', 'Secondary'],
                    ['tertiary', 'Tertiary'],
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <label htmlFor={`brand-${key}`} className="text-xs font-medium text-muted-foreground">{label}</label>
                      <div className="flex items-center gap-2">
                        <Input
                          id={`brand-${key}`}
                          value={brandPalette[key]}
                          onChange={(e) => setBrandPalette((prev) => ({ ...prev, [key]: e.target.value }))}
                          placeholder="#123456"
                          disabled={submitting}
                          className="min-w-0 bg-background/50"
                          aria-label={`${label} color value`}
                        />
                        <label className="relative flex size-10 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-border bg-background/50 hover:border-primary/60" title={`Choose ${label.toLowerCase()} color`}>
                          <span className="absolute inset-1 rounded-sm border border-foreground/10" style={brandPalette[key] ? { backgroundColor: brandPalette[key] } : undefined} />
                          {!brandPalette[key] && <Palette className="relative z-10 size-4 text-muted-foreground" />}
                          <input
                            type="color"
                            value={
                              /^#[\da-f]{6}$/i.test(brandPalette[key])
                                ? brandPalette[key]
                                : getComputedStyle(document.documentElement).getPropertyValue('--brand-white').trim()
                            }
                            onChange={(e) => setBrandPalette((prev) => ({ ...prev, [key]: e.target.value }))}
                            disabled={submitting}
                            aria-label={`Pick ${label.toLowerCase()} color`}
                            className="absolute inset-0 size-full cursor-pointer opacity-0"
                          />
                        </label>
                        {brandPalette[key] && (
                          <button type="button" onClick={() => setBrandPalette((prev) => ({ ...prev, [key]: '' }))} disabled={submitting} aria-label={`Clear ${label.toLowerCase()} color`} className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-medium">Fonts</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    ['heading', 'Heading font'],
                    ['body', 'Body font'],
                  ].map(([key, label]) => (
                    <div key={key} className="space-y-1.5">
                      <label htmlFor={`brand-font-${key}`} className="text-xs font-medium text-muted-foreground">{label}</label>
                      <Input
                        id={`brand-font-${key}`}
                        value={brandFonts[key]}
                        onChange={(e) => setBrandFonts((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder="e.g. Arial"
                        disabled={submitting}
                        className="bg-background/50"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="brand-guidance" className="text-sm font-medium">Brand direction</label>
                <Textarea
                  id="brand-guidance"
                  value={brandGuidance}
                  onChange={(e) => setBrandGuidance(e.target.value)}
                  placeholder="Optional notes about your brand or the visual style to follow."
                  disabled={submitting}
                  className="min-h-20 bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <span className="block text-sm font-medium">Logo</span>
                {logoPreview ? (
                  <div className="flex h-11 items-center gap-3 rounded-md border border-border/60 bg-background/50 px-3">
                    <img src={logoPreview} alt="Selected logo preview" className="max-h-8 max-w-24 object-contain" />
                    <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{logoFile?.name}</span>
                    <button type="button" onClick={removeLogo} disabled={submitting} aria-label="Remove logo" className="text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
                  </div>
                ) : (
                  <label className="flex h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-border/70 bg-background/30 px-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground">
                    <ImagePlus className="size-4" /> Upload a logo
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoChange} disabled={submitting} className="sr-only" />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP, up to 5 MB.</p>
              </div>
            </div>
          </details>

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
              placeholder="Describe the presentation you need: how many slides, the style, who it’s for, what to include, and what to leave out."
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
                  <GridPulse size="tiny" decorative className="shrink-0" />
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
