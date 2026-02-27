"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  ArrowLeft,
  Search,
  BookOpen,
  MapPinOff,
  RotateCcw,
  Trash2,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Clock,
  Power,
  Users,
  X
} from "lucide-react";

// --- Types ตาม Database ---
interface AuthTokens { access_token: string; refresh_token: string; }
interface UserProfile {
  userId?: string;
  email: string;
  role: string;
  fullName?: string;
  _id?: string;
  id?: string;
  sub?: string;
}

interface CourseSession {
  _id: string;
  courseCode: string;
  courseName: string;
  location?: {
    latitude: number;
    longitude: number;
    building: string;
  };
  schedule: string;
  teacherId: string;
  isActive: boolean;
}

const STORAGE_KEY = "attendance-auth";
const CHECKED_KEY = "checked-sessions-history";
const DEFAULT_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

// --- สูตรคำนวณระยะทาง GPS (Haversine Formula) หน่วยเป็นเมตร ---
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// --- ฟังก์ชันเช็คเวลาเรียน ---
const daysMap: Record<string, number> = {
  "sunday": 0, "monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4, "friday": 5, "saturday": 6,
  "sun": 0, "mon": 1, "tue": 2, "wed": 3, "thu": 4, "fri": 5, "sat": 6
};

const isCourseTimeNow = (scheduleStr?: string, currentTime: Date = new Date()) => {
  if (!scheduleStr) return false;
  try {
    const parts = scheduleStr.split(' ');
    if (parts.length !== 2) return false;

    const currentDay = currentTime.getDay();
    const normalizedDay = parts[0].trim().toLowerCase();
    const targetDay = daysMap[normalizedDay] ?? daysMap[normalizedDay.substring(0, 3)];

    if (currentDay !== targetDay) return false;

    const [startStr, endStr] = parts[1].split('-');
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    const [startHour, startMin] = startStr.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMin;

    const [endHour, endMin] = endStr.split(':').map(Number);
    const endTotalMinutes = endHour * 60 + endMin;

    return currentMinutes >= startTotalMinutes && currentMinutes <= endTotalMinutes;
  } catch (err) {
    console.error("Time parsing error:", err);
    return false;
  }
};

