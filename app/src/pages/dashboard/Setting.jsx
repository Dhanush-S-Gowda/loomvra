import { useState } from "react";
import { toast } from "sonner";
import { InfoIcon } from "lucide-react";

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
  const [planningModel, setPlanningModel] = useState("");
  const [pptCreationModel, setPptCreationModel] = useState("");
  const [smallModel, setSmallModel] = useState("");

  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast.error("API key is required", {
        description: "Please enter a valid OpenRouter API key.",
      });
      return;
    }

    // TODO: Persist the API key securely (e.g., backend or secure storage)
    toast.success("API key saved", {
      description: "Your OpenRouter API key has been saved successfully.",
    });
  };

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
                <Button onClick={handleSaveApiKey}>Save</Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-1">
              <ModelSelect
                label="Planning model"
                tooltip="This model is used to create the comprehensive design plan."
                value={planningModel}
                onChange={setPlanningModel}
              />
              <ModelSelect
                label="PPT creation model"
                tooltip="This model should ideally be large and good at writing code for slide generation."
                value={pptCreationModel}
                onChange={setPptCreationModel}
              />
              <ModelSelect
                label="Small model"
                tooltip="This model is used for small tasks like context creation. A tiny, cheap model is sufficient."
                value={smallModel}
                onChange={setSmallModel}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}

export default Setting;
