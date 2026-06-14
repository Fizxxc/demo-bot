'use client';
import { useEffect, useRef } from 'react';

export default function AutoAiReply({ threadId, shouldRun }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!shouldRun) return;
    const timer = setTimeout(() => ref.current?.requestSubmit(), 61000);
    return () => clearTimeout(timer);
  }, [shouldRun]);

  if (!shouldRun) return null;
  return (
    <form ref={ref} method="post" action="/api/web/chat/ai-reply" style={{ display: 'none' }}>
      <input type="hidden" name="threadId" value={threadId} />
    </form>
  );
}
