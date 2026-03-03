// src/components/EmployeeRooms.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { RoomAPI } from "../api/roomAPI";

const ACCENTS  = ["accent-green","accent-blue","accent-yellow","accent-purple","accent-sky","accent-rose"];

export default function EmployeeRooms({ onBook }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roomSearch, setRoomSearch] = useState("");
  const [capFilter, setCapFilter] = useState("");
  const [facFilter, setFacFilter] = useState("");

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    try {
      const data = await RoomAPI.getEmployeeRooms();
      setRooms(Array.isArray(data) ? data : data?.items ?? []);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const allFacilities = useMemo(() => {
    const set = new Set();
    rooms.forEach(r => (r.facilities || []).forEach(f => set.add(f.name || f)));
    return [...set].sort();
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    let list = [...rooms];
    if (roomSearch.trim()) {
      const q = roomSearch.toLowerCase();
      list = list.filter(r =>
        r.name?.toLowerCase().includes(q) ||
        r.branchName?.toLowerCase().includes(q)
      );
    }
    if (capFilter) {
      const cap = parseInt(capFilter, 10);
      list = list.filter(r => r.capacity >= cap);
    }
    if (facFilter) {
      list = list.filter(r =>
        (r.facilities || []).some(f => (f.name || f) === facFilter)
      );
    }
    return list;
  }, [rooms, roomSearch, capFilter, facFilter]);

  return (
    <div className="emp-rooms-panel">
      {/* Filters */}
      <div className="emp-rooms-search">
        <input className="emp-search-input"
          placeholder="Search rooms or branch..."
          value={roomSearch} onChange={(e) => setRoomSearch(e.target.value)} />
        <select value={capFilter} onChange={e => setCapFilter(e.target.value)}>
          <option value="">Any Capacity</option>
          <option value="5">5+</option>
          <option value="10">10+</option>
          <option value="20">20+</option>
          <option value="50">50+</option>
        </select>
        <select value={facFilter} onChange={e => setFacFilter(e.target.value)}>
          <option value="">Any Facility</option>
          {allFacilities.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {/* Room cards */}
      {loading ? (
        <div className="emp-spinner" />
      ) : filteredRooms.length === 0 ? (
        <div className="emp-empty">No rooms match your filters</div>
      ) : (
        <div className="emp-rooms-grid">
          {filteredRooms.map((room, i) => (
            <div key={room.id} className="emp-room-card"
                 style={{ animationDelay:`${i*0.04}s` }}>
              <div className={`emp-room-card__accent ${ACCENTS[i%ACCENTS.length]}`} />
              <div className="emp-room-card__name">🚪 {room.name}</div>
              <div className="emp-room-card__branch">🏢 {room.branchName}</div>
              <div className="emp-room-card__row">
                <span className="emp-room-card__cap">👥 {room.capacity} people</span>
              </div>
              {(room.facilities || []).length > 0 && (
                <div className="emp-room-card__tags">
                  {(room.facilities || []).slice(0, 4).map((f, fi) => (
                    <span key={fi} className="emp-room-card__tag">{f.name || f}</span>
                  ))}
                  {(room.facilities || []).length > 4 && (
                    <span className="emp-room-card__tag">
                      +{(room.facilities || []).length - 4}
                    </span>
                  )}
                </div>
              )}
              <button className="emp-room-card__book-btn"
                onClick={() => onBook?.(room)}>
                🗓 Book Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}