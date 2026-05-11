const db = require('../utils/fileDb');
const { generateId } = require('../utils/idGenerator');
const eventService = require('./eventService');
const { Ollama } = require('ollama');

// Initialize Ollama Client
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:2b';
const AI_ENABLED = process.env.AI_ENABLED !== 'false';
const CACHE_TTL_MS = (parseInt(process.env.AI_CACHE_TTL_SECONDS) || 300) * 1000;

const ollama = new Ollama({ host: OLLAMA_BASE_URL });

// Simple in-memory cache
const aiCache = new Map();

function getFromCache(key) {
  const cached = aiCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }
  return null;
}

function setCache(key, data, ttlMs = CACHE_TTL_MS) {
  aiCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

// ─── Gemma Integration Core ──────────────────────────────────────────────────

/**
 * Calls Ollama, enforces JSON output, and handles parsing.
 */
async function callGemma(prompt, systemPrompt = 'You are a behavioral discipline AI for Restraint Protocol. Analyze user data and return ONLY valid JSON. No explanation. No markdown formatting blocks like ```json.') {
  if (!AI_ENABLED) throw new Error('AI is disabled via env var.');

  try {
    const response = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      options: {
        temperature: 0.3, // Keep it deterministic and focused
      }
    });

    let content = response.message.content.trim();
    
    // Strip markdown code blocks if the model ignored the system prompt
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(content);
  } catch (err) {
    console.error('[AI] Gemma error or parse failure:', err.message);
    throw err; // Let calling function handle fallback
  }
}

// ─── Deterministic Fallback Engine ──────────────────────────────────────────

const MOTIVATIONAL_MESSAGES = [
  "Discipline is the bridge between goals and accomplishment. Hold your position.",
  "Every second you stay in session is proof that you are in control.",
  "Your future self is watching this moment. Don't let them down.",
  "The chain is only as strong as the weakest link. Be the strongest link.",
  "Pressure creates diamonds. Stay under pressure. Stay focused.",
  "Commitment made. Retreat is not an option.",
  "You started this. Finish what you started. No exceptions.",
  "Weakness is a choice. So is strength. Choose right now.",
];

const POST_FAILURE_ADVICE = [
  "Failure is data. Study when and why you broke. Adjust your next session.",
  "A shorter session completed beats a longer session failed. Scale down. Show up.",
  "The discipline muscle needs training. You tore it today. It will heal stronger.",
  "Document what triggered your exit. That trigger owns you right now. Take it back.",
  "You broke protocol. That is the record now. Build a new one starting next session.",
];

const POST_SUCCESS_MESSAGES = [
  "Protocol complete. Discipline demonstrated. Score updated.",
  "Session closed. You held the line when it mattered. Remember this feeling.",
  "Full session. Zero breaks. This is who you are becoming.",
  "Completed. Your streak holds. The record stands.",
];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeRiskScore(userData, sessionPlan) {
  let score = 0.3;
  const duration = sessionPlan.duration || 1500;

  if (duration > 3600) score += 0.25;
  else if (duration > 1800) score += 0.15;
  else if (duration > 900) score += 0.05;

  const streak = userData.streak || 0;
  if (streak === 0) score += 0.2;
  else if (streak < 3) score += 0.1;
  else if (streak >= 7) score -= 0.1;

  const stakeAmount = sessionPlan.stake_amount || 0;
  if (stakeAmount > 1000) score -= 0.05;
  else if (stakeAmount === 0) score += 0.1;

  if (userData.risk_level === 'high') score += 0.15;
  else if (userData.risk_level === 'low') score -= 0.1;

  return Math.min(Math.max(parseFloat(score.toFixed(2)), 0.05), 0.95);
}

// ─── AI Service Functions (Live + Fallback) ─────────────────────────────────

