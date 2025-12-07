import React from 'react';

interface VKVideoEmbedProps {
  aspectRatio?: string;
  className?: string;
  rounded?: '2xl' | '3xl';
}

export const VKVideoEmbed: React.FC<VKVideoEmbedProps> = ({ 
  aspectRatio = '16 / 9',
  className = '',
  rounded = '3xl'
}) => {
  // VK video embed URL
  // URL: https://vkvideo.ru/video-234473214_456239017
  // owner_id: -234473214 (отрицательный!), video_id: 456239017
  // hash: 0ef452bb5d660fff (обязателен для работы)
  const embedUrl = 'https://vkvideo.ru/video_ext.php?oid=-234473214&id=456239017&hash=0ef452bb5d660fff';

  const roundedClass = rounded === '2xl' ? 'rounded-2xl' : 'rounded-3xl';

  return (
    <div className={`relative w-full ${className}`} style={{ aspectRatio }}>
      <div className={`absolute inset-0 ${roundedClass} overflow-hidden backdrop-blur-sm border border-white/10`}>
        <iframe
          src={embedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allowFullScreen
          className="absolute inset-0"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          title="VK Video Embed"
        />
      </div>
      {/* Decorative elements */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-indigo-500/30 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-500/30 rounded-full blur-2xl pointer-events-none"></div>
    </div>
  );
};

