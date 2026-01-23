export default function Home() {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      textAlign: 'center',
      padding: '20px'
    }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>EzyPzy API Server</h1>
      <p style={{ fontSize: '1.25rem', color: '#666', marginBottom: '2rem' }}>
        ✅ Server is running
      </p>
      <div style={{ 
        background: '#f5f5f5', 
        padding: '20px', 
        borderRadius: '8px',
        maxWidth: '600px'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Available API Endpoints:</h2>
        <ul style={{ 
          textAlign: 'left', 
          lineHeight: '2',
          listStyle: 'none',
          padding: 0
        }}>
          <li>📦 <code>/api/products</code> - Products API</li>
          <li>🏢 <code>/api/businesses</code> - Businesses API</li>
          <li>🎁 <code>/api/ads</code> - Offers/Ads API</li>
          <li>🛒 <code>/api/orders</code> - Orders API</li>
          <li>👤 <code>/api/users</code> - Users API</li>
          <li>⭐ <code>/api/favorites</code> - Favorites API</li>
          <li>🔔 <code>/api/notifications</code> - Notifications API</li>
          <li>🔐 <code>/api/auth/*</code> - Authentication API</li>
        </ul>
      </div>
    </div>
  );
}
