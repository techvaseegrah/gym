// Simple notification sound utility
// Since we don't have an actual sound file, we'll create a simple beep using the Web Audio API

let audioContext = null;

// Initialize audio context on first user interaction
const initAudioContext = () => {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
};

// Play a simple beep sound
export const playNotificationSound = () => {
    try {
        initAudioContext();
        
        if (!audioContext) {
            console.warn('AudioContext not available');
            return;
        }
        
        // Create oscillator for beep sound
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // Frequency in Hz
        gainNode.gain.value = 0.3; // Volume (0 to 1)
        
        oscillator.start();
        
        // Stop after 200ms
        setTimeout(() => {
            oscillator.stop();
        }, 200);
    } catch (error) {
        console.warn('Could not play notification sound:', error);
    }
};

// Fallback function that does nothing (for environments where audio is not supported)
export const playNotificationSoundSilent = () => {
    // Silent fallback - does nothing
    console.log('Notification sound would play here (silent mode)');
};