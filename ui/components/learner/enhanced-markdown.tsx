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
            <h1 className="text-4xl font-bold text-slate-900 mb-6 mt-8 pb-2 border-b-2 border-blue-500" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-3xl font-semibold text-slate-800 mb-4 mt-6 pb-2 border-b border-slate-300" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-2xl font-semibold text-slate-700 mb-3 mt-5" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-xl font-semibold text-slate-700 mb-2 mt-4" {...props} />
          ),
          
          // Paragraph styling
          p: ({ node, ...props }) => (
            <p className="text-base text-slate-700 leading-relaxed mb-4" {...props} />
          ),
          
          // List styling
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-2 mb-4 ml-4 text-slate-700" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-2 mb-4 ml-4 text-slate-700" {...props} />
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
                <code className="bg-slate-100 text-red-600 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              );
            }
            
            // Code blocks
            return (
              <code className={`block bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto my-4 font-mono text-sm ${className}`} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ node, ...props }) => (
            <pre className="overflow-x-auto" {...props} />
          ),
          
          // Blockquote
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-blue-500 bg-blue-50 pl-4 py-3 my-4 italic text-slate-700" {...props} />
          ),
          
          // Tables
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full divide-y divide-slate-300 border border-slate-300" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-slate-100" {...props} />
          ),
          tbody: ({ node, ...props }) => (
            <tbody className="divide-y divide-slate-200 bg-white" {...props} />
          ),
          tr: ({ node, ...props }) => (
            <tr className="hover:bg-slate-50" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="px-4 py-3 text-sm text-slate-700" {...props} />
          ),
          
          // Links
          a: ({ node, ...props }) => (
            <a className="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer" {...props} />
          ),
          
          // Horizontal rule
          hr: ({ node, ...props }) => (
            <hr className="my-8 border-t-2 border-slate-300" {...props} />
          ),
          
          // Strong/Bold
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-slate-900" {...props} />
          ),
          
          // Emphasis/Italic
          em: ({ node, ...props }) => (
            <em className="italic text-slate-800" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
