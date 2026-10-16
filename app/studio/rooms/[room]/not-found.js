// Shown for a room address that does not exist.
import Link from 'next/link'
import { ROOMS } from '@/lib/crafts'

export default function RoomNotFound() {
  return (
    <div className="section">
      <div className="empty glass panel fam-pur">
        <span className="jewel"><svg aria-hidden="true"><use href="#i-rooms" /></svg></span>
        <h1 className="display h2">That room is not in the studio</h1>
        <p>The Button Box has four rooms. Choose one to step into.</p>
        <ul className="row" style={{ justifyContent: 'center', listStyle: 'none' }}>
          {ROOMS.map((r) => (
            <li key={r.key}>
              <Link className={`btn soft small fam-${r.family}`} href={`/studio/rooms/${r.key}`}>{r.name}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
