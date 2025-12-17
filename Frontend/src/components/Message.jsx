import React from "react";

export default function Message({ m }) {
  return (
    <div className={"message " + (m.role === 'user' ? 'user' : 'bot')}>
      <div className="message-body">{m.text}</div>
      {m.refs && m.refs.length > 0 && (
        <div className="refs">
          {m.refs.slice(0,3).map((r, i) => (
            <div key={i} className="ref">{r.filename || r.title || 'ref'}</div>
          ))}
        </div>
      )}
    </div>
  );
}
