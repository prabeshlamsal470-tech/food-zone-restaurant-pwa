// Enhanced audio alert system for push notifications
class AudioAlertManager {
  constructor() {
    this.audioContext = null;
    this.isEnabled = true;
    this.isPlaying = false;
  }

  // Initialize audio context
  async init() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      // Resume audio context if suspended (required for mobile browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      return true;
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
      return false;
    }
  }

  // Create a loud bell/ring sound
  createBellSound(frequency = 800, duration = 0.5) {
    if (!this.audioContext) return null;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filterNode = this.audioContext.createBiquadFilter();

    // Connect audio nodes
    oscillator.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Configure bell sound
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.5, this.audioContext.currentTime + duration);

    // Add filter for bell-like resonance
    filterNode.type = 'bandpass';
    filterNode.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    filterNode.Q.setValueAtTime(10, this.audioContext.currentTime);

    // Volume envelope (loud start, quick fade)
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.8, this.audioContext.currentTime + 0.01); // Loud start
    gainNode.gain.exponentialRampToValueAtTime(0.1, this.audioContext.currentTime + duration * 0.3);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

    return { oscillator, gainNode, duration };
  }

  // Play bell sound 3 times with intervals
  async playTripleBell() {
    if (!this.isEnabled || this.isPlaying) return;
    
    this.isPlaying = true;
    
    try {
      // Ensure audio context is ready
      if (!this.audioContext) {
        await this.init();
      }
      
      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Play 3 bell sounds with different frequencies for variety
      const frequencies = [800, 1000, 800]; // High-low-high pattern
      const interval = 0.8; // Time between bells

      for (let i = 0; i < 3; i++) {
        const bell = this.createBellSound(frequencies[i], 0.6);
        if (bell) {
          const startTime = this.audioContext.currentTime + (i * interval);
          bell.oscillator.start(startTime);
          bell.oscillator.stop(startTime + bell.duration);
        }
        
        // Add vibration if available (mobile devices)
        if (navigator.vibrate) {
          setTimeout(() => {
            navigator.vibrate([300, 100, 300]); // Strong vibration pattern
          }, i * interval * 1000);
        }
      }

      // Reset playing flag after all sounds complete
      setTimeout(() => {
        this.isPlaying = false;
      }, (3 * interval + 0.6) * 1000);

    } catch (error) {
      console.warn('Audio alert failed:', error);
      this.isPlaying = false;
    }
  }

  // Alternative method using HTML5 Audio for better mobile support
  async playAudioFile(audioUrl, times = 3) {
    if (!this.isEnabled || this.isPlaying) return;
    
    this.isPlaying = true;
    
    try {
      for (let i = 0; i < times; i++) {
        const audio = new Audio(audioUrl);
        audio.volume = 1.0; // Maximum volume
        
        // Play with delay between repetitions
        setTimeout(async () => {
          try {
            await audio.play();
            
            // Add vibration
            if (navigator.vibrate) {
              navigator.vibrate([400, 200, 400]);
            }
          } catch (error) {
            console.warn(`Audio play attempt ${i + 1} failed:`, error);
          }
        }, i * 1000); // 1 second between plays
      }
      
      // Reset playing flag
      setTimeout(() => {
        this.isPlaying = false;
      }, times * 1000 + 2000);
      
    } catch (error) {
      console.warn('Audio file playback failed:', error);
      this.isPlaying = false;
    }
  }

  // Create notification sound using Web Audio API (works offline)
  async playNotificationAlert() {
    if (!this.isEnabled || this.isPlaying) return;
    
    // Try Web Audio API first (better for PWA/offline)
    try {
      await this.playTripleBell();
    } catch (error) {
      console.warn('Web Audio API failed, trying HTML5 audio:', error);
      // Fallback to HTML5 audio
      await this.playAudioFile('/sounds/notification-bell.mp3', 3);
    }
  }

  // Enable/disable audio alerts
  setEnabled(enabled) {
    this.isEnabled = enabled;
  }

  // Check if audio is enabled
  getEnabled() {
    return this.isEnabled;
  }

  // Request audio permissions (for mobile browsers)
  async requestPermissions() {
    try {
      // Try to initialize audio context
      const initialized = await this.init();
      if (!initialized) return false;
      
      // Play a silent sound to unlock audio on mobile
      if (this.audioContext) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
        
        console.log('Audio context unlocked successfully');
      }
      
      return true;
    } catch (error) {
      console.warn('Audio permission request failed:', error);
      return false;
    }
  }

  // Test audio functionality
  async testAudio() {
    try {
      await this.init();
      if (this.audioContext && this.audioContext.state === 'running') {
        console.log('Audio test: Playing single bell');
        const bell = this.createBellSound(800, 0.3);
        if (bell) {
          bell.oscillator.start();
          bell.oscillator.stop(this.audioContext.currentTime + bell.duration);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.warn('Audio test failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const audioAlertManager = new AudioAlertManager();

export default audioAlertManager;
