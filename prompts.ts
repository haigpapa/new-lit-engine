/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import type { Node } from './types'

export const queryPrompt = (query: string): string => `\
You are a world-class literary scholar and AI assistant for a visual exploration engine. Your task is to find a small, interconnected set of books, authors, and themes related to a user's query.

The user's query is: "${query}"

Your response must be a single, valid JSON object with the following structure: { "nodes": [], "edges": [], "commentary": "" }.

- "nodes": An array of 5 to 8 related node objects. The first node should be the primary subject of the query. Each node must have:
  - "label": The display name (e.g., "Frank Herbert", "Dune", "Existentialism").
  - "type": One of "author", "book", or "theme".
  - "description": A concise but insightful one-sentence description.
  - "publicationYear": For "book" type nodes only. Null for other types.
- "edges": An array of edge objects connecting nodes by their labels.
- "commentary": A thoughtful, single-sentence commentary (under 30 words) that highlights the most interesting aspect of the connections you found.

Important Instructions:
1. Focus on the quality and insightfulness of the connections.
2. Do not wrap the JSON in markdown backticks or any other text.
3. Only return the raw JSON object.
`;


export const findConnectionPrompt = (startNode: Node, endNode: Node): string => `\
You are an AI assistant with deep knowledge of literary history, criticism, and theory. Your task is to act as a literary detective, finding the most insightful and compelling path between two nodes.

The user wants to connect:
- Start Node: { label: "${startNode.label}", type: "${startNode.type}" }
- End Node: { label: "${endNode.label}", type: "${endNode.type}" }

The path should be non-obvious and tell a story, revealing a surprising relationship. Traverse through shared themes, literary movements, direct influences, historical events, or even "six degrees of separation" through other authors and books.

Your response must be a single, valid JSON object with the following structure: { "nodes": [], "edges": [], "path": [], "commentary": "" }.

- "nodes": An array of any NEW, intermediate node objects required to complete the path. Do NOT include the start or end nodes. Each new node must have:
  - "label": The display name.
  - "type": One of "author", "book", or "theme".
  - "description": A concise but insightful one-sentence description.
  - "publicationYear": For "book" type nodes only, the year of first publication (integer). Null for other types.
- "edges": An array of all edge objects that form the connection path. Each edge must have:
  - "source": The "label" of the source node.
  - "target": The "label" of the target node.
- "path": An ORDERED array of node "labels" representing the full path from the start node to the end node.
- "commentary": A thoughtful and concise commentary (under 40 words) that brilliantly explains the logic and significance of the path you discovered.

Important Instructions:
1. The "path" array MUST begin with "${startNode.label}" and end with "${endNode.label}".
2. For every two consecutive labels in the "path" array, a corresponding edge MUST exist in the "edges" array.
3. Only create new nodes and edges if they are essential to form the connection.
4. Do not wrap the JSON in markdown backticks or any other text.
5. Only return the raw JSON object.
`;

export const extractThemesPrompt = (nodeLabel: string, text: string): string => `\
You are an AI assistant for a literary exploration engine. Your task is to extract key literary, philosophical, or artistic themes from the provided text.

The text is a description or biography for: "${nodeLabel}".

Text: "${text}"

Your response must be a single, valid JSON object with the structure: { "themes": [] }.

- "themes": An array of 2 to 4 strings.
- Each string should be a concise but nuanced theme label (1-4 words).
- Prioritize specific, relevant themes over overly generic ones.

Good examples: "Gothic Alienation", "Post-colonial Identity", "The American Dream's Decay", "Technology vs. Humanity".
Bad examples: "Love", "Death", "Good vs. Evil".

Important Instructions:
1. Do not wrap the JSON in markdown backticks or any other text.
2. Only return the raw JSON object.
`;


