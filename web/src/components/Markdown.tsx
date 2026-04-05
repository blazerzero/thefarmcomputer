import { FC } from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";

interface MarkdownProps {
	children: string;
}

function preprocessBullets(text: string): string {
	return text
		.replace(/\n{2,}/g, (match) => "\n" + "\u00A0\n".repeat(match.length - 1))
		.split("\n")
		.map((line) => {
			if (/^• /.test(line)) return line.replace(/^• /, "- ");
			if (/^- /.test(line)) return `  ${line}`;
			return line;
		})
		.join("\n");
}

export const Markdown: FC<MarkdownProps> = ({ children }) => (
	<ReactMarkdown
		remarkPlugins={[remarkBreaks]}
		components={{
			a: ({ node: _node, ...props }) => (
				<a {...props} target="_blank" rel="noreferrer" />
			),
		}}
	>
		{preprocessBullets(children)}
	</ReactMarkdown>
);
