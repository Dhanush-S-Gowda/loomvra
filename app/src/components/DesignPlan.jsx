import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { toast } from "sonner";
import { startCrafting, updateProject as saveProject, resolveImageUrl } from '@/lib/api';
import { GridPulse } from '@/components/GridLoadingScreen';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardAction,
} from '@/components/ui/card';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trash2,
  Palette,
  LayoutTemplate,
  FileText,
  Image as ImageIcon,
  Pencil,
  Check,
  X,
  ArrowRight,
  Plus,
} from 'lucide-react';
import ImagePickerDialog from '@/components/ImagePickerDialog';

function EditableField({ label, value, isEditing, onChange, multiline = false, type = 'text' }) {
  if (!isEditing) {
    return (
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-1 leading-relaxed">{value}</p>
      </div>
    );
  }

  const InputComponent = multiline ? Textarea : Input;
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">{label}</label>
      <InputComponent
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm"
        rows={multiline ? 3 : undefined}
      />
    </div>
  );
}

const FONTS = [
  { name: 'Arial', weights: ['Regular', 'SemiBold', 'Bold'] },
  { name: 'Times New Roman', weights: ['Regular', 'SemiBold', 'Bold'] },
  { name: 'Verdana', weights: ['Regular', 'SemiBold', 'Bold'] },
  { name: 'Georgia', weights: ['Regular', 'SemiBold', 'Bold'] },
  { name: 'Tahoma', weights: ['Regular', 'SemiBold', 'Bold'] },
  { name: 'Trebuchet MS', weights: ['Regular', 'SemiBold', 'Bold'] },
  { name: 'Courier New', weights: ['Regular', 'SemiBold', 'Bold'] },
];

