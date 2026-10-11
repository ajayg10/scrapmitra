import { useEffect, useRef, useState } from 'react';

import videoAsset from '../../assets/loopback-cta.mp4';
import poster from '../../assets/loopback-cta-poster.jpg';

import AnimatedSection from './ui/AnimatedSection';
import DotTexture from './ui/DotTexture';
import Eyebrow from './ui/Eyebrow';

export default function FinalCTASection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showVideo, setShowVideo] = useState(false);

  // Respect the user's reduced-motion preference.
  useEffect(() => {
    const mediaQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    const updateMotionPreference = () => {
      setShowVideo(!mediaQuery.matches);
    };

    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);

    return () => {
      mediaQuery.removeEventListener('change', updateMotionPreference);
    };
  }, []);

  // Play the video when motion is permitted.
  useEffect(() => {
    if (!showVideo || !videoRef.current) return;

    videoRef.current.play().catch(() => {
      // If autoplay is unavailable, the poster remains visible.
    });
  }, [showVideo]);

  return (
    <section
      aria-labelledby="final-cta-title"
      className="lb-section lb-section-ivory lb-cta-section relative isolate overflow-hidden"
      style={{
        position: 'relative',
        isolation: 'isolate',
        overflow: 'hidden',
        backgroundColor: 'transparent',
        borderTop: '1px solid #D7E3D2',
        padding: 0,
        margin: 0,
      }}
    >
      {/* Background poster: visible before the video loads or if it fails */}
      <img
        src={poster}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[60%_center]"
      />

      {/* Cinematic background video */}
      {showVideo && (
        <video
          ref={videoRef}
          className="absolute inset-0 -z-20 h-full w-full object-cover object-[60%_center]"
          src={videoAsset}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          onError={() => setShowVideo(false)}
        />
      )}

      {/* Dark forest wash to make the cinematic video rich and text readable */}
      <div
        className="absolute inset-0 -z-10"
        aria-hidden="true"
        style={{
          background:
            'linear-gradient(180deg, rgba(11,41,35,0.75) 0%, rgba(11,41,35,0.65) 50%, rgba(11,41,35,0.75) 100%)',
        }}
      />

      {/* Existing decorative texture and glow */}
      <DotTexture id="cta-dots" />

      <div className="lb-cta-glow" aria-hidden="true" />

      {/* Existing CTA content */}
      <div
        className="lb-container lb-center-text flex flex-col items-center"
        style={{
          position: 'relative',
          zIndex: 1,
          paddingTop: 'clamp(36px, 5vw, 60px)',
          paddingBottom: 'clamp(40px, 5vw, 64px)',
        }}
      >
        <AnimatedSection>
          <div className="flex flex-col items-center justify-center">
            <Eyebrow light>
              THE STORY CONTINUES WITH YOUR DEVICE
            </Eyebrow>

            <h2
              id="final-cta-title"
              className="lb-cta-h2 text-[#F6F3E9]"
              style={{
                fontFamily: '"Space Grotesk", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(36px, 5vw, 60px)',
                letterSpacing: '-2px',
                marginBottom: '16px',
                maxWidth: '800px',
                lineHeight: 1.1,
              }}
            >
              Before you throw it away,
              <br className="hidden md:block" />
              find out what it could{' '}
              <span className="relative inline-block pb-[0.2em]">
                become.
                <svg
                  className="absolute left-[0.02em] bottom-0 w-[56%] h-auto pointer-events-none"
                  viewBox="0 0 200 22"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  focusable="false"
                  style={{
                    display: 'block',
                    overflow: 'visible',
                  }}
                >
                  <path
                    fill="#F15B40"
                    d="M2 14 C22 8 42 6.5 62 9 C82 11.5 100 13.5 125 10.5 C150 7.5 175 4.5 198 4.8 L198 6.6 C176 8.5 152 14.5 124 17.5 C98 20.5 80 18.5 60 15.5 C40 12.5 22 14 2 16.5 Z"
                  />
                </svg>
              </span>
            </h2>

            <p
              className="lb-cta-sub text-[#A8BDA5]"
              style={{
                fontFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
                fontSize: '20px',
                maxWidth: '500px',
                margin: '0 auto 28px',
              }}
            >
              Every device deserves the right next decision. Start with
              what you already have.
            </p>

            <div className="flex flex-col sm:flex-row gap-[16px] justify-center items-center w-full px-4 sm:px-0">
              <a
                href="/app"
                className="inline-flex items-center justify-center whitespace-nowrap flex-none font-bricolage font-[600] leading-none transition-transform hover:-translate-y-px h-[54px] px-[28px] gap-[10px] text-[18px] border-2 border-[#0F1A17] rounded-[4px] bg-[#0F3D33] !text-[#F6F3E9] shadow-[4px_4px_0_#F0A530] w-full sm:w-auto"
              >
                Find its next life

                <svg
                  className="w-[16px] h-[16px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 19.5l15-15m0 0H8.25m10.75 0v10.75"
                  />
                </svg>
              </a>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center whitespace-nowrap flex-none font-bricolage font-[600] leading-none transition-transform hover:-translate-y-px h-[54px] px-[28px] gap-[10px] text-[18px] border-2 border-[#0F1A17] rounded-[4px] bg-[#F6F3E9] text-[#0F1A17] shadow-[4px_4px_0_#0F1A17] w-full sm:w-auto"
                onClick={(event) => {
                  event.preventDefault();

                  document
                    .querySelector('#how-it-works')
                    ?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                Explore how it works

                <svg
                  className="w-[16px] h-[16px]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </a>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
