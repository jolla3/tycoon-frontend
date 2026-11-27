export function SocialCard() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '66px 76px',
        color: '#102A43',
        fontFamily: 'Arial, sans-serif',
        background: 'linear-gradient(135deg, #F4F6F8 0%, #E7F7FA 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          right: -95,
          top: -120,
          width: 470,
          height: 470,
          borderRadius: 235,
          border: '2px solid rgba(0, 150, 199, 0.12)',
          display: 'flex',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            display: 'flex',
            width: 52,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 14,
            background: '#023E8A',
            color: '#FFFFFF',
            fontSize: 27,
            fontWeight: 700,
          }}
        >
          J
        </div>
        <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, letterSpacing: '2px', color: '#023E8A' }}>
          JOMUGIT
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 40 }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 735 }}>
          <div
            style={{
              display: 'flex',
              color: '#0077B6',
              fontSize: 19,
              fontWeight: 700,
              letterSpacing: '3px',
              marginBottom: 22,
            }}
          >
            RENTAL &amp; PROPERTY MANAGEMENT
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 56,
              lineHeight: 1.12,
              fontWeight: 700,
              letterSpacing: '-1.5px',
              color: '#023E8A',
            }}
          >
            Manage rental operations with clarity.
          </div>
          <div style={{ display: 'flex', marginTop: 23, fontSize: 24, lineHeight: 1.35, color: '#4A5568' }}>
            One workspace for estates, houses, tenants, rent collection and reporting.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            width: 235,
            height: 270,
            flexShrink: 0,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 30,
            background: '#023E8A',
            boxShadow: '0 20px 55px rgba(2, 62, 138, 0.16)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', width: 124, height: 170, padding: 15, gap: 12, background: '#FFFFFF', borderRadius: 12 }}>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 27, height: 27, borderRadius: 5, background: '#00B4D8' }} />
              <div style={{ width: 27, height: 27, borderRadius: 5, background: '#00B4D8' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 27, height: 27, borderRadius: 5, background: '#00B4D8' }} />
              <div style={{ width: 27, height: 27, borderRadius: 5, background: '#00B4D8' }} />
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ width: 27, height: 27, borderRadius: 5, background: '#00B4D8' }} />
              <div style={{ width: 27, height: 27, borderRadius: 5, background: '#00B4D8' }} />
            </div>
            <div style={{ display: 'flex', alignSelf: 'center', width: 39, height: 37, marginTop: 'auto', background: '#023E8A' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', fontSize: 17, color: '#52606D', letterSpacing: '0.3px' }}>
        Published by JOMUGIT CONSULTING LIMITED
      </div>
    </div>
  );
}
