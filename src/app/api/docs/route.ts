import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * GET /api/docs
 * Returns the OpenAPI specification in YAML format
 * Use /api/docs?format=yaml for YAML or /api/docs for default YAML response
 *
 * Swagger UI can parse YAML directly, so no conversion needed.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'yaml';

  try {
    // Read the OpenAPI YAML file
    const openapiPath = path.join(process.cwd(), 'src', 'app', 'api', 'openapi.yaml');
    const openapiYaml = fs.readFileSync(openapiPath, 'utf-8');

    // Return as YAML (Swagger UI can parse YAML directly)
    return new NextResponse(openapiYaml, {
      headers: {
        'Content-Type': format === 'yaml' ? 'text/yaml' : 'application/x-yaml',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error loading OpenAPI spec:', error);
    return NextResponse.json(
      { error: 'Failed to load API documentation' },
      { status: 500 }
    );
  }
}
