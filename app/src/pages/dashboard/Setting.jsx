import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, InfoIcon } from "lucide-react";
import GridLoadingScreen, { GridPulse } from "@/components/GridLoadingScreen";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxSeparator,
} from "@/components/ui/combobox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getModels,
  getSettings,
  updateSettings,
  verifyOpenRouterKey,
  verifyPexelsKey,
} from "@/lib/api";

// Format pricing as "in $X / cache $Y / out $Z per 1M" (per million tokens),
// rounded to 4 decimal places. Cache is omitted when unavailable.
function formatPricing(model) {
  const { promptPerM, completionPerM, inputCacheReadPerM } = model.pricing;
  const round = (n) => String(Number(n).toFixed(4)).replace(/\.?0+$/, "");
  const parts = [`in $${round(promptPerM)}`, `out $${round(completionPerM)}`];
  if (inputCacheReadPerM != null) {
    parts.splice(1, 0, `cache $${round(inputCacheReadPerM)}`);
  }
  return `${parts.join(" / ")} per 1M`;
}

// Find a model by its id ("provider/model_name") within the grouped list.
function findModel(groups, id) {
  if (!id) return null;
  for (const group of groups) {
    const found = group.models.find((m) => m.id === id);
    if (found) return found;
  }
  return null;
}

