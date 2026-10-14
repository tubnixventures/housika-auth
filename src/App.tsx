import { useEffect, useState } from 'react';

export default function App() {
  const [docText, setDocText] = useState('Loading Housika Authentication API documentation...');

  useEffect(() => {
    fetch('/doc')
      .then((res) => res.text())
      .then((text) => setDocText(text))
      .catch(() => {
        setDocText(
          'Housika Authentication API (Cloudflare Workers)\n\n' +
          'Pure backend service active.\n' +
          'Endpoints available: /auth/signup, /auth/login, /auth/logout, /auth/current-user, /doc, etc.'
        );
      });
  }, []);

  return (
    <pre style={{ margin: 0, padding: '24px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.5' }}>
      {docText}
    </pre>
  );
}
