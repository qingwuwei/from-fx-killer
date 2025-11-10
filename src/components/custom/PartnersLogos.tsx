"use client";

import React from 'react';
import { motion } from 'motion/react';
import { useLanguage } from '@/contexts/LanguageContext';

const logos = [
  { id: 1, src: '/logos/1.png', alt: 'Partner 1' },
  { id: 2, src: '/logos/2.png', alt: 'Partner 2' },
  { id: 3, src: '/logos/3.png', alt: 'Partner 3' },
  { id: 4, src: '/logos/4.png', alt: 'Partner 4' },
  { id: 5, src: '/logos/5.png', alt: 'Partner 5' },
  { id: 6, src: '/logos/6.png', alt: 'Partner 6' },
  { id: 7, src: '/logos/7.png', alt: 'Partner 7' },
  { id: 8, src: '/logos/8.png', alt: 'Partner 8' },
  { id: 9, src: '/logos/9.png', alt: 'Partner 9' },
  { id: 10, src: '/logos/10.png', alt: 'Partner 10' },
];

export default function PartnersLogos() {
  const { language } = useLanguage();
  const isZh = language === 'zh';

  // 双倍数组用于无缝循环
  const doubledLogos = [...logos, ...logos];

  return (
    <section className="py-16 bg-white dark:bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-black mb-4">
            {isZh ? '合作伙伴' : 'Our Partners'}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {isZh
              ? '与全球领先的金融机构和平台建立战略合作伙伴关系'
              : 'Strategic partnerships with leading global financial institutions and platforms'}
          </p>
        </motion.div>

        {/* Logos Auto Scroll */}
        <div className="relative">
          <motion.div
            className="flex gap-12"
            animate={{
              x: [0, -100 * logos.length],
            }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 20,
                ease: "linear",
              },
            }}
          >
            {doubledLogos.map((logo, index) => (
              <div
                key={`${logo.id}-${index}`}
                className="flex-shrink-0 w-40 h-20 flex items-center justify-center"
              >
                <img
                  src={logo.src}
                  alt={logo.alt}
                  style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto' }}
                  className="object-contain filter grayscale hover:grayscale-0 transition-all duration-300 hover:scale-110"
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
