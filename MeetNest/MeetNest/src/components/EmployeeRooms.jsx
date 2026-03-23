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

  return null;
}