export default function SessionsPage() {
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState(DEFAULT_URL);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<CourseSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingGps, setCheckingGps] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkedSessions, setCheckedSessions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationError, setLocationError] = useState<{ id: string, distance: number, message: string } | null>(null);

  // --- States สำหรับ Teacher ---
  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [selectedCourseName, setSelectedCourseName] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const savedChecked = localStorage.getItem(CHECKED_KEY);
    if (savedChecked) setCheckedSessions(JSON.parse(savedChecked));
    return () => clearInterval(timer);
  }, []);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      return s.courseName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.courseCode?.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [sessions, searchQuery]);

  const activeSessions = useMemo(() => filteredSessions.filter(s => s.isActive && isCourseTimeNow(s.schedule, currentTime)), [filteredSessions, currentTime]);
  const historySessions = useMemo(() => filteredSessions.filter(s => !s.isActive || !isCourseTimeNow(s.schedule, currentTime)), [filteredSessions, currentTime]);

  const callWithAuth = useCallback(async (path: string, init: RequestInit = {}) => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) { router.push("/"); return null; }
    const { tokens: currentTokens } = JSON.parse(saved);
    const call = (at: string) => fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...init.headers, 'Authorization': `Bearer ${at}`, 'Content-Type': 'application/json' }
    });
    let res = await call(currentTokens?.access_token || currentTokens);
    if (res.status === 401) {
      const refresh = await fetch(`${baseUrl}/auth/refresh`, {
        method: "POST", headers: { 'Authorization': `Bearer ${currentTokens.refresh_token}` }
      });
      if (!refresh.ok) { localStorage.removeItem(STORAGE_KEY); router.push("/"); return null; }
      const updated = await refresh.json();
      setTokens(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...JSON.parse(saved), tokens: updated }));
      res = await call(updated.access_token);
    }
    return res;
  }, [baseUrl, router]);

  const loadAllSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await callWithAuth("/courses");
      if (res && res.ok) {
        const data = await res.json();
        setSessions(data);
      } else {
        console.error("[Fetch Data] Failed to load sessions");
      }
    } catch (err) {
      console.error("[Fetch Data] Error:", err);
    } finally {
      setLoading(false);
    }
  }, [callWithAuth]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setTokens(parsed.tokens || { access_token: parsed.access_token, refresh_token: parsed.refresh_token });
      setBaseUrl(parsed.baseUrl || DEFAULT_URL);
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

  // --- Functions สำหรับ Teacher ---
  const handleToggleSessionStatus = async (sessionId: string, currentStatus: boolean, schedule: string) => {
    // [เพิ่ม] ดักการเปิดผิดเวลาก่อนกดยืนยัน ป้องกันการ Request API
    if (!currentStatus && !isCourseTimeNow(schedule, currentTime)) {
      alert("ไม่สามารถเปิดเช็คชื่อได้ เนื่องจากไม่อยู่ในช่วงเวลาเรียนที่กำหนด");
      console.warn(`[Toggle Action] Blocked: Teacher tried to open session ${sessionId} outside of schedule (${schedule})`);
      return;
    }

    if (!confirm(`คุณต้องการ ${currentStatus ? 'ปิด' : 'เปิด'} การเช็คชื่อรายวิชานี้ใช่หรือไม่?`)) return;

    const endpoint = currentStatus ? `/attendance/sessions/${sessionId}/close` : `/attendance/sessions/${sessionId}/open`;
    try {
      const res = await callWithAuth(endpoint, { method: "POST" });
      if (res?.ok) {
        alert("อัปเดตสถานะสำเร็จ!");
        console.log(`[Toggle Action] Success: Session ${sessionId} status changed.`);
        loadAllSessions(); 
      } else {
        // [เพิ่ม] เก็บ Log ข้อผิดพลาดจากฝั่ง Backend
        const errorData = await res?.json().catch(() => null);
        alert(`เกิดข้อผิดพลาด: ${errorData?.message || 'ไม่สามารถอัปเดตสถานะได้'}`);
        console.error(`[Toggle Action] Server returned error:`, errorData);
      }
    } catch (error) {
      console.error("[Toggle Action] Exception encountered:", error);
      alert("เซิร์ฟเวอร์ขัดข้อง");
    }
  };

  const handleViewAttendanceList = async (courseId: string, courseName: string) => {
    setSelectedCourseName(courseName);
    setIsModalOpen(true);
    setAttendanceList([]); 
    try {
      const res = await callWithAuth(`/attendance/course/${courseId}`);
      if (res?.ok) {
        const data = await res.json();
        setAttendanceList(data);
      } else {
        console.error(`[View Attendance] Failed to fetch data for course ${courseId}`);
      }
    } catch (error) {
      console.error("[View Attendance] Exception encountered:", error);
    }
  };

  // --- Function เช็คชื่อ (สำหรับ Student) ---
  const handleCheckIn = (session: CourseSession) => {
    const sessionId = session._id;
    setLocationError(null);
    setCheckingGps(sessionId);

    if (!navigator.geolocation) {
      setLocationError({ id: sessionId, distance: 0, message: "เบราว์เซอร์ไม่รองรับ GPS" });
      setCheckingGps(null);
      console.warn("[Check-in] Geolocation not supported by browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const studentLat = position.coords.latitude;
        const studentLon = position.coords.longitude;
        const targetLat = session.location?.latitude;
        const targetLon = session.location?.longitude;
        const radiusLimit = 5000;

        if (!targetLat || !targetLon) {
          setLocationError({ id: sessionId, distance: 0, message: "รายวิชานี้ไม่มีข้อมูลพิกัดในระบบ" });
          setCheckingGps(null);
          console.warn(`[Check-in] Missing target coordinates for session ${sessionId}`);
          return;
        }

        const distance = calculateDistance(studentLat, studentLon, targetLat, targetLon);

        if (distance <= radiusLimit) {
          try {
            const currentCheckInTime = new Date().toISOString();
            const payload = {
              courseId: sessionId,
              studentId: profile?.userId || profile?._id || profile?.id || profile?.sub || "dummy-student-id",
              classDate: currentCheckInTime.split('T')[0],
              status: 'present',
              checkInTime: currentCheckInTime
            };

            const res = await callWithAuth(`/attendance`, {
              method: 'POST',
              body: JSON.stringify(payload)
            });

            if (!res?.ok) {
              const errorData = await res?.json().catch(() => null);
              console.error("[Check-in] API Error:", errorData);
              throw new Error("บันทึกข้อมูลล้มเหลว");
            }

            console.log(`[Check-in] Success for session ${sessionId}`);
            const updatedChecked = [...checkedSessions, sessionId];
            setCheckedSessions(updatedChecked);
            localStorage.setItem(CHECKED_KEY, JSON.stringify(updatedChecked));

          } catch (error) {
            console.error("[Check-in] Exception:", error);
            setLocationError({ id: sessionId, distance: 0, message: "เซิร์ฟเวอร์ขัดข้อง" });
          }
        } else {
          console.warn(`[Check-in] Distance limit exceeded. Distance: ${Math.round(distance)}m`);
          setLocationError({ id: sessionId, distance, message: `ห่างจากห้องเรียน ${Math.round(distance)} เมตร` });
        }
        setCheckingGps(null);
      },
      (error) => {
        console.error("[Check-in] Geolocation API Error:", error);
        setLocationError({ id: sessionId, distance: 0, message: "กรุณาเปิด GPS และอนุญาตให้เข้าถึงตำแหน่ง" });
        setCheckingGps(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleResetHistory = () => {
    if (confirm("ต้องการล้างประวัติเช็คชื่อทั้งหมดในเครื่องนี้?")) {
      localStorage.removeItem(CHECKED_KEY);
      setCheckedSessions([]);
      setLocationError(null);
    }
  };

  const handleResetSession = (sessionId: string) => {
    const updatedChecked = checkedSessions.filter(id => id !== sessionId);
    setCheckedSessions(updatedChecked);
    localStorage.setItem(CHECKED_KEY, JSON.stringify(updatedChecked));
  };

  const renderCard = (session: CourseSession) => {
    const sessionId = session._id;
    const isAlreadyChecked = checkedSessions.includes(sessionId);
    const isLocationFail = locationError?.id === sessionId;
    const isCurrentlyChecking = checkingGps === sessionId;
    const currentlyInTime = isCourseTimeNow(session.schedule, currentTime);

    const scheduleParts = session.schedule?.split(' ') || ["", ""];
    const displayDay = scheduleParts[0];
    const displayTime = scheduleParts[1];

    return (
      <div className={`group relative rounded-[2.5rem] border transition-all duration-500 bg-white shadow-sm overflow-hidden flex flex-col ${!currentlyInTime && !session.isActive ? 'border-slate-200 opacity-60 grayscale' :
        session.isActive ? 'border-green-500 ring-4 ring-green-500/5 hover:shadow-xl hover:-translate-y-1' : 'border-slate-200 opacity-90'
        } ${isLocationFail ? 'border-red-500 ring-red-500/10 grayscale-0 opacity-100' : ''}`}>

        <div className="p-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className={`text-white text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-wider shadow-sm ${!currentlyInTime && !session.isActive ? 'bg-slate-400' : isLocationFail ? 'bg-red-500' : 'bg-[#130f2a]'
                }`}>
                {session.courseCode}
              </span>
              <div className={`h-2 w-2 rounded-full ${!currentlyInTime && !session.isActive ? 'bg-slate-300' : isLocationFail ? 'bg-red-500' : session.isActive ? 'bg-green-500 animate-ping' : 'bg-slate-300'
                }`}></div>
            </div>
            <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${isAlreadyChecked ? 'bg-blue-50 text-blue-600' :
              isLocationFail ? 'bg-red-50 text-red-600' :
                session.isActive && currentlyInTime ? 'bg-green-50 text-green-600' : 'text-slate-400'
              }`}>
              {isAlreadyChecked ? 'สำเร็จ' : isLocationFail ? 'ไม่สำเร็จ' : session.isActive && currentlyInTime ? 'กำลังเปิด' : 'ปิดอยู่'}
            </div>
          </div>

          <h4 className="text-[16px] font-black text-[#130f2a] mb-1 line-clamp-1 uppercase tracking-tight">{session.courseName}</h4>
          <p className="text-[12px] font-bold text-slate-500 mb-4 line-clamp-2 min-h-[36px]">{session.location?.building || "ไม่ระบุอาคาร"}</p>

          {isLocationFail && !isTeacher && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between gap-2 text-red-600 animate-bounce">
              <div className="flex items-center gap-2">
                <MapPinOff size={14} className="shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-tighter leading-tight">{locationError.message}</span>
              </div>
              <button onClick={() => setLocationError(null)} className="bg-white px-2 py-1.5 shrink-0 rounded-lg border text-[8px] font-black uppercase hover:bg-red-50 transition-colors shadow-sm active:scale-95">
                <RotateCcw size={10} className="inline mr-1" /> ลองใหม่
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100 mb-6">
            <div className="flex items-center gap-1.5 text-slate-600 text-[11px] font-black">
              <Clock size={14} className={currentlyInTime ? "text-indigo-500" : "text-slate-400"} />
              <span className="tabular-nums uppercase">{displayDay} {displayTime}</span>
            </div>
            {session.location && !isTeacher && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                <MapPin size={12} /> ระยะ 50 เมตร
              </div>
            )}
          </div>

          {/* ----- UI สำหรับ Teacher ----- */}
          {isTeacher && currentlyInTime && (
            <div className="space-y-3">
              <button
                // ส่ง schedule เข้าไปด้วยตามที่แก้ฟังก์ชันด้านบน
                onClick={() => handleToggleSessionStatus(session._id, session.isActive, session.schedule)}
                className={`w-full py-3 rounded-2xl font-black text-[11px] uppercase transition-all shadow-md flex items-center justify-center gap-2 ${session.isActive ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
              >
                <Power size={14} /> {session.isActive ? "ปิดการเช็คชื่อ" : "เปิดการเช็คชื่อ"}
              </button>

              <button
                onClick={() => handleViewAttendanceList(session._id, session.courseName)}
                className="w-full py-3 rounded-2xl font-black text-[11px] uppercase transition-all border border-indigo-200 text-indigo-600 hover:bg-indigo-50 flex items-center justify-center gap-2"
              >
                <Users size={14} /> ดูรายชื่อนักศึกษา
              </button>
            </div>
          )}

          {!isTeacher && (
            /* ----- UI สำหรับ Student ----- */
            session.isActive && (
              <div className="space-y-1">
                <button
                  onClick={() => handleCheckIn(session)}
                  disabled={isAlreadyChecked || isLocationFail || !currentlyInTime || isCurrentlyChecking}
                  className={`w-full py-4 rounded-2xl font-black text-[11px] uppercase transition-all shadow-lg flex items-center justify-center gap-2 ${!currentlyInTime ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' :
                    isAlreadyChecked ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' :
                      isLocationFail ? 'bg-red-50 text-red-300 opacity-50 cursor-not-allowed' :
                        isCurrentlyChecking ? 'bg-indigo-500 text-white animate-pulse' :
                          'bg-green-600 text-white hover:bg-green-700 active:scale-95 shadow-gray-600/30'
                    }`}
                >
                  {!currentlyInTime ? <><AlertCircle size={14} /> หมดเวลา</> :
                    isAlreadyChecked ? <><CheckCircle2 size={14} className="text-blue-500" /> เช็คชื่อแล้ว</> :
                      isLocationFail ? 'แก้ไขข้อผิดพลาดด้านบน' :
                        isCurrentlyChecking ? <><div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div> กำลังตรวจสอบ GPS...</> :
                          <><MapPin size={14} /> เช็คชื่อเดี๋ยวนี้</>}
                </button>
                {isAlreadyChecked && !isTeacher && (
                  <button
                    onClick={() => handleResetSession(sessionId)}
                    className="w-full mt-2 py-2 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center gap-1 border border-slate-200 border-dashed"
                  >
                    <RotateCcw size={10} /> กดที่นี่หากต้องการเช็คชื่อใหม่อีกครั้ง
                  </button>
                )}
                {!currentlyInTime && !isAlreadyChecked && (
                  <p className="text-[8px] text-center font-black text-slate-400 uppercase tracking-widest mt-2">ไม่อยู่ในช่วงเวลาเปิดเช็คชื่อ</p>
                )}
              </div>
            ))}
        </div>
      </div>
    );
  };

  return (
    <main className="h-screen text-[#130f2a] font-sans relative overflow-hidden bg-[#CBD5E1] flex flex-col">
      <nav className="z-50 border-b border-slate-300/50 bg-white/40 backdrop-blur-xl shrink-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
              <ClipboardCheck size={20} fill="currentColor" className="fill-white/20" />
            </div>
            <span className="text-lg font-black tracking-tighter uppercase">ระบบเช็คชื่อ<span className="text-blue-500">.</span></span>
          </div>
          <div className="flex items-center gap-3">
            {!isTeacher && (
              <button onClick={handleResetHistory} className="p-2 rounded-xl border border-red-200 bg-white text-red-500 shadow-sm hover:bg-red-50 transition-colors"><Trash2 size={18} /></button>
            )}
            <button onClick={() => router.back()} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-[10px] font-black flex items-center gap-2 hover:bg-slate-50 shadow-sm transition-colors"><ArrowLeft size={14} /> กลับ</button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col mx-auto w-full max-w-7xl px-6 py-6 relative z-10 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 mb-1 font-black text-[10px] uppercase tracking-[0.3em]"><BookOpen size={16} /> การเช็คชื่อเข้าเรียน</div>
            <h3 className="text-3xl font-black tracking-tight uppercase text-[#0f172a] leading-none">
              {isTeacher ? "แดชบอร์ดอาจารย์" : "ตารางเรียน"}
            </h3>
          </div>
          <div className="flex items-center gap-3 bg-white/80 p-1.5 rounded-2xl shadow-sm border border-white min-w-[300px] md:min-w-[350px]">
            <Search size={18} className="ml-3 text-slate-400" />
            <input type="text" placeholder="ค้นหารายวิชา..." className="w-full bg-transparent text-[10px] font-black outline-none py-2 uppercase tracking-widest" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-10 pb-20">
          <section>
            <h4 className="text-[12px] font-black uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-ping"></div> รายวิชาที่เปิดเช็คชื่อ ({activeSessions.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {activeSessions.length > 0 ? (
                activeSessions.map((s, idx) => <React.Fragment key={idx}>{renderCard(s)}</React.Fragment>)
              ) : (
                <div className="col-span-full py-10 text-center text-slate-400 text-sm font-bold bg-white/40 rounded-3xl border border-dashed border-slate-300">ไม่มีเซสชั่นที่กำลังเปิดเช็คชื่อในขณะนี้</div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6 opacity-60">
              <div className="h-5 w-1 bg-slate-400 rounded-full"></div>
              <h4 className="text-[12px] font-black uppercase tracking-[0.2em] text-slate-500">ประวัติ / ยังไม่ถึงเวลาเรียน ({historySessions.length})</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {historySessions.map((s, idx) => <React.Fragment key={idx}>{renderCard(s)}</React.Fragment>)}
            </div>
          </section>
        </div>
      </div>

      {/* Modal แสดงรายชื่อนักศึกษา (สำหรับ Teacher) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#130f2a]/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-lg text-[#130f2a] uppercase tracking-tight line-clamp-1">{selectedCourseName}</h3>
                <p className="text-xs font-bold text-slate-500 uppercase">รายชื่อนักศึกษาที่เช็คชื่อแล้ว</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white rounded-full border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
              {attendanceList.length > 0 ? (
                <ul className="space-y-2 p-4">
                  {attendanceList.map((record, index) => {
                    const studentObj = record.studentId;
                    const studentName = (typeof studentObj === 'object' && studentObj !== null)
                      ? studentObj.fullName || "ไม่ทราบชื่อ"
                      : "ไม่ทราบชื่อ";

                    const displayId = (typeof studentObj === 'object' && studentObj !== null)
                      ? (studentObj.studentId || studentObj.userId || studentObj._id?.toString().substring(0, 8))
                      : String(studentObj || "").substring(0, 8);

                    const initials = studentName.substring(0, 2).toUpperCase();

                    return (
                      <li key={index} className="p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 border border-indigo-100">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-800 line-clamp-1">{studentName}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400">ID: {displayId}</span>
                              <span className="text-[10px] font-black uppercase text-green-500 tracking-widest">• {record.status === 'present' ? 'เข้าเรียน' : record.status || "เข้าเรียน"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-400 block">เวลา</span>
                          <span className="text-sm font-black text-slate-700">
                            {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) : "-"}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                  <Users size={48} className="mb-4 text-slate-200" />
                  <p className="text-sm font-bold">ยังไม่มีผู้เช็คชื่อในรายวิชานี้</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </main>
  );
}