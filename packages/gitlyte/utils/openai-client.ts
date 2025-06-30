import OpenAI from "openai";
import type { GitLyteConfig, Suggestion } from "../types/config.js";
import type { DesignSystem } from "../types/generated-site.js";
import type { RepoData, RepositoryAnalysis } from "../types/repository.js";

export type ContentType = "hero" | "features" | "stats";

export interface AIAnalysisResult {
  projectType:
    | "library"
    | "application"
    | "tool"
    | "framework"
    | "game"
    | "website";
  industry:
    | "web"
    | "mobile"
    | "ai"
    | "data"
    | "devtools"
    | "gaming"
    | "fintech"
    | "other";
  audience: "developers" | "endusers" | "enterprise" | "researchers";
  features: string[];
}

export interface GeneratedContent {
  hero?: {
    title: string;
    subtitle: string;
    description: string;
  };
  features?: {
    title: string;
    items: Array<{ title: string; description: string }>;
  };
  stats?: {
    items: Array<{ label: string; value: string | number }>;
  };
}

export interface DesignPreferences {
  preferredColors?: { primary?: string; secondary?: string };
  style?: string;
}

export class OpenAIClient {
  public client: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.client = new OpenAI({ apiKey });
  }

  async analyzeRepository(repoData: RepoData): Promise<AIAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(repoData);

    return this.makeOpenAIRequest(
      "gpt-4",
      "You are an expert at analyzing software repositories. Always respond with valid JSON format only, no markdown or additional text.",
      prompt,
      0.3,
      1500,
      "Failed to analyze repository"
    );
  }

  async generateContent(
    analysis: RepositoryAnalysis,
    contentType: ContentType
  ): Promise<GeneratedContent> {
    const prompt = this.buildContentPrompt(analysis, contentType);

    return this.makeOpenAIRequest(
      "gpt-4",
      "You are an expert at creating compelling website content. Always respond with valid JSON format only.",
      prompt,
      0.7,
      1500,
      "Failed to generate content"
    );
  }

  async generateDesign(
    analysis: RepositoryAnalysis,
    preferences?: DesignPreferences
  ): Promise<DesignSystem> {
    const prompt = this.buildDesignPrompt(analysis, preferences);

    return this.makeOpenAIRequest(
      "gpt-4",
      "You are an expert at creating beautiful, accessible design systems. Always respond with valid JSON format only.",
      prompt,
      0.5,
      2000,
      "Failed to generate design"
    );
  }

  async suggestImprovements(
    config: GitLyteConfig,
    analysis: RepositoryAnalysis
  ): Promise<Suggestion[]> {
    const prompt = this.buildSuggestionPrompt(config, analysis);

    return this.makeOpenAIRequest(
      "gpt-4",
      "You are an expert at analyzing website configurations and suggesting improvements. Always respond with valid JSON array format only.",
      prompt,
      0.3,
      1500,
      "Failed to generate suggestions"
    );
  }

  private async makeOpenAIRequest<T>(
    model: string,
    systemMessage: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number,
    errorPrefix: string
  ): Promise<T> {
    try {
      const completion = await this.client.chat.completions.create({
        model,
        messages: [
          {
            role: "system",
            content: systemMessage,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
      });

      const response = completion.choices[0]?.message?.content?.trim();
      if (!response) {
        throw new Error("Empty response from OpenAI");
      }

      const cleanedResponse = this.cleanJsonResponse(response);
      return JSON.parse(cleanedResponse);
    } catch (_error) {
      throw new Error(`${errorPrefix}: ${(_error as Error).message}`);
    }
  }

  private buildAnalysisPrompt(repoData: RepoData): string {
    return `Analyze this repository and determine its characteristics:

Repository: ${repoData.basicInfo.name}
Description: ${repoData.basicInfo.description}
Language: ${repoData.basicInfo.language}
Topics: ${repoData.basicInfo.topics.join(", ")}
README: ${repoData.readme.substring(0, 1000)}...

Return JSON with:
{
  "projectType": "library|application|tool|framework|game|website",
  "industry": "web|mobile|ai|data|devtools|gaming|fintech|other", 
  "audience": "developers|endusers|enterprise|researchers",
  "features": ["key feature 1", "key feature 2"]
}`;
  }

  private buildContentPrompt(
    analysis: RepositoryAnalysis,
    contentType: ContentType
  ): string {
    const baseInfo = `Project: ${analysis.basicInfo.name}
Type: ${analysis.projectCharacteristics.type}
Industry: ${analysis.projectCharacteristics.industry}
Audience: ${analysis.projectCharacteristics.audience}`;

    switch (contentType) {
      case "hero":
        return `${baseInfo}

Generate compelling hero section content:
{
  "hero": {
    "title": "Catchy title",
    "subtitle": "Value proposition", 
    "description": "What it does and why it matters"
  }
}`;

      case "features":
        return `${baseInfo}

Generate features section:
{
  "features": {
    "title": "Section title",
    "items": [
      {"title": "Feature name", "description": "Feature benefit"}
    ]
  }
}`;

      case "stats":
        return `${baseInfo}

Generate stats section:
{
  "stats": {
    "items": [
      {"label": "Metric name", "value": "Metric value"}
    ]
  }
}`;
    }
  }

  private buildDesignPrompt(
    analysis: RepositoryAnalysis,
    preferences?: DesignPreferences
  ): string {
    return `Create a design system for this ${analysis.projectCharacteristics.type} project:

Industry: ${analysis.projectCharacteristics.industry}
Audience: ${analysis.projectCharacteristics.audience}
${preferences ? `Preferences: ${JSON.stringify(preferences)}` : ""}

Return complete DesignSystem JSON with colors, typography, effects, and spacing.`;
  }

  private buildSuggestionPrompt(
    config: GitLyteConfig,
    analysis: RepositoryAnalysis
  ): string {
    return `Analyze this configuration and suggest improvements:

Config: ${JSON.stringify(config, null, 2)}
Project: ${analysis.basicInfo.name} (${analysis.projectCharacteristics.type})

Return array of suggestions with type, message, suggestion, and priority fields.`;
  }

  private cleanJsonResponse(response: string): string {
    return response
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();
  }
}
