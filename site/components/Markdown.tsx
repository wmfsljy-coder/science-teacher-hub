import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* 지도안(LESSON.md)을 빌드할 때 HTML 로 바꿔 보여 줍니다. 표는 가로로 밀어 볼 수 있게 감쌉니다. */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="table-wrap" tabIndex={0} role="region" aria-label="표 (가로로 밀어 볼 수 있음)">
              <table>{children}</table>
            </div>
          ),
          a: ({ href, children }) => (
            <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noopener">
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
