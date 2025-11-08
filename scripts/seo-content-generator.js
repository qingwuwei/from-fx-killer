const Parser = require('rss-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');
const crypto = require('crypto');

const RSS_SOURCES = [
  'https://www.fxstreet.com/rss/news/latest'
];

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const NEWS_DIR = path.join(__dirname, '../src/content/news');
const HISTORY_FILE = path.join(__dirname, '../.news-history.json');

// 黑名单关键词（推广相关）
const SPAM_KEYWORDS = [
  'sponsored', 'advertisement', 'promoted', 'affiliate',
  'partner content', 'paid promotion', 'sponsored by',
  'click here', 'sign up now', 'register today',
  'limited offer', 'exclusive deal',
  'open account', 'deposit bonus', 'trading bonus',
  'free $100', 'risk-free', 'guaranteed profit',
  '赞助', '广告', '推广', '合作推广', '商业推广',
  '开户', '入金', '赠金', '免费赠送', '保证盈利'
];

// 加载历史记录
function loadHistory() {
  if (fs.existsSync(HISTORY_FILE)) {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  }
  return { hashes: [] };
}

// 保存历史记录
function saveHistory(history) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
}

// 生成内容哈希
function generateHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

// 检查是否重复
function isDuplicate(title, history) {
  const hash = generateHash(title.toLowerCase().trim());
  if (history.hashes.includes(hash)) {
    console.log(`❌ Duplicate detected: "${title}"`);
    return true;
  }
  history.hashes.push(hash);
  // 只保留最近1000条历史
  if (history.hashes.length > 1000) {
    history.hashes = history.hashes.slice(-1000);
  }
  return false;
}

// 检查是否是垃圾内容
function isSpamContent(title, description) {
  const text = (title + ' ' + description).toLowerCase();

  for (const keyword of SPAM_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      console.log(`❌ Filtered spam: "${title}" (含关键词: ${keyword})`);
      return true;
    }
  }

  const linkCount = (text.match(/http/g) || []).length;
  if (linkCount > 3) {
    console.log(`❌ Filtered spam: "${title}" (链接过多: ${linkCount})`);
    return true;
  }

  return false;
}

// 检查内容质量
function isQualityContent(title, description) {
  if (title.length < 20 || description.length < 50) {
    console.log(`❌ Filtered low quality: "${title}" (内容过短)`);
    return false;
  }

  const forexKeywords = [
    'eur', 'usd', 'gbp', 'jpy', 'forex', 'currency',
    'gold', 'silver', 'oil', 'bitcoin', 'crypto',
    '外汇', '货币', '汇率', '黄金', '比特币'
  ];

  const text = (title + ' ' + description).toLowerCase();
  const hasForexKeyword = forexKeywords.some(kw =>
    text.includes(kw.toLowerCase())
  );

  if (!hasForexKeyword) {
    console.log(`❌ Filtered non-forex: "${title}"`);
    return false;
  }

  return true;
}

// 清理内容
function cleanContent(content) {
  content = content.replace(/<[^>]*>/g, '');
  content = content.replace(/https?:\/\/[^\s]+/g, '');
  content = content.replace(/[\w.-]+@[\w.-]+\.\w+/g, '');
  content = content.replace(/\s+/g, ' ').trim();
  return content;
}

// 使用Groq AI改写（中文版本）
async function rewriteWithGroqZh(content) {
  if (!GROQ_API_KEY) {
    return simpleRewriteZh(content);
  }

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'groq/compound',
        messages: [
          {
            role: 'system',
            content: '你是专业的外汇分析师。将外汇新闻改写为SEO友好的中文内容。只返回改写后的文章内容，不要有任何解释、推理过程或元信息。'
          },
          {
            role: 'user',
            content: `改写以下外汇新闻：

${content}

严格要求：
1. 第一行必须是中文标题（翻译原标题）
2. 只返回文章内容，不要有"改写后的内容"等标签
3. 不要解释你的改写过程
4. 保持核心信息不变
5. 改变表达方式和句子结构
6. 自然融入关键词：外汇、交易
7. 正文分成2-3个段落，每段3-4句话
8. 总字数200-250字
9. 段落之间空一行
10. 立即开始写文章`
          }
        ],
        temperature: 0.7,
        max_tokens: 600
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Groq API错误（中文）:', error.message);
    return simpleRewriteZh(content);
  }
}