async function analyzePreSession(userData, sessionPlan) {
  const duration = sessionPlan.duration || 1500;
  const cacheKey = `preSession_${userData.id}_${duration}_${sessionPlan.stake_amount}`;
  
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  try {
    const prompt = `
User data:
- total_focus_time: ${userData.total_focus_time || 0} seconds
- streak: ${userData.streak || 0}
- focus_score: ${userData.focus_score || 0}
- user_risk_level: ${userData.risk_level || 'medium'}

Planned Session:
- duration: ${duration} seconds
- stake_amount: ${sessionPlan.stake_amount || 0}
- blocked_apps: ${(sessionPlan.blocked_apps || []).join(', ')}

Return exactly this JSON structure. The message MUST be exactly ONE short sentence:
{"risk_score": (float 0.0-1.0), "risk_level": "low|medium|high", "recommended_duration": (integer seconds), "suggested_stake": (integer), "message": "Exactly one short, stern sentence of coaching advice."}
`;
    const result = await callGemma(prompt);
    
    // Validate output loosely
    if (typeof result.risk_score !== 'number' || !result.message) throw new Error('Invalid schema from AI');
    
    setCache(cacheKey, result);
    return result;

  } catch (err) {
    console.log('[AI] Falling back to deterministic pre-session analysis');
    const riskScore = computeRiskScore(userData, sessionPlan);
    let riskLevel = 'low';
    let recommendedDuration = duration;
    let message = '';

    if (riskScore >= 0.7) {
      riskLevel = 'high';
      recommendedDuration = Math.min(duration, 1500);
      message = `High risk detected. Keep it to ${Math.floor(recommendedDuration / 60)} minutes to ensure completion.`;
    } else if (riskScore >= 0.4) {
      riskLevel = 'medium';
      recommendedDuration = Math.min(duration, 2700);
      message = `Moderate risk. Silence your phone and commit.`;
    } else {
      riskLevel = 'low';
      message = `You are ready. Commit to the full session.`;
    }

    const suggestedStake = riskScore >= 0.6 ? 1000 : riskScore >= 0.4 ? 500 : 200;

    return { risk_score: riskScore, risk_level: riskLevel, recommended_duration: recommendedDuration, suggested_stake: suggestedStake, message };
  }
}

async function generateFocusMessage(sessionData) {
  const elapsed = (sessionData.duration || 1500) - (sessionData.remaining_time || 0);
  const progress = elapsed / (sessionData.duration || 1500);
  const phase = progress < 0.33 ? 'early' : progress < 0.66 ? 'mid' : 'final';

  // We don't cache this as we want variety during long sessions, but we keep it fast.
  try {
    const prompt = `
Active session context:
- total_duration: ${sessionData.duration} seconds
- progress: ${Math.round(progress * 100)}%
- phase: ${phase}
- stake: ${sessionData.stake_amount || 0}

Return exactly this JSON. The message MUST be exactly ONE short sentence:
{"message": "Exactly one intense, short sentence of motivation to keep the user focused."}
`;
    const result = await callGemma(prompt);
    if (!result.message) throw new Error('Invalid schema');

    return { message: result.message, progress: parseFloat(progress.toFixed(2)), phase };
  } catch (err) {
    let message = getRandom(MOTIVATIONAL_MESSAGES);
    if (progress < 0.2) message = "Session locked. Do not waver.";
    else if (progress < 0.5) message = "The hardest part is behind you. Hold.";
    else if (progress < 0.8) message = "Discipline is compounding. Keep going.";
    else message = "Final stretch. Finish.";

    return { message, progress: parseFloat(progress.toFixed(2)), phase };
  }
}

