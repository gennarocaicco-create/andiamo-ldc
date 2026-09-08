export default function ScorePickersSheet({ title, pseudos, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10,20,50,0.55)', zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', width: '100%', maxWidth: 480, borderRadius: '20px 20px 0 0',
          maxHeight: '70vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{ padding: '18px 20px 10px', fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15 }}>
          {title}
        </div>
        <div style={{ overflowY: 'auto', padding: '0 20px 20px' }}>
          {pseudos.map((pseudo, i) => (
            <div
              key={i}
              style={{
                padding: '9px 0', borderBottom: i < pseudos.length - 1 ? '1px solid rgba(15,31,61,0.06)' : 'none',
                fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 14,
              }}
            >
              {pseudo}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
