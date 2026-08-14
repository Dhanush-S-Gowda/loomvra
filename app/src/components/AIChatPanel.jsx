import { useState, useRef, useCallback, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import {
  ArrowUpIcon,
  BotMessageSquare,
  PanelRightClose,
  PanelRightOpen,
  ImageIcon,
  RotateCwIcon,
  XIcon,
  ChevronDownIcon,
} from 'lucide-react';
import ImagePickerDialog from '@/components/ImagePickerDialog';

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
import {
  Attachment,
  AttachmentActions,
  AttachmentAction,
  AttachmentContent,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment';

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
          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted text-foreground rounded-bl-sm'
          }`}
        >
          {message.image && (
            <Attachment
              orientation="horizontal"
              className="mb-2 w-full max-w-[240px] bg-background/60 ring-1 ring-foreground/10"
            >
              <AttachmentMedia variant="image">
                <img src={message.image.src || message.image} alt="Attached" />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>
                  {message.image.purpose || 'Image'}
                </AttachmentTitle>
              </AttachmentContent>
            </Attachment>
          )}
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    </MessageScrollerItem>
  );
}

export function AIChatPanel({
  projectId,
  slideCount = 0,
  onSlidesUpdated,
}) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [pendingImage, setPendingImage] = useState(null); // { src, purpose? }
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!projectId) return undefined;
    const protocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const host = API_BASE_URL.replace(/^https?:\/\//, '');
    const socket = new WebSocket(`${protocol}://${host}/ws/project/${projectId}`);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'clarification') {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: message.question }]);
        setIsBusy(false);
      } else if (message.type === 'complete') {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: message.message }]);
        onSlidesUpdated?.(message.changes || []);
        setIsBusy(false);
      } else if (message.type === 'error') {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${message.error}` }]);
        setIsBusy(false);
      }
    };
    socket.onerror = () => setIsBusy(false);
    return () => { socket.close(); socketRef.current = null; };
  }, [projectId, onSlidesUpdated]);

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

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if ((!text && !pendingImage) || isBusy) return;
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'The editor connection is not ready yet. Please try again.' }]);
      return;
    }

    let image = pendingImage;
    try {
      if (image?.src?.startsWith('data:image/')) {
        const response = await fetch(`${API_BASE_URL}/project/${projectId}/images`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: image.src, purpose: image.purpose }),
        });
        const uploaded = await response.json();
        if (!response.ok) throw new Error(uploaded.error || 'Image upload failed');
        image = { ...image, src: uploaded.url };
      }
    } catch (error) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${error.message}` }]);
      return;
    }

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', content: text, image }]);
    setInput('');
    setPendingImage(null);
    setIsBusy(true);
    socket.send(JSON.stringify({
      type: 'edit', prompt: text || 'Use the attached image in the most appropriate selected slide.',
      slideNumbers: [...selectedSlides], images: image ? [{ url: image.src, purpose: image.purpose }] : [],
    }));
  }, [input, pendingImage, isBusy, projectId, selectedSlides]);

  const handleReset = useCallback(() => {
    setMessages(INITIAL_MESSAGES);
    setInput('');
    setPendingImage(null);
    setIsBusy(false);
  }, []);

  const handleImageSelect = useCallback((image) => {
    const imageData = typeof image === 'string' ? { src: image } : image;
    if (!imageData?.src) return;
    setPendingImage({
      src: imageData.src,
      purpose: imageData.purpose || 'Image',
    });
  }, []);

  const slideLabel =
    selectedSlides.size === 0
      ? 'No slides'
      : selectedSlides.size === slideCount
        ? 'All slides'
        : `${selectedSlides.size} slide${selectedSlides.size > 1 ? 's' : ''}`;

  return (
    <MessageScrollerProvider>
      {collapsed ? (
        <div className="flex h-full w-12 shrink-0 flex-col items-center border-l bg-background py-3">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Open AI Assistant"
            onClick={() => setCollapsed(false)}
            className="shrink-0"
          >
            <PanelRightOpen className="size-4" />
          </Button>
          <div className="mt-3 flex flex-1 items-center justify-center [writing-mode:vertical-rl] rotate-180">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <BotMessageSquare className="size-4" /> AI Assistant
            </span>
          </div>
        </div>
      ) : (
      <Card className="flex h-full w-72 shrink-0 flex-col gap-0 overflow-hidden rounded-none border shadow-xl">
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
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Collapse AI Assistant"
                onClick={() => setCollapsed(true)}
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
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
          {pendingImage && (
            <Attachment
              orientation="horizontal"
              className="w-full bg-background ring-1 ring-foreground/10"
            >
              <AttachmentMedia variant="image">
                <img src={pendingImage.src} alt="Pending attachment" />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>
                  {pendingImage.purpose || 'Image ready to send'}
                </AttachmentTitle>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction
                  aria-label="Remove image"
                  onClick={() => setPendingImage(null)}
                >
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="w-full"
          >
            <InputGroup className="h-auto ring-3 ring-ring/50">
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

                  {/* Add image button — opens upload / Pexels picker */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InputGroupButton
                        type="button"
                        size="xs"
                        variant="ghost"
                        aria-label="Add image"
                        onClick={() => setImagePickerOpen(true)}
                        disabled={isBusy}
                        className="shrink-0 border border-zinc-500 text-muted-foreground hover:text-foreground px-2"
                      >
                        <ImageIcon className="h-4 w-4" />
                        <span className="text-xs">Image</span>
                      </InputGroupButton>
                    </TooltipTrigger>
                    <TooltipContent>Upload or search Pexels</TooltipContent>
                  </Tooltip>

                  {/* Send button */}
                  <InputGroupButton
                    type="submit"
                    variant="default"
                    size="icon-sm"
                    disabled={(!input.trim() && !pendingImage) || isBusy}
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
      )}

      <ImagePickerDialog
        open={imagePickerOpen}
        onOpenChange={setImagePickerOpen}
        onSelect={handleImageSelect}
      />
    </MessageScrollerProvider>
  );
}
