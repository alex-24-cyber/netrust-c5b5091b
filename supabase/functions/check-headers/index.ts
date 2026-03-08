import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SECURITY_HEADERS = [
  {
    name: 'Strict-Transport-Security',
    description: 'Enforces HTTPS connections, preventing downgrade attacks',
    severity: 'high',
  },
  {
    name: 'Content-Security-Policy',
    description: 'Prevents XSS, clickjacking, and code injection attacks',
    severity: 'high',
  },
  {
    name: 'X-Frame-Options',
    description: 'Prevents clickjacking by controlling iframe embedding',
    severity: 'medium',
  },
  {
    name: 'X-Content-Type-Options',
    description: 'Prevents MIME-type sniffing attacks',
    severity: 'medium',
  },
  {
    name: 'Referrer-Policy',
    description: 'Controls how much referrer info is sent with requests',
    severity: 'low',
  },
  {
    name: 'Permissions-Policy',
    description: 'Controls which browser features the site can use',
    severity: 'low',
  },
  {
    name: 'X-XSS-Protection',
    description: 'Legacy XSS filter (mostly superseded by CSP)',
    severity: 'low',
  },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUrl = parsedUrl.toString();

    const response = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'NetTrust-Security-Scanner/1.0' },
    });

    const isHttps = parsedUrl.protocol === 'https:';
    const results = SECURITY_HEADERS.map(header => {
      const value = response.headers.get(header.name);
      return {
        name: header.name,
        present: !!value,
        value: value || null,
        description: header.description,
        severity: header.severity,
      };
    });

    const presentCount = results.filter(r => r.present).length;
    const totalCount = results.length;
    const score = Math.round((presentCount / totalCount) * 100);

    let grade: string;
    if (score >= 85) grade = 'A';
    else if (score >= 70) grade = 'B';
    else if (score >= 50) grade = 'C';
    else if (score >= 30) grade = 'D';
    else grade = 'F';

    return new Response(JSON.stringify({
      url: targetUrl,
      isHttps,
      statusCode: response.status,
      headers: results,
      score,
      grade,
      presentCount,
      totalCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
