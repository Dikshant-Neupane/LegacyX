/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // LegacyX Design Tokens
        'vault-bg': '#0A0A08',
        'vault-surface': '#111110',
        'vault-raised': '#1A1A18',
        'vault-text': '#F0EDE6',
        'vault-muted': '#8A8880',
        'vault-gold': '#C9A96E',
        'vault-amber': '#D4782A',
        'vault-red': '#C0392B',
        'vault-green': '#4A9B6F',
        'vault-border': '#2A2A28',
      },
      fontFamily: {
        'display': ['Playfair Display', 'serif'],
        'heading': ['DM Serif Display', 'serif'],
        'body': ['Sora', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'hero': ['clamp(48px, 8vw, 96px)', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
        'section': ['clamp(32px, 5vw, 56px)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'subtitle': ['clamp(16px, 2vw, 20px)', { lineHeight: '1.6' }],
        'caption': ['13px', { lineHeight: '1.5' }],
      },
      boxShadow: {
        'gold-glow': '0 0 40px rgba(201, 169, 110, 0.08)',
        'gold-hover': '0 0 60px rgba(201, 169, 110, 0.15)',
        'gold-intense': '0 0 80px rgba(201, 169, 110, 0.25)',
      },
      animation: {
        'grain': 'grain 8s steps(10) infinite',
        'shimmer': 'shimmer 4s ease-in-out infinite',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'flame': 'flame 0.5s ease-in-out infinite alternate',
        'cursor-morph': 'cursorMorph 0.2s ease-out',
        'typewriter': 'typewriter 1s steps(44) forwards',
        'seal-stamp': 'sealStamp 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'sonar-ping': 'sonarPing 1.2s ease-out forwards',
        'dash-travel': 'dashTravel 20s linear infinite',
        'scan-ring': 'scanRing 3s linear infinite',
        'float-up': 'floatUp 3s ease-out forwards',
      },
      keyframes: {
        grain: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '10%': { transform: 'translate(-5%, -10%)' },
          '20%': { transform: 'translate(-15%, 5%)' },
          '30%': { transform: 'translate(7%, -25%)' },
          '40%': { transform: 'translate(-5%, 25%)' },
          '50%': { transform: 'translate(-15%, 10%)' },
          '60%': { transform: 'translate(15%, 0%)' },
          '70%': { transform: 'translate(0%, 15%)' },
          '80%': { transform: 'translate(3%, 35%)' },
          '90%': { transform: 'translate(-10%, 10%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '100%': { backgroundPosition: '0% 0%' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(201, 169, 110, 0.1)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 40px rgba(201, 169, 110, 0.3)' },
        },
        flame: {
          '0%': { clipPath: 'polygon(50% 0%, 20% 100%, 80% 100%)' },
          '25%': { clipPath: 'polygon(45% 5%, 15% 100%, 85% 95%)' },
          '50%': { clipPath: 'polygon(55% 0%, 25% 95%, 75% 100%)' },
          '75%': { clipPath: 'polygon(48% 3%, 18% 100%, 82% 98%)' },
          '100%': { clipPath: 'polygon(52% 0%, 22% 98%, 78% 100%)' },
        },
        cursorMorph: {
          '0%': { width: '12px', height: '12px' },
          '100%': { width: '32px', height: '32px' },
        },
        sealStamp: {
          '0%': { transform: 'scale(2)', opacity: '0' },
          '60%': { transform: 'scale(0.9)', opacity: '1' },
          '80%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        sonarPing: {
          '0%': { transform: 'scale(1)', opacity: '0.6', borderColor: 'rgba(201, 169, 110, 0.6)' },
          '100%': { transform: 'scale(2.5)', opacity: '0', borderColor: 'rgba(201, 169, 110, 0)' },
        },
        dashTravel: {
          '0%': { strokeDashoffset: '1000' },
          '100%': { strokeDashoffset: '0' },
        },
        scanRing: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-200px) rotate(45deg)', opacity: '0' },
        },
        typewriter: {
          from: { width: '0' },
          to: { width: '100%' },
        },
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #C9A96E 0%, #D4782A 100%)',
        'gold-subtle': 'linear-gradient(135deg, rgba(201, 169, 110, 0.1) 0%, rgba(201, 169, 110, 0.02) 100%)',
      },
    },
  },
  plugins: [],
};
