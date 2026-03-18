"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

interface EnhancedMarkdownProps {
  content: string;
  className?: string;
}

export function EnhancedMarkdown({ content, className = "" }: EnhancedMarkdownProps) {
  const mermaidRef = useRef<boolean>(false);

  useEffect(() => {
    // Dynamically load and render Mermaid diagrams
    if (!mermaidRef.current && typeof window !== "undefined") {
      import("mermaid").then((mermaid) => {
        mermaid.default.initialize({
          startOnLoad: true,
          theme: "default",
          themeVariables: {
            primaryColor: "#3b82f6",
            primaryTextColor: "#1e293b",
            primaryBorderColor: "#64748b",
            lineColor: "#64748b",
            secondaryColor: "#e0e7ff",
            tertiaryColor: "#f1f5f9",
          },
        });

        // Run mermaid on all code blocks with language "mermaid"
        const renderMermaid = () => {
          const mermaidBlocks = document.querySelectorAll("code.language-mermaid");
          mermaidBlocks.forEach((block, index) => {
            const parent = block.parentElement;
            if (parent && parent.tagName === "PRE") {
              const code = block.textContent || "";
              const id = `mermaid-${index}-${Date.now()}`;
              
              // Create a div to render the diagram
              const div = document.createElement("div");
              div.className = "mermaid-diagram my-6";
              div.id = id;
              div.textContent = code;
              
              // Replace the pre block with the div
              parent.replaceWith(div);
            }
          });

          // Render all mermaid diagrams
          mermaid.default.run({
            querySelector: ".mermaid-diagram",
          });
        };

        // Delay to ensure DOM is ready
        setTimeout(renderMermaid, 100);
      });

      mermaidRef.current = true;
    }
  }, [content]);

  return (
    <div className={`enhanced-markdown ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          // Custom heading styles
          h1: ({ node, ...props }) => (
            <h1 className="text-4xl font-bold text-gray-800 mb-6 mt-8" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-3xl font-semibold text-gray-800 mb-4 mt-6" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-2xl font-semibold text-gray-800 mb-3 mt-5" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-xl font-semibold text-gray-700 mb-2 mt-4" {...props} />
          ),
          
          // Paragraph styling
          p: ({ node, ...props }) => (
            <p className="text-base text-gray-700 leading-relaxed mb-4" {...props} />
          ),
          
          // List styling
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4 text-gray-700" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 ml-4 text-gray-700" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="ml-2" {...props} />
          ),
          
          // Code blocks
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const lang = match ? match[1] : "";
            
            // Handle mermaid diagrams
            if (lang === "mermaid") {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            
            // Inline code
            if (inline) {
              return (
                <code className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm font-mono border border-orange-200" {...props}>
                  {children}
                </code>
              );
            }
            
            // Code blocks
            return (
              <code className={`block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-4 font-mono text-sm border-2 border-gray-700 shadow-lg ${className}`} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ node, ...props }) => (
            <pre className="overflow-x-auto" {...props} />
          ),
          
          // Blockquote
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-orange-500 bg-orange-50 pl-6 py-4 my-4 italic text-gray-800 rounded-r-lg shadow-sm" {...props} />
          ),
          
          // Tables
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6 rounded-lg shadow-lg">
              <table className="min-w-full divide-y divide-gray-300 border-2 border-gray-300 bg-white" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-gradient-to-r from-orange-500 to-orange-600" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-gray-200 bg-white" {...props} />
          ),
          tr: ({ node, ...props }) => {
            const isHeaderRow = (node as any)?.parent?.tagName === "thead";

            if (isHeaderRow) {
              return <tr className="bg-gradient-to-r from-orange-500 to-orange-600" {...props} />;
            }

            return <tr className="hover:bg-orange-50 transition-colors" {...props} />;
          },
          th: ({ node, ...props }) => (
            <th className="px-6 py-4 text-left text-sm font-bold text-black uppercase tracking-wider" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-6 py-4 text-sm text-gray-800 font-medium" {...props} />
          ),
          
          // Links
          a: ({ node, ...props }) => (
            <a className="text-orange-600 hover:text-orange-700 underline font-medium" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          
          // Horizontal rule
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-t-2 border-gray-300" {...props} />
          ),
          
          // Strong/Bold
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-gray-800" {...props} />
          ),
          
          // Emphasis/Italic
          em: ({ node, ...props }) => (
            <em className="italic text-gray-700" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
