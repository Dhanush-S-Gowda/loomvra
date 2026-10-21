import { useState, useRef, useCallback, useEffect } from 'react';
import { API_BASE_URL, undoEdits, redoEdits } from '@/lib/api';
import {
  ArrowUpIcon,
  BotMessageSquare,
  PanelRightClose,
  PanelRightOpen,
  ImageIcon,
  RotateCwIcon,
  XIcon,
  ChevronDownIcon,
  GripVertical,
  Square,
  Undo2,
  Redo2,
  PanelsTopLeft,
  MousePointer2,
} from 'lucide-react';
import ImagePickerDialog from '@/components/ImagePickerDialog';
import { GridPulse } from '@/components/GridLoadingScreen';

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

function formatTokenCount(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return String(value);
}

function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  if (message.kind === 'reasoning') {
    return <MessageScrollerItem><div className="ml-2 border-l-2 border-border pl-3 text-xs italic text-muted-foreground whitespace-pre-wrap">{message.content}</div></MessageScrollerItem>;
  }
  if (message.kind === 'tool') {
    return <MessageScrollerItem><details className="ml-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs"><summary className="flex cursor-pointer list-none items-center gap-2 text-muted-foreground"><GridPulse size="tiny" decorative className="shrink-0" />{message.content}</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap border-t pt-2 font-mono text-[10px] text-foreground/70">{message.details || 'No details returned.'}</pre></details></MessageScrollerItem>;
  }
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
  onCaptureCurrentSlide,
  onImageReferenceModeChange,
  selectedSlideImage,
  isSelectingImageReference,
}) {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [input, setInput] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [isCapturingSlide, setIsCapturingSlide] = useState(false);
  const [pendingImage, setPendingImage] = useState(null); // { src, purpose? }
  const [imageReference, setImageReference] = useState(null);

  useEffect(() => {
    if (selectedSlideImage) setImageReference(selectedSlideImage);
  }, [selectedSlideImage]);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const socketRef = useRef(null);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isHistoryBusy, setIsHistoryBusy] = useState(false);
  const [contextUsage, setContextUsage] = useState({ promptTokens: 0, completionTokens: 0, contextLimit: 32768 });
  const streamMessageRef = useRef(null);
  const [panelWidth, setPanelWidth] = useState(360);
  const resizeRef = useRef(null);

  const startResize = useCallback((event) => {
    event.preventDefault();
    resizeRef.current = { startX: event.clientX, startWidth: panelWidth };
    const move = (moveEvent) => setPanelWidth(Math.min(560, Math.max(320, resizeRef.current.startWidth + resizeRef.current.startX - moveEvent.clientX)));
    const stop = () => { resizeRef.current = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
  }, [panelWidth]);

  useEffect(() => {
    if (!projectId) return undefined;
    const protocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws';
    const host = API_BASE_URL.replace(/^https?:\/\//, '');
    const socket = new WebSocket(`${protocol}://${host}/ws/project/${projectId}`);
    socketRef.current = socket;
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'ready') {
        setContextUsage(message.context || { promptTokens: 0, completionTokens: 0, contextLimit: 32768 });
      } else if (message.type === 'reasoning_delta') {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.kind === 'reasoning') return [...prev.slice(0, -1), { ...last, content: last.content + message.delta }];
          return [...prev, { id: crypto.randomUUID(), kind: 'reasoning', role: 'assistant', content: message.delta }];
        });
      } else if (message.type === 'text_delta') {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.kind === 'stream') return [...prev.slice(0, -1), { ...last, content: last.content + message.delta }];
          return [...prev, { id: crypto.randomUUID(), kind: 'stream', role: 'assistant', content: message.delta }];
        });
      } else if (message.type === 'tool_call_start') {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), kind: 'tool', role: 'assistant', content: `Using ${message.tool}…`, details: JSON.stringify(message.args || {}, null, 2) }]);
      } else if (message.type === 'context_usage') {
        setContextUsage(message);
      } else if (message.type === 'session_reset') {
        setContextUsage(message.context || { promptTokens: 0, completionTokens: 0, contextLimit: 32768 });
      } else if (message.type === 'edit_applied') {
        onSlidesUpdated?.([message]);
      } else if (message.type === 'clarification') {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: message.question }]);
        setIsBusy(false);
      } else if (message.type === 'complete') {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: message.message }]);
        onSlidesUpdated?.(message.changes || []);
        if (message.changes?.length) {
          setUndoStack((prev) => [...prev, message.changes]);
          setRedoStack([]);
        }
        setIsBusy(false);
        streamMessageRef.current = null;
      } else if (message.type === 'stopped') {
        if (message.changes?.length) onSlidesUpdated?.(message.changes);
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: message.message || 'Generation stopped.' }]);
        setIsBusy(false);
      } else if (message.type === 'error') {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${message.error}` }]);
        setIsBusy(false);
      }
    };
    socket.onerror = () => setIsBusy(false);
    return () => { socket.close(); socketRef.current = null; };
  }, [projectId, onSlidesUpdated]);
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
    const userText = input.trim();
    const referenceText = imageReference
      ? `Selected slide image reference (slide ${imageReference.slideNumber}): ${imageReference.src}`
      : '';
    const text = [userText, referenceText].filter(Boolean).join('\n\n');
    if ((!text && !pendingImage) || isBusy) return;
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'The editor connection is not ready yet. Please try again.' }]);
      return;
    }

    let image = pendingImage;
    try {
      if (image?.src?.startsWith('data:image/') && !image.keepInline) {
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
      slideNumbers: [...selectedSlides], images: [
        ...(imageReference ? [{ kind: 'asset', url: imageReference.src, purpose: `Reference image from slide ${imageReference.slideNumber}` }] : []),
        ...(image ? [{ kind: image.kind || 'asset', url: image.src, purpose: image.purpose }] : []),
      ],
    }));
  }, [input, pendingImage, imageReference, isBusy, projectId, selectedSlides]);

  const handleReset = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: 'The editor connection is not ready, so the saved chat context could not be cleared. Please try again.' }]);
      return;
    }
    socket.send(JSON.stringify({ type: 'reset' }));
    setMessages(INITIAL_MESSAGES);
    setInput('');
    setPendingImage(null);
    setImageReference(null);
    onImageReferenceModeChange?.(false);
    setIsBusy(false);
    setContextUsage((current) => ({ ...current, promptTokens: 0, completionTokens: 0 }));
  }, [onImageReferenceModeChange]);

  const handleStop = useCallback(() => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'stop' }));
    setIsBusy(false);
  }, []);

  const handleImageSelect = useCallback((image) => {
    const imageData = typeof image === 'string' ? { src: image } : image;
    if (!imageData?.src) return;
    setPendingImage({
      src: imageData.src,
      purpose: imageData.purpose || 'Image',
      kind: 'asset',
      keepInline: Boolean(imageData.keepInline),
    });
  }, []);

  const handleAttachCurrentSlide = useCallback(async () => {
    if (!onCaptureCurrentSlide || isBusy || isCapturingSlide) return;
    setIsCapturingSlide(true);
    try {
      const src = await onCaptureCurrentSlide();
      setPendingImage({ src, purpose: 'Current slide', kind: 'slide', keepInline: true });
    } catch (error) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setIsCapturingSlide(false);
    }
  }, [onCaptureCurrentSlide, isBusy, isCapturingSlide]);

  const handleToggleImageReferenceMode = useCallback(() => {
    onImageReferenceModeChange?.(!isSelectingImageReference);
  }, [onImageReferenceModeChange, isSelectingImageReference]);
  const moveHistory = useCallback(
    async (direction) => {
      const source = direction === 'undo' ? undoStack : redoStack;
      const last = source.length ? source[source.length - 1] : null;
      if (!last || isHistoryBusy || !projectId) return;

      const payload = last.map(({ slideNumber, target, oldCode, newCode }) => ({
        slideNumber,
        target,
        oldCode,
        newCode,
      }));

      setIsHistoryBusy(true);
      try {
        const result =
          direction === 'undo'
            ? await undoEdits(projectId, payload)
            : await redoEdits(projectId, payload);
        onSlidesUpdated?.(result.changes || []);

        if (direction === 'undo') {
          setUndoStack((prev) => prev.slice(0, -1));
          setRedoStack((prev) => [...prev, last]);
        } else {
          setRedoStack((prev) => prev.slice(0, -1));
          setUndoStack((prev) => [...prev, last]);
        }
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${error.message}` },
        ]);
      } finally {
        setIsHistoryBusy(false);
      }
    },
    [undoStack, redoStack, isHistoryBusy, projectId, onSlidesUpdated]
  );

  const handleUndo = useCallback(() => moveHistory('undo'), [moveHistory]);
  const handleRedo = useCallback(() => moveHistory('redo'), [moveHistory]);

  const slideLabel =
    selectedSlides.size === 0
      ? 'No slides'
      : selectedSlides.size === slideCount
        ? 'All slides'
        : `${selectedSlides.size} slide${selectedSlides.size > 1 ? 's' : ''}`;
  const contextTokens = contextUsage.promptTokens + contextUsage.completionTokens;
  const contextLimit = Math.max(1, contextUsage.contextLimit);
  const contextPercent = Math.min(100, (contextTokens / contextLimit) * 100);
  const contextRemaining = Math.max(0, contextLimit - contextTokens);
  const contextRemainingPercent = Math.max(0, 100 - Math.round(contextPercent));

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
      <Card className="relative flex h-full shrink-0 flex-col gap-0 overflow-hidden rounded-none border shadow-xl" style={{ width: panelWidth, backgroundColor: 'var(--chat-panel)' }}>
        <button type="button" aria-label="Resize AI Assistant" onMouseDown={startResize} className="absolute inset-y-0 left-0 z-20 flex w-2 cursor-ew-resize items-center justify-center bg-transparent hover:bg-primary/10"><GripVertical className="h-8 w-3 text-muted-foreground/40" /></button>

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
                    aria-label="Undo last AI edit"
                    onClick={handleUndo}
                    disabled={!undoStack.length || isBusy || isHistoryBusy}
                  >
                    <Undo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Redo last undone AI edit"
                    onClick={handleRedo}
                    disabled={!redoStack.length || isBusy || isHistoryBusy}
                  >
                    <Redo2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo</TooltipContent>
              </Tooltip>
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

        <CardFooter className="shrink-0 flex-col gap-2 border-t bg-[var(--chat-surface)] p-3">
          <Tooltip>
            <TooltipTrigger className="block w-full cursor-help bg-transparent p-0 text-left">
              <div className="w-full">
                <div className="mb-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-muted-foreground"><span>Context remaining</span><span className="shrink-0">{contextRemainingPercent}%</span></div>
                <div
                  role="progressbar"
                  aria-label="Context remaining"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={contextRemainingPercent}
                  className="h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${contextRemainingPercent}%` }} />
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>{formatTokenCount(contextRemaining)} tokens remaining of {formatTokenCount(contextLimit)} available ({contextRemainingPercent}% remaining)</TooltipContent>
          </Tooltip>
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
          {imageReference && (
            <div className="flex w-full items-start justify-between gap-2 rounded-md border bg-background px-2.5 py-2 text-xs">
              <span className="min-w-0 break-all text-muted-foreground">Image reference: {imageReference.src}</span>
              <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" aria-label="Remove image reference" onClick={() => setImageReference(null)}>
                <XIcon className="size-3.5" />
              </button>
            </div>
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

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InputGroupButton
                        type="button"
                        size="xs"
                        variant="ghost"
                        aria-label={isCapturingSlide ? 'Preparing slide image' : 'Attach current slide as an image'}
                        aria-busy={isCapturingSlide}
                        onClick={handleAttachCurrentSlide}
                        disabled={isBusy || isCapturingSlide || !onCaptureCurrentSlide}
                        className="shrink-0 border border-zinc-500 px-2 text-muted-foreground hover:text-foreground"
                      >
                        {isCapturingSlide ? <GridPulse size="tiny" decorative className="shrink-0" /> : <PanelsTopLeft className="h-4 w-4" />}
                      </InputGroupButton>
                    </TooltipTrigger>
                    <TooltipContent>Send the currently open slide as an image attachment with your prompt.</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InputGroupButton
                        type="button"
                        size="xs"
                        variant={isSelectingImageReference ? 'secondary' : 'ghost'}
                        aria-label={isSelectingImageReference ? 'Cancel image reference selection' : 'Select slide image as reference'}
                        aria-pressed={isSelectingImageReference}
                        onClick={handleToggleImageReferenceMode}
                        disabled={isBusy || !onImageReferenceModeChange}
                        className={`shrink-0 border border-zinc-500 px-2 ${isSelectingImageReference ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        <MousePointer2 className="h-4 w-4" />
                      </InputGroupButton>
                    </TooltipTrigger>
                    <TooltipContent>{isSelectingImageReference ? 'Click an image on the slide, or click again to cancel' : 'Select an image on the slide as a reference'}</TooltipContent>
                  </Tooltip>

                  {isBusy ? (
                    <InputGroupButton type="button" variant="default" size="icon-sm" onClick={handleStop} className="ml-auto shrink-0" aria-label="Stop generation">
                      <Square className="h-3.5 w-3.5 fill-current" />
                      <span className="sr-only">Stop</span>
                    </InputGroupButton>
                  ) : <InputGroupButton
                    type="submit"
                    variant="default"
                    size="icon-sm"
                    disabled={!input.trim() && !pendingImage && !imageReference}
                    className="ml-auto shrink-0"
                  >
                    <ArrowUpIcon className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                  </InputGroupButton>}
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
