"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  GraduationCap, 
  Calendar, 
  Clock, 
  ArrowLeft, 
  Search,
  BookOpen,
  MapPinOff,
  RotateCcw,
  Trash2,
  Power,
  PowerOff,
  AlertCircle
} from "lucide-react";

// --- Types ---
type Role = "admin" | "teacher" | "student";
interface AuthTokens { access_token: string; refresh_token: string; }
interface UserProfile { userId: string; email: string; role: Role; }
interface Course { _id: { $oid: string }; courseCode: string; courseName: string; }
interface Session {
  _id: { $oid: string };
  title: string;
  scheduledStart: { $date: string };
  scheduledEnd: { $date: string };
  isAttendanceOpen: boolean;
  courseId: { $oid: string } | Course; 
  createdBy: { $oid: string } | { _id: { $oid: string }; fullName?: string };
}

const STORAGE_KEY = "attendance-auth";
const CHECKED_KEY = "checked-sessions-history";
const DEFAULT_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export default function SessionsPage() {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState(DEFAULT_URL);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date()); 
  const [checkedSessions, setCheckedSessions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const savedChecked = localStorage.getItem(CHECKED_KEY);
    if (savedChecked) setCheckedSessions(JSON.parse(savedChecked));
    return () => clearInterval(timer);
  }, []);

  // แมปปิ้งข้อมูลวิชาให้ครบทั้ง 6 รายวิชาตามไฟล์ JSON
  const getCourseInfo = (session: Session) => {
    const cId = (session.courseId as any).$oid;
    const courses: Record<string, {code: string, name: string}> = {
      "c001": { code: "CS101", name: "Introduction to Computer Science" },
      "c002": { code: "CS202", name: "Data Structures" },
      "c003": { code: "CS203", name: "Object-Oriented Programming" },
      "c004": { code: "MATH201", name: "Discrete Mathematics" },
      "c005": { code: "CS301", name: "Database Systems" },
      "c006": { code: "CS305", name: "Web Development" }
    };
    return courses[cId] || { code: "N/A", name: "Unknown Course" };
  };

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const info = getCourseInfo(s);
      return info.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
             info.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
             s.title.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [sessions, searchQuery]);

  // แยกกลุ่มตามสถานะการเปิด attendance
  const activeSessions = useMemo(() => filteredSessions.filter(s => s.isAttendanceOpen), [filteredSessions]);
  const historySessions = useMemo(() => filteredSessions.filter(s => !s.isAttendanceOpen), [filteredSessions]);

  const callWithAuth = useCallback(async (path: string, init: RequestInit = {}) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) { router.push("/"); return null; }
    const { tokens: currentTokens } = JSON.parse(saved);
    const call = (at: string) => fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...init.headers, 'Authorization': `Bearer ${at}`, 'Content-Type': 'application/json' }
    });
    let res = await call(currentTokens.access_token);
    if (res.status === 401) {
      const refresh = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST", headers: { 'Authorization': `Bearer ${currentTokens.refresh_token}` }
      });
      if (!refresh.ok) { localStorage.removeItem(STORAGE_KEY); router.push("/"); return null; }
      const updated = await refresh.json();
      setTokens(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ tokens: updated, baseUrl }));
      res = await call(updated.access_token);
    }
    return res;
  }, [baseUrl, router]);

  const loadAllSessions = useCallback(async () => {
    try {
      setLoading(true);
      // ข้อมูล 6 วิชา: 2 วิชาเปิดเช็ค (Active) และ 4 วิชาปิดเช็ค (History)
      const dataFromJson: Session[] = [
        // --- ส่วนที่เปิดให้เช็คชื่อ (Active) ---
        { "_id": { "$oid": "s001" }, "courseId": { "$oid": "c001" }, "title": "Lecture 1: Intro", "scheduledStart": { "$date": "2026-02-23T08:00:00Z" }, "scheduledEnd": { "$date": "2026-02-23T10:00:00Z" }, "isAttendanceOpen": true, "createdBy": { "$oid": "659c00666e032f7aeaafc801" } },
        { "_id": { "$oid": "s002" }, "courseId": { "$oid": "c002" }, "title": "Session 1: Errors", "scheduledStart": { "$date": "2026-02-23T10:00:00Z" }, "scheduledEnd": { "$date": "2026-02-23T12:00:00Z" }, "isAttendanceOpen": true, "createdBy": { "$oid": "659c00666e032f7aeaafc801" } },
        
        // --- ส่วนที่ไม่ได้เปิดให้เช็คชื่อ (History / Closed) ---
        { "_id": { "$oid": "s003" }, "courseId": { "$oid": "c003" }, "title": "Lecture 1", "scheduledStart": { "$date": "2026-02-23T13:00:00Z" }, "scheduledEnd": { "$date": "2026-02-23T15:00:00Z" }, "isAttendanceOpen": false, "createdBy": { "$oid": "659c00666e032f7aeaafc801" } },
        { "_id": { "$oid": "s004" }, "courseId": { "$oid": "c004" }, "title": "Lecture 1", "scheduledStart": { "$date": "2026-02-23T09:00:00Z" }, "scheduledEnd": { "$date": "2026-02-23T11:00:00Z" }, "isAttendanceOpen": false, "createdBy": { "$oid": "659c00666e032f7aeaafc802" } },
        { "_id": { "$oid": "s005" }, "courseId": { "$oid": "c005" }, "title": "Lab 1", "scheduledStart": { "$date": "2026-02-23T11:00:00Z" }, "scheduledEnd": { "$date": "2026-02-23T13:00:00Z" }, "isAttendanceOpen": false, "createdBy": { "$oid": "659c00666e032f7aeaafc802" } },
        { "_id": { "$oid": "s006" }, "courseId": { "$oid": "c006" }, "title": "Lecture 2", "scheduledStart": { "$date": "2026-02-23T15:00:00Z" }, "scheduledEnd": { "$date": "2026-02-23T17:00:00Z" }, "isAttendanceOpen": false, "createdBy": { "$oid": "659c00666e032f7aeaafc802" } }
      ];
      setSessions(dataFromJson);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const { tokens: t, baseUrl: b } = JSON.parse(saved);
      setTokens(t); setBaseUrl(b || DEFAULT_URL);
    } else { router.push("/"); }
  }, [router]);

  useEffect(() => {
    if (!tokens) return;
    (async () => {
      setLoading(true);
      const pRes = await callWithAuth("/auth/profile");
      if (pRes && pRes.ok) {
        const userData = await pRes.json();
        setProfile(userData);
        loadAllSessions();
      }
      setLoading(false);
    })();
  }, [tokens, callWithAuth, loadAllSessions]);

  const handleCheckIn = (sessionId: string, courseCode: string) => {
    // CS202 จะติด Error ตามเงื่อนไขที่กำหนด
    if (courseCode === "CS202") { 
      setLocationError(sessionId); 
      return; 
    }
    setLocationError(null);
    const updatedChecked = [...checkedSessions, sessionId];
    setCheckedSessions(updatedChecked);
    localStorage.setItem(CHECKED_KEY, JSON.stringify(updatedChecked));
  };

  const toggleAttendance = async (sessionId: string, currentStatus: boolean) => {
    if (!profile || profile.role !== "teacher") return;
    setSessions(prev => prev.map(s => s._id.$oid === sessionId ? { ...s, isAttendanceOpen: !currentStatus } : s));
    try {
      await callWithAuth(`/attendance/sessions/${sessionId}/toggle`, {
        method: "PATCH", body: JSON.stringify({ isAttendanceOpen: !currentStatus })
      });
    } catch (err) { console.error(err); }
  };

  const handleResetHistory = () => {
    if (confirm("ต้องการล้างประวัติเช็คชื่อทั้งหมด?")) {
      localStorage.removeItem(CHECKED_KEY);
      setCheckedSessions([]);
      setLocationError(null);
    }
  };

  const handleBackNavigation = () => {
    if (profile?.role === "admin") router.push("/admin");
    else if (profile?.role === "teacher") router.push("/teacher");
    else router.push("/student");
  };

  const renderCard = (session: Session) => {
    const sessionId = session._id.$oid;
    const isAlreadyChecked = checkedSessions.includes(sessionId);
    const courseInfo = getCourseInfo(session);
    const isLocationFail = locationError === sessionId;
    const isTeacher = profile?.role === "teacher";
    
    const startTime = new Date(session.scheduledStart.$date);
    const endTime = new Date(session.scheduledEnd.$date);
    const isTimeValid = currentTime >= startTime && currentTime <= endTime;

    return (
      <div className={`group relative rounded-[2.5rem] border transition-all duration-500 bg-white shadow-sm overflow-hidden ${
          session.isAttendanceOpen ? 'border-green-500 ring-4 ring-green-500/5 animate-pulse-scale' : 'border-slate-200 opacity-90'
        } ${isLocationFail ? 'border-red-500 ring-red-500/10' : ''}`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider ${isLocationFail ? 'bg-red-500' : 'bg-[#130f2a]'}`}>
                {courseInfo.code}
              </span>
              <div className={`h-2 w-2 rounded-full ${isLocationFail ? 'bg-red-500' : session.isAttendanceOpen ? 'bg-green-500 animate-ping' : 'bg-slate-300'}`}></div>
            </div>
            <div className={`text-[10px] font-black uppercase tracking-widest ${isAlreadyChecked ? 'text-blue-500' : isLocationFail ? 'text-red-600' : session.isAttendanceOpen ? 'text-green-600' : 'text-slate-400'}`}>
              {isAlreadyChecked ? 'Success' : isLocationFail ? 'Failed' : session.isAttendanceOpen ? 'Live' : 'Closed'}
            </div>
          </div>

          <h4 className="text-[14px] font-black text-[#130f2a] mb-1 line-clamp-1 uppercase tracking-tight">{courseInfo.name}</h4>
          <p className="text-[12px] font-bold text-slate-500 mb-4 line-clamp-1">{session.title}</p>

          {isLocationFail && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between gap-2 text-red-600 animate-bounce">
              <div className="flex items-center gap-2">
                <MapPinOff size={14} />
                <span className="text-[9px] font-black uppercase tracking-tighter">อยู่นอกพิกัดที่กำหนด</span>
              </div>
              <button onClick={() => setLocationError(null)} className="bg-white px-2 py-1 rounded-lg border text-[8px] font-black uppercase hover:bg-red-50 transition-colors">
                <RotateCcw size={10} /> Retry
              </button>
            </div>
          )}

          <div className="flex items-center gap-4 mb-8">
            <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-black">
              <Clock size={14} className="text-indigo-500" />
              {startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})} - {endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
            </div>
          </div>

          {session.isAttendanceOpen && profile?.role === "student" && (
            <button 
              onClick={() => handleCheckIn(sessionId, courseInfo.code)}
              disabled={isAlreadyChecked || isLocationFail}
              className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase transition-all shadow-lg active:scale-95 ${
                isAlreadyChecked ? 'bg-slate-100 text-slate-400' : isLocationFail ? 'bg-red-50 text-red-300 opacity-50' : 'bg-green-600 text-white hover:bg-[#130f2a] shadow-green-600/20'
              }`}
            >
              {isAlreadyChecked ? 'Checked In' : isLocationFail ? 'Fix Error Above' : 'Check In Now'}
            </button>
          )}

          {isTeacher && (
            <button 
              onClick={() => toggleAttendance(sessionId, session.isAttendanceOpen)}
              className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase transition-all flex items-center justify-center gap-2 shadow-lg ${
                session.isAttendanceOpen ? 'bg-red-100 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-green-100 text-green-600 hover:bg-green-600 hover:text-white'
              }`}
            >
              {session.isAttendanceOpen ? <><PowerOff size={14} /> Close Attendance</> : <><Power size={14} /> Open Attendance</>}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="h-screen text-[#130f2a] font-sans relative overflow-hidden bg-[#CBD5E1] flex flex-col">
      <nav className="z-50 border-b border-slate-300/50 bg-white/40 backdrop-blur-xl shrink-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#130f2a] text-white shadow-lg"><GraduationCap size={20} /></div>
            <span className="text-lg font-black tracking-tighter uppercase">MKATD.</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleResetHistory} className="p-2 rounded-xl border border-red-200 bg-white text-red-500 shadow-sm"><Trash2 size={18} /></button>
            <button onClick={handleBackNavigation} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-[10px] font-black flex items-center gap-2 transition-all hover:bg-red-50 shadow-sm"><ArrowLeft size={14} /> BACK</button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col mx-auto w-full max-w-7xl px-6 py-6 relative z-10 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-1 font-black text-[10px] uppercase tracking-[0.3em]"><BookOpen size={16} /> Course Records</div>
            <h3 className="text-3xl font-black tracking-tight uppercase text-[#0f172a] leading-none">Class Sessions</h3>
          </div>
          <div className="flex items-center gap-3 bg-white/80 p-1.5 rounded-2xl shadow-sm border border-white min-w-[350px]">
            <Search size={18} className="ml-3 text-slate-400" />
            <input type="text" placeholder="SEARCH COURSE..." className="w-full bg-transparent text-[10px] font-black outline-none py-2 uppercase tracking-widest" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-10 pb-20">
          <section>
            <h4 className="text-[12px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-ping"></div> รายวิชาที่เปิดเช็คชื่อ ({activeSessions.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {activeSessions.map((s, idx) => <React.Fragment key={idx}>{renderCard(s)}</React.Fragment>)}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6 opacity-60">
              <div className="h-5 w-1 bg-slate-400 rounded-full"></div>
              <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-500">รายวิชาที่ยังไม่เปิด / ประวัติ ({historySessions.length})</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {historySessions.map((s, idx) => <React.Fragment key={idx}>{renderCard(s)}</React.Fragment>)}
            </div>
          </section>
        </div>
      </div>
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @keyframes pulse-scale { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        .animate-pulse-scale { animation: pulse-scale 3s ease-in-out infinite; }
      `}</style>
    </main>
  );
}