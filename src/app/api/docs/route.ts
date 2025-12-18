import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

/**
 * GET /api/docs
 * Returns the OpenAPI specification
 * Use /api/docs?format=yaml for YAML or /api/docs?format=json for JSON
 * Default: JSON (for Swagger UI compatibility)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'json';

  try {
    // Read the OpenAPI YAML file
    const openapiPath = path.join(process.cwd(), 'src', 'app', 'api', 'openapi.yaml');
    const openapiYaml = fs.readFileSync(openapiPath, 'utf-8');

    if (format === 'yaml') {
      return new NextResponse(openapiYaml, {
        headers: {
          'Content-Type': 'text/yaml',
          'Cache-Control': 'public, max-age=3600',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Parse YAML and return as JSON
    const openapiJson = yaml.load(openapiYaml);
    return NextResponse.json(openapiJson, {
      headers: {
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
