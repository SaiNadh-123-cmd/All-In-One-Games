import React, { useState } from 'react';
import { Capacitor } from '@capacitor/core';

const PrivacyPolicy = ({ onClose }: { onClose: () => void }) => {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, overflow: 'auto',
    }}>
      <div style={{
        maxWidth: 600, width: '100%',
        background: 'linear-gradient(145deg, #1e293b, #0f172a)',
        borderRadius: 20, border: '1px solid rgba(71,85,105,0.4)',
        padding: '32px 28px', maxHeight: '85vh', overflow: 'auto',
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>
          Privacy Policy
        </h2>

        <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p><strong style={{ color: '#cbd5e1' }}>Last updated:</strong> May 2026</p>

          <h3 style={{ color: '#f1f5f9', fontSize: 15, margin: 0 }}>1. Information We Collect</h3>
          <p>We collect minimal data to provide and improve our service:</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li>Game scores you achieve (stored via Supabase)</li>
            <li>A randomly generated player name for score saving</li>
            <li>Local best scores stored in your browser localStorage</li>
          </ul>

          <h3 style={{ color: '#f1f5f9', fontSize: 15, margin: 0 }}>2. Ad Serving</h3>
          <p>This app uses Google AdMob for advertising. AdMob may collect device identifiers and usage data to serve personalized ads. See <a href="https://policies.google.com/privacy" target="_blank" rel="noopener" style={{ color: '#60a5fa' }}>Google's Privacy Policy</a> for details.</p>

          <h3 style={{ color: '#f1f5f9', fontSize: 15, margin: 0 }}>3. Third-Party Services</h3>
          <p>We use the following third-party services:</p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li><strong>Supabase</strong> — Stores game scores on secure cloud servers</li>
            <li><strong>Google AdMob</strong> — Serves advertisements in the app</li>
            <li><strong>Google AdSense</strong> — Serves advertisements on the web version</li>
          </ul>

          <h3 style={{ color: '#f1f5f9', fontSize: 15, margin: 0 }}>4. Data Storage & Security</h3>
          <p>Scores are transmitted securely to Supabase. Player names are randomly generated and not tied to personal identity. No email, location, or contact information is collected.</p>

          <h3 style={{ color: '#f1f5f9', fontSize: 15, margin: 0 }}>5. Children's Privacy</h3>
          <p>This app is not directed at children under 13. We do not knowingly collect data from children.</p>

          <h3 style={{ color: '#f1f5f9', fontSize: 15, margin: 0 }}>6. Contact</h3>
          <p>For privacy concerns, contact the developer at the email listed on the app store listing.</p>
        </div>

        <button onClick={onClose} style={{
          marginTop: 24, width: '100%', padding: '14px 0',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          color: '#fff', border: 'none', borderRadius: 12,
          fontSize: 14, fontWeight: 700, cursor: 'pointer',
        }}>Close</button>
      </div>
    </div>
  );
};

const PrivacyLink = ({ onOpen }: { onOpen: () => void }) => (
  <button onClick={onOpen} style={{
    background: 'none', border: 'none', color: '#475569',
    fontSize: 12, cursor: 'pointer', textDecoration: 'underline',
    padding: 0,
  }}>Privacy Policy</button>
);

export { PrivacyPolicy, PrivacyLink };