// 使用Groq AI改写（英文版本）
async function rewriteWithGroqEn(content) {
  if (!GROQ_API_KEY) {
    return simpleRewriteEn(content);
  }

  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'groq/compound',
        messages: [
          {
            role: 'system',
            content: 'You are a professional forex analyst. Rewrite forex news into SEO-friendly English content. Return ONLY the rewritten article content, NO explanations, NO meta-commentary, NO "rewritten content" labels.'
          },
          {
            role: 'user',
            content: `Rewrite this forex news:

${content}

CRITICAL RULES:
1. Return ONLY the article paragraphs - nothing else
2. NO labels like "Rewritten Content" or "Reasoning"
3. NO explanations about your process
4. Keep core facts unchanged
5. Use different expressions and sentence structures
6. Include keywords: forex, trading
7. Write 2-3 paragraphs, each with 3-4 sentences
8. 150-200 words total
9. Separate paragraphs with blank lines
10. Start writing the article IMMEDIATELY`
          }
        ],
        temperature: 0.7,
        max_tokens: 400
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Groq API错误（英文）:', error.message);
    return simpleRewriteEn(content);
  }
}

// 简单改写（中文备用）
function simpleRewriteZh(content) {
  const parts = content.split('\n');
  const englishTitle = parts[0].trim();
  const desc = parts.slice(1).join(' ').substring(0, 100);

  // 简单的英译中标题（基于常见交易术语）
  let chineseTitle = englishTitle
    .replace(/USD\/JPY/gi, '美元/日元')
    .replace(/EUR\/USD/gi, '欧元/美元')
    .replace(/GBP\/USD/gi, '英镑/美元')
    .replace(/AUD\/USD/gi, '澳元/美元')
    .replace(/USD\/CAD/gi, '美元/加元')
    .replace(/NZD\/USD/gi, '纽元/美元')
    .replace(/USD\/CHF/gi, '美元/瑞郎')
    .replace(/XAU\/USD/gi, '黄金/美元')
    .replace(/XAG\/USD/gi, '白银/美元')
    .replace(/Price Forecast/gi, '价格预测')
    .replace(/Technical Analysis/gi, '技术分析')
    .replace(/Market Update/gi, '市场更新')
    .replace(/rebounds/gi, '反弹')
    .replace(/rises/gi, '上涨')
    .replace(/falls/gi, '下跌')
    .replace(/steady/gi, '稳定')
    .replace(/tops/gi, '突破')
    .replace(/struggles/gi, '承压');

  return `${chineseTitle}

外汇市场最新动态显示，${desc}

市场分析师指出，当前外汇交易环境复杂多变，投资者需要密切关注相关经济数据和技术指标的变化。专业交易员建议，在当前市场环境下应谨慎操作，严格控制风险，合理设置止损止盈位。

技术面分析显示，关键支撑位和阻力位对交易决策至关重要。外汇交易者应结合基本面和技术面进行综合分析，制定合理的交易策略。市场波动性增加时，更需要保持冷静，避免情绪化交易。`;
}

// 简单改写（英文备用）
function simpleRewriteEn(content) {
  const parts = content.split('\n');
  const desc = parts.slice(1).join(' ').substring(0, 100);

  return `Latest forex market updates indicate ${desc}

Market analysts point out that forex trading volatility has increased significantly in recent sessions. Traders are advised to monitor economic data releases closely and maintain strict risk management protocols when executing trades.

Technical indicators suggest key support and resistance levels remain crucial for trading decisions. Forex market participants should combine fundamental and technical analysis to develop robust trading strategies in the current environment.`;
}

// 生成slug
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