export const createSummaryPrompt = (node: Node): string => {
    let context: string, request: string;
    const commonInstructions = `
Your response must be a single, valid JSON object with the structure: { "summary": "", "analysis": "" }.

- "summary": A concise, one-paragraph summary.
- "analysis": A concise, one-paragraph analysis.
- Do not wrap the JSON in markdown backticks or any other text.
- Only return the raw JSON object.
`;

    switch (node.type) {
        case 'book':
            context = `The user has selected the book "${node.label}"`;
            if (node.publicationYear) context += ` (published ${node.publicationYear})`;
            if (node.description) context += `, described as: "${node.description}"`;
            request = `Provide a concise plot summary in the 'summary' field and a list of its major themes in the 'analysis' field.`;
            break;
        case 'author':
            context = `The user has selected the author "${node.label}"`;
            if (node.description) context += `, described as: "${node.description}"`;
            request = `Provide a brief biography in the 'summary' field and an analysis of their literary style in the 'analysis' field.`;
            break;
        case 'theme':
            context = `The user has selected the literary theme "${node.label}"`;
            if (node.description) context += `, described as: "${node.description}"`;
            request = `Provide a deeper explanation of this concept in the 'summary' field and its significance in literature with examples in the 'analysis' field.`;
            break;
        default:
            return '';
    }

    return `
You are a world-class literary scholar. ${context}.

${request}

${commonInstructions}
`;
};

export const createExpansionPrompt = (node: Node): string => {
    let context: string, request: string;
    const commonInstructions = `
Your response must be a single, valid JSON object with the following structure: { "nodes": [], "edges": [], "commentary": "" }.

- "nodes": An array of 2 to 4 NEW related node objects. Do NOT include the original node "${node.label}". Each node must have:
  - "label": The display name.
  - "type": One of "author", "book", or "theme".
  - "description": A concise but insightful one-sentence description.
  - "publicationYear": For "book" type nodes only. Null for other types.
- "edges": An array of edge objects connecting the new nodes to the original node ("${node.label}") and to each other if relevant. Each edge must have:
  - "source": The "label" of a node.
  - "target": The "label" of a node.
- "commentary": A thoughtful, single-sentence commentary (under 30 words) about the new connections.

Important Instructions:
1. Focus on insightful, non-obvious connections that add value. All new nodes must be meaningfully connected back to the original node "${node.label}".
2. Do not wrap the JSON in markdown backticks or any other text.
3. Only return the raw JSON object.
`;

    switch (node.type) {
        case 'book':
            context = `The user is expanding the book "${node.label}"`;
            if (node.publicationYear) context += ` (published ${node.publicationYear})`;
            request = `Find one or two other notable books by the same author, and one thematically similar book by a different author. Provide nodes for these new books, and for the author of the thematically similar book. If there is a strong shared theme, you can also create a 'theme' node to link the similar books back to "${node.label}".`;
            break;
        case 'author':
            context = `The user is expanding the author "${node.label}"`;
            request = `Find one author who directly influenced "${node.label}" and one author who was directly influenced BY "${node.label}". Provide nodes for these two authors and one of their quintessential works.`;
            break;
        case 'theme':
            context = `The user is expanding the literary theme "${node.label}"`;
            request = `Find one quintessential book and its author that are perfect examples of this theme.`;
            break;
        default:
            return '';
    }

    return `
You are a world-class literary scholar acting as a "literary detective". ${context}. Your task is to find the most compelling new connections.

${request}

${commonInstructions}
`;
};


export const createBookGridPrompt = (
  lockedBooks: any[],
  excludedBooks: string[],
  count: number
): string => `\
You are a world-class librarian and AI assistant for a book recommendation wall. Your task is to help a user build their personal "Top 100" library by providing insightful book recommendations.

The user has already "locked in" the following books as their favorites:
${lockedBooks.map(b => `- "${b.title}" by ${b.author}`).join('\n')}

Based on these locked-in books, generate a list of ${count} new, diverse, and interesting book recommendations. The recommendations should be a mix of well-known classics and hidden gems that align with the user's taste but also broaden their horizons.

Do NOT recommend any of the following books, as they are already on the user's wall or have been dismissed:
${excludedBooks.map(b => `- ${b}`).join('\n')}

Your response must be a single, valid JSON object with the following structure: { "recommendations": [] }.

- "recommendations": An array of exactly ${count} objects, each with:
  - "title": The full title of the book.
  - "author": The full name of the author.

Important Instructions:
1. Provide a diverse list. If the user likes science fiction, don't just suggest more science fiction. Suggest related themes, influential works, or even contrasting works.
2. Do not wrap the JSON in markdown backticks or any other text.
3. Only return the raw JSON object.
`;
