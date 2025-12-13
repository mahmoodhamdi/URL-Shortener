'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp, Sparkles, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  UtmParams,
  UTM_SOURCES,
  UTM_MEDIUMS,
  UTM_TEMPLATES,
  buildUtmUrl,
  sanitizeUtmValue,
} from '@/lib/url/utm';

interface UtmBuilderProps {
  url: string;
  onChange: (params: UtmParams) => void;
  initialParams?: UtmParams;
}

export function UtmBuilder({ url, onChange, initialParams }: UtmBuilderProps) {
  const t = useTranslations('utm');
  const [isExpanded, setIsExpanded] = useState(false);
  const [params, setParams] = useState<UtmParams>(initialParams || {});
  const [copied, setCopied] = useState(false);

  // Notify parent of changes
  useEffect(() => {
    onChange(params);
  }, [params, onChange]);

  const handleTemplateSelect = (templateId: string) => {
    const template = UTM_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setParams({
        ...params,
        utmSource: template.source,
        utmMedium: template.medium,
        utmCampaign: template.campaign || params.utmCampaign,
      });
    }
  };

  const handleInputChange = (field: keyof UtmParams, value: string) => {
    setParams({
      ...params,
      [field]: value ? sanitizeUtmValue(value) : undefined,
    });
  };

  const previewUrl = url ? buildUtmUrl(url, params) : '';

  const handleCopyPreview = async () => {
    if (previewUrl) {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const hasParams = !!(
    params.utmSource ||
    params.utmMedium ||
    params.utmCampaign ||
    params.utmTerm ||
    params.utmContent
  );

  return (
    <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800/50">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-medium">{t('title')}</span>
          {hasParams && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {t('active')}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Templates */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('quickTemplates')}
            </label>
            <div className="flex flex-wrap gap-2">
              {UTM_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    params.utmSource === template.source &&
                    params.utmMedium === template.medium
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>

          {/* UTM Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('source')} <span className="text-gray-500">({t('required')})</span>
              </label>
              <input
                type="text"
                value={params.utmSource || ''}
                onChange={(e) => handleInputChange('utmSource', e.target.value)}
                placeholder={t('sourcePlaceholder')}
                list="utm-sources"
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <datalist id="utm-sources">
                {UTM_SOURCES.map((source) => (
                  <option key={source} value={source} />
                ))}
              </datalist>
              <p className="text-xs text-gray-500 mt-1">{t('sourceHelp')}</p>
            </div>

            {/* Medium */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('medium')} <span className="text-gray-500">({t('required')})</span>
              </label>
              <input
                type="text"
                value={params.utmMedium || ''}
                onChange={(e) => handleInputChange('utmMedium', e.target.value)}
                placeholder={t('mediumPlaceholder')}
                list="utm-mediums"
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <datalist id="utm-mediums">
                {UTM_MEDIUMS.map((medium) => (
                  <option key={medium} value={medium} />
                ))}
              </datalist>
              <p className="text-xs text-gray-500 mt-1">{t('mediumHelp')}</p>
            </div>

            {/* Campaign */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('campaign')} <span className="text-gray-500">({t('recommended')})</span>
              </label>
              <input
                type="text"
                value={params.utmCampaign || ''}
                onChange={(e) => handleInputChange('utmCampaign', e.target.value)}
                placeholder={t('campaignPlaceholder')}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{t('campaignHelp')}</p>
            </div>

            {/* Term */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('term')} <span className="text-gray-500">({t('optional')})</span>
              </label>
              <input
                type="text"
                value={params.utmTerm || ''}
                onChange={(e) => handleInputChange('utmTerm', e.target.value)}
                placeholder={t('termPlaceholder')}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{t('termHelp')}</p>
            </div>

            {/* Content */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">
                {t('content')} <span className="text-gray-500">({t('optional')})</span>
              </label>
              <input
                type="text"
                value={params.utmContent || ''}
                onChange={(e) => handleInputChange('utmContent', e.target.value)}
                placeholder={t('contentPlaceholder')}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-900 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">{t('contentHelp')}</p>
            </div>
          </div>

          {/* Preview */}
          {url && hasParams && (
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('preview')}
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-900 border rounded-md text-sm overflow-x-auto">
                  {previewUrl}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPreview}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Clear button */}
          {hasParams && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setParams({})}
              >
                {t('clearAll')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
