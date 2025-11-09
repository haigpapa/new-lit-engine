/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from '@google/genai';
import { queryLlm, retryWithBackoff } from './llm';
import { extractThemesPrompt } from './prompts';
import { apiCache } from './utils/cache';
import type { Node, OpenLibraryWork, OpenLibraryAuthor, BookData } from './types';

const ai = new GoogleGenAI({
    apiKey: process.env.API_KEY
});

// --- API Throttling for Open Library ---
let lastApiCallTimestamp = 0;
const API_CALL_INTERVAL = 200; // ms between calls (increased from 100 for safety)

async function throttledFetch(url: string, options?: RequestInit): Promise<Response> {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTimestamp;

    if (timeSinceLastCall < API_CALL_INTERVAL) {
        const delay = API_CALL_INTERVAL - timeSinceLastCall;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    lastApiCallTimestamp = Date.now();
    return fetch(url, options);
}

// Centralized fetch helper using the new throttler with caching
async function fetchOpenLibrary(path: string): Promise<any> {
    // Check cache first
    const cacheKey = `openlib:${path}`;
    const cached = apiCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const url = path.startsWith('http') ? path : `https://openlibrary.org${path}`;

    try {
        const response = await throttledFetch(url, { referrerPolicy: 'no-referrer' });
        if (!response.ok) {
            throw new Error(`Open Library request failed for ${path} with status: ${response.status}`);
        }
        const data = await response.json();

        // Cache the successful response
        apiCache.set(cacheKey, data);

        return data;
    } catch (error) {
        // Retry logic for network errors
        if (error.message?.includes('network') || error.message?.includes('fetch')) {
            console.warn(`Network error for ${path}, retrying...`);
            // Wait and retry once
            await new Promise(resolve => setTimeout(resolve, 1000));
            const response = await throttledFetch(url, { referrerPolicy: 'no-referrer' });
            if (!response.ok) {
                throw new Error(`Open Library request failed for ${path} with status: ${response.status}`);
            }
            const data = await response.json();
            apiCache.set(cacheKey, data);
            return data;
        }
        throw error;
    }
}

/**
 * Searches Open Library to find the API key for a node that is missing one.
 */
export async function findApiKeyForNode(node: Pick<Node, 'label' | 'type'>): Promise<string | null> {
    try {
        let searchPath;
        if (node.type === 'book') {
            searchPath = `/search.json?title=${encodeURIComponent(node.label)}&limit=1`;
        } else if (node.type === 'author') {
            searchPath = `/search/authors.json?q=${encodeURIComponent(node.label)}&limit=1`;
        } else {
            return null; // Only books and authors have keys
        }

        const data = await fetchOpenLibrary(searchPath);
        if (data.docs && data.docs.length > 0) {
            const key = data.docs[0].key;
            // Ensure author keys start with /authors/
            if (node.type === 'author' && !key.startsWith('/authors/')) {
                return `/authors/${key}`;
            }
            return key;
        }
    } catch (error) {
        console.error(`Failed to find API key for ${node.label}:`, error);
    }
    return null;
}

/**
 * Ensures a book node has a cover image URL.
 * Fetches from Open Library if an API key is present.
 */
export async function ensureBookImage(bookNode: Pick<Node, 'imageUrl' | 'api_key' | 'label'>): Promise<string | null> {
    if (bookNode.imageUrl) {
        return bookNode.imageUrl;
    }

    if (bookNode.api_key) {
        try {
            const workData = await fetchOpenLibrary(`${bookNode.api_key}.json`);
            const coverId = workData.covers && workData.covers[0];
            if (coverId) {
                return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
            }
        } catch (e) {
            console.error(`Failed to fetch book cover for ${bookNode.label}:`, e);
        }
    }
    return null; // No generative fallback for books
}


/**
 * Ensures an author node has an image URL.
 * Fetches from Open Library if possible, otherwise returns null.
 */
export async function ensureAuthorImage(authorNode: Pick<Node, 'imageUrl' | 'api_key' | 'label'>): Promise<string | null> {
    if (authorNode.imageUrl) {
        return authorNode.imageUrl;
    }

    if (authorNode.api_key) {
        try {
            const authorData = await fetchOpenLibrary(`${authorNode.api_key}.json`);
            const photoId = authorData.photos && authorData.photos[0];
            if (photoId) {
                return `https://covers.openlibrary.org/a/id/${photoId}-L.jpg`;
            }
        } catch (e) {
            console.error(`Failed to fetch author data for image: ${authorNode.label}`, e);
        }
    }
    
    // Fallback to AI image generation has been removed for performance.
    return null;
}

/**
 * Extracts themes from a given text using an LLM.
 */
async function getThemesFromText(nodeLabel: string, text: string): Promise<string[]> {
    if (!text || text.length < 50) return []; // Don't run on very short/irrelevant text
    try {
        const prompt = extractThemesPrompt(nodeLabel, text);
        const response = await queryLlm({
            model: 'gemini-2.5-flash-lite',
            prompt,
            config: { responseMimeType: 'application/json' }
        });
        const resJ = JSON.parse(response.text.replace(/```json/g, '').replace(/```/g, ''));
        return resJ.themes || [];
    } catch (error) {
        console.error(`Failed to extract themes for ${nodeLabel}:`, error);
        return [];
    }
}

/**
 * Finds a single book for the book grid, prioritizing a good cover image.
 */
export async function findBookForGrid(title: string, author: string = ''): Promise<BookData | null> {
    try {
        let query;
        if (author) {
            query = `${title} ${author}`;
        } else {
            query = title;
        }

        const searchPath = `/search.json?q=${encodeURIComponent(query)}&limit=5&fields=key,title,author_name,cover_i`;
        const data = await fetchOpenLibrary(searchPath);

        if (!data.docs || data.docs.length === 0) return null;

        // Find the best doc - one with a cover is ideal.
        const doc = data.docs.find(d => d.cover_i) || data.docs[0];

        return {
            title: doc.title,
            author: doc.author_name ? doc.author_name.join(', ') : 'Unknown Author',
            coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null,
            apiKey: doc.key,
        };
    } catch (error) {
        console.error(`Failed to find book for grid: ${title}`, error);
        return null;
    }
}


// A function to search for a book or author
export async function searchLiterary(query: string): Promise<any> {
    try {
        // Search for works (books) first, as it's a common query type
        const workData = await fetchOpenLibrary(`/search.json?q=${encodeURIComponent(query)}&limit=5&fields=key,title,author_name,author_key,first_publish_year,first_sentence,cover_i,description,subjects,series`);

        if (workData.docs && workData.docs.length > 0) {
            // We found some books, let's process the most relevant one
            const mainDoc = workData.docs[0];
            return await processOpenLibraryDoc(mainDoc);
        }

        // If no books, maybe it's an author search?
        const authorData = await fetchOpenLibrary(`/search/authors.json?q=${encodeURIComponent(query)}&limit=1`);

        if (authorData.docs && authorData.docs.length > 0) {
            const authorSearchResult = authorData.docs[0];
            // Fetch the full author record to get photos and more details
            const fullAuthorData = await fetchOpenLibrary(`/authors/${authorSearchResult.key}.json`);

            // Now fetch works by this author
            const worksByAuthorData = await fetchOpenLibrary(`/authors/${authorSearchResult.key}/works.json?limit=5`);

            return await processAuthorAndWorks(fullAuthorData, worksByAuthorData.entries);
        }
    } catch (error) {
        console.error("Open Library API error:", error);
        return null; // Return null on error to allow fallback
    }
    
    return null; // No results found
}

// Helper to process a single book/work document from Open Library
async function processOpenLibraryDoc(doc: any, isExpansion: boolean = false): Promise<any> {
    const nodes = [];
    const edges = [];
    
    if (isExpansion) {
        // EXPANSION LOGIC: Find author's other works and thematically related works.
        const authorKeys = doc.authors?.map(a => a.author?.key).filter(Boolean);

        if (authorKeys && authorKeys.length > 0) {
            const primaryAuthorKey = authorKeys[0];
            try {
                // Fetch author details to get their name, as it's not in the work object
                const authorData = await fetchOpenLibrary(`${primaryAuthorKey}.json`);
                const authorName = authorData.name;

                // 1. Get other works by the same author
                const authorWorksData = await fetchOpenLibrary(`${primaryAuthorKey}/works.json?limit=4`);
                authorWorksData.entries.forEach(work => {
                    if (work.key !== doc.key) { // Don't add the same book again
                        nodes.push({
                            label: work.title,
                            type: 'book',
                            description: `Another work by ${authorName}.`,
                            publicationYear: work.first_publish_year,
                            api_key: work.key,
                        });
                        edges.push({ source: authorName, target: work.title });
                    }
                });
            } catch (e) {
                console.error(`Failed to expand with author's other works for ${doc.title}:`, e);
            }
        }

        // 2. Find thematically related books via subjects
        const subjects = doc.subjects?.slice(0, 2) || [];
        for (const subject of subjects) {
            try {
                const subjectData = await fetchOpenLibrary(`/subjects/${subject.toLowerCase().replace(/\s/g, '_')}.json?limit=2`);
                subjectData.works.forEach(work => {
                    if (work.key !== doc.key && work.authors) { // Ensure it's a different book and has an author
                        nodes.push({
                            label: work.title,
                            type: 'book',
                            description: `Related to the theme of "${subject}".`,
                            publicationYear: work.first_publish_year,
                            api_key: work.key,
                        });
                        nodes.push({
                            label: work.authors[0].name,
                            type: 'author',
                            description: `Author of "${work.title}".`,
                            api_key: `/authors/${work.authors[0].key}`,
                        });
                        edges.push({ source: work.authors[0].name, target: work.title });
                        edges.push({ source: work.title, target: subject });
                    }
                });
            } catch (e) {
                console.error(`Failed to fetch related books for subject "${subject}":`, e);
            }
        }
        
        const commentary = nodes.length > 0 ? `Found works related to "${doc.title}".` : `No new connections found for "${doc.title}".`;
        return { nodes, edges, commentary };
    }


    // DEFAULT SEARCH LOGIC
    const descriptionText = doc.description?.value || doc.description || (Array.isArray(doc.first_sentence) ? doc.first_sentence.join(' ') : 'No description available.');
    
    let coverId = null;
    if (doc.cover_i) {
        coverId = doc.cover_i;
    } else if (doc.covers && Array.isArray(doc.covers) && doc.covers.length > 0) {
        coverId = doc.covers[0];
    }

    const seriesName = doc.series && doc.series.length > 0 ? doc.series[0] : null;
    const publicationYear = doc.first_publish_year || (doc.first_publish_date ? parseInt(String(doc.first_publish_date).match(/\d{4}/)?.[0] || null) : null);

    const bookNode = {
        label: doc.title,
        type: 'book',
        description: descriptionText.substring(0, 200) + (descriptionText.length > 200 ? '...' : ''),
        publicationYear: publicationYear,
        series: seriesName,
        api_key: doc.key && (doc.key.startsWith('/') ? doc.key : `/works/${doc.key}`),
        imageUrl: coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null,
    };
    nodes.push(bookNode);
    
    const authorKeys = doc.authors?.map(a => a.author?.key).filter(Boolean) || doc.author_key?.map(k => `/authors/${k}`);

    if (authorKeys) {
        for(const authorKey of authorKeys.slice(0, 2)) { // Limit to 2 authors
            try {
                const authorData = await fetchOpenLibrary(`${authorKey}.json`);
                
                const bio = authorData.bio?.value || authorData.bio || `Author of "${doc.title}".`;
                const photoId = authorData.photos && authorData.photos[0];

                const imageUrl = photoId ? `https://covers.openlibrary.org/a/id/${photoId}-L.jpg` : null;

                const authorNode = {
                    label: authorData.name,
                    type: 'author',
                    description: bio,
                    publicationYear: null,
                    api_key: authorKey,
                    imageUrl: imageUrl,
                };
                nodes.push(authorNode);
                edges.push({source: authorData.name, target: doc.title});
            } catch (e) {
                console.error("Error fetching author details:", e);
            }
        }
    } else if (doc.author_name) {
        // Fallback for search results that don't have full author objects
        const authorNames = doc.author_name.slice(0, 2);
        for (let i = 0; i < authorNames.length; i++) {
            const authorName = authorNames[i];
            const description = `The author of "${doc.title}".`;
            
            const authorNode = {
               label: authorName,
               type: 'author',
               description,
               publicationYear: null,
               api_key: doc.author_key ? `/authors/${doc.author_key[i]}` : null,
               imageUrl: null,
           };
           nodes.push(authorNode);
           edges.push({source: authorName, target: doc.title});
        }
    }
    
    // Theme extraction from subjects and description
    const themes = new Set(doc.subjects || []);
    const descriptionForThemes = doc.description?.value || doc.description || (Array.isArray(doc.first_sentence) ? doc.first_sentence.join(' ') : null);

    if (descriptionForThemes && themes.size < 3) {
        const extractedThemes = await getThemesFromText(doc.title, descriptionForThemes);
        extractedThemes.forEach(theme => themes.add(theme));
    }

    Array.from(themes).slice(0, 3).forEach(subject => { // Limit to 3 themes total
        const themeNode = {
            label: subject,
            type: 'theme',
            description: `A theme related to "${doc.title}".`,
            publicationYear: null,
        };
        nodes.push(themeNode);
        edges.push({source: doc.title, target: subject});
    });

    const commentary = isExpansion ? `Expanded on "${doc.title}" with data from Open Library.` : `Found "${doc.title}" on Open Library.`;

    return { nodes, edges, commentary };
}

// Helper to process an author and their works
async function processAuthorAndWorks(authorDoc: any, works: any[], isExpansion: boolean = false): Promise<any> {
    const nodes = [];
    const edges = [];
    const authorName = authorDoc.name;
    const bio = authorDoc.bio?.value || authorDoc.bio || `The author ${authorName}.`;

    if (!isExpansion) {
        const photoId = authorDoc.photos && authorDoc.photos[0];
        const imageUrl = photoId ? `https://covers.openlibrary.org/a/id/${photoId}-L.jpg` : null;

        nodes.push({
            label: authorName,
            type: 'author',
            description: bio,
            publicationYear: null,
            api_key: authorDoc.key && (authorDoc.key.startsWith('/') ? authorDoc.key : `/authors/${authorDoc.key}`),
            imageUrl: imageUrl,
        });
    }

    works.forEach(work => {
        const bookNode = {
            label: work.title,
            type: 'book',
            description: `A book by ${authorName}.`,
            publicationYear: work.first_publish_year,
            api_key: work.key && (work.key.startsWith('/') ? work.key : `/works/${work.key}`)
        };
        nodes.push(bookNode);
        edges.push({ source: authorName, target: work.title });
    });

    // Extract and add themes for the author from their bio
    const extractedThemes = await getThemesFromText(authorName, bio);
    extractedThemes.slice(0, 3).forEach(theme => {
        const themeNode = {
            label: theme,
            type: 'theme',
            description: `A theme associated with the work of ${authorName}.`,
            publicationYear: null,
        };
        nodes.push(themeNode);
        edges.push({ source: authorName, target: theme });
    });

    const commentary = isExpansion ? `Found more works by ${authorName} from Open Library.` : `Found author ${authorName} on Open Library.`;
    return { nodes, edges, commentary };
}
