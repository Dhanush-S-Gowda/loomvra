import { useState, useRef, useCallback } from 'react';
import {
  ArrowUpIcon,
  BotMessageSquare,
  PaperclipIcon,
  RotateCwIcon,
  XIcon,
  ChevronDownIcon,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from '@/components/ui/input-group';
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const DEFAULT_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet 34y634b 3u23n' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku' },
  { id: 'gemini-1-5-pro', name: 'Gemini 1.5 Pro' },
];

const INITIAL_MESSAGES = [
  {
    id: 'welcome',
    role: 'assistant',
    content: 'Hi! I can help you refine your presentation. Ask me anything about your slides, content, or design.',
  },
];

function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  return (
    <MessageScrollerItem scrollAnchor={isUser}>
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm'
          }`}
        >
          {message.image && (
            <img
              src={message.image}
              alt="Uploaded"
              className="mb-2 max-h-40 rounded-lg object-cover"
            />
          )}
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    </MessageScrollerItem>
  );
}

export function AIChatPanel({
  models = DEFAULT_MODELS,
  slideCount = 0,
}) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [selectedModel, setSelectedModel] = useState(null);
  const fileInputRef = useRef(null);
  const [pendingImage, setPendingImage] = useState(null);

  // Slide selection state
  const [selectedSlides, setSelectedSlides] = useState(new Set());

  const allSlidesSelected = selectedSlides.size === slideCount && slideCount > 0;

  const toggleSlide = useCallback((slideNum) => {
    setSelectedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(slideNum)) {
        next.delete(slideNum);
      } else {
        next.add(slideNum);
      }
      return next;
    });
  }, []);

  const toggleAllSlides = useCallback(() => {
    setSelectedSlides((prev) => {
      if (prev.size === slideCount) {
        return new Set();
      }
      return new Set(Array.from({ length: slideCount }, (_, i) => i + 1));
    });
  }, [slideCount]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if ((!text && !pendingImage) || isBusy) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      image: pendingImage,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setPendingImage(null);
    setIsBusy(true);

    setTimeout(() => {
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          "I've received your message. In a real implementation, this would connect to your AI backend and stream a response based on your presentation context.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsBusy(false);
    }, 1500);
  }, [input, pendingImage, isBusy]);

  const handleReset = useCallback(() => {
    setMessages(INITIAL_MESSAGES);
    setInput('');
    setPendingImage(null);
    setIsBusy(false);
  }, []);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPendingImage(url);
    e.target.value = '';
  }, []);

  const slideLabel =
    selectedSlides.size === 0
      ? 'No slides'
      : selectedSlides.size === slideCount
        ? 'All slides'
        : `${selectedSlides.size} slide${selectedSlides.size > 1 ? 's' : ''}`;

  return (
    <MessageScrollerProvider>
      <Card className="flex rounded-none box-border h-full w-full flex-col gap-0 overflow-hidden border shadow-xl">
        {/* Header */}
        <CardHeader className="shrink-0 gap-0 border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <BotMessageSquare className="h-5 w-5 text-primary" />
                <span className="text-sm font-semibold">AI Assistant</span>
              </div>
              <span className="text-xs text-muted-foreground mt-0.5">
                Ask AI to make any changes
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Reset conversation"
                    onClick={handleReset}
                    disabled={isBusy}
                  >
                    <RotateCwIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-hidden p-0">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-muted-foreground">
              <BotMessageSquare className="h-10 w-10 opacity-40" />
              <div>
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs">Start a conversation about your slides</p>
              </div>
            </div>
          ) : (
            <MessageScroller>
              <MessageScrollerViewport>
                <MessageScrollerContent
                  aria-busy={isBusy}
                  className="px-4 py-4"
                >
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} />
                  ))}
                  {isBusy && (
                    <MessageScrollerItem>
                      <div className="flex justify-start">
                        <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-current"
                            style={{ animationDelay: '150ms' }}
                          />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-current"
                            style={{ animationDelay: '300ms' }}
                          />
                        </div>
                      </div>
                    </MessageScrollerItem>
                  )}
                </MessageScrollerContent>
              </MessageScrollerViewport>
              <MessageScrollerButton />
            </MessageScroller>
          )}
        </CardContent>

        {/* Footer */}
        <CardFooter className="shrink-0 flex-col gap-2 border-t bg-muted/30 p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="w-full"
          >
            <InputGroup className="h-auto">
              <InputGroupTextarea
                placeholder="Ask about your presentation..."
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isBusy}
              />
              <InputGroupAddon align="block-end" className="pt-1 gap-1.5">
                <div className="flex w-full align-middle gap-1.5">
                  {/* Model selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <InputGroupButton
                        type="button"
                        size="xs"
                        variant="outline"
                        aria-label="Select model"
                        className="max-w-28"
                      >
                        <span className="truncate text-xs font-medium">
                          {selectedModel ? selectedModel.name : 'Choose model'}
                        </span>
                        <ChevronDownIcon className="h-3 w-3 shrink-0" />
                      </InputGroupButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="w-48">
                      {models.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => setSelectedModel(model)}
                        >
                          {model.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Slide selector */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <InputGroupButton
                        type="button"
                        size="xs"
                        variant="outline"
                        aria-label="Select slides"
                        className="shrink-0 px-2"
                      >
                        <span className="truncate text-xs font-medium">
                          {slideLabel}
                        </span>
                        <ChevronDownIcon className="h-3 w-3 shrink-0" />
                      </InputGroupButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="w-48">
                      <DropdownMenuCheckboxItem
                        checked={allSlidesSelected}
                        onCheckedChange={toggleAllSlides}
                      >
                        Select All
                      </DropdownMenuCheckboxItem>
                      <DropdownMenuSeparator />
                      {Array.from({ length: slideCount }, (_, i) => i + 1).map(
                        (num) => (
                          <DropdownMenuCheckboxItem
                            key={num}
                            checked={selectedSlides.has(num)}
                            onCheckedChange={() => toggleSlide(num)}
                          >
                            Slide {num}
                          </DropdownMenuCheckboxItem>
                        )
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Add image button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InputGroupButton
                        type="button"
                        size="xs"
                        variant="ghost"
                        aria-label="Upload image"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isBusy}
                        className="shrink-0 border border-zinc-500 text-muted-foreground hover:text-foreground px-2"
                      >
                        <PaperclipIcon className="h-4 w-4" />
                        <span className="text-xs">Image</span>
                      </InputGroupButton>
                    </TooltipTrigger>
                    <TooltipContent>Upload image</TooltipContent>
                  </Tooltip>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {/* Send button */}
                  <InputGroupButton
                    type="submit"
                    variant="default"
                    size="icon-sm"
                    disabled={(!input.trim() && !pendingImage) || isBusy || !selectedModel || selectedSlides.size === 0}
                    className="ml-auto shrink-0"
                  >
                    <ArrowUpIcon className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                  </InputGroupButton>
                </div>
              </InputGroupAddon>
            </InputGroup>
          </form>
        </CardFooter>
      </Card>
    </MessageScrollerProvider>
  );
}
