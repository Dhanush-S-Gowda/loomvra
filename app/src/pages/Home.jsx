import { ArrowRight, ArrowUpRight, Layers3, WandSparkles } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

const steps = [
  {
    number: '01',
    title: 'Start with your brief',
    copy: 'Name the topic, audience, and what you want them to take away.',
  },
  {
    number: '02',
    title: 'Build the story',
    copy: 'Turn your direction into a focused narrative, then map it across slides.',
  },
  {
    number: '03',
    title: 'Refine the deck',
    copy: 'Review the draft, adjust the details, and make each slide your own.',
  },
];

function Home() {
  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-24 -top-28 size-96 rounded-full bg-[radial-gradient(circle,var(--blob-coral),transparent_68%)] opacity-35 blur-3xl dark:opacity-25" />
        <div className="absolute right-[-9rem] top-28 size-[32rem] rounded-full bg-[radial-gradient(circle,var(--blob-purple),transparent_68%)] opacity-30 blur-3xl dark:opacity-20" />
        <div className="absolute bottom-[-15rem] left-1/3 size-[34rem] rounded-full bg-[radial-gradient(circle,var(--blob-teal),transparent_68%)] opacity-20 blur-3xl dark:opacity-15" />
        <div className="bg-noise absolute inset-0 opacity-[0.035]" />
      </div>

      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link to="/" className="font-heading text-2xl tracking-tight">NextGen PPT</Link>
        <Link to="/dashboard">
          <Button variant="ghost" className="gap-2 rounded-full px-4 text-sm">
            Open workspace <ArrowUpRight className="size-4" />
          </Button>
        </Link>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-16 px-6 pb-24 pt-12 lg:grid-cols-[0.94fr_1.06fr] lg:px-10 lg:pb-36 lg:pt-20">
        <div className="max-w-2xl">
          <p className="mb-7 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <span className="size-2 rounded-full bg-primary" /> From thought to story
          </p>
          <h1 className="max-w-xl font-heading text-6xl leading-[0.92] tracking-[-0.045em] sm:text-7xl lg:text-[7.6rem]">
            Make the idea <span className="text-primary">visible.</span>
          </h1>
          <p className="mt-8 max-w-md text-base leading-7 text-muted-foreground sm:text-lg">
            Share what you want to say and who needs to hear it. NextGen helps shape the story, build the slides, and create an editable PowerPoint draft.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link to="/dashboard">
              <Button size="lg" className="group h-12 gap-3 rounded-full px-6 text-base shadow-lg shadow-primary/15">
                Start building
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <span className="text-sm text-muted-foreground">Your next good draft starts here.</span>
          </div>
        </div>

        <div className="relative min-h-[28rem] lg:min-h-[35rem]">
          <div className="absolute left-0 top-10 rotate-[-7deg] rounded-2xl border border-foreground/10 bg-card/75 p-5 shadow-2xl shadow-foreground/10 backdrop-blur-sm sm:left-10 sm:p-7">
            <p className="mb-20 text-[10px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">Your raw material</p>
            <p className="max-w-[13rem] font-heading text-3xl leading-none sm:max-w-[17rem] sm:text-4xl">A thought is just a story waiting for structure.</p>
            <div className="mt-10 h-1 w-16 rounded-full bg-primary" />
          </div>
          <div className="absolute bottom-5 right-0 z-10 w-[82%] rotate-[5deg] rounded-2xl border border-foreground/10 bg-foreground p-6 text-background shadow-2xl shadow-foreground/20 sm:bottom-0 sm:right-10 sm:p-8 dark:bg-card dark:text-foreground">
            <div className="mb-20 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.25em] text-background/55 dark:text-foreground/45">
              <span>NextGen / 01</span><span>Editable by design</span>
            </div>
            <p className="max-w-md font-heading text-4xl leading-[0.95] sm:text-6xl">A deck with a point of view.</p>
            <div className="mt-10 flex items-end justify-between">
              <div className="h-14 w-14 rounded-full bg-primary/90" />
              <Layers3 className="size-6 text-background/50 dark:text-foreground/45" />
            </div>
          </div>
          <div className="absolute right-0 top-0 flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25 sm:right-8">
            <WandSparkles className="size-7" />
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-card/35">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:px-10 lg:py-28">
          <div className="lg:pt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">From brief to deck</p>
            <h2 className="mt-4 max-w-sm font-heading text-5xl leading-none tracking-tight sm:text-6xl">A clear path from first thought to final slides.</h2>
            <p className="mt-5 max-w-sm leading-6 text-muted-foreground">Keep the message in focus at every step, from the first prompt to the finished draft.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/55 shadow-sm shadow-foreground/5">
            {steps.map((step) => (
              <article key={step.number} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-stretch gap-4 border-b border-border/70 px-5 py-6 last:border-b-0 sm:grid-cols-[5rem_minmax(0,1fr)] sm:gap-6 sm:px-8 sm:py-7">
                <span className="flex h-full items-center justify-center font-mono text-7xl font-bold leading-none tabular-nums text-primary">{step.number}</span>
                <div className="min-w-0 pt-0.5">
                  <h3 className="font-heading text-3xl leading-none">{step.title}</h3>
                  <p className="mt-3 max-w-md leading-5 text-muted-foreground">{step.copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 py-20 sm:flex-row sm:items-end sm:justify-between lg:px-10 lg:py-28">
        <h2 className="max-w-2xl font-heading text-5xl leading-[0.95] tracking-tight sm:text-7xl">Give the idea a room to become real.</h2>
        <Link to="/dashboard" className="shrink-0">
          <Button variant="outline" size="lg" className="group h-12 gap-3 rounded-full px-6 text-base">
            Start building <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </Link>
      </section>

      <footer className="mx-auto flex max-w-7xl items-center justify-between border-t border-border/70 px-6 py-6 text-xs text-muted-foreground lg:px-10">
        <span>NextGen PPT</span>
        <span>Make something worth presenting.</span>
      </footer>
    </main>
  );
}

export default Home;
