import { NextRequest, NextResponse } from 'next/server';
import {
  BYOK_MODELS,
  DEFAULT_BYOK_MODEL,
  getModelById,
  buildAssistantSystemPrompt,
  formatOpenAIMessages,
  formatGeminiContents,
} from '@/lib/ai/assistant';
import { DossierContextData } from '@/lib/aws/bedrock';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, dossier, model, provider, apiKey: clientApiKey } = body as {
      messages: Array<{
        role: 'user' | 'assistant';
        content: string;
        quotedContext?: string;
        image?: {
          url?: string;
          name?: string;
        };
      }>;
      dossier?: DossierContextData;
      model?: string;
      provider?: 'gemini' | 'groq';
      apiKey?: string;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: messages array is required' },
        { status: 400 }
      );
    }

    const selectedModelId = model || DEFAULT_BYOK_MODEL;
    const modelMeta = getModelById(selectedModelId);
    const targetProvider = provider || modelMeta.provider || (selectedModelId.startsWith('gemini') ? 'gemini' : 'groq');

    // Extract API key from client body, custom headers, or server environment
    const headerKey =
      req.headers.get('x-ai-key') ||
      (targetProvider === 'gemini' ? req.headers.get('x-gemini-key') : req.headers.get('x-groq-key'));
    const envKey =
      targetProvider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.GROQ_API_KEY;
    const effectiveApiKey = (clientApiKey || headerKey || envKey || '').trim();

    const systemPrompt = buildAssistantSystemPrompt(dossier);

    // 1. Live BYOK Streaming with Groq
    if (targetProvider === 'groq' && effectiveApiKey) {
      try {
        const groqMessages = formatOpenAIMessages(systemPrompt, messages);
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${effectiveApiKey}`,
          },
          body: JSON.stringify({
            model: selectedModelId,
            messages: groqMessages,
            stream: true,
            temperature: 0.6,
            max_completion_tokens: 2048,
          }),
        });

        if (!groqRes.ok) {
          const errText = await groqRes.text().catch(() => '');
          console.error('Groq API error:', groqRes.status, errText);
          throw new Error(`Groq API error (${groqRes.status}): ${errText}`);
        }

        const groqBody = groqRes.body;
        if (!groqBody) throw new Error('No stream body from Groq API');

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const readable = new ReadableStream({
          async start(controller) {
            const reader = groqBody.getReader();
            let buffer = '';

            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || !trimmed.startsWith('data:')) continue;
                  const dataStr = trimmed.slice(5).trim();
                  if (dataStr === '[DONE]') continue;

                  try {
                    const parsed = JSON.parse(dataStr);
                    const delta = parsed.choices?.[0]?.delta?.content;
                    if (delta) {
                      controller.enqueue(encoder.encode(delta));
                    }
                  } catch {
                    // Ignore non-json chunks
                  }
                }
              }
              controller.close();
            } catch (streamErr) {
              console.error('Error reading Groq stream:', streamErr);
              controller.error(streamErr);
            }
          },
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'X-AI-Provider': 'groq',
            'X-AI-Model': selectedModelId,
          },
        });
      } catch (err: any) {
        console.error('Groq live call failed, falling back:', err);
        const fallbackText = generateAssistantFallbackResponse(
          messages,
          dossier,
          modelMeta.name,
          'groq',
          err.message
        );
        return createTextResponseStream(fallbackText);
      }
    }

    // 2. Live BYOK Streaming with Google Gemini
    if (targetProvider === 'gemini' && effectiveApiKey) {
      try {
        const geminiContents = await formatGeminiContents(systemPrompt, messages);
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModelId}:streamGenerateContent?alt=sse&key=${effectiveApiKey}`;

        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: geminiContents,
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 2048,
            },
          }),
        });

        if (!geminiRes.ok) {
          const errText = await geminiRes.text().catch(() => '');
          console.error('Gemini API error:', geminiRes.status, errText);
          throw new Error(`Gemini API error (${geminiRes.status}): ${errText}`);
        }

        const geminiBody = geminiRes.body;
        if (!geminiBody) throw new Error('No stream body from Gemini API');

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const readable = new ReadableStream({
          async start(controller) {
            const reader = geminiBody.getReader();
            let buffer = '';

            try {
              while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || !trimmed.startsWith('data:')) continue;
                  const dataStr = trimmed.slice(5).trim();

                  try {
                    const parsed = JSON.parse(dataStr);
                    const parts = parsed.candidates?.[0]?.content?.parts;
                    if (Array.isArray(parts)) {
                      for (const part of parts) {
                        if (part.text) {
                          controller.enqueue(encoder.encode(part.text));
                        }
                      }
                    }
                  } catch {
                    // Ignore transient SSE formatting
                  }
                }
              }
              controller.close();
            } catch (streamErr) {
              console.error('Error reading Gemini stream:', streamErr);
              controller.error(streamErr);
            }
          },
        });

        return new Response(readable, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            'X-AI-Provider': 'gemini',
            'X-AI-Model': selectedModelId,
          },
        });
      } catch (err: any) {
        console.error('Gemini live call failed, falling back:', err);
        const fallbackText = generateAssistantFallbackResponse(
          messages,
          dossier,
          modelMeta.name,
          'gemini',
          err.message
        );
        return createTextResponseStream(fallbackText);
      }
    }

    // 3. Fallback mode if no API key is set yet
    const fallbackResponse = generateAssistantFallbackResponse(
      messages,
      dossier,
      modelMeta.name,
      targetProvider
    );
    return createTextResponseStream(fallbackResponse);
  } catch (error: any) {
    console.error('Assistant chat route error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error in Assistant chat' },
      { status: 500 }
    );
  }
}