function ModelSelect({ label, tooltip, value, onChange, groups }) {
  // Base UI expects each group to expose an `items` array.
  const items = groups.map((group) => ({
    value: group.provider,
    items: group.models,
  }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <InfoIcon className="size-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="top">{tooltip}</TooltipContent>
        </Tooltip>
      </div>
      <Combobox
        items={items}
        value={value}
        onValueChange={onChange}
        itemToStringLabel={(model) => model.name}
      >
        <ComboboxInput placeholder="Select a model" className="w-full" />
        <ComboboxContent>
          <ComboboxEmpty>No models found.</ComboboxEmpty>
          <ComboboxList>
            {(group, index) => (
              <ComboboxGroup key={group.value} items={group.items}>
                <ComboboxLabel>{group.value}</ComboboxLabel>
                <ComboboxCollection>
                  {(model) => (
                    <ComboboxItem key={model.id} value={model}>
                      <span className="flex flex-col">
                        <span>{model.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatPricing(model)}
                        </span>
                      </span>
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
                {index < items.length - 1 && <ComboboxSeparator />}
              </ComboboxGroup>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

function Setting() {
  const [apiKey, setApiKey] = useState("");
  const [pexelApiKey, setPexelApiKey] = useState("");
  const [designModel, setDesignModel] = useState(null);
  const [mainModel, setMainModel] = useState(null);
  const [smallModel, setSmallModel] = useState(null);
  const [designCustomPrompt, setDesignCustomPrompt] = useState("");
  const [slidesCustomPrompt, setSlidesCustomPrompt] = useState("");
  const [chatCustomPrompt, setChatCustomPrompt] = useState("");
  const [modelGroups, setModelGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedApiKeys, setSavedApiKeys] = useState({ openrouter: "", pexels: "" });
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPexelApiKey, setShowPexelApiKey] = useState(false);

  // Fetch settings and supported models on mount
  useEffect(() => {
    (async () => {
      try {
        const [settings, models] = await Promise.all([
          getSettings(),
          getModels(),
        ]);
        setApiKey(settings.openrouter_api || "");
        setPexelApiKey(settings.pexel_api || "");
        setSavedApiKeys({
          openrouter: settings.openrouter_api || "",
          pexels: settings.pexel_api || "",
        });
        setModelGroups(models);
        setDesignModel(findModel(models, settings.design_model));
        setMainModel(findModel(models, settings.main_model));
        setSmallModel(findModel(models, settings.small_model));
        setDesignCustomPrompt(settings.design_custom_prompt || "");
        setSlidesCustomPrompt(settings.slides_custom_prompt || "");
        setChatCustomPrompt(settings.chat_custom_prompt || "");
      } catch (err) {
        toast.error("Failed to load settings", {
          description: err.message,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const nextOpenRouterKey = apiKey.trim();
      const nextPexelsKey = pexelApiKey.trim();

      if (nextOpenRouterKey !== savedApiKeys.openrouter) {
        await verifyOpenRouterKey(nextOpenRouterKey);
      }
      if (nextPexelsKey !== savedApiKeys.pexels) {
        await verifyPexelsKey(nextPexelsKey);
      }

      await updateSettings({
        openrouter_api: nextOpenRouterKey,
        pexel_api: nextPexelsKey,
        design_model: designModel?.id ?? "",
        main_model: mainModel?.id ?? "",
        small_model: smallModel?.id ?? "",
        design_model_context_limit: designModel?.context_length ?? 32768,
        main_model_context_limit: mainModel?.context_length ?? 32768,
        small_model_context_limit: smallModel?.context_length ?? 32768,
        design_custom_prompt: designCustomPrompt,
        slides_custom_prompt: slidesCustomPrompt,
        chat_custom_prompt: chatCustomPrompt,
      });
      setSavedApiKeys({ openrouter: nextOpenRouterKey, pexels: nextPexelsKey });
      toast.success("Settings saved", {
        description: "Your API keys and model preferences have been updated.",
      });
    } catch (err) {
      toast.error("Settings were not saved", {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // Credentials and all three model choices are required before saving.
  const canSaveModels =
    Boolean(apiKey.trim()) &&
    Boolean(pexelApiKey.trim()) &&
    Boolean(designModel) &&
    Boolean(mainModel) &&
    Boolean(smallModel);

  if (loading) {
    return (
      <GridLoadingScreen
        eyebrow="Workspace"
        title="Loading settings"
        subtitle="Getting your saved preferences ready."
        showProgress={false}
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-6 overflow-y-auto overscroll-contain p-6">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <span className="size-2 rounded-full bg-primary" /> Workspace
          </p>
          <h1 className="font-heading text-4xl font-medium tracking-tight">Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your OpenRouter configuration and model preferences.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">AI Configuration</CardTitle>
            <CardDescription>
              Configure API keys, models, and reusable AI instructions. Changed
              keys are verified when you save settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-8">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">OpenRouter API Key</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      placeholder="sk-or-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowApiKey((prev) => !prev)}
                      aria-label={showApiKey ? "Hide OpenRouter API key" : "Show OpenRouter API key"}
                    >
                      {showApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Pexels API Key</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showPexelApiKey ? "text" : "password"}
                      placeholder="Pexels API key"
                      value={pexelApiKey}
                      onChange={(e) => setPexelApiKey(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPexelApiKey((prev) => !prev)}
                      aria-label={showPexelApiKey ? "Hide Pexels API key" : "Show Pexels API key"}
                    >
                      {showPexelApiKey ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <ModelSelect
                label="Design model"
                tooltip="This model is used to create the comprehensive design plan."
                value={designModel}
                onChange={setDesignModel}
                groups={modelGroups}
              />
              <ModelSelect
                label="PPT creation model"
                tooltip="This model should ideally be large and good at writing code for slide generation."
                value={mainModel}
                onChange={setMainModel}
                groups={modelGroups}
              />
              <ModelSelect
                label="Small model"
                tooltip="This model is used for small tasks like context creation. A tiny, cheap model is sufficient."
                value={smallModel}
                onChange={setSmallModel}
                groups={modelGroups}
              />
            </div>

            <div className="flex flex-col gap-5 border-t pt-6">
              <div className="border-l-2 border-primary pl-3">
                <h3 className="text-base font-semibold">Custom AI instructions</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  These instructions are added to their matching generation prompt and shared with AI chat.
                </p>
              </div>
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="flex flex-col gap-2">
                  <label htmlFor="design-custom-prompt" className="text-sm font-medium">Design planning</label>
                  <Textarea
                    id="design-custom-prompt"
                    value={designCustomPrompt}
                    onChange={(event) => setDesignCustomPrompt(event.target.value)}
                    placeholder="Add guidance for the presentation plan, audience, tone, and structure..."
                    rows={4}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="slides-custom-prompt" className="text-sm font-medium">Slide generation</label>
                  <Textarea
                    id="slides-custom-prompt"
                    value={slidesCustomPrompt}
                    onChange={(event) => setSlidesCustomPrompt(event.target.value)}
                    placeholder="Add guidance for slide layout, visual style, typography, and content..."
                    rows={4}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label htmlFor="chat-custom-prompt" className="text-sm font-medium">AI chat edits</label>
                  <Textarea
                    id="chat-custom-prompt"
                    value={chatCustomPrompt}
                    onChange={(event) => setChatCustomPrompt(event.target.value)}
                    placeholder="Add reusable guidance for how the AI should handle chat requests and slide edits..."
                    rows={4}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSaveSettings}
              disabled={!canSaveModels || saving}
              className="self-start"
            >
              {saving ? (
                <><GridPulse size="tiny" decorative className="mr-2 shrink-0" />Saving…</>
              ) : (
                "Save Settings"
              )}
            </Button>
            {!canSaveModels && (
              <p className="text-sm text-muted-foreground">
                Enter both API keys and select all three models to enable
                saving.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

export default Setting;