// 主函数
async function generateContent() {
  if (!fs.existsSync(NEWS_DIR)) {
    fs.mkdirSync(NEWS_DIR, { recursive: true });
  }

  const history = loadHistory();
  const parser = new Parser();
  const today = dayjs().format('YYYY-MM-DD');

  let totalGenerated = 0;
  let totalFiltered = 0;

  for (const feedUrl of RSS_SOURCES) {
    try {
      console.log(`\n📡 抓取RSS: ${feedUrl}`);
      const feed = await parser.parseURL(feedUrl);
      const items = feed.items.slice(0, 10);

      for (const item of items) {
        const cleanTitle = cleanContent(item.title);
        const cleanDesc = cleanContent(item.contentSnippet || item.description || '');

        // 重复检测
        if (isDuplicate(cleanTitle, history)) {
          totalFiltered++;
          continue;
        }

        // 过滤垃圾内容
        if (isSpamContent(cleanTitle, cleanDesc)) {
          totalFiltered++;
          continue;
        }

        // 检查质量
        if (!isQualityContent(cleanTitle, cleanDesc)) {
          totalFiltered++;
          continue;
        }

        const slug = slugify(cleanTitle);
        const dirName = `${today}-${slug}`;
        const newsPath = path.join(NEWS_DIR, dirName);

        if (fs.existsSync(newsPath)) {
          console.log(`⏭️  已存在: ${cleanTitle}`);
          continue;
        }

        console.log(`\n🤖 处理: ${cleanTitle}`);

        // 创建目录
        fs.mkdirSync(newsPath, { recursive: true });

        // AI改写中英文版本
        const [contentZh, contentEn] = await Promise.all([
          rewriteWithGroqZh(`${cleanTitle}\n\n${cleanDesc}`),
          rewriteWithGroqEn(`${cleanTitle}\n\n${cleanDesc}`)
        ]);

        // 从中文内容中提取标题（第一行）和正文
        const zhLines = contentZh.split('\n');
        const zhTitle = zhLines[0].trim();
        const zhBody = zhLines.slice(1).filter(line => line.trim()).join('\n\n');

        // 从中文正文中提取前100字作为描述
        const zhDescription = zhBody.replace(/\n/g, ' ').substring(0, 150);

        // 生成中文Markdown
        const markdownZh = `---
title: "${zhTitle.replace(/"/g, '\\"')}"
date: "${dayjs().format('YYYY-MM-DD HH:mm:ss')}"
description: "${zhDescription.replace(/"/g, '\\"')}"
keywords: ["外汇", "交易", "市场分析", "外汇新闻"]
category: "外汇新闻"
source: "FX Killer 分析团队"
language: "zh"
---

${zhBody}

---

**数据来源**: FX Killer 分析团队
**更新时间**: ${dayjs().format('YYYY-MM-DD HH:mm')}

**免责声明**: 本文仅供参考，不构成投资建议。外汇交易存在风险，请谨慎决策。
`;

        // 生成英文Markdown
        const markdownEn = `---
title: "${cleanTitle.replace(/"/g, '\\"')}"
date: "${dayjs().format('YYYY-MM-DD HH:mm:ss')}"
description: "${cleanDesc.substring(0, 150).replace(/"/g, '\\"')}"
keywords: ["forex", "trading", "market analysis", "forex news"]
category: "Forex News"
source: "FX Killer Analysis Team"
language: "en"
---

${contentEn}

---

**Data Source**: FX Killer Analysis Team
**Updated**: ${dayjs().format('YYYY-MM-DD HH:mm')}

**Disclaimer**: This article is for reference only and does not constitute investment advice. Forex trading involves risks; please make decisions carefully.
`;

        // 写入文件
        fs.writeFileSync(path.join(newsPath, 'zh.md'), markdownZh, 'utf8');
        fs.writeFileSync(path.join(newsPath, 'en.md'), markdownEn, 'utf8');

        console.log(`✅ 生成: ${dirName} (中英双语)`);
        totalGenerated++;

        // 控制速度，避免触发限制
        // 每分钟限制：70K token, 30次请求
        // 每篇文章约2次请求（中文+英文），约2K tokens
        // 安全间隔：10秒，确保每分钟最多6次请求，约12K tokens
        await sleep(10000); // 10秒间隔

        // 每次运行最多生成3篇（6个请求，约6K tokens）
        if (totalGenerated >= 3) {
          break;
        }
      }
    } catch (error) {
      console.error(`❌ 处理失败 ${feedUrl}:`, error.message);
    }
  }

  // 保存历史记录
  saveHistory(history);

  console.log(`\n📊 统计:`);
  console.log(`  ✅ 成功生成: ${totalGenerated} 篇 (${totalGenerated * 2} 个文件)`);
  console.log(`  ❌ 过滤掉: ${totalFiltered} 篇`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

generateContent()
  .then(() => console.log('\n✨ 完成！'))
  .catch(error => {
    console.error('\n💥 致命错误:', error);
    process.exit(1);
  });
