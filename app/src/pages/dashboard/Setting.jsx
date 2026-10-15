import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, InfoIcon } from "lucide-react";
import GridLoadingScreen, { GridPulse } from "@/components/GridLoadingScreen";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [modelGroups, setModelGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(null); // "openrouter" | "pexels" | null
  const [openRouterVerified, setOpenRouterVerified] = useState(false);
  const [pexelsVerified, setPexelsVerified] = useState(false);
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
        setModelGroups(models);
        setDesignModel(findModel(models, settings.design_model));
        setMainModel(findModel(models, settings.main_model));
        setSmallModel(findModel(models, settings.small_model));
        // If a key is already stored, consider it verified.
        setOpenRouterVerified(Boolean(settings.openrouter_api));
        setPexelsVerified(Boolean(settings.pexel_api));
      } catch (err) {
        toast.error("Failed to load settings", {
          description: err.message,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleVerifyApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("API key is required", {
        description: "Please enter a valid OpenRouter API key.",
      });
      return;
    }

    setVerifying("openrouter");
    try {
      await verifyOpenRouterKey(apiKey.trim());
      setOpenRouterVerified(true);
      toast.success("OpenRouter API key verified", {
        description: "Your OpenRouter API key is valid.",
      });
    } catch (err) {
      setOpenRouterVerified(false);
      toast.error("Verification failed", {
        description: err.message,
      });
    } finally {
      setVerifying(null);
    }
  };

  const handleVerifyPexelApiKey = async () => {
    if (!pexelApiKey.trim()) {
      toast.error("API key is required", {
        description: "Please enter a valid Pexels API key.",
      });
      return;
    }

    setVerifying("pexels");
    try {
      await verifyPexelsKey(pexelApiKey.trim());
      setPexelsVerified(true);
      toast.success("Pexels API key verified", {
        description: "Your Pexels API key is valid.",
      });
    } catch (err) {
      setPexelsVerified(false);
      toast.error("Verification failed", {
        description: err.message,
      });
    } finally {
      setVerifying(null);
    }
  };

  const handleSaveModels = async () => {
    setSaving(true);
    try {
      await updateSettings({
        openrouter_api: apiKey.trim(),
        pexel_api: pexelApiKey.trim(),
        design_model: designModel?.id ?? "",
        main_model: mainModel?.id ?? "",
        small_model: smallModel?.id ?? "",
      });
      toast.success("Settings saved", {
        description: "Your API keys and model preferences have been updated.",
      });
    } catch (err) {
      toast.error("Failed to save settings", {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  // Save Model Settings is only enabled once both keys are verified and a
  // model is selected for each of the three model fields.
  const canSaveModels =
    openRouterVerified &&
    pexelsVerified &&
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
      <div className="flex flex-col gap-6 p-6 max-w-2xl">
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
            <CardTitle className="text-2xl">API Keys</CardTitle>
            <CardDescription>
              Configure your OpenRouter and Pexels API keys. Verify each key
              before saving.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
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
                <Button
                  onClick={handleVerifyApiKey}
                  disabled={verifying === "openrouter"}
                >
                  {verifying === "openrouter" ? (
                    <GridPulse size="tiny" decorative className="shrink-0" />
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
              {openRouterVerified && (
                <p className="text-sm text-primary">
                  ✓ OpenRouter API key verified
                </p>
              )}
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
                <Button
                  onClick={handleVerifyPexelApiKey}
                  disabled={verifying === "pexels"}
                >
                  {verifying === "pexels" ? (
                    <GridPulse size="tiny" decorative className="shrink-0" />
                  ) : (
                    "Verify"
                  )}
                </Button>
              </div>
              {pexelsVerified && (
                <p className="text-sm text-primary">
                  ✓ Pexels API key verified
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-1">
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

            <Button
              onClick={handleSaveModels}
              disabled={!canSaveModels || saving}
              className="self-start"
            >
              {saving ? (
                <><GridPulse size="tiny" decorative className="mr-2 shrink-0" />Saving…</>
              ) : (
                "Save Model Settings"
              )}
            </Button>
            {!canSaveModels && (
              <p className="text-sm text-muted-foreground">
                Verify both API keys and select all three models to enable
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
