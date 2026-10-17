'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  X,
  Maximize2,
  Minimize2,
  Paperclip,
  ArrowUp,
  FileText,
  Image as ImageIcon,
  Quote,
  Loader2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';
import { AssistantMarkdown } from './AssistantMarkdown';
import { NormalizedPaper, ResearchResult } from '@archyve/shared';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  quotedContext?: string;
  image?: {
    url: string;
    s3Key?: string;
    name: string;
    size: number;
    type: string;
    base64?: string;
  };
}

interface AssistantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  paper: NormalizedPaper | null;
  result: ResearchResult | null;
  initialQuotedText?: string | null;
  onClearQuotedText?: () => void;
}

export function AssistantSidebar({
  isOpen,
  onClose,
  paper,
  result,
  initialQuotedText,
  onClearQuotedText,
}: AssistantSidebarProps) {
  // Sidebar state
  const [isWide, setIsWide] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Staged attachments
  const [quotedContext, setQuotedContext] = useState<string | null>(null);
  const [stagedImage, setStagedImage] = useState<{
    file: File;
    previewUrl: string;
    base64: string;
  } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // DOM Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Sync initial quoted text from selection menu
  useEffect(() => {
    if (initialQuotedText) {
      setQuotedContext(initialQuotedText);
      if (onClearQuotedText) onClearQuotedText();
      // Auto-focus input when quote added
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [initialQuotedText, onClearQuotedText]);

  // Auto-scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputValue]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle image file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorNotice(null);

    // Validate size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setErrorNotice(
        `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 5MB.`
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate mime
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      setErrorNotice('Only PNG and JPEG/JPG images are allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    // Convert to base64 for Bedrock multimodal ingestion
    const reader = new FileReader();
    reader.onload = () => {
      setStagedImage({
        file,
        previewUrl,
        base64: reader.result as string,
      });
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeStagedImage = () => {
    if (stagedImage?.previewUrl) {
      URL.revokeObjectURL(stagedImage.previewUrl);
    }
    setStagedImage(null);
  };

  // Upload image to S3 backend
  const uploadImageToS3 = async (file: File): Promise<{ s3Url: string; s3Key?: string } | null> => {
    try {
      setIsUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/assistant/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to upload image to AWS S3');
      }

      const data = await res.json();
      return {
        s3Url: data.s3Url,
        s3Key: data.s3Key,
      };
    } catch (err: any) {
      console.error('S3 upload error:', err);
      setErrorNotice(`AWS S3 Upload Warning: ${err.message}. Proceeding with local image data.`);
      return null;
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle message submission
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputValue).trim();
    if ((!text && !stagedImage) || isLoading) return;

    setErrorNotice(null);

    let uploadedS3Data: { s3Url: string; s3Key?: string } | null = null;
    if (stagedImage) {
      uploadedS3Data = await uploadImageToS3(stagedImage.file);
    }

    const newUserMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      quotedContext: quotedContext || undefined,
      image: stagedImage
        ? {
            url: uploadedS3Data?.s3Url || stagedImage.previewUrl,
            s3Key: uploadedS3Data?.s3Key,
            name: stagedImage.file.name,
            size: stagedImage.file.size,
            type: stagedImage.file.type,
            base64: stagedImage.base64,
          }
        : undefined,
    };

    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setInputValue('');
    setQuotedContext(null);
    setStagedImage(null);
    setIsLoading(true);

    const assistantMsgId = `assistant-${Date.now()}`;
    // Add placeholder assistant message
    setMessages((prev) => [
      ...prev,
      {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      },
    ]);

    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
            quotedContext: m.quotedContext,
            image: m.image
              ? {
                  base64: m.image.base64,
                  type: m.image.type,
                  s3Url: m.image.url,
                }
              : undefined,
          })),
          dossier: {
            paper: paper || undefined,
            result: result || undefined,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported by browser.');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: accumulatedText } : msg
          )
        );
      }
    } catch (err: any) {
      console.error('Assistant error:', err);
      setErrorNotice(err.message || 'Failed to generate response.');
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content:
                  msg.content ||
                  `⚠️ *Unable to complete response: ${err.message || 'Unknown network error'}. Please check AWS Bedrock credentials in .env or try again.*`,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    setErrorNotice(null);
  };

  // Dynamic suggestions tailored to paper
  const suggestions = [
    'What are the key contributions of this paper?',
    'Summarize the methodology & experimental results',
    'Is there an open-access PDF available and where?',
    'What related code repositories and literature exist?',
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Mobile Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 sm:hidden transition-opacity"
        onClick={onClose}
      />

      {/* Slide-in Assistant Sidebar */}
      <aside
        style={{
          width: isWide ? 'min(680px, 50vw)' : 'min(440px, 100vw)',
        }}
        className="fixed top-0 right-0 h-[100dvh] z-50 bg-background/95 dark:bg-[#131a1a]/95 backdrop-blur-xl border-l border-border shadow-2xl flex flex-col transition-all duration-300 ease-in-out font-sans select-text"
      >
        {/* Top Header */}
        <header className="px-4 py-3 border-b border-border/70 flex items-center justify-between shrink-0 bg-card/50">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary dark:text-brand-accent shadow-2xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-semibold text-foreground text-sm tracking-tight">
                  Assistant
                </h3>
                <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  AWS Bedrock
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Reset conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsWide(!isWide)}
              className="hidden sm:inline-flex p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title={isWide ? 'Standard width' : 'Expand width'}
            >
              {isWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Subtitle matching Image 2 */}
        <div className="px-4 py-1.5 bg-muted/40 border-b border-border/40 text-[10px] sm:text-[11px] text-muted-foreground/80 font-sans flex items-center justify-between select-none">
          <span>Responses are generated using AI and may contain mistakes.</span>
          <span className="hidden sm:inline font-mono text-[9px] opacity-75">S3 + Bedrock</span>
        </div>

        {/* Error notification banner if any */}
        {errorNotice && (
          <div className="m-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">{errorNotice}</div>
            <button
              onClick={() => setErrorNotice(null)}
              className="text-amber-700 dark:text-amber-400 hover:opacity-80"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Scrollable Conversation View */}
        <div
          ref={scrollAreaRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 text-xs sm:text-[13px]"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-end pb-4 space-y-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
                  <span>Suggestions</span>
                </div>
                <div className="space-y-1.5">
                  {suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(suggestion)}
                      className="w-full text-left p-2.5 rounded-xl border border-border/70 hover:border-brand-primary/50 dark:hover:border-brand-accent/50 bg-card hover:bg-card-muted transition-all duration-150 text-foreground text-xs leading-relaxed cursor-pointer shadow-2xs group flex items-center justify-between gap-2"
                    >
                      <span className="group-hover:text-brand-primary dark:group-hover:text-brand-accent transition-colors">
                        {suggestion}
                      </span>
                      <ArrowUp className="w-3.5 h-3.5 rotate-45 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                } space-y-1`}
              >
                {/* Quoted Dossier Excerpt if attached */}
                {msg.quotedContext && (
                  <div className="max-w-[85%] rounded-lg p-2 bg-brand-primary/10 border border-brand-primary/20 text-foreground text-[11px] italic font-serif flex items-start gap-1.5 shadow-2xs">
                    <Quote className="w-3 h-3 text-brand-primary shrink-0 mt-0.5" />
                    <span className="line-clamp-3">"{msg.quotedContext}"</span>
                  </div>
                )}

                {/* Uploaded Image Thumbnail if attached */}
                {msg.image && (
                  <div className="max-w-[85%] rounded-xl overflow-hidden border border-border shadow-xs bg-card p-1">
                    <img
                      src={msg.image.url}
                      alt={msg.image.name}
                      className="max-h-48 w-auto rounded-lg object-cover"
                    />
                    <div className="px-1 pt-1 text-[10px] text-muted-foreground font-mono flex items-center justify-between gap-2">
                      <span className="truncate max-w-[140px]">{msg.image.name}</span>
                      <span>{(msg.image.size / (1024 * 1024)).toFixed(1)} MB</span>
                    </div>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`rounded-2xl px-3.5 py-2.5 max-w-[90%] ${
                    msg.role === 'user'
                      ? 'bg-neutral-900 text-neutral-100 dark:bg-neutral-100 dark:text-neutral-900 rounded-br-xs font-sans'
                      : 'bg-card border border-border/80 text-foreground rounded-bl-xs shadow-2xs w-full'
                  }`}
                >
                  {msg.role === 'user' ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div>
                      {msg.content ? (
                        <AssistantMarkdown content={msg.content} />
                      ) : (
                        <div className="flex items-center gap-2 text-muted-foreground py-1 font-mono text-xs">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
                          <span>Synthesizing response via AWS Bedrock...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <span className="text-[9px] font-mono text-muted-foreground/60 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          )}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-mono p-2 bg-card rounded-xl border border-border/60">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-primary" />
              <span>Querying AWS Bedrock Converse stream...</span>
            </div>
          )}
        </div>

        {/* Input Container (matching Image 2 bottom box) */}
        <div className="p-3 border-t border-border/70 bg-card/40 shrink-0 space-y-2">
          <div className="rounded-2xl border border-border/80 bg-background/80 dark:bg-[#1a2323]/80 p-2.5 shadow-xs focus-within:border-brand-primary/60 dark:focus-within:border-brand-accent/60 transition-colors space-y-2">
            {/* Top context badges row */}
            <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-border/40 select-none">
              {/* Dossier Indicator Chip */}
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/80 text-foreground text-[10px] font-medium border border-border/60 max-w-[200px]">
                <FileText className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="truncate">{paper?.title || 'Research Dossier'}</span>
              </div>

              {/* Quoted Text Chip */}
              {quotedContext && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary dark:text-brand-accent text-[10px] font-medium border border-brand-primary/20 max-w-[220px]">
                  <Quote className="w-3 h-3 shrink-0" />
                  <span className="truncate">"{quotedContext}"</span>
                  <button
                    type="button"
                    onClick={() => setQuotedContext(null)}
                    className="hover:opacity-75 cursor-pointer ml-0.5"
                    title="Remove excerpt"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Staged Image Chip */}
              {stagedImage && (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium border border-emerald-500/20 max-w-[220px]">
                  <ImageIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{stagedImage.file.name}</span>
                  <span className="text-[9px] opacity-75 font-mono">
                    ({(stagedImage.file.size / (1024 * 1024)).toFixed(1)}MB)
                  </span>
                  <button
                    type="button"
                    onClick={removeStagedImage}
                    className="hover:opacity-75 cursor-pointer ml-0.5"
                    title="Remove image"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Staged Image Thumbnail Preview */}
            {stagedImage && (
              <div className="relative inline-block mt-1">
                <img
                  src={stagedImage.previewUrl}
                  alt="Preview"
                  className="w-16 h-16 object-cover rounded-lg border border-border shadow-xs"
                />
                <button
                  type="button"
                  onClick={removeStagedImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:bg-neutral-800 transition-colors shadow-xs cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                quotedContext
                  ? 'Ask about this highlighted excerpt...'
                  : stagedImage
                  ? 'Ask about this uploaded image...'
                  : 'Ask a question about this dossier...'
              }
              rows={1}
              className="w-full bg-transparent resize-none border-0 p-0 text-xs sm:text-[13px] text-foreground placeholder:text-muted-foreground/70 focus:outline-hidden focus:ring-0 leading-relaxed max-h-32 font-sans"
            />

            {/* Bottom Controls Row: Paperclip attachment & Send Button */}
            <div className="flex items-center justify-between pt-1">
              {/* Paperclip Button */}
              <div className="flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                  id="assistant-file-upload"
                />
                <label
                  htmlFor="assistant-file-upload"
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
                  title="Attach PNG/JPG (max 5MB) - uploaded to AWS S3"
                >
                  {isUploadingImage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Paperclip className="w-3.5 h-3.5" />
                  )}
                </label>
                <span className="text-[10px] text-muted-foreground/60 font-mono hidden sm:inline">
                  PNG/JPG ≤5MB (AWS S3)
                </span>
              </div>

              {/* Send Button */}
              <button
                type="button"
                onClick={() => handleSendMessage()}
                disabled={(!inputValue.trim() && !stagedImage) || isLoading}
                className="w-7 h-7 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-xs cursor-pointer"
                title="Send message (Enter)"
              >
                <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
