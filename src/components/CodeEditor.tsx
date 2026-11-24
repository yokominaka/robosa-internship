import React, { useRef, useMemo } from 'react';

export interface CompilerDiagnostic {
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  diagnostics?: CompilerDiagnostic[];
  readOnly?: boolean;
}

// Tokenizer & syntax highlighter for Arduino C++
function highlightArduinoCpp(source: string): string {
  // Escape HTML characters
  const escaped = source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Regex patterns
  return escaped
    // Comments
    .replace(/(\/\/[^\n]*)/g, '<span style="color:#7d8a97;font-style:italic;">$1</span>')
    // String literals
    .replace(/("(?:\\.|[^"\\])*")/g, '<span style="color:#a5d6ff;">$1</span>')
    // Preprocessor
    .replace(/(#\w+)/g, '<span style="color:#ff7b72;font-weight:600;">$1</span>')
    // Constants
    .replace(/\b(HIGH|LOW|INPUT|INPUT_PULLUP|OUTPUT|true|false)\b/g, '<span style="color:#79c0ff;font-weight:600;">$1</span>')
    // Core Types & Keywords
    .replace(/\b(void|int|byte|bool|boolean|char|unsigned|long|float|double|const|enum|struct|switch|case|break|if|else|return|for|while|default)\b/g, '<span style="color:#ff7b72;">$1</span>')
    // Arduino API functions & Classes
    .replace(/\b(pinMode|digitalWrite|digitalRead|analogRead|analogWrite|delay|millis|micros|setup|loop)\b/g, '<span style="color:#d2a8ff;font-weight:600;">$1</span>')
    .replace(/\b(Serial)\b/g, '<span style="color:#ffa657;font-weight:600;">$1</span>')
    // Numbers
    .replace(/\b(\d+)\b/g, '<span style="color:#79c0ff;">$1</span>');
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  diagnostics = [],
  readOnly = false,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => code.split('\n'), [code]);

  // Map line numbers to diagnostic severities
  const errorLines = useMemo(() => {
    const map = new Map<number, CompilerDiagnostic>();
    for (const d of diagnostics) {
      if (d.line > 0 && !map.has(d.line)) {
        map.set(d.line, d);
      }
    }
    return map;
  }, [diagnostics]);

  const highlightedCode = useMemo(() => highlightArduinoCpp(code), [code]);

  const handleScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (preRef.current) {
      preRef.current.scrollTop = scrollTop;
      preRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      // Insert 2 spaces
      const newValue = code.substring(0, start) + '  ' + code.substring(end);
      onChange(newValue);

      // Restore cursor position after state update
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        minHeight: '380px',
        backgroundColor: 'var(--editor-bg)',
        border: '1px solid var(--line)',
        borderRadius: '6px',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'var(--font-mono)',
        fontSize: '12px',
        lineHeight: '20px',
      }}
    >
      {/* Gutter with Line Numbers and Error Badges */}
      <div
        ref={gutterRef}
        style={{
          width: '42px',
          backgroundColor: 'var(--gutter-bg)',
          borderRight: '1px solid var(--line)',
          padding: '12px 6px',
          userSelect: 'none',
          overflow: 'hidden',
          textAlign: 'right',
          color: 'var(--muted)',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {lines.map((_, idx) => {
          const lineNum = idx + 1;
          const diag = errorLines.get(lineNum);
          const isError = diag?.severity === 'error';
          const isWarn = diag?.severity === 'warning';

          return (
            <div
              key={lineNum}
              title={diag ? `Line ${lineNum}: ${diag.message}` : undefined}
              style={{
                height: '20px',
                paddingRight: '4px',
                color: isError ? '#fff' : isWarn ? '#000' : 'var(--muted)',
                backgroundColor: isError ? 'var(--err)' : isWarn ? 'var(--warn)' : 'transparent',
                borderRadius: '3px',
                fontWeight: diag ? 'bold' : 'normal',
                cursor: diag ? 'help' : 'default',
              }}
            >
              {lineNum}
            </div>
          );
        })}
      </div>

      {/* Editor Main Canvas (Overlaid Syntax Highlighted Pre + Transparent Textarea) */}
      <div style={{ position: 'relative', flex: 1, height: '100%', overflow: 'hidden' }}>
        {/* Highlighted text layer */}
        <pre
          ref={preRef}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: highlightedCode + '\n' }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            padding: '12px',
            overflow: 'hidden',
            whiteSpace: 'pre',
            tabSize: 2,
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            pointerEvents: 'none',
            color: 'var(--text-primary)',
            boxSizing: 'border-box',
          }}
        />

        {/* Interactive editing textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%',
            margin: 0,
            padding: '12px',
            overflow: 'auto',
            resize: 'none',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: 'transparent',
            caretColor: 'var(--volt-lime)',
            whiteSpace: 'pre',
            tabSize: 2,
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>
    </div>
  );
};
