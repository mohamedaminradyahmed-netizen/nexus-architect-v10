
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface ProjectFile {
    path: string;
    content: string;
    language: 'typescript' | 'css' | 'json' | 'html' | 'javascript';
    // Optional because AI generated responses often omit timestamps
    lastModified?: number;
}

export interface DesignTokens {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    accent: string;
    font: string;
    borderRadius: string;
}

export interface DesignSystem {
    name: string;
    tokens: DesignTokens;
}

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

/**
 * Represent the complete state of a project session.
 * Used for serializing context between client and architect agent.
 */
export interface ProjectState {
    files: Record<string, ProjectFile>;
    history: ChatMessage[];
    prompt: string;
    imageBase64?: string;
}

/**
 * Interface representing a UI component or block being generated.
 */
export interface Artifact {
    id: string;
    html: string;
    styleName: string;
    status: 'streaming' | 'ready';
}
