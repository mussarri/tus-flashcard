import { parseStringPromise } from 'xml2js';
import * as fs from 'fs/promises';

export interface ParsedSVGRegion {
  id: string;
  type: 'g' | 'path' | 'circle' | 'rect' | 'ellipse' | 'polygon' | 'polyline';
}

/**
 * Parse SVG file and extract region IDs
 * Prefers IDs from <g id="regions"> group if it exists
 * Otherwise extracts all IDs from <g>, <path>, and other shape elements
 */
export async function parseSVGRegions(svgContent: string | Buffer): Promise<string[]> {
  try {
    const content = typeof svgContent === 'string' ? svgContent : svgContent.toString('utf-8');
    
    // Parse XML
    const parsed = await parseStringPromise(content, {
      explicitArray: false,
      mergeAttrs: true,
    });

    const regions: string[] = [];

    // First, try to find a <g id="regions"> group
    const findRegionsGroup = (element: any): any => {
      if (!element || typeof element !== 'object') return null;

      if (element.g) {
        const groups = Array.isArray(element.g) ? element.g : [element.g];
        for (const group of groups) {
          if (group.id === 'regions' || group.id === 'region') {
            return group;
          }
          const found = findRegionsGroup(group);
          if (found) return found;
        }
      }

      return null;
    };

    const regionsGroup = findRegionsGroup(parsed.svg);
    
    if (regionsGroup) {
      // Extract IDs from regions group
      const extractIds = (element: any): void => {
        if (!element || typeof element !== 'object') return;

        // Check if this element has an ID
        if (element.id && typeof element.id === 'string' && element.id !== 'regions') {
          regions.push(element.id);
        }

        // Recursively check children
        ['g', 'path', 'circle', 'rect', 'ellipse', 'polygon', 'polyline'].forEach((tag) => {
          if (element[tag]) {
            const items = Array.isArray(element[tag]) ? element[tag] : [element[tag]];
            items.forEach((item: any) => extractIds(item));
          }
        });
      };

      extractIds(regionsGroup);
    } else {
      // No regions group found, extract all IDs from root level
      const extractAllIds = (element: any): void => {
        if (!element || typeof element !== 'object') return;

        // Check if this element has an ID
        if (element.id && typeof element.id === 'string') {
          regions.push(element.id);
        }

        // Recursively check children
        ['g', 'path', 'circle', 'rect', 'ellipse', 'polygon', 'polyline'].forEach((tag) => {
          if (element[tag]) {
            const items = Array.isArray(element[tag]) ? element[tag] : [element[tag]];
            items.forEach((item: any) => extractAllIds(item));
          }
        });
      };

      extractAllIds(parsed.svg);
    }

    // Remove duplicates and return
    return [...new Set(regions)];
  } catch (error) {
    throw new Error(
      `Failed to parse SVG: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Parse SVG file from file path
 */
export async function parseSVGRegionsFromFile(filePath: string): Promise<string[]> {
  const content = await fs.readFile(filePath);
  return parseSVGRegions(content);
}