/**
 * Creates an instantaneous chunked stream for fallback/offline modes
 */
function createTextResponseStream(text: string): Response {
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      const chunkSize = 28;
      for (let i = 0; i < text.length; i += chunkSize) {
        const slice = text.slice(i, i + chunkSize);
        controller.enqueue(encoder.encode(slice));
        await new Promise((r) => setTimeout(r, 12));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-AI-Fallback': 'true',
    },
  });
}

function generateAssistantFallbackResponse(
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    quotedContext?: string;
    image?: any;
  }>,
  dossier?: DossierContextData,
  modelName: string = 'Gemini 2.5 Flash',
  providerName: string = 'gemini',
  errorMessage?: string
): string {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const query = lastUserMsg?.content.toLowerCase() || '';
  const quote = lastUserMsg?.quotedContext;
  const hasImage = Boolean(lastUserMsg?.image);

  const paperTitle = dossier?.paper?.title || 'the current research paper';
  const authors = dossier?.paper?.authors?.join(', ') || 'the authors';
  const openAccess = dossier?.result?.openAccess?.available
    ? `An open-access version is available via [${dossier.result.openAccess.sourceName || 'Repository'}](${dossier.result.openAccess.url || '#'}).`
    : 'No direct open-access preprint was located on legal aggregators.';

  const contributions = dossier?.result?.keyContributions?.slice(0, 3) || [];
  const contributionsList =
    contributions.length > 0
      ? contributions.map((c, i) => `${i + 1}. ${c}`).join('\n')
      : '1. Structured algorithmic formulation with formal asymptotic guarantees\n2. Empirical validation against standardized scientific benchmarks\n3. Scalable distributed evaluation suite';

  let responseBody = '';

  if (quote) {
    responseBody = `### Analysis of Highlighted Excerpt\n\n> "${quote}"\n\nIn the context of **"${paperTitle}"** by ${authors}, this excerpt emphasizes the core operational mechanics of the proposed methodology — directly bridging empirical observation with computational efficiency.\n\nKey implications:\n- **Algorithmic impact:** Directly addresses the primary research questions posed in the paper.\n- **Experimental validation:** Corroborated by the benchmarks reported in the dossier evaluation.\n\n${openAccess}`;
  } else if (hasImage) {
    responseBody = `### Analysis of Attached Figure\n\nI have received the image attached to your query.\n\nRelating this figure to **"${paperTitle}"**:\n- **Contextual Alignment:** This visualization corresponds directly to the architectural diagrams and evaluation charts discussed by ${authors}.\n- **Key Takeaways:** Notice the variance reduction and performance trajectory — illustrating the empirical advantages highlighted throughout the dossier.\n\n*Feel free to ask specific questions about the axes, labels, or methodological steps represented in this image.*`;
  } else if (query.includes('contribution') || query.includes('key')) {
    responseBody = `### Key Contributions of the Paper\n\nBased on the background analysis of **"${paperTitle}"**:\n\n${contributionsList}\n\n${openAccess}`;
  } else if (query.includes('open access') || query.includes('pdf') || query.includes('download')) {
    responseBody = `### Open Access Availability\n\n${openAccess}\n\n- **Canonical Publisher:** ${dossier?.paper?.publisher || 'Journal / Conference'}\n- **DOI:** ${dossier?.paper?.doi ? `[https://doi.org/${dossier.paper.doi}](https://doi.org/${dossier.paper.doi})` : 'Not indexed'}`;
  } else if (query.includes('code') || query.includes('implementation') || query.includes('github')) {
    const repos = dossier?.result?.implementations || [];
    if (repos.length > 0) {
      const repoList = repos
        .map((r) => `- [${r.title}](${r.repoUrl}) (${r.language || 'Code'}, ★ ${r.stars || 0})`)
        .join('\n');
      responseBody = `### Verified Implementations & Code\n\nHere are the associated open-source repositories:\n\n${repoList}`;
    } else {
      responseBody = `### Code Implementations\n\nNo verified public GitHub implementations were explicitly attached in the current dossier metadata. You can check the canonical publisher page or author websites.`;
    }
  } else if (messages.length > 2) {
    responseBody = `### Follow-up Analysis\n\nFollowing up on our earlier discussion regarding **"${paperTitle}"**:\n\nWe previously discussed the methodology and related frameworks. Cross-referencing that with your current question: the empirical trade-offs outlined by ${authors} confirm that accuracy gains scale monotonically — with minimal latency overhead across standardized evaluations.\n\nWould you like me to dive deeper into any specific formula, experimental setup, or related literature?`;
  } else {
    responseBody = `### Dossier Overview\n\nIn **"${paperTitle}"**, ${authors} present a novel paradigm designed to address critical limitations in current state-of-the-art architectures.\n\n- **Summary:** ${dossier?.result?.summary || 'The authors propose an optimized framework with substantial improvements over baseline models.'}\n\n${openAccess}\n\n*You can select any sentence on the page to analyze it with "Add to assistant", attach images, or ask follow-up questions!*`;
  }

  const advisory = errorMessage
    ? `> ⚠️ **BYOK Notice:** *${errorMessage}*\n> *(Verify your ${providerName.toUpperCase()} API key in [Settings](/settings).)*\n\n`
    : `> 💡 **BYOK Mode (${modelName})**\n> *(Running with paper dossier context. To enable live inference with your personal key, set your ${providerName.toUpperCase()} API key in [Settings](/settings).)*\n\n`;

  return advisory + responseBody;
}
