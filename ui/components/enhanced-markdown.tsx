"use client";

import React from 'react';

interface EnhancedMarkdownProps {
  content: string;
}

export function EnhancedMarkdown({ content }: EnhancedMarkdownProps) {
  // Parse inline markdown (bold, italic, code)
  const parseInlineMarkdown = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    // Pattern to match **bold**, *italic*, `code`, and [link](url)
    const pattern = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
    let match;
    let key = 0;
    
    while ((match = pattern.exec(text)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      if (match[1]) {
        // Bold **text**
        parts.push(<strong key={`b-${key++}`} className="font-bold text-neutral-900">{match[2]}</strong>);
      } else if (match[3]) {
        // Italic *text*
        parts.push(<em key={`i-${key++}`} className="italic text-neutral-800">{match[4]}</em>);
      } else if (match[5]) {
        // Inline code `text`
        parts.push(
          <code key={`c-${key++}`} className="bg-neutral-100 text-violet-700 px-2 py-0.5 rounded text-base font-mono">
            {match[6]}
          </code>
        );
      } else if (match[7]) {
        // Link [text](url)
        parts.push(
          <a key={`a-${key++}`} href={match[9]} className="text-violet-600 hover:text-violet-800 underline font-medium">
            {match[8]}
          </a>
        );
      }
      
      lastIndex = pattern.lastIndex;
    }
    
    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : [text];
  };

  // Simple markdown-like content renderer with enhanced styling
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactElement[] = [];
    let currentParagraph: string[] = [];
    let inCodeBlock = false;
    let codeBlockLines: string[] = [];
    let inTable = false;
    let tableLines: string[] = [];

    const flushParagraph = (index: number) => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ');
        elements.push(
          <p key={`p-${index}`} className="text-lg text-neutral-700 leading-relaxed mb-4">
            {parseInlineMarkdown(paragraphText)}
          </p>
        );
        currentParagraph = [];
      }
    };

    const flushTable = (index: number) => {
      if (tableLines.length > 0) {
        const rows = tableLines.filter(line => !line.match(/^\|[\s-:|]+\|$/)); // Remove separator line
        
        if (rows.length > 0) {
          const headers = rows[0].split('|').map(h => h.trim()).filter(h => h);
          const dataRows = rows.slice(1).map(row => 
            row.split('|').map(cell => cell.trim()).filter(cell => cell)
          );

          elements.push(
            <div key={`table-${index}`} className="overflow-x-auto my-6">
              <table className="min-w-full border-collapse border-2 border-neutral-300 shadow-md rounded-lg">
                <thead className="bg-gradient-to-r from-violet-100 to-purple-100">
                  <tr>
                    {headers.map((header, i) => (
                      <th key={i} className="border border-neutral-300 px-4 py-3 text-left font-bold text-neutral-900">
                        {parseInlineMarkdown(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="border border-neutral-300 px-4 py-3 text-neutral-700">
                          {parseInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        
        tableLines = [];
        inTable = false;
      }
    };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Code blocks
      if (trimmedLine.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="bg-neutral-900 text-green-400 p-4 rounded-lg my-4 overflow-x-auto">
              <code className="text-sm font-mono">{codeBlockLines.join('\n')}</code>
            </pre>
          );
          codeBlockLines = [];
          inCodeBlock = false;
        } else {
          flushParagraph(index);
          flushTable(index);
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockLines.push(line);
        return;
      }

      // Tables (detect lines with | characters)
      if (trimmedLine.includes('|') && trimmedLine.startsWith('|')) {
        flushParagraph(index);
        inTable = true;
        tableLines.push(trimmedLine);
        return;
      } else if (inTable && !trimmedLine) {
        flushTable(index);
        return;
      } else if (inTable) {
        // Not a table line anymore, flush table
        flushTable(index);
      }

      // Headings
      if (trimmedLine.startsWith('# ')) {
        flushParagraph(index);
        flushTable(index);
        elements.push(
          <h1 key={`h1-${index}`} className="text-4xl font-bold text-neutral-900 mt-8 mb-4 pb-2 border-b-2 border-violet-200">
            {parseInlineMarkdown(trimmedLine.substring(2))}
          </h1>
        );
      } else if (trimmedLine.startsWith('## ')) {
        flushParagraph(index);
        flushTable(index);
        elements.push(
          <h2 key={`h2-${index}`} className="text-3xl font-bold text-neutral-900 mt-6 mb-3">
            {parseInlineMarkdown(trimmedLine.substring(3))}
          </h2>
        );
      } else if (trimmedLine.startsWith('### ')) {
        flushParagraph(index);
        flushTable(index);
        elements.push(
          <h3 key={`h3-${index}`} className="text-2xl font-semibold text-neutral-800 mt-5 mb-2">
            {parseInlineMarkdown(trimmedLine.substring(4))}
          </h3>
        );
      } else if (trimmedLine.startsWith('#### ')) {
        flushParagraph(index);
        flushTable(index);
        elements.push(
          <h4 key={`h4-${index}`} className="text-xl font-semibold text-neutral-800 mt-4 mb-2">
            {parseInlineMarkdown(trimmedLine.substring(5))}
          </h4>
        );
      }
      // Lists
      else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        flushParagraph(index);
        flushTable(index);
        elements.push(
          <li key={`li-${index}`} className="text-lg text-neutral-700 leading-relaxed ml-4 mb-2 list-disc list-inside">
            {parseInlineMarkdown(trimmedLine.substring(2))}
          </li>
        );
      } else if (/^\d+\.\s/.test(trimmedLine)) {
        flushParagraph(index);
        flushTable(index);
        elements.push(
          <li key={`oli-${index}`} className="text-lg text-neutral-700 leading-relaxed ml-4 mb-2 list-decimal list-inside">
            {parseInlineMarkdown(trimmedLine.replace(/^\d+\.\s/, ''))}
          </li>
        );
      }
      // Blockquotes
      else if (trimmedLine.startsWith('> ')) {
        flushParagraph(index);
        flushTable(index);
        elements.push(
          <blockquote key={`quote-${index}`} className="border-l-4 border-violet-500 bg-violet-50 pl-4 py-2 my-4 italic text-neutral-700">
            {parseInlineMarkdown(trimmedLine.substring(2))}
          </blockquote>
        );
      }
      // Horizontal rules
      else if (trimmedLine === '---' || trimmedLine === '***') {
        flushParagraph(index);
        flushTable(index);
        elements.push(<hr key={`hr-${index}`} className="my-8 border-t-2 border-neutral-200" />);
      }
      // Empty lines
      else if (trimmedLine === '') {
        flushParagraph(index);
        flushTable(index);
      }
      // Regular paragraphs
      else {
        currentParagraph.push(trimmedLine);
      }
    });

    flushParagraph(lines.length);
    flushTable(lines.length);
    return elements;
  };

  return <div className="prose prose-lg max-w-none">{renderContent(content)}</div>;
}