function FontSelectField({ label, value, isEditing, onChange }) {
  if (!isEditing) {
    return (
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-1 leading-relaxed">{value}</p>
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">{label}</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select font" />
        </SelectTrigger>
        <SelectContent>
          {FONTS.map((font) => (
            <SelectGroup key={font.name}>
              <SelectLabel>{font.name}</SelectLabel>
              {font.weights.map((weight) => {
                const fontWeight = weight === 'Bold' ? 700 : weight === 'SemiBold' ? 600 : 400;
                return (
                  <SelectItem
                    key={`${font.name} ${weight}`}
                    value={`${font.name} ${weight}`}
                    style={{ fontFamily: font.name, fontWeight }}
                  >
                    {font.name} {weight}
                  </SelectItem>
                );
              })}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DesignPlan({ data, projectId }) {
  const [plan, setPlan] = useState(data);
  const [slides, setSlides] = useState(data.slides);
  const [slideToDelete, setSlideToDelete] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [imageDialog, setImageDialog] = useState(null);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [imagePickerTarget, setImagePickerTarget] = useState(null); // { slideNumber, imgIndex } or { slideNumber } for new
  const [crafting, setCrafting] = useState(false);
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);

  const startEdit = (section) => {
    setEditingSection(section);
  };

  const cancelEdit = () => {
    setEditingSection(null);
    setPlan(data);
    setSlides(data.slides);
  };

  const saveEdit = async () => {
    setEditingSection(null);
    if (!projectId) {
      toast.error("Project ID is missing");
      return;
    }
    setSaving(true);
    try {
      // Merge the edited slides back into the plan before persisting.
      const payload = { ...plan, slides };
      const result = await saveProject(projectId, { design_plan: payload });
      // Reflect the server's canonical (image-persisted) plan back into state.
      setPlan(result);
      setSlides(result.slides);
      toast.success("Design plan saved");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateProject = useCallback((field, value) => {
    setPlan((prev) => ({ ...prev, project: { ...prev.project, [field]: value } }));
  }, []);

  const updateGlobalDesign = useCallback((field, value) => {
    setPlan((prev) => ({ ...prev, globalDesign: { ...prev.globalDesign, [field]: value } }));
  }, []);

  const updateMasterTemplate = useCallback((field, value) => {
    setPlan((prev) => ({ ...prev, masterTemplate: { ...prev.masterTemplate, [field]: value } }));
  }, []);

  const updatePersistentElement = useCallback((index, field, value) => {
    setPlan((prev) => {
      const newElements = [...prev.masterTemplate.persistentElements];
      newElements[index] = { ...newElements[index], [field]: value };
      return { ...prev, masterTemplate: { ...prev.masterTemplate, persistentElements: newElements } };
    });
  }, []);

  const addPersistentElement = useCallback(() => {
    setPlan((prev) => ({
      ...prev,
      masterTemplate: {
        ...prev.masterTemplate,
        persistentElements: [
          ...(prev.masterTemplate.persistentElements || []),
          { type: '', position: '' },
        ],
      },
    }));
  }, []);

  const removePersistentElement = useCallback((index) => {
    setPlan((prev) => ({
      ...prev,
      masterTemplate: {
        ...prev.masterTemplate,
        persistentElements: (prev.masterTemplate.persistentElements || []).filter((_, i) => i !== index),
      },
    }));
  }, []);

  const updateSlide = useCallback((slideNumber, field, value) => {
    setSlides((prev) =>
      prev.map((s) => (s.number === slideNumber ? { ...s, [field]: value } : s))
    );
  }, []);

  const updateSlideImage = useCallback((slideNumber, imgIndex, value) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.number !== slideNumber) return s;
        const newImages = [...s.images];
        const existing = newImages[imgIndex];
        // Images are stored as objects ({ src, ... }) on the server.
        newImages[imgIndex] =
          existing && typeof existing === "object"
            ? { ...existing, src: value }
            : { src: value };
        return { ...s, images: newImages };
      })
    );
  }, []);

  const removeSlideImage = useCallback((slideNumber, imgIndex) => {
    setSlides((prev) =>
      prev.map((s) => {
        if (s.number !== slideNumber) return s;
        const newImages = s.images.filter((_, i) => i !== imgIndex);
        return { ...s, images: newImages };
      })
    );
  }, []);

  const openImagePicker = useCallback((slideNumber, imgIndex = null) => {
    setImagePickerTarget({ slideNumber, imgIndex });
    setImagePickerOpen(true);
  }, []);

  const openMasterImagePicker = useCallback(() => {
    setImagePickerTarget({ master: true });
    setImagePickerOpen(true);
  }, []);

  const handleImageSelect = useCallback((image) => {
    if (!imagePickerTarget) return;
    const { slideNumber, imgIndex, master } = imagePickerTarget;
    const imageData = typeof image === 'string' ? { src: image } : image;
    if (master) {
      updateMasterTemplate('image', imageData);
    } else if (imgIndex !== null) {
      updateSlideImage(slideNumber, imgIndex, imageData.src);
    } else {
      setSlides((prev) =>
        prev.map((s) =>
          s.number === slideNumber
            ? { ...s, images: [...s.images, imageData] }
            : s
        )
      );
    }
    setImagePickerTarget(null);
  }, [imagePickerTarget, updateSlideImage]);

  const removeMasterImage = useCallback(() => {
    setPlan((prev) => {
      const nextMaster = { ...prev.masterTemplate };
      delete nextMaster.image;
      return { ...prev, masterTemplate: nextMaster };
    });
  }, []);

  const handleDeleteConfirm = () => {
    if (slideToDelete !== null) {
      setSlides((prev) => prev.filter((s) => s.number !== slideToDelete));
      setSlideToDelete(null);
    }
  };

  const handleStartCrafting = async () => {
    if (!projectId) {
      toast.error("Project ID is missing");
      return;
    }
    setCrafting(true);
    try {
      const result = await startCrafting(projectId);
      toast.success(result.message || "Slide generation started!");
      // Navigate back to project page so it starts polling
      navigate(`/dashboard/project/${projectId}`, { replace: true });
    } catch (err) {
      toast.error(err.message);
      setCrafting(false);
    }
  };

  const { project, globalDesign, masterTemplate } = plan;

  const isEditingProject = editingSection === 'project';
  const isEditingGlobalDesign = editingSection === 'globalDesign';
  const isEditingMasterTemplate = editingSection === 'masterTemplate';

  return (
    <div className="space-y-10 p-6 md:p-10 max-w-6xl mx-auto h-full overflow-y-auto scrollbar-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <span className="size-2 rounded-full bg-primary" /> Design Plan
          </p>
          <h1 className="font-heading text-4xl md:text-5xl font-medium tracking-tight">
            Craft your deck
          </h1>
        </div>
        <Button
          size="lg"
          className="gap-2 rounded-md"
          onClick={handleStartCrafting}
          disabled={crafting || saving}
        >
          {crafting ? (
            <>
              <GridPulse size="tiny" decorative className="shrink-0" />
              Starting…
            </>
          ) : (
            <>
              Ready to Craft
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>

      {/* Project Overview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-medium">Project</h2>
          </div>
          {isEditingProject ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon-sm" onClick={cancelEdit}>
                <X className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={saveEdit}>
                <Check className="size-4 text-green-600" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon-sm" onClick={() => startEdit('project')}>
              <Pencil className="size-4 text-muted-foreground" />
            </Button>
          )}
        </div>
        <Card className="border-l-4 border-l-primary/40">
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 pt-5">
            <EditableField
              label="Title"
              value={project.title}
              isEditing={isEditingProject}
              onChange={(v) => updateProject('title', v)}
            />
            <EditableField
              label="Topic"
              value={project.topic}
              isEditing={isEditingProject}
              onChange={(v) => updateProject('topic', v)}
            />
            <EditableField
              label="Purpose"
              value={project.purpose}
              isEditing={isEditingProject}
              onChange={(v) => updateProject('purpose', v)}
            />
            <EditableField
              label="Audience"
              value={project.audience}
              isEditing={isEditingProject}
              onChange={(v) => updateProject('audience', v)}
            />
            <EditableField
              label="Language"
              value={project.language}
              isEditing={isEditingProject}
              onChange={(v) => updateProject('language', v)}
            />
            <EditableField
              label="Slide Count"
              value={String(project.slideCount)}
              isEditing={isEditingProject}
              onChange={(v) => updateProject('slideCount', v)}
              type="number"
            />
          </CardContent>
        </Card>
      </section>

      {/* Global Design */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-medium">Global Design</h2>
          </div>
          {isEditingGlobalDesign ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon-sm" onClick={cancelEdit}>
                <X className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={saveEdit}>
                <Check className="size-4 text-green-600" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon-sm" onClick={() => startEdit('globalDesign')}>
              <Pencil className="size-4 text-muted-foreground" />
            </Button>
          )}
        </div>
        <Card className="border-l-4 border-l-secondary/40">
          <CardContent className="space-y-5 pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <EditableField
                label="Theme"
                value={globalDesign.theme}
                isEditing={isEditingGlobalDesign}
                onChange={(v) => updateGlobalDesign('theme', v)}
              />
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Primary Color</p>
                {isEditingGlobalDesign ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={globalDesign.primary_color}
                      onChange={(e) => updateGlobalDesign('primary_color', e.target.value)}
                      className="text-sm"
                    />
                    <input
                      type="color"
                      value={globalDesign.primary_color}
                      onChange={(e) => updateGlobalDesign('primary_color', e.target.value)}
                      className="size-6 rounded-full ring-1 ring-foreground/10 shrink-0 overflow-hidden p-0 border-0 cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="inline-block size-4 rounded-full ring-1 ring-foreground/10"
                      style={{ backgroundColor: globalDesign.primary_color }}
                    />
                    <span className="text-sm font-medium">{globalDesign.primary_color}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Secondary Color</p>
                {isEditingGlobalDesign ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={globalDesign.secondary_color}
                      onChange={(e) => updateGlobalDesign('secondary_color', e.target.value)}
                      className="text-sm"
                    />
                    <input
                      type="color"
                      value={globalDesign.secondary_color}
                      onChange={(e) => updateGlobalDesign('secondary_color', e.target.value)}
                      className="size-6 rounded-full ring-1 ring-foreground/10 shrink-0 overflow-hidden p-0 border-0 cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="inline-block size-4 rounded-full ring-1 ring-foreground/10"
                      style={{ backgroundColor: globalDesign.secondary_color }}
                    />
                    <span className="text-sm font-medium">{globalDesign.secondary_color}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Accent Color</p>
                {isEditingGlobalDesign ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={globalDesign.accent_color}
                      onChange={(e) => updateGlobalDesign('accent_color', e.target.value)}
                      className="text-sm"
                    />
                    <input
                      type="color"
                      value={globalDesign.accent_color}
                      onChange={(e) => updateGlobalDesign('accent_color', e.target.value)}
                      className="size-6 rounded-full ring-1 ring-foreground/10 shrink-0 overflow-hidden p-0 border-0 cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="inline-block size-4 rounded-full ring-1 ring-foreground/10"
                      style={{ backgroundColor: globalDesign.accent_color }}
                    />
                    <span className="text-sm font-medium">{globalDesign.accent_color}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Background Color</p>
                {isEditingGlobalDesign ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={globalDesign.background_color}
                      onChange={(e) => updateGlobalDesign('background_color', e.target.value)}
                      className="text-sm"
                    />
                    <input
                      type="color"
                      value={globalDesign.background_color}
                      onChange={(e) => updateGlobalDesign('background_color', e.target.value)}
                      className="size-6 rounded-full ring-1 ring-foreground/10 shrink-0 overflow-hidden p-0 border-0 cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="inline-block size-4 rounded-full ring-1 ring-foreground/10"
                      style={{ backgroundColor: globalDesign.background_color }}
                    />
                    <span className="text-sm font-medium">{globalDesign.background_color}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Text Color</p>
                {isEditingGlobalDesign ? (
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      value={globalDesign.text_color}
                      onChange={(e) => updateGlobalDesign('text_color', e.target.value)}
                      className="text-sm"
                    />
                    <input
                      type="color"
                      value={globalDesign.text_color}
                      onChange={(e) => updateGlobalDesign('text_color', e.target.value)}
                      className="size-6 rounded-full ring-1 ring-foreground/10 shrink-0 overflow-hidden p-0 border-0 cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="inline-block size-4 rounded-full ring-1 ring-foreground/10"
                      style={{ backgroundColor: globalDesign.text_color }}
                    />
                    <span className="text-sm font-medium">{globalDesign.text_color}</span>
                  </div>
                )}
              </div>
              <FontSelectField
                label="Heading Font"
                value={globalDesign.heading_font}
                isEditing={isEditingGlobalDesign}
                onChange={(v) => updateGlobalDesign('heading_font', v)}
              />
              <FontSelectField
                label="Subheading Font"
                value={globalDesign.subHeading_font}
                isEditing={isEditingGlobalDesign}
                onChange={(v) => updateGlobalDesign('subHeading_font', v)}
              />
              <FontSelectField
                label="Body Font"
                value={globalDesign.body_font}
                isEditing={isEditingGlobalDesign}
                onChange={(v) => updateGlobalDesign('body_font', v)}
              />
            </div>
            <div className="grid grid-cols-1 gap-5 pt-3 border-t border-border/60">
              <EditableField
                label="Design Concepts"
                value={globalDesign.designConcepts}
                isEditing={isEditingGlobalDesign}
                onChange={(v) => updateGlobalDesign('designConcepts', v)}
                multiline
              />
              <EditableField
                label="Overall Guidelines"
                value={globalDesign.overallGuidelines}
                isEditing={isEditingGlobalDesign}
                onChange={(v) => updateGlobalDesign('overallGuidelines', v)}
                multiline
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Master Template */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-medium">Master Template</h2>
          </div>
          {isEditingMasterTemplate ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon-sm" onClick={cancelEdit}>
                <X className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={saveEdit}>
                <Check className="size-4 text-green-600" />
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="icon-sm" onClick={() => startEdit('masterTemplate')}>
              <Pencil className="size-4 text-muted-foreground" />
            </Button>
          )}
        </div>
        <Card className="border-l-4 border-l-accent/40">
          <CardContent className="space-y-5 pt-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <EditableField
                label="Background Type"
                value={masterTemplate.backgroundType}
                isEditing={isEditingMasterTemplate}
                onChange={(v) => updateMasterTemplate('backgroundType', v)}
              />
              <EditableField
                label="Background Description"
                value={masterTemplate.backgroundDescription}
                isEditing={isEditingMasterTemplate}
                onChange={(v) => updateMasterTemplate('backgroundDescription', v)}
                multiline
              />
            </div>
            <div className="pt-3 border-t border-border/60">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Persistent Elements</p>
              <div className="space-y-2">
                {(masterTemplate.persistentElements || []).map((el, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {isEditingMasterTemplate ? (
                      <>
                        <Input
                          value={el.type}
                          onChange={(e) => updatePersistentElement(idx, 'type', e.target.value)}
                          className="text-sm flex-1"
                          placeholder="Type"
                        />
                        <Button variant="ghost" size="icon-sm" onClick={() => removePersistentElement(idx)} aria-label="Remove persistent element">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                        <span className="text-muted-foreground">—</span>
                        <Input
                          value={el.position}
                          onChange={(e) => updatePersistentElement(idx, 'position', e.target.value)}
                          className="text-sm flex-1"
                          placeholder="Position"
                        />
                      </>
                    ) : (
                      <p className="text-sm leading-relaxed">
                        <span className="font-medium">{el.type}</span>
                        <span className="text-muted-foreground"> — {el.position}</span>
                      </p>
                    )}
                  </div>
                ))}
                {isEditingMasterTemplate && (
                  <Button variant="outline" size="sm" className="gap-2" onClick={addPersistentElement}>
                    <Plus className="size-4" /> Add persistent element
                  </Button>
                )}
              </div>
            </div>
            <div className="pt-3 border-t border-border/60">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Master Template Image (optional, max 1)</p>
                {isEditingMasterTemplate && masterTemplate.image && (
                  <Button variant="ghost" size="sm" onClick={removeMasterImage} className="gap-2 text-destructive">
                    <Trash2 className="size-4" /> Remove
                  </Button>
                )}
              </div>
              {masterTemplate.image?.src ? (
                <img src={resolveImageUrl(masterTemplate.image.src)} alt={masterTemplate.image.purpose || 'Master template'} className="max-h-32 rounded-md object-contain" />
              ) : <p className="text-sm text-muted-foreground italic">No image selected</p>}
              {isEditingMasterTemplate && !masterTemplate.image?.src && (
                <Button variant="outline" size="sm" className="mt-2 gap-2" onClick={openMasterImagePicker}>
                  <ImageIcon className="size-4" /> Add image
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Slides */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="size-5 text-primary" />
            <h2 className="font-heading text-xl font-medium">Slides</h2>
          </div>
          <span className="text-sm text-muted-foreground">
            {slides.length} of {project.slideCount}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {slides.map((slide) => {
            const isEditingSlide = editingSection === `slide-${slide.number}`;
            return (
              <Card key={slide.number} className="relative border-l-4 border-l-muted-foreground/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1">
                      {slide.number}
                    </span>
                    {isEditingSlide ? (
                      <Input
                        value={slide.title}
                        onChange={(e) => updateSlide(slide.number, 'title', e.target.value)}
                        className="text-base font-medium"
                      />
                    ) : (
                      <span className="truncate">{slide.title}</span>
                    )}
                  </CardTitle>
                  {isEditingSlide ? (
                    <Textarea
                      value={slide.objective}
                      onChange={(e) => updateSlide(slide.number, 'objective', e.target.value)}
                      className="text-sm mt-1"
                      rows={2}
                    />
                  ) : (
                    <CardDescription className="mt-1">{slide.objective}</CardDescription>
                  )}
                  <CardAction className="flex items-center gap-1">
                    {isEditingSlide ? (
                      <>
                        <Button variant="ghost" size="icon-sm" onClick={cancelEdit}>
                          <X className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={saveEdit}>
                          <Check className="size-4 text-green-600" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => startEdit(`slide-${slide.number}`)}
                        >
                          <Pencil className="size-4 text-muted-foreground" />
                        </Button>
                        <Dialog
                          open={slideToDelete === slide.number}
                          onOpenChange={(open) => {
                            if (!open) setSlideToDelete(null);
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => setSlideToDelete(slide.number)}
                            >
                              <Trash2 className="size-4" />
                              <span className="sr-only">Delete slide {slide.number}</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Slide {slide.number}?</DialogTitle>
                              <DialogDescription>
                                This will permanently remove <strong>"{slide.title}"</strong> from the design plan. This action cannot be undone.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
                              <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                              </DialogClose>
                              <Button variant="destructive" onClick={handleDeleteConfirm}>
                                Delete
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </CardAction>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {isEditingSlide ? (
                      <>
                        <div>
                          <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">Layout</label>
                          <Input
                            value={slide.layout}
                            onChange={(e) => updateSlide(slide.number, 'layout', e.target.value)}
                            className="text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">Background</label>
                          <Textarea
                            value={slide.background}
                            onChange={(e) => updateSlide(slide.number, 'background', e.target.value)}
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">Element Placement</label>
                          <Textarea
                            value={slide.elementPlacement}
                            onChange={(e) => updateSlide(slide.number, 'elementPlacement', e.target.value)}
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                        <div>
                          <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">Visual Hierarchy</label>
                          <Textarea
                            value={slide.visualHierarchy}
                            onChange={(e) => updateSlide(slide.number, 'visualHierarchy', e.target.value)}
                            className="text-sm"
                            rows={2}
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Layout</p>
                          <p className="text-sm font-medium mt-1 leading-relaxed">{slide.layout}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Background</p>
                          <p className="text-sm mt-1 leading-relaxed">{slide.background}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Element Placement</p>
                          <p className="text-sm mt-1 leading-relaxed">{slide.elementPlacement}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground">Visual Hierarchy</p>
                          <p className="text-sm mt-1 leading-relaxed">{slide.visualHierarchy}</p>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-3 border-t border-border/60">
                    {isEditingSlide ? (
                      <div>
                        <label className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">Styling Notes</label>
                        <Textarea
                          value={slide.stylingNotes}
                          onChange={(e) => updateSlide(slide.number, 'stylingNotes', e.target.value)}
                          className="text-sm"
                          rows={3}
                        />
                      </div>
                    ) : (
                      <>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Styling Notes</p>
                        <p className="text-sm leading-relaxed">{slide.stylingNotes}</p>
                      </>
                    )}
                  </div>

                  {/* Images */}
                  <div className="pt-3 border-t border-border/60">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Images</p>
                      {isEditingSlide && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => openImagePicker(slide.number)}
                        >
                          <Plus className="size-3.5" />
                          Add Image
                        </Button>
                      )}
                    </div>
                    {slide.images.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {slide.images.map((img, idx) => {
                          const src =
                            img && typeof img === "object" ? img.src : img;
                          const imageUrl = resolveImageUrl(src);
                          return (
                          <div key={idx} className="relative group">
                            <Dialog
                              open={imageDialog === `${slide.number}-${idx}`}
                              onOpenChange={(open) => {
                                if (!open) setImageDialog(null);
                              }}
                            >
                              <DialogTrigger asChild>
                                <button
                                  className="relative overflow-hidden rounded-lg ring-1 ring-foreground/10 hover:ring-primary/40 transition-all"
                                  onClick={() => setImageDialog(`${slide.number}-${idx}`)}
                                >
                                  <img
                                    src={imageUrl}
                                    alt={`Slide ${slide.number} image ${idx + 1}`}
                                    className="h-24 w-32 object-cover rounded-lg"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg" />
                                </button>
                              </DialogTrigger>
                              <DialogContent className="max-w-[90vw] sm:max-w-[90vw]">
                                <DialogHeader>
                                  <DialogTitle>Slide {slide.number} — Image {idx + 1}</DialogTitle>
                                </DialogHeader>
                                <div className="flex justify-center">
                                  <img
                                    src={imageUrl}
                                    alt={`Slide ${slide.number} image ${idx + 1}`}
                                    className="max-h-[70vh] max-w-[75vw] rounded-lg object-contain"
                                  />
                                </div>
                                <DialogFooter>
                                  {isEditingSlide && (
                                    <Button
                                      variant="destructive"
                                      onClick={() => {
                                        removeSlideImage(slide.number, idx);
                                        setImageDialog(null);
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  )}
                                  <DialogClose asChild>
                                    <Button variant="outline">Close</Button>
                                  </DialogClose>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No images</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <ImagePickerDialog
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        onSelect={handleImageSelect}
      />
    </div>
  );
}

export default DesignPlan;
