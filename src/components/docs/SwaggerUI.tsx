'use client';

import { useEffect, useState } from 'react';
import SwaggerUIReact from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

interface SwaggerUIProps {
  url?: string;
}

export default function SwaggerUI({ url = '/api/docs' }: SwaggerUIProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="swagger-ui-wrapper">
      <SwaggerUIReact
        url={url}
        docExpansion="list"
        defaultModelsExpandDepth={-1}
        persistAuthorization={true}
      />
      <style jsx global>{`
        .swagger-ui-wrapper {
          background: var(--background);
        }
        .swagger-ui .topbar {
          display: none;
        }
        .swagger-ui .info {
          margin: 20px 0;
        }
        .swagger-ui .info .title {
          color: hsl(var(--foreground));
        }
        .swagger-ui .info .description p,
        .swagger-ui .info li,
        .swagger-ui .markdown p,
        .swagger-ui .markdown li {
          color: hsl(var(--muted-foreground));
        }
        .swagger-ui .opblock-tag {
          color: hsl(var(--foreground));
          border-bottom: 1px solid hsl(var(--border));
        }
        .swagger-ui .opblock {
          border-radius: 8px;
          box-shadow: none;
          border: 1px solid hsl(var(--border));
          margin-bottom: 10px;
        }
        .swagger-ui .opblock .opblock-summary {
          border-radius: 8px;
        }
        .swagger-ui .opblock .opblock-summary-method {
          border-radius: 4px;
          min-width: 70px;
        }
        .swagger-ui .opblock .opblock-summary-path {
          color: hsl(var(--foreground));
        }
        .swagger-ui .opblock .opblock-summary-description {
          color: hsl(var(--muted-foreground));
        }
        .swagger-ui .btn {
          border-radius: 6px;
        }
        .swagger-ui .btn.execute {
          background-color: hsl(var(--primary));
          border-color: hsl(var(--primary));
        }
        .swagger-ui .btn.execute:hover {
          background-color: hsl(var(--primary) / 0.9);
        }
        .swagger-ui select {
          border-radius: 6px;
        }
        .swagger-ui input[type="text"],
        .swagger-ui textarea {
          border-radius: 6px;
          border-color: hsl(var(--border));
        }
        .swagger-ui .model-box {
          background: hsl(var(--muted));
        }
        .swagger-ui section.models {
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
        }
        .swagger-ui section.models h4 {
          color: hsl(var(--foreground));
        }
        .dark .swagger-ui .opblock-body pre.microlight {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }
        .dark .swagger-ui .response-col_status {
          color: hsl(var(--foreground));
        }
        .dark .swagger-ui table thead tr td,
        .dark .swagger-ui table thead tr th {
          color: hsl(var(--foreground));
          border-color: hsl(var(--border));
        }
        .dark .swagger-ui .parameter__name,
        .dark .swagger-ui .parameter__type,
        .dark .swagger-ui .parameter__in {
          color: hsl(var(--foreground));
        }
        .dark .swagger-ui .model-title {
          color: hsl(var(--foreground));
        }
        .dark .swagger-ui .model {
          color: hsl(var(--muted-foreground));
        }
      `}</style>
    </div>
  );
}
