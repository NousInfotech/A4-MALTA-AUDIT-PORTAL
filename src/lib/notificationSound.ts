/**
 * Notification Sound Utility
 * Handles playing notification sounds based on user preferences
 */

// Create audio context for notification sounds
let audioContext: AudioContext | null = null;

// Initialize audio context
const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

/**
 * Generate a simple notification sound using Web Audio API
 * @param volume Volume level (0-1)
 * @param frequency Frequency in Hz (default: 800)
 * @param duration Duration in milliseconds (default: 200)
 */
const playTone = (volume: number = 0.7, frequency: number = 800, duration: number = 200) => {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
};

/**
 * Play a notification sound based on priority
 * @param priority Notification priority
 * @param volume Volume level (0-1)
 */
export const playNotificationSound = (priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal', volume: number = 0.7) => {
  // Resume audio context if suspended (required by some browsers)
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  switch (priority) {
    case 'urgent':
      // High-pitched, longer sound for urgent notifications
      playTone(volume, 1000, 300);
      setTimeout(() => playTone(volume, 1200, 200), 100);
      break;
    case 'high':
      // Medium-high pitch for high priority
      playTone(volume, 900, 250);
      break;
    case 'normal':
      // Standard notification sound
      playTone(volume, 800, 200);
      break;
    case 'low':
      // Lower pitch, shorter sound for low priority
      playTone(volume * 0.6, 600, 150);
      break;
    default:
      playTone(volume, 800, 200);
  }
};

/**
 * Play a custom notification sound from a file
 * @param soundUrl URL to the sound file
 * @param volume Volume level (0-1)
 */
export const playCustomSound = (soundUrl: string, volume: number = 0.7) => {
  try {
    const audio = new Audio(soundUrl);
    audio.volume = volume;
    audio.play().catch((error) => {
      console.warn('Could not play custom notification sound:', error);
    });
  } catch (error) {
    console.warn('Could not create audio element:', error);
  }
};

/**
 * Test notification sound
 */
export const testNotificationSound = (volume: number = 0.7) => {
  playNotificationSound('normal', volume);
};

