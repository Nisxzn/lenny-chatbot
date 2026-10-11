export type Role = "user" | "assistant";

export interface Source {
  id: string;
  title: string;
  guest?: string;
  speaker?: string;
  episode?: string;
  episode_title?: string;
  timestamp?: string | undefined;
  url?: string | undefined;
  content?: string | undefined;
}

export type ArtifactType = "markdown" | "html";

export interface Artifact {
  id: string;
  title: string;
  type: ArtifactType;
  content: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  thinking?: string;
  createdAt: number;
  sources?: Source[] | undefined;
  artifact?: Artifact | undefined;
  status?: "generating" | "done" | "error";
  statusMsg?: string;
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: Message[];
}

export type ProviderKind = "ollama" | "cloud";

export interface ModelSelection {
  provider: ProviderKind;
  model: string;
  cloudProviderName: string;
}
