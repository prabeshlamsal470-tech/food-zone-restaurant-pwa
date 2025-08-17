import React from 'react';

const AdminTest = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: '#333', fontSize: '24px', marginBottom: '20px' }}>
        🍽️ Food Zone Admin Test Page
      </h1>
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h2 style={{ color: '#666', fontSize: '18px', marginBottom: '10px' }}>
          Admin Interface Test
        </h2>
        <p style={{ color: '#888', fontSize: '14px' }}>
          If you can see this page, React routing and basic rendering is working correctly.
        </p>
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#e8f5e8', borderRadius: '4px' }}>
          <strong style={{ color: '#2d5a2d' }}>✅ Status: Component Loaded Successfully</strong>
        </div>
      </div>
    </div>
  );
};

export default AdminTest;
