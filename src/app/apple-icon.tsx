import { ImageResponse } from 'next/og';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 38,
          background: '#023E8A',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: 92,
            height: 112,
            padding: 12,
            gap: 9,
            borderRadius: 9,
            background: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', gap: 9 }}>
            <div style={{ width: 19, height: 19, borderRadius: 3, background: '#00B4D8' }} />
            <div style={{ width: 19, height: 19, borderRadius: 3, background: '#00B4D8' }} />
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <div style={{ width: 19, height: 19, borderRadius: 3, background: '#00B4D8' }} />
            <div style={{ width: 19, height: 19, borderRadius: 3, background: '#00B4D8' }} />
          </div>
          <div
            style={{
              display: 'flex',
              alignSelf: 'center',
              width: 28,
              height: 29,
              borderTopLeftRadius: 4,
              borderTopRightRadius: 4,
              background: '#023E8A',
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
