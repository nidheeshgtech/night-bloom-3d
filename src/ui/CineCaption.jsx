// Tour title card in a film-titles style: chapter counter with a drawn gold rule, title words
// rising out of a mask one after another, subtitle settling in. The opening and closing shots
// (the brand) get a larger centred title card. Leaves on its own before the next shot.
export default function CineCaption({ caption, variant = 'hud' }) {
  const { title, sub, index = null, total = null, duration = 8 } = caption
  const isTitle = index !== null && (index === 0 || index === total - 1)
  const pad = (n) => String(n).padStart(2, '0')
  return (
    <div
      className={`cine cine-${variant} ${isTitle ? 'cine-title' : ''}`}
      key={title + sub}
      style={{ '--out': `${Math.max(2.5, duration - 0.9)}s` }}
    >
      {index !== null && !isTitle && (
        <div className="cine-chapter">
          <span>{pad(index)}</span>
          <i />
          <span>{pad(total - 2)}</span>
        </div>
      )}
      <h2>
        {title.split(' ').map((w, k) => (
          <span className="cine-word" key={k} style={{ '--d': `${0.15 + k * 0.09}s` }}>
            <span>{w}</span>
          </span>
        ))}
      </h2>
      {sub && <p>{sub}</p>}
    </div>
  )
}
