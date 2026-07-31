import { useState, useEffect } from "react";
import { toast } from "sonner";
import { InfoIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { getSettings, updateSettings } from "@/lib/api";

const OPENROUTER_MODELS = [
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "anthropic/claude-3.5-haiku", label: "Claude 3.5 Haiku" },
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
  { value: "google/gemini-2.0-flash-lite-001", label: "Gemini 2.0 Flash Lite" },
  { value: "deepseek/deepseek-chat", label: "DeepSeek V3" },
  { value: "deepseek/deepseek-r1", label: "DeepSeek R1" },
  { value: "meta-llama/llama-3.3-70b-instruct", label: "Llama 3.3 70B" },
  { value: "meta-llama/llama-3.1-8b-instruct", label: "Llama 3.1 8B" },
  { value: "qwen/qwen-2.5-72b-instruct", label: "Qwen 2.5 72B" },
  { value: "qwen/qwen-2.5-7b-instruct", label: "Qwen 2.5 7B" },
];

function ModelSelect({ label, tooltip, value, onChange }) {
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
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a model" />
        </SelectTrigger>
        <SelectContent>
          {OPENROUTER_MODELS.map((model) => (
            <SelectItem key={model.value} value={model.value}>
              {model.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Setting() {
  const [apiKey, setApiKey] = useState("");
  const [designModel, setDesignModel] = useState("");
  const [mainModel, setMainModel] = useState("");
  const [smallModel, setSmallModel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    (async () => {
      try {
        const settings = await getSettings();
        setApiKey(settings.openrouter_api || "");
        setDesignModel(settings.design_model || "");
        setMainModel(settings.main_model || "");
        setSmallModel(settings.small_model || "");
      } catch (err) {
        toast.error("Failed to load settings", {
          description: err.message,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast.error("API key is required", {
        description: "Please enter a valid OpenRouter API key.",
      });
      return;
    }

    setSaving(true);
    try {
      await updateSettings({ openrouter_api_key: apiKey.trim() });
      toast.success("API key saved", {
        description: "Your OpenRouter API key has been saved successfully.",
      });
    } catch (err) {
      toast.error("Failed to save API key", {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModels = async () => {
    setSaving(true);
    try {
      await updateSettings({
        design_model: designModel,
        main_model: mainModel,
        small_model: smallModel,
      });
      toast.success("Models saved", {
        description: "Your model preferences have been updated.",
      });
    } catch (err) {
      toast.error("Failed to save models", {
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-6 p-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your OpenRouter configuration and model preferences.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">OpenRouter</CardTitle>
            <CardDescription>
              Configure your OpenRouter API key and choose the models for
              different tasks.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="sk-or-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleSaveApiKey} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-1">
              <ModelSelect
                label="Design model"
                tooltip="This model is used to create the comprehensive design plan."
                value={designModel}
                onChange={setDesignModel}
              />
              <ModelSelect
                label="PPT creation model"
                tooltip="This model should ideally be large and good at writing code for slide generation."
                value={mainModel}
                onChange={setMainModel}
              />
              <ModelSelect
                label="Small model"
                tooltip="This model is used for small tasks like context creation. A tiny, cheap model is sufficient."
                value={smallModel}
                onChange={setSmallModel}
              />
            </div>

            <Button onClick={handleSaveModels} disabled={saving} className="self-start">
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : (
                "Save Model Settings"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

export default Setting;
