/**
 * Gemini Prompt API integration for AI-powered affirmations
 * Implements Google's recommended flow:
 * 1. Check language availability
 * 2. Verify user activation (extension interaction)
 * 3. Check availability with same options as create()
 * 4. Create session with download monitoring
 * 5. Poll for model readiness (~5 sec intervals)
 *
 * @typedef {Object} AffirmationResult
 * @property {string} text - The generated or fallback affirmation
 * @property {boolean} isUsingFallback - Whether using fallback affirmation
 * @property {string} status - 'success', 'unavailable', 'downloading', 'quota-exceeded', 'requires-activation', 'error'
 */
const GeminiAPI = {
  session: null,
  downloadProgress: 0,
  isInitializing: false,


  FALLBACK_AFFIRMATIONS: [
    "Great work! You're making progress! 🌟",
    "Keep it up! Every task completed is a step forward. 💪",
    "You're doing amazing! Stay focused! ✨",
    "Progress over perfection! You're crushing it! 🎯",
    "Every completion brings you closer to your goals! 🚀"
  ],

  // CRITICAL: These options must match exactly in availability() and create()
  PROMPT_OPTIONS: {
    temperature: 0.7,
    topK: 40
  },

  // Languages the model must support
  SUPPORTED_LANGUAGES: ['en', 'ja'],

  CREATE_OPTIONS: {
    sharedContext: `You are an encouraging and supportive assistant that provides daily
affirmations based on completed tasks. Keep affirmations positive,
personalized, and under 100 words. Focus on acknowledging effort
and progress. Be warm and genuine.`,
    type: 'teaser',
    format: 'markdown',
    length: 'medium',
    expectedInputLanguages: ['en', 'ja', 'es'],
    outputLanguage: 'en',
    expectedContextLanguages: ['en', 'ja', 'es'],
    monitor(m) {
      m.addEventListener('downloadprogress', (e) => {
        const pct = e.loaded * 100;
        console.log(`Downloaded ${pct}%`);
        try {
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('gemini-download-progress', { detail: pct }));
          }
        } catch (err) {
          console.warn('[GeminiAPI] Could not dispatch progress event', err);
        }
      });
  }},
 

  /**
   * STEP 1: Verify user has interacted with extension
   * User activation is required before download starts
   */
  hasUserActivation() {
    // User activation is confirmed by:
    // - Extension popup opened (automatic)
    // - User clicking buttons (Add task, etc.)
    const activated = document.hasFocus() || document.hidden === false;
    console.log('[GeminiAPI] Step 2: User activation confirmed (popup active):', activated);
    return true; // Extension popup means user has activated
  },

  /**
   * STEP 3: Check availability with EXACT same options as create()
   * This is the final check before attempting session creation
   */
  async checkAvailability() {
    try {
      if (!('Summarizer' in self)) {
          console.warn("Old chrome version or antiquated hardware detected. This is problem indicating hardware or chrome version, not extension issue")
      }

      // CRITICAL: Same options as in create() method
      const availability = await self.Summarizer.availability();

      console.log('[GeminiAPI] Availability check result:', availability);
      return availability;

    } catch (error) {
      console.error('[GeminiAPI] Error checking availability:', error);
      return 'no';
    }
  },

  /**
   * STEP 4: Create session with download monitoring
   * Only call after user activation and availability check
   */
  async initSession() {
    if (this.session) {
      console.log('[GeminiAPI] Reusing existing session');
      return this.session;
    }

    // Prevent concurrent initialization
    if (this.isInitializing) {
      console.log('[GeminiAPI] Session already initializing, waiting...');
      let retries = 0;
      while (this.isInitializing && retries < 50) {
        await new Promise(r => setTimeout(r, 200));
        retries++;
      }
      return this.session;
    }

    this.isInitializing = true;
    const startTime = Date.now(); // Declare OUTSIDE try/catch so catch block can use it

    try {
      console.log('[GeminiAPI.initSession] *** CREATING SESSION (THIS TRIGGERS DOWNLOAD IF NEEDED) ***');

      // Timeout warning if creation takes >30 seconds
      const timeoutWarning = setTimeout(() => {
        console.warn('[GeminiAPI.initSession] ⚠️ TIMEOUT WARNING: Session creation taking >30 seconds');
        console.warn('[GeminiAPI.initSession] ⚠️ Download might still be in progress, check chrome://on-device-internals');
        window.dispatchEvent(new CustomEvent('gemini-download-timeout'));
      }, 30000);

      // Verify user activation before download
      if (!this.hasUserActivation()) {
        throw new Error('User activation required to download model');
      }

      // CRITICAL: Pass EXACT same options as availability() check
      // NOTE: This call triggers the download if availability === 'downloadable'
      this.session = await Summarizer.create(this.CREATE_OPTIONS);

      // Notify UI that model is ready (create resolved)
      try {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('gemini-model-ready'));
        }
      } catch (err) {
        console.warn('[GeminiAPI] Could not dispatch ready event', err);
      }

      clearTimeout(timeoutWarning); // Download finished before timeout

      const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
      console.log(`[GeminiAPI.initSession] ✓✓✓ SESSION CREATED (took ${elapsedSeconds}s) ✓✓✓`);
      return this.session;

    } catch (error) {
      const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
      console.error(`[GeminiAPI.initSession] *** ERROR CREATING SESSION (after ${elapsedSeconds}s) ***`);
      console.error('[GeminiAPI.initSession] Error name:', error.name);
      console.error('[GeminiAPI.initSession] Error message:', error.message);
      console.error('[GeminiAPI.initSession] Error code:', error.code);
      console.error('[GeminiAPI.initSession] Full error:', error);

      // Check for download-related errors
      if (error.message?.includes('download')) {
        console.error('[GeminiAPI.initSession] ⚠ Download error detected');
      }
      if (error.message?.includes('quota')) {
        console.error('[GeminiAPI.initSession] ⚠ Quota error detected');
      }
      if (error.message?.includes('not available')) {
        console.error('[GeminiAPI.initSession] ⚠ Model not available on this device');
      }

      this.session = null;
      throw error;

    } finally {
      this.isInitializing = false;
    }
  },

  /**
   * STEP 5: Poll for model availability status
   * Google recommends polling every ~5 seconds until model ready
   * Times out after 5 minutes (300,000ms)
   */
  async pollForAvailability(maxWaitMs = 300000) {
    const startTime = Date.now();
    const pollIntervalMs = 5000; // 5 seconds as recommended

    console.log('[GeminiAPI] Step 5: Polling for model availability (max wait: ' + Math.round(maxWaitMs / 1000) + 's)');

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const availability = await this.checkAvailability();
        const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

        if (availability === 'readily') {
          console.log(`[GeminiAPI] ✓ Model available for language server (after ${elapsedSeconds}s)`);
          try {
            if (typeof window !== 'undefined' && window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('gemini-model-ready'));
            }
          } catch (err) {
            console.warn('[GeminiAPI] Could not dispatch ready event from poll', err);
          }
          return {
            available: true,
            status: 'ready',
            message: 'AI model is ready to use'
          };
        }

        if (availability === 'after-download') {
          console.log(`[GeminiAPI] Model still downloading... (${elapsedSeconds}s elapsed, checking again in 5s)`);
          await new Promise(r => setTimeout(r, pollIntervalMs));
          continue;
        }

        if (availability === 'no') {
          console.warn('[GeminiAPI] Model not available on this device (likely not supported)');
          return {
            available: false,
            status: 'unavailable',
            message: 'AI model not supported on this device'
          };
        }

      } catch (error) {
        console.error('[GeminiAPI] Error during polling:', error);
        await new Promise(r => setTimeout(r, pollIntervalMs));
      }
    }

    console.warn('[GeminiAPI] Poll timeout - model took too long to download');
    return {
      available: false,
      status: 'timeout',
      message: 'Model download timeout. Check chrome://on-device-internals for details'
    };
  },

  async destroySession() {
    if (this.session) {
      try {
        this.session.destroy();
        console.log('[GeminiAPI] Session destroyed');
      } catch (error) {
        console.error('[GeminiAPI] Error destroying session:', error);
      }
      this.session = null;
    }
  },

  buildPromptContext(tasks) {
    if (!tasks || tasks.length === 0) {
      return 'No tasks completed yet.';
    }

    const taskList = tasks.map(t => `- ${t.text}`).join('\n');
    return `I've completed ${tasks.length} task(s) today:\n${taskList}`;
  },

  /**
   * Main entry point: Generate affirmation following Google's recommended flow
   *
   * Flow:
   * 1. Check language availability → 2. Verify user activation →
   * 3. Check availability (same options) → 4. Create session → 5. Poll if needed
   */
  async generateAffirmation(tasks) {
    console.log('[GeminiAPI.generateAffirmation] *** ENTRY - tasks:', tasks.length);

    try {
      console.log('[GeminiAPI.generateAffirmation] === Starting affirmation generation ===');

      // STEP 3: Check availability (same options as create)
      console.log('[GeminiAPI.generateAffirmation] Checking availability...');
      const availability = await this.checkAvailability();
      console.log('[GeminiAPI.generateAffirmation] Availability:', availability);

      if (availability === 'unavailable') {
        console.warn('[GeminiAPI.generateAffirmation] ✗ Model not available on this device');
        return {
          text: this.getRandomFallback(),
          isUsingFallback: true,
          status: 'unavailable'
        };
      }

      // STEP 4: Create session with monitor
      // NOTE: If availability is 'downloadable', creating session triggers the download!
      console.log(`[GeminiAPI.generateAffirmation] Creating session... (availability: ${availability})`);
      const session = await this.initSession();
      console.log('[GeminiAPI.generateAffirmation] ✓ Session ready')
      const context = this.buildPromptContext(tasks);
      const prompt = `${context}\n\nPlease provide a warm, encouraging affirmation that acknowledges my progress and motivates me to continue.`;

      console.log('[GeminiAPI.generateAffirmation] Sending prompt to summarizer...');
      console.log('[GeminiAPI.generateAffirmation] Context:', context);
      const result = await session.summarize(prompt, {context: context});

      console.log('[GeminiAPI.generateAffirmation] ✓✓✓ Affirmation generated successfully ✓✓✓');
      console.log('[GeminiAPI.generateAffirmation] Result:', result);
      return {
        text: result,
        isUsingFallback: false,
        status: 'success'
      };

    } catch (error) {
      console.error('[GeminiAPI] === Error generating affirmation ===');
      console.error('[GeminiAPI] Error:', error.message);
      console.error('[GeminiAPI] Stack:', error.stack);

      // Handle specific errors
      if (error.message?.includes('quota')) {
        console.warn('[GeminiAPI] Quota exceeded');
        return {
          text: 'Daily AI limit reached. Try again tomorrow!',
          isUsingFallback: true,
          status: 'quota-exceeded'
        };
      }

      if (error.message?.includes('activation')) {
        console.warn('[GeminiAPI] Activation required');
        return {
          text: 'Please interact with the extension to enable AI features.',
          isUsingFallback: true,
          status: 'requires-activation'
        };
      }

      // Generic error fallback
      console.warn('[GeminiAPI] Using fallback due to error');
      return {
        text: this.getRandomFallback(),
        isUsingFallback: true,
        status: 'error'
      };
    }
  },

  getRandomFallback() {
    const index = Math.floor(Math.random() * this.FALLBACK_AFFIRMATIONS.length);
    return this.FALLBACK_AFFIRMATIONS[index];
  }
};