async function generatePostSessionInsight(sessionResult) {
  const isSuccess = sessionResult.status === 'completed';
  const duration = sessionResult.duration || 1500;

  try {
    const prompt = `
Session outcome: ${sessionResult.status}
- planned_duration: ${duration} seconds
- stake_amount: ${sessionResult.stake_amount || 0}
- blocked_apps: ${(sessionResult.blocked_apps || []).join(', ')}

Return exactly this JSON. The message and advice MUST each be exactly ONE short sentence:
{"message": "Exactly one stern sentence assessing the outcome.", "advice": "Exactly one actionable sentence for their next session."}
`;
    const result = await callGemma(prompt);
    if (!result.message || !result.advice) throw new Error('Invalid schema');

    return {
      status: isSuccess ? 'completed' : 'failed',
      message: result.message,
      focus_points_earned: isSuccess ? Math.floor(duration / 60) * 2 : 0,
      streak_change: isSuccess ? +1 : -1,
      advice: result.advice,
    };
  } catch (err) {
    return {
      status: isSuccess ? 'completed' : 'failed',
      message: isSuccess ? getRandom(POST_SUCCESS_MESSAGES) : getRandom(POST_FAILURE_ADVICE),
      focus_points_earned: isSuccess ? Math.floor(duration / 60) * 2 : 0,
      streak_change: isSuccess ? +1 : -1,
      advice: isSuccess
        ? `Next session: try extending by 10 minutes.`
        : `Next session: set duration to ${Math.max(Math.floor(duration / 2 / 60), 10)} minutes.`,
    };
  }
}

async function generateUserSummary(userStats) {
  const cacheKey = `userSummary_${userStats.id}`;
  const cached = getFromCache(cacheKey);
  // User summary is heavier, cache for longer (10 mins)
  if (cached) return cached;

  const hours = Math.floor((userStats.total_focus_time || 0) / 3600);

  try {
    const prompt = `
User Profile Stats:
- total_focus_hours: ${hours}
- current_streak: ${userStats.streak || 0}
- focus_score: ${userStats.focus_score || 0}
- success_rate: ${userStats.success_rate || 0}%

Return exactly this JSON:
{"assessment": "2-3 sentences evaluating their overall discipline and reliability based on the stats.", "recommendation": "1 sentence on how they should approach their sessions this week."}
`;
    const result = await callGemma(prompt);
    if (!result.assessment || !result.recommendation) throw new Error('Invalid schema');

    const summary = {
      assessment: result.assessment,
      recommendation: result.recommendation,
      total_focus_hours: hours,
      current_streak: userStats.streak || 0,
      risk_profile: userStats.risk_level || 'unknown',
      focus_score: userStats.focus_score || 0,
    };
    
    setCache(cacheKey, summary, CACHE_TTL_MS * 2);
    return summary;

  } catch (err) {
    const { focus_score, streak, risk_level } = userStats;
    let assessment = '';
    let recommendation = '';

    if (focus_score >= 200) {
      assessment = "Elite discipline profile. Your commitment record is exceptional.";
      recommendation = "Maintain long sessions. Consider raising stakes to keep challenge alive.";
    } else if (focus_score >= 100) {
      assessment = "Strong protocol compliance. Streaks show consistent follow-through.";
      recommendation = "Push session durations. You are ready for harder commitments.";
    } else if (focus_score >= 50) {
      assessment = "Building discipline baseline. Progress is visible. Continue.";
      recommendation = "Protect your streak. One missed session resets momentum.";
    } else {
      assessment = "Protocol initiation phase. Establish the habit before increasing stakes.";
      recommendation = "Start with 15-25 minute sessions. Win consistently. Scale up.";
    }

    return {
      assessment,
      recommendation,
      total_focus_hours: hours,
      current_streak: streak || 0,
      risk_profile: risk_level || 'unknown',
      focus_score: focus_score || 0,
    };
  }
}

// ─── Persist AI Insight ───────────────────────────────────────────────────────

function saveInsight(userId, sessionId, type, content, riskScore = 0, confidence = 0.85) {
  const insight = {
    id: generateId('ai'),
    user_id: userId,
    session_id: sessionId,
    type,
    content,
    risk_score: riskScore,
    confidence,
    created_at: new Date().toISOString(),
  };
  db.insert('ai_insights', insight);
  eventService.logEvent('AI_ANALYSIS_GENERATED', userId, sessionId, { type });
  return insight;
}

function getUserInsights(userId) {
  return db.findMany('ai_insights', (a) => a.user_id === userId);
}

function getSessionInsight(sessionId) {
  return db.findMany('ai_insights', (a) => a.session_id === sessionId);
}

module.exports = {
  analyzePreSession,
  generateFocusMessage,
  generatePostSessionInsight,
  generateUserSummary,
  saveInsight,
  getUserInsights,
  getSessionInsight,
};
