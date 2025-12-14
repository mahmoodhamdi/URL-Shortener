/**
 * Retargeting Pixel Script Generation
 * Generates tracking scripts for various advertising platforms
 */

export type PixelType =
  | 'FACEBOOK'
  | 'GOOGLE_ANALYTICS'
  | 'GOOGLE_ADS'
  | 'TWITTER'
  | 'LINKEDIN'
  | 'TIKTOK'
  | 'CUSTOM';

export interface PixelConfig {
  type: PixelType;
  pixelId: string;
  customScript?: string;
}

/**
 * Generate Facebook (Meta) Pixel script
 */
export function generateFacebookPixel(pixelId: string): string {
  return `<!-- Facebook Pixel -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${escapePixelId(pixelId)}');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=${escapePixelId(pixelId)}&ev=PageView&noscript=1"
/></noscript>
<!-- End Facebook Pixel -->`;
}

/**
 * Generate Google Analytics 4 (GA4) script
 */
export function generateGoogleAnalytics(measurementId: string): string {
  return `<!-- Google Analytics GA4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${escapePixelId(measurementId)}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${escapePixelId(measurementId)}');
</script>
<!-- End Google Analytics -->`;
}

/**
 * Generate Google Ads conversion tracking script
 */
export function generateGoogleAds(conversionId: string): string {
  return `<!-- Google Ads -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${escapePixelId(conversionId)}"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${escapePixelId(conversionId)}');
</script>
<!-- End Google Ads -->`;
}

/**
 * Generate Twitter (X) Pixel script
 */
export function generateTwitterPixel(pixelId: string): string {
  return `<!-- Twitter Pixel -->
<script>
!function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
twq('config','${escapePixelId(pixelId)}');
</script>
<!-- End Twitter Pixel -->`;
}

/**
 * Generate LinkedIn Insight Tag script
 */
export function generateLinkedInPixel(partnerId: string): string {
  return `<!-- LinkedIn Insight Tag -->
<script type="text/javascript">
_linkedin_partner_id = "${escapePixelId(partnerId)}";
window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
window._linkedin_data_partner_ids.push(_linkedin_partner_id);
</script>
<script type="text/javascript">
(function(l) {
if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
window.lintrk.q=[]}
var s = document.getElementsByTagName("script")[0];
var b = document.createElement("script");
b.type = "text/javascript";b.async = true;
b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
s.parentNode.insertBefore(b, s);})(window.lintrk);
</script>
<noscript>
<img height="1" width="1" style="display:none;" alt="" src="https://px.ads.linkedin.com/collect/?pid=${escapePixelId(partnerId)}&fmt=gif" />
</noscript>
<!-- End LinkedIn Insight Tag -->`;
}

/**
 * Generate TikTok Pixel script
 */
export function generateTikTokPixel(pixelId: string): string {
  return `<!-- TikTok Pixel -->
<script>
!function (w, d, t) {
w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
ttq.load('${escapePixelId(pixelId)}');
ttq.page();
}(window, document, 'ttq');
</script>
<!-- End TikTok Pixel -->`;
}

/**
 * Escape pixel ID to prevent XSS
 */
export function escapePixelId(id: string): string {
  return id
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate pixel ID format for different platforms
 */
export function validatePixelId(type: PixelType, pixelId: string): { valid: boolean; error?: string } {
  if (!pixelId || pixelId.trim() === '') {
    return { valid: false, error: 'Pixel ID is required' };
  }

  const trimmedId = pixelId.trim();

  switch (type) {
    case 'FACEBOOK':
      // Facebook Pixel ID: 15-16 digit number
      if (!/^\d{15,16}$/.test(trimmedId)) {
        return { valid: false, error: 'Facebook Pixel ID must be a 15-16 digit number' };
      }
      break;

    case 'GOOGLE_ANALYTICS':
      // GA4 Measurement ID: G-XXXXXXXXXX
      if (!/^G-[A-Z0-9]{10}$/i.test(trimmedId)) {
        return { valid: false, error: 'Google Analytics ID must be in format G-XXXXXXXXXX' };
      }
      break;

    case 'GOOGLE_ADS':
      // Google Ads Conversion ID: AW-XXXXXXXXXXX
      if (!/^AW-\d{10,11}$/i.test(trimmedId)) {
        return { valid: false, error: 'Google Ads ID must be in format AW-XXXXXXXXXXX' };
      }
      break;

    case 'TWITTER':
      // Twitter Pixel ID: alphanumeric
      if (!/^[a-z0-9]{5,10}$/i.test(trimmedId)) {
        return { valid: false, error: 'Twitter Pixel ID must be 5-10 alphanumeric characters' };
      }
      break;

    case 'LINKEDIN':
      // LinkedIn Partner ID: 6-7 digit number
      if (!/^\d{6,7}$/.test(trimmedId)) {
        return { valid: false, error: 'LinkedIn Partner ID must be a 6-7 digit number' };
      }
      break;

    case 'TIKTOK':
      // TikTok Pixel ID: alphanumeric, typically 20+ chars
      if (!/^[A-Z0-9]{15,30}$/i.test(trimmedId)) {
        return { valid: false, error: 'TikTok Pixel ID must be 15-30 alphanumeric characters' };
      }
      break;

    case 'CUSTOM':
      // Custom scripts - just check for basic content
      if (trimmedId.length < 10) {
        return { valid: false, error: 'Custom script must be at least 10 characters' };
      }
      break;
  }

  return { valid: true };
}

/**
 * Generate pixel script based on type
 */
export function generatePixelScript(config: PixelConfig): string {
  switch (config.type) {
    case 'FACEBOOK':
      return generateFacebookPixel(config.pixelId);
    case 'GOOGLE_ANALYTICS':
      return generateGoogleAnalytics(config.pixelId);
    case 'GOOGLE_ADS':
      return generateGoogleAds(config.pixelId);
    case 'TWITTER':
      return generateTwitterPixel(config.pixelId);
    case 'LINKEDIN':
      return generateLinkedInPixel(config.pixelId);
    case 'TIKTOK':
      return generateTikTokPixel(config.pixelId);
    case 'CUSTOM':
      return config.customScript || config.pixelId;
    default:
      return '';
  }
}

/**
 * Generate all pixel scripts for a list of pixels
 */
export function generateAllPixelScripts(pixels: PixelConfig[]): string {
  return pixels.map(generatePixelScript).join('\n');
}

/**
 * Get pixel platform display name
 */
export function getPixelTypeName(type: PixelType): string {
  const names: Record<PixelType, string> = {
    FACEBOOK: 'Meta (Facebook) Pixel',
    GOOGLE_ANALYTICS: 'Google Analytics 4',
    GOOGLE_ADS: 'Google Ads',
    TWITTER: 'X (Twitter) Pixel',
    LINKEDIN: 'LinkedIn Insight Tag',
    TIKTOK: 'TikTok Pixel',
    CUSTOM: 'Custom Script',
  };
  return names[type] || type;
}

/**
 * Get pixel platform icon (for UI)
 */
export function getPixelTypeIcon(type: PixelType): string {
  const icons: Record<PixelType, string> = {
    FACEBOOK: 'facebook',
    GOOGLE_ANALYTICS: 'bar-chart',
    GOOGLE_ADS: 'google',
    TWITTER: 'twitter',
    LINKEDIN: 'linkedin',
    TIKTOK: 'music',
    CUSTOM: 'code',
  };
  return icons[type] || 'code';
}
