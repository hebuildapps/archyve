'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  ArrowUp,
  ChevronDown,
  X,
  Copy,
  Check,
  RotateCcw,
  Loader2,
  Quote,
  Image as ImageIcon,
} from 'lucide-react';
import { AssistantMarkdown } from './AssistantMarkdown';
import { CEREBRAS_MODELS, CerebrasModel, DEFAULT_CEREBRAS_MODEL } from '@/lib/ai/cerebras';
import { NormalizedPaper, ResearchResult } from '@archyve/shared';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  quotedContext?: string;
  image?: {
    url: string;
    name: string;
    size: number;
  };
}

interface ChatboxProps {
  paper: NormalizedPaper | null;
  result: ResearchResult | null;
  initialQuotedText?: string | null;
  onClearQuotedText?: () => void;
}

type ChatboxViewMode = 'bar' | 'box' | 'sidebar';

export function Chatbox({
  paper,
  result,
  initialQuotedText,
  onClearQuotedText,
}: ChatboxProps) {
  // Mounting state for React Portal to document.body
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // View mode: 'bar' (minimized), 'box' (bottom expanded), 'sidebar' (floating sidebar window)
  const [viewMode, setViewMode] = useState<ChatboxViewMode>('bar');
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_CEREBRAS_MODEL);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);

  // Height state for bottom box mode
  const [boxHeight, setBoxHeight] = useState<number>(440);
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartHeightRef = useRef(0);

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Staged attachments
  const [quotedContext, setQuotedContext] = useState<string | null>(null);
  const [stagedImage, setStagedImage] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);

  // DOM Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // Read saved welcome dismissal preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem('archyve_welcome_dismissed');
      if (dismissed === 'true') {
        setShowWelcome(false);
      }
    }
  }, []);

  const handleDismissWelcome = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowWelcome(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('archyve_welcome_dismissed', 'true');
    }
  };

  // Close model menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setIsModelMenuOpen(false);
      }
    };
    if (isModelMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isModelMenuOpen]);

  // Handle initial quoted text passed from TextSelectionMenu
  useEffect(() => {
    if (initialQuotedText) {
      setQuotedContext(initialQuotedText);
      if (viewMode === 'bar') {
        setViewMode('box');
      }
      if (onClearQuotedText) onClearQuotedText();
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [initialQuotedText, onClearQuotedText, viewMode]);

  // Global Ctrl+I / Cmd+I to toggle chatbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setViewMode((prev) => (prev === 'bar' ? 'box' : 'bar'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-scroll messages to bottom
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

  // Height resize drag listeners for box mode
  const handleDragStart = (e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartHeightRef.current = boxHeight;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = dragStartYRef.current - moveEvent.clientY;
      const newHeight = Math.max(280, Math.min(window.innerHeight * 0.85, dragStartHeightRef.current + deltaY));
      setBoxHeight(newHeight);
    };

    const handlePointerUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Toggle height presets on double click or click
  const handleExtendClick = () => {
    setBoxHeight((prev) => (prev < 420 ? 520 : prev < 600 ? 680 : 360));
  };

  // File upload handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please upload a smaller image.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const validMimes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validMimes.includes(file.type.toLowerCase())) {
      alert('Only PNG, JPG, and JPEG images are supported.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setStagedImage({ file, previewUrl });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeStagedImage = () => {
    if (stagedImage?.previewUrl) {
      URL.revokeObjectURL(stagedImage.previewUrl);
    }
    setStagedImage(null);
  };

  // Copy assistant message to clipboard (matching Image 3 copy button)
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputValue).trim();
    if ((!text && !stagedImage) || isLoading) return;

    // Ensure view mode is open
    if (viewMode === 'bar') {
      setViewMode('box');
    }

    let uploadedImageUrl = stagedImage?.previewUrl || '';
    if (stagedImage) {
      try {
        const formData = new FormData();
        formData.append('file', stagedImage.file);
        const uploadRes = await fetch('/api/assistant/upload', {
          method: 'POST',
          body: formData,
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          if (data.s3Url) uploadedImageUrl = data.s3Url;
        }
      } catch (err) {
        console.warn('Image upload error:', err);
      }
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
      quotedContext: quotedContext || undefined,
      image: stagedImage
        ? {
          url: uploadedImageUrl,
          name: stagedImage.file.name,
          size: stagedImage.file.size,
        }
        : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setQuotedContext(null);
    setStagedImage(null);
    setIsLoading(true);

    const assistantMsgId = `assistant-${Date.now()}`;
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
            image: m.image,
          })),
          dossier: {
            paper: paper || undefined,
            result: result || undefined,
          },
          model: selectedModelId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported by browser.');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;

        setMessages((prev) =>
          prev.map((msg) => (msg.id === assistantMsgId ? { ...msg, content: accumulated } : msg))
        );
      }
    } catch (err: any) {
      console.error('Cerebras assistant error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
              ...msg,
              content:
                msg.content ||
                `⚠️ *Inference error: ${err.message || 'Unknown network error'}. Please check Cerebras configuration in .env.*`,
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

  const currentModel =
    CEREBRAS_MODELS.find((m) => m.id === selectedModelId) || CEREBRAS_MODELS[0];

  const isSidebar = viewMode === 'sidebar';
  const isOpen = viewMode !== 'bar';

  if (!mounted) return null;

  return createPortal(
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9980] bg-black/40 backdrop-blur-2xs sm:hidden"
          onClick={() => setViewMode('bar')}
        />
      )}

      <div
        style={{
          position: 'fixed',
          right: isSidebar ? '24px' : '20px',
          bottom: '20px',
          top: isSidebar ? '24px' : undefined,
          height: isSidebar ? 'calc(100vh - 3rem)' : isOpen ? `${boxHeight}px` : undefined,
          width: isSidebar ? '440px' : 'min(460px, calc(100vw - 2.5rem))',
          zIndex: 9990,
        }}
        className={`archyve-chat fixed z-[9990] flex flex-col font-sans ${isSidebar
          ? 'archyve-glass-shell rounded-[26px]'
          : isOpen
            ? 'rounded-[26px] archyve-glass-shell'
            : ''
          }`}
      >
        {!isSidebar && isOpen && (
          <div
            onPointerDown={handleDragStart}
            onClick={handleExtendClick}
            className="w-full flex items-center justify-center pt-2 pb-1 cursor-ns-resize group select-none shrink-0"
            title="Drag or click to adjust chatbox height"
          >
            <div className="h-[3px] w-9 rounded-full bg-white/25 transition-colors group-hover:bg-white/40 group-active:bg-white/55" />
          </div>
        )}

        {isOpen && (
        <header className="flex shrink-0 select-none items-center justify-between px-3.5 py-1.5 text-[#9a9aa0]">
          {/* Left SVG Button: Bottom pointing chevron (close/shove down to bar) */}
          <button
            type="button"
            onClick={() => setViewMode('bar')}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#9a9aa0] transition-colors hover:bg-white/6 hover:text-[#f4f4f5]"
            title="Minimize to bar"
          >
            <ChevronDown className="h-4 w-4" strokeWidth={1.75} />
          </button>

          {/* Center Brand / Context Info */}
          <div className="flex max-w-[220px] items-center text-[12px] font-medium tracking-[-0.01em] text-[#c8c8cc]">
            <span className="truncate">
              {paper?.title || 'Archyve'}
            </span>
          </div>

          {/* Right SVG Buttons: Refresh & Pop-out (->|) */}
          <div className="flex items-center gap-1">
            {/* Refresh (Clear conversation) */}
            <button
              type="button"
              onClick={() => {
                setMessages([]);
                setQuotedContext(null);
                setStagedImage(null);
              }}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#9a9aa0] transition-colors hover:bg-white/6 hover:text-[#f4f4f5]"
              title="Clear conversation"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>

            {/* Pop-out button (->|): makes bar into floating sidebar window */}
            <button
              type="button"
              onClick={() => setViewMode(isSidebar ? 'box' : 'sidebar')}
              className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-white/6 ${isSidebar ? 'bg-white/8 text-[#f4f4f5]' : 'text-[#9a9aa0] hover:text-[#f4f4f5]'
                }`}
              title={isSidebar ? 'Dock back to bottom box' : 'Pop out into floating sidebar window'}
            >
              {/* Exact SVG ->| matching Image 3 */}
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="12" x2="15" y2="12" />
                <polyline points="10 7 15 12 10 17" />
                <line x1="20" y1="4" x2="20" y2="20" />
              </svg>
            </button>

            {isSidebar && (
              <button
                type="button"
                onClick={() => setViewMode('bar')}
                className="ml-0.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#9a9aa0] transition-colors hover:bg-white/6 hover:text-[#f4f4f5]"
                title="Close"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            )}
          </div>
        </header>
        )}

        {isOpen && (
        <div
          ref={scrollAreaRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-2 text-[13px]"
        >

          {/* Quick suggestions when empty */}
          {messages.length === 0 && !showWelcome && (
            <div className="h-full flex flex-col justify-end pb-2 space-y-2 select-none">
              <span className="text-[11px] font-medium tracking-[-0.01em] text-[#8e8e93]">
                Suggested queries
              </span>
              <div className="space-y-1.5">
                {[
                  'What are the key contributions of this paper?',
                  'Summarize the methodology & experimental results',
                  'Is there an open-access PDF available and where?',
                ].map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(s)}
                    className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-white/8 bg-white/4 p-2.5 text-left text-[13px] text-[#e4e4e7] transition-colors hover:bg-white/7"
                  >
                    <span>{s}</span>
                    <ArrowUp className="h-3.5 w-3.5 rotate-45 text-[#9a9aa0]" strokeWidth={1.75} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message List */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'
                } space-y-1`}
            >
              {/* Highlighted text quote if attached */}
              {msg.quotedContext && (
                <div className="flex max-w-[88%] items-start gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2 font-sans text-[12px] italic text-[#d4d4d8]">
                  <Quote className="mt-0.5 h-3 w-3 shrink-0 text-[#a1a1aa]" strokeWidth={1.75} />
                  <span className="line-clamp-2">"{msg.quotedContext}"</span>
                </div>
              )}

              {/* Uploaded image preview if attached */}
              {msg.image && (
                <a
                  href={msg.image.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex max-w-[260px] items-center gap-1.5 rounded-full border border-white/10 bg-white/6 pl-1 pr-2.5 py-0.5 text-[11px] font-medium text-[#e4e4e7] hover:bg-white/10 transition-colors group cursor-pointer"
                  title="Click to view full image"
                >
                  <img
                    src={msg.image.url}
                    alt={msg.image.name}
                    className="h-4 w-4 rounded-[4px] object-cover shrink-0 border border-white/20 group-hover:opacity-90"
                  />
                  <span className="truncate">{msg.image.name}</span>
                </a>
              )}

              {/* Message Content Bubble */}
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 ${msg.role === 'user'
                  ? 'rounded-br-xs bg-white/8 font-sans text-[#f4f4f5]'
                  : 'w-full rounded-bl-xs border border-white/8 bg-white/4 text-[#e4e4e7]'
                  }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                ) : (
                  <div>
                    {msg.content ? (
                      <div>
                        <AssistantMarkdown content={msg.content} />

                        {/* Copy button at bottom left of assistant response (Image 3) */}
                        <div className="pt-2 flex items-center justify-start border-t border-neutral-700/40 mt-2 select-none">
                          <button
                            type="button"
                            onClick={() => handleCopyMessage(msg.id, msg.content)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md p-1 font-sans text-[12px] text-[#9a9aa0] transition-colors hover:text-[#f4f4f5]"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-[#d4d4d8]" strokeWidth={1.75} />
                                <span className="text-[11px] text-[#d4d4d8]">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                                <span className="text-[11px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 py-1 text-[13px] text-[#9a9aa0]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-[#c8c8cc]" strokeWidth={1.75} />
                        <span>Synthesizing response...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/4 p-2 text-[13px] text-[#9a9aa0]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[#c8c8cc]" strokeWidth={1.75} />
              <span>Generating (~{currentModel.speed})...</span>
            </div>
          )}
        </div>
        )}

        <div className={`shrink-0 select-none ${isOpen ? 'mx-3 mb-3' : ''}`}>
          {showWelcome && !isSidebar && (
            <div className="archyve-glass-panel relative rounded-t-[22px] border-b-0 px-[18px] pb-3.5 pt-[15px] text-left shadow-none">
              <div className="flex items-start justify-between gap-4">
                <h4 className="pt-px text-[15px] font-medium leading-none tracking-[-0.015em] text-[#f4f4f5]">
                  Welcome to Archyve!
                </h4>
                <button
                  type="button"
                  onClick={handleDismissWelcome}
                  className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-[#8d8d92] transition-colors hover:text-[#f4f4f5]"
                  title="Dismiss welcome message"
                  aria-label="Dismiss welcome message"
                >
                  <X className="h-[15px] w-[15px]" strokeWidth={1.75} />
                </button>
              </div>
              <p className="mt-[9px] text-[13px] font-normal leading-[1.45] tracking-[-0.006em] text-[#b7b7bc]">
                Archyve helps you read and dissect academic papers—and supports your research with
                explanations, methodology breakdowns, citations, and summaries.
              </p>
            </div>
          )}
          {/* Staged attachments preview */}
          {(quotedContext || stagedImage) && (
            <div className="flex flex-wrap items-center gap-1.5 pb-2">
              {quotedContext && (
                <div className="inline-flex max-w-[280px] items-center gap-1 rounded-full border border-white/10 bg-white/6 px-2.5 py-0.5 text-[11px] font-medium text-[#d4d4d8]">
                  <Quote className="h-3 w-3 shrink-0 text-[#a1a1aa]" strokeWidth={1.75} />
                  <span className="truncate">"{quotedContext}"</span>
                  <button
                    type="button"
                    onClick={() => setQuotedContext(null)}
                    className="hover:opacity-75 cursor-pointer ml-1"
                  >
                    <X className="h-3 w-3" strokeWidth={1.75} />
                  </button>
                </div>
              )}

              {stagedImage && (
                <div className="inline-flex max-w-[240px] items-center gap-1.5 rounded-full border border-white/10 bg-white/6 pl-1 pr-2 py-0.5 text-[11px] font-medium text-[#e4e4e7] backdrop-blur-xs">
                  {stagedImage.previewUrl ? (
                    <img
                      src={stagedImage.previewUrl}
                      alt={stagedImage.file.name}
                      className="h-4 w-4 rounded-[4px] object-cover shrink-0 border border-white/20"
                    />
                  ) : (
                    <ImageIcon className="h-3 w-3 shrink-0 text-[#a1a1aa]" strokeWidth={1.75} />
                  )}
                  <span className="truncate">{stagedImage.file.name}</span>
                  <button
                    type="button"
                    onClick={removeStagedImage}
                    className="hover:text-white text-[#a1a1aa] transition-colors cursor-pointer ml-0.5"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" strokeWidth={1.75} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Main Input Box container */}
          <div
            className={`archyve-glass-input flex min-h-[92px] cursor-text flex-col justify-between px-2.5 pb-2.5 pt-3 transition-colors ${showWelcome && !isSidebar ? 'rounded-b-[26px] rounded-t-none' : 'rounded-[26px]'}`}
            onClick={() => textareaRef.current?.focus()}
          >
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything"
              rows={1}
              className="w-full resize-none border-0 bg-transparent px-1.5 py-0 text-[15px] leading-snug tracking-[-0.011em] text-[#f4f4f5] placeholder:text-[#8e8e93] focus:outline-hidden focus:ring-0 max-h-32"
            />

            {/* Bottom Row inside input box: + on left, Model Picker + White Send Button on right */}
            <div className="flex items-center justify-between pt-1.5">
              {/* Left: + icon button for attachments */}
              <div className="flex items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-[#c8c8cc] transition-colors hover:bg-white/6 hover:text-white"
                  title="Attach file (PNG, JPG ≤5MB)"
                >
                  <Plus className="h-[17px] w-[17px]" strokeWidth={1.6} />
                </label>
              </div>

              {/* Right: Model Picker Dropdown & White Send Button */}
              <div className="relative flex items-center gap-1">
                {/* Model Picker Trigger */}
                <div ref={modelMenuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                    className="inline-flex h-8 cursor-pointer select-none items-center gap-1 rounded-lg px-2 font-sans text-[13px] font-medium tracking-[-0.01em] text-[#d4d4d8] transition-colors hover:bg-white/6 hover:text-white"
                  >
                    <span>{currentModel.shortName}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-[#9a9aa0]" strokeWidth={1.75} />
                  </button>

                  {/* Model Picker Popover Menu */}
                  {isModelMenuOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 8px)',
                        right: 0,
                        zIndex: 9999,
                      }}
                      className="archyve-glass-menu absolute bottom-full right-0 z-[9999] mb-0 w-[248px] rounded-xl p-1.5 text-left shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="mb-1 border-b border-white/8 px-2 py-1 text-[11px] font-medium tracking-[-0.01em] text-[#8e8e93]">
                        Models
                      </div>
                      <div className="space-y-0.5">
                        {CEREBRAS_MODELS.map((m) => {
                          const isSelected = m.id === selectedModelId;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedModelId(m.id);
                                setIsModelMenuOpen(false);
                              }}
                              className={`flex w-full cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[13px] transition-colors ${isSelected
                                ? 'bg-white/8 font-medium text-white'
                                : 'text-[#d4d4d8] hover:bg-white/6 hover:text-white'
                                }`}
                            >
                              <div className="flex flex-col">
                                <span className="font-sans">{m.name}</span>
                                <span className="text-[11px] text-[#8e8e93]">
                                  {m.parameters} · {m.speed}
                                </span>
                              </div>
                              {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#e4e4e7]" strokeWidth={1.75} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* White Circular Send Button with Dark Arrow Up (Image 1 & 3 exact style) */}
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={(!inputValue.trim() && !stagedImage) || isLoading}
                  className="relative z-10 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-[0_1px_2px_rgba(0,0,0,0.35)] transition-all hover:bg-[#f4f4f5] active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
                  title="Send (Enter)"
                >
                  <ArrowUp className="h-4 w-4" strokeWidth={2.25} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
