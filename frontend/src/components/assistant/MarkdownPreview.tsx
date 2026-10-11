import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders markdown safely: cleans XML tags like <artifact> so content displays cleanly. */
export function MarkdownPreview({ content }: { content: string }) {
  const cleanContent = content
    .replace(/<artifact\b[^>]*>/gi, "")
    .replace(/<\/artifact>/gi, "")
    .replace(/<think\b[^>]*>/gi, "")
    .replace(/<\/think>/gi, "");

  return (
    <div className="prose-lenny">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanContent}</ReactMarkdown>
    </div>
  );
}
