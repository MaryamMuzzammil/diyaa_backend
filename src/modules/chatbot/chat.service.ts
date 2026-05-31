import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { Repository } from 'typeorm';
import { ChatActorContext } from './chat-actor.service';
import { ChatMessage } from './entities/chat-message.entity';

export type SourceType =
  | 'dataset'
  | 'ai'
  | 'dataset+ai'
  | 'system'
  | 'error';

export type ChatResult = {
  answer: string;
  source: SourceType;
  confidence?: number;
};

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);
  private qaData: Record<string, unknown>[] = [];
  private summaryData: Record<string, unknown>[] = [];
  private datasetsReady = false;

  private readonly apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  private readonly greetings = new Set([
    'hi',
    'hello',
    'hey',
    'assalam',
    'assalamualaikum',
    'salam',
    'hii',
    'helo',
  ]);

  /** Lesson-plan / teacher-guide text — not for students */
  private readonly teacherMarkers = [
    'information for teachers',
    'duration / no of periods',
    'materials /',
    'while teaching the lesson',
    'consult the textbook at all steps',
  ];

  private readonly maxDirectAnswerChars = 420;
  private readonly maxContextSnippetChars = 600;

  constructor(
    private config: ConfigService,
    @InjectRepository(ChatMessage)
    private messageRepo: Repository<ChatMessage>,
  ) {}

  onModuleInit() {
    this.loadDatasets();
  }

  private get apiKey(): string | undefined {
    return this.config.get<string>('GROQ_API_KEY');
  }

  private resolveDatasetPath(filename: string): string {
    const candidates = [
      path.join(process.cwd(), 'src', 'chatbot', filename),
      path.join(process.cwd(), 'dist', 'chatbot', filename),
      path.join(__dirname, '..', '..', 'chatbot', filename),
    ];
    const found = candidates.find((p) => fs.existsSync(p));
    if (!found) {
      throw new Error(
        `Dataset not found: ${filename}. Expected under src/chatbot/`,
      );
    }
    return found;
  }

  private loadDatasets() {
    try {
      const qaPath = this.resolveDatasetPath('QA.json');
      const summariesPath = this.resolveDatasetPath('Summaries.json');

      this.qaData = JSON.parse(fs.readFileSync(qaPath, 'utf-8')) as Record<
        string,
        unknown
      >[];
      const summaryRaw = JSON.parse(
        fs.readFileSync(summariesPath, 'utf-8'),
      ) as unknown;
      this.summaryData = this.flattenSummaries(summaryRaw);
      this.datasetsReady = true;
      this.logger.log(
        `Chat datasets loaded (QA: ${this.qaData.length}, summaries: ${this.summaryData.length})`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to load chat datasets: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private flattenSummaries(data: unknown): Record<string, unknown>[] {
    const result: Record<string, unknown>[] = [];

    const walk = (item: unknown) => {
      if (Array.isArray(item)) {
        item.forEach(walk);
      } else if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        if (row.topic || row.short_explanation || row.key_points) {
          result.push(row);
        }
        Object.values(row).forEach((value) => {
          if (typeof value === 'object' && value !== null) walk(value);
        });
      }
    };

    walk(data);
    return result;
  }

  async chat(question: string): Promise<ChatResult> {
    if (!this.datasetsReady) {
      this.loadDatasets();
    }

    const cleanQuestion = question?.trim();

    if (!cleanQuestion) {
      return {
        answer: 'Please type a question.',
        source: 'system',
      };
    }

    const lowerQuestion = cleanQuestion.toLowerCase();

    if (this.greetings.has(lowerQuestion)) {
      return {
        answer: 'Hello! 😊 What would you like to learn today?',
        source: 'system',
      };
    }

    const ragResult = this.retrieveRelevantContext(cleanQuestion);

    // Only return dataset verbatim when the *question* closely matches and answer is kid-safe
    if (
      ragResult.bestDirectAnswer &&
      ragResult.questionMatchScore >= 0.82 &&
      this.isStudentFriendlyText(ragResult.bestDirectAnswer)
    ) {
      return {
        answer: ragResult.bestDirectAnswer.trim(),
        source: 'dataset',
        confidence: ragResult.questionMatchScore,
      };
    }

    return this.askGroqWithContext(cleanQuestion, ragResult.context);
  }

  async chatAndSave(actor: ChatActorContext, question: string) {
    const result = await this.chat(question);

    const saved = await this.messageRepo.save(
      this.messageRepo.create({
        user_id: actor.user_id,
        user_name: actor.user_name,
        user_role: actor.user_role,
        institute_id: actor.institute_id,
        profile_id: actor.profile_id,
        profile_type: actor.profile_type,
        question: question.trim(),
        answer: result.answer,
        source: result.source,
        confidence: result.confidence ?? null,
      }),
    );

    return {
      message_id: saved.id,
      answer: result.answer,
      source: result.source,
      confidence: result.confidence,
      created_at: saved.created_at,
    };
  }

  async getHistory(userId: number, limit = 30) {
    const rows = await this.messageRepo.find({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      take: limit,
    });

    return rows.map((r) => ({
      message_id: r.id,
      question: r.question,
      answer: r.answer,
      source: r.source,
      confidence: r.confidence,
      created_at: r.created_at,
    }));
  }

  private isTeacherFacingText(text: string): boolean {
    const lower = text.toLowerCase();
    return this.teacherMarkers.some((m) => lower.includes(m));
  }

  private isStudentFriendlyText(text: string): boolean {
    const trimmed = text?.trim() ?? '';
    if (!trimmed) return false;
    if (trimmed.length > this.maxDirectAnswerChars) return false;
    if (this.isTeacherFacingText(trimmed)) return false;
    return true;
  }

  private clipForContext(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return '';
    if (trimmed.length <= this.maxContextSnippetChars) return trimmed;
    return `${trimmed.slice(0, this.maxContextSnippetChars)}…`;
  }

  private retrieveRelevantContext(question: string) {
    const q = this.normalize(question);
    const qTokens = this.tokenize(q);

    let bestDirectAnswer: string | null = null;
    let questionMatchScore = 0;

    const candidates: {
      score: number;
      source: string;
      text: string;
    }[] = [];

    for (const item of this.qaData) {
      const datasetQuestion = String(item?.question ?? '').trim();
      const answer = String(item?.answer ?? '').trim();
      if (!datasetQuestion || !this.isStudentFriendlyText(answer)) {
        continue;
      }

      const questionScore = this.calculateScore(q, qTokens, datasetQuestion);

      if (questionScore > questionMatchScore) {
        questionMatchScore = questionScore;
        bestDirectAnswer = answer;
      }

      if (questionScore >= 0.4) {
        candidates.push({
          score: questionScore,
          source: 'QA.json',
          text: `Question: ${datasetQuestion}\nAnswer: ${this.clipForContext(answer)}`,
        });
      }
    }

    for (const item of this.summaryData) {
      const topic = String(item?.topic ?? '').trim();
      const explanation = String(
        item?.short_explanation ?? item?.explanation ?? '',
      ).trim();
      const keyPoints = Array.isArray(item?.key_points)
        ? (item.key_points as string[])
            .filter((p) => typeof p === 'string' && p.length < 200)
            .slice(0, 5)
            .join('\n- ')
        : '';

      if (this.isTeacherFacingText(explanation)) {
        continue;
      }

      const searchText = `${topic} ${explanation}`;
      const score = this.calculateScore(q, qTokens, searchText);

      if (score >= 0.35 && explanation) {
        candidates.push({
          score,
          source: 'Summaries.json',
          text: `Topic: ${topic}\nExplanation: ${this.clipForContext(explanation)}${
            keyPoints ? `\nKey Points:\n- ${keyPoints}` : ''
          }`,
        });
      }
    }

    const topCandidates = candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    const context = topCandidates
      .map(
        (item, index) =>
          `[Context ${index + 1} | Score: ${item.score.toFixed(2)}]\n${item.text}`,
      )
      .join('\n\n');

    return {
      bestDirectAnswer,
      questionMatchScore,
      context,
    };
  }

  private calculateScore(
    normalizedQuestion: string,
    questionTokens: string[],
    targetText: string,
  ) {
    const normalizedTarget = this.normalize(targetText);
    const targetTokens = this.tokenize(normalizedTarget);

    if (!normalizedTarget) return 0;

    // Require at least 2 meaningful tokens to avoid "noun" matching random lessons
    if (questionTokens.length < 2 && normalizedQuestion.length < 12) {
      const single = questionTokens[0] ?? '';
      if (single && normalizedTarget.split(' ').includes(single)) {
        return 0.45;
      }
    }

    if (
      normalizedQuestion.length >= 8 &&
      normalizedTarget.includes(normalizedQuestion)
    ) {
      return 1;
    }

    let overlap = 0;
    for (const token of questionTokens) {
      if (targetTokens.includes(token)) {
        overlap++;
      }
    }

    const overlapScore = overlap / Math.max(questionTokens.length, 1);
    const phraseBoost = questionTokens.some((token) =>
      normalizedTarget.includes(token),
    )
      ? 0.15
      : 0;

    return Math.min(overlapScore + phraseBoost, 1);
  }

  private normalize(text: string) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(text: string) {
    const stopWords = new Set([
      'what',
      'is',
      'are',
      'the',
      'a',
      'an',
      'of',
      'in',
      'on',
      'to',
      'for',
      'and',
      'or',
      'me',
      'tell',
      'about',
      'define',
      'explain',
    ]);

    return text
      .split(' ')
      .filter((word) => word.length > 2 && !stopWords.has(word));
  }

  private async askGroqWithContext(
    question: string,
    context: string,
  ): Promise<ChatResult> {
    if (!this.apiKey) {
      return {
        answer:
          'AI assistant is not configured. Please ask your teacher for help.',
        source: 'error',
      };
    }

    try {
      const hasContext = context.trim().length > 0;

      const systemPrompt = `
You are Diyaa, a friendly learning assistant for kids (ages 6–12).

Rules:
1. Give a SHORT, simple answer (3–6 sentences max).
2. Explain like talking to a child — no teacher lesson plans, no "duration", no "materials", no "information for teachers".
3. If learning context is provided, use the ideas only — rewrite in your own simple words.
4. If context is missing or not helpful, answer from your own knowledge.
5. Never copy long curriculum text, bullet lists for teachers, or classroom admin notes.
6. Do not mention "dataset", "context", or "RAG".
`;

      const userPrompt = hasContext
        ? `
Helpful notes (rewrite simply for the child — do not copy verbatim):

${context}

Student question:
${question}

Give a friendly, short explanation.
`
        : `
Student question:
${question}

Give a friendly, short explanation for a child.
`;

      const response = await axios.post(
        this.apiUrl,
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 300,
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content;
      return {
        answer: content ?? 'Sorry, I could not generate an answer.',
        source: hasContext ? 'dataset+ai' : 'ai',
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown AI error';
      return {
        answer: `AI service error: ${message}`,
        source: 'error',
      };
    }
  }
}
