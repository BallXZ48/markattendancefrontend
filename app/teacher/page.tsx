"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  School,
  BookOpen,
  Bell,
  Clock,
  Activity,
  Radio,
  LayoutGrid,
  Calendar,
  QrCode,
  X,
  Sparkles,
  ChevronRight,
  Power,
} from "lucide-react";

// --- Types ---
type Role = "admin" | "teacher" | "student";
type ScheduleItem = { courseCode: string; day: string; time: string };
type UserProfile = {
  email: string;
  role: Role;
  fullName?: string;
  department?: string;
  facultyName?: string;
  tableId?: number;
  schedule?: ScheduleItem[];
};

interface ClassSession {
  _id: string;
  title?: string;
  courseId: {
    _id: string;
    courseCode: string;
    courseName: string;
    studentIds?: any[];
  };
  scheduledStart: string;
  scheduledEnd: string;
  isAttendanceOpen: boolean;
  studentCount?: number;
}

const STORAGE_KEY = "attendance-auth";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

const daysMap: Record<string, number> = {
  "sun": 0, "mon": 1, "tue": 2, "wed": 3, "thu": 4, "fri": 5, "sat": 6
};

const isCourseTimeNow = (dayStr?: string, timeRange?: string) => {
  if (!dayStr || !timeRange) return false;

  try {
    const now = new Date();
    const currentDay = now.getDay();
    const normalizedDay = dayStr.trim().toLowerCase().substring(0, 3);
    const targetDay = daysMap[normalizedDay];

    if (currentDay !== targetDay) return false;

    const [startStr, endStr] = timeRange.split('-');
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = startStr.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMin;

    const [endHour, endMin] = endStr.split(':').map(Number);
    const endTotalMinutes = endHour * 60 + endMin;

    return currentMinutes >= startTotalMinutes && currentMinutes <= endTotalMinutes;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export default function TeacherDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeSessions, setActiveSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- States for QR Generation ---
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    router.push("/");
  };

  const callWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.access_token || parsed?.tokens?.access_token;
    if (!token) return null;

    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    if (res.status === 401) {
      handleLogout();
      return null;
    }
    return res;
  };

  const loadData = async () => {
    try {
      const profileRes = await callWithAuth('/auth/profile');
      if (!profileRes) return;
      const me = await profileRes.json();
      if (me.role !== "teacher" && me.role !== "admin") return router.push(`/${me.role || ""}`);
      setProfile(me);

      const sessionsRes = await callWithAuth('/attendance/sessions/teacher');
      if (sessionsRes && sessionsRes.ok) {
        const data = await sessionsRes.json();
        const activeOnly = (Array.isArray(data) ? data : []).filter((s: ClassSession) => s.isAttendanceOpen);
        setActiveSessions(activeOnly);
      }
    } catch (err: any) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); 
    return () => clearInterval(interval);
  }, [router]);

  const activeCourseCodes = activeSessions.map(s => s.courseId?.courseCode).filter(Boolean);
  const scheduledCourses = profile?.schedule || [];
  
  const timeToTeachCourses = scheduledCourses.filter(c => 
    isCourseTimeNow(c.day, c.time) && !activeCourseCodes.includes(c.courseCode)
  );
  
  const otherCourses = scheduledCourses.filter(c => 
    !isCourseTimeNow(c.day, c.time) && !activeCourseCodes.includes(c.courseCode)
  );

  const handleShowQR = (session: ClassSession) => {
    setIsGenerating(true);
    setSelectedSession(session);
    setShowQrModal(true);
    setTimeout(() => {
      setIsGenerating(false);
    }, 1000);
  };

  const handleCloseSession = async (sessionId: string) => {
    if (!confirm("คุณต้องการ ปิด การเช็คชื่อรายวิชานี้ใช่หรือไม่?")) return;
    
    const targetSession = activeSessions.find(s => s._id === sessionId);
    if (!targetSession) return;

    try {
      const res = await callWithAuth(`/attendance/sessions/${targetSession.courseId._id}/close`, { method: "POST" });
      if (res?.ok) {
        alert("ปิดคาบเรียนสำเร็จ!");
        loadData(); 
      } else {
        const err = await res?.json().catch(() => null);
        alert(`เกิดข้อผิดพลาด: ${err?.message || 'ไม่สามารถอัปเดตสถานะได้'}`);
      }
    } catch (error) {
      alert("เซิร์ฟเวอร์ขัดข้อง");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#E2E8F0]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#130f2a] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen text-[#130f2a] pb-24 font-sans relative overflow-hidden bg-[#CBD5E1]">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] h-[800px] w-[800px] rounded-full bg-indigo-400/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-5%] left-[-15%] h-[900px] w-[900px] rounded-full bg-blue-400/20 blur-[140px] animate-bounce-slow" />
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `radial-gradient(#130f2a 1.5px, transparent 1px)`, backgroundSize: '32px 32px' }} />
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          <pattern id="circuit" width="200" height="200" patternUnits="userSpaceOnUse">
            <path d="M0 100h40m20 0h140M100 0v40m0 20v140M40 100l20-20m0 40l-20-20M100 40l20 20m-40 0l20-20" stroke="#130f2a" strokeWidth="1" fill="none" />
            <circle cx="40" cy="100" r="3" fill="#130f2a" />
            <circle cx="160" cy="100" r="3" fill="#130f2a" />
            <circle cx="100" cy="40" r="3" fill="#130f2a" />
            <circle cx="100" cy="160" r="3" fill="#130f2a" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#circuit)" />
        </svg>
      </div>

      <nav className="sticky top-0 z-50 border-b border-slate-300/50 bg-white/40 backdrop-blur-2xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#130f2a] text-white shadow-lg">
              <ClipboardCheck size={24} />
            </div>
            <span className="text-2xl font-black tracking-tighter uppercase">ทีซิงค์<span className="text-blue-500">.</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <Link href="/teacher" className="text-[11px] font-black uppercase tracking-widest text-[#130f2a] border-b-2 border-[#130f2a]">แดชบอร์ด</Link>
            {/* นำเมนูจัดการคาบเรียนออกตามภาพอ้างอิง */}
          </div>
          <button
            onClick={handleLogout}
            className="rounded-2xl border border-slate-300 bg-white/60 px-6 py-2.5 text-xs font-black transition-all hover:bg-red-50 hover:text-red-600 shadow-sm active:scale-95"
          >
            ออกจากระบบ
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-8 pt-12 relative z-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          
          <aside className="lg:col-span-4 space-y-8">
            <div className="overflow-hidden rounded-[3rem] bg-white/90 border border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-md">
              <div className="h-32 bg-[#130f2a] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"></div>
              </div>
              <div className="px-10 pb-12 text-center">
                <div className="relative -mt-16 mb-8 inline-block">
                  <div className="h-32 w-32 rounded-[2.8rem] border-[6px] border-white bg-[#F8FAFC] flex items-center justify-center text-4xl font-black text-[#130f2a] shadow-xl">
                    {profile?.fullName ? (
                      profile.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
                    ) : "TH"}
                  </div>
                </div>
                <div className="space-y-1 mb-10 text-left">
                  <h2 className="text-2xl font-black tracking-tight leading-none uppercase">{profile?.fullName || "ผู้ใช้งานอาจารย์"}</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">{profile?.email}</p>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "คณะ", val: profile?.facultyName || "การศึกษาทั่วไป", icon: School },
                    { label: "ภาควิชา / สาขา", val: profile?.department || "เทคโนโลยีสารสนเทศ", icon: BookOpen },
                    { label: "Table ID", val: profile?.tableId ? `ตารางที่ ${profile.tableId}` : "ไม่ระบุ", icon: Calendar }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4 rounded-3xl bg-slate-200/40 p-5 border border-transparent transition-all duration-300">
                      <div className="text-[#130f2a]/80"><item.icon size={20} /></div>
                      <div className="text-left text-[#130f2a]">
                        <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider mb-0.5">{item.label}</p>
                        <p className="font-bold text-sm leading-tight">{item.val || "-"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[3rem] bg-[#130f2a] p-10 text-white shadow-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8 relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">สถานะระบบการสอน</p>
                <Activity size={18} className="text-indigo-400" />
              </div>
              <div className="flex items-baseline gap-2 relative z-10">
                <p className="text-6xl font-black tracking-tighter uppercase">ออนไลน์</p>
              </div>
              <div className="mt-8 flex items-center gap-2 relative z-10">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">ระบบพร้อมใช้งาน</p>
              </div>
            </div>
          </aside>

          <div className="lg:col-span-8 space-y-10">
            
            {/* โครงสร้างใหม่: แบ่งซ้าย (คอร์สเรียน) ขวา (ปุ่มสร้าง QR) */}
            <div className="flex flex-col xl:flex-row gap-8 items-start">
              
              {/* คอลัมน์ซ้าย: แสดงวิชาที่เปิดอยู่และวิชาที่ถึงเวลาสอน */}
              <div className="flex-1 w-full space-y-10">
                {activeSessions.length > 0 && (
                  <section className="space-y-6">
                    <header className="flex items-center gap-3 px-2">
                      <div className="h-3 w-3 rounded-full bg-green-500 animate-ping"></div>
                      <h3 className="text-2xl font-black tracking-tight uppercase text-[#0f172a]">การเช็คชื่อที่กำลังเปิดอยู่</h3>
                    </header>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {activeSessions.map((session, index) => (
                        <div key={index} className="group relative rounded-[3rem] bg-white border-2 border-green-500 p-8 shadow-[0_0_30px_rgba(34,197,94,0.2)] animate-pulse-scale z-20 flex flex-col">
                          <div className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1 rounded-full bg-green-500 text-white text-[10px] font-black animate-bounce">
                            <Radio size={12} className="animate-pulse" />
                            กำลังเปิด
                          </div>
                          
                          <div className="mb-6 flex-1 mt-4">
                            <span className="text-[10px] font-black uppercase tracking-widest mb-1 block text-green-600">รหัสวิชา: {session.courseId.courseCode}</span>
                            <h4 className="text-2xl font-black leading-tight tracking-tight text-[#130f2a] min-h-[3rem] line-clamp-2">
                              {session.title || session.courseId.courseName}
                            </h4>
                          </div>

                          <div className="space-y-3 mt-auto">
                            <button
                              onClick={() => handleShowQR(session)}
                              className="w-full flex items-center justify-center gap-3 rounded-xl bg-[#130f2a] py-3 text-xs font-black text-white shadow-xl transition-all hover:bg-slate-800 active:scale-95"
                            >
                              <QrCode size={16} /> แสดง QR Code
                            </button>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleCloseSession(session._id)}
                                className="flex-[2] flex items-center justify-center gap-2 rounded-xl bg-red-50 text-red-600 border border-red-200 py-2.5 text-[10px] font-black uppercase hover:bg-red-500 hover:text-white transition-all active:scale-95"
                              >
                                <Power size={12} /> ปิดเช็คชื่อ
                              </button>
                              <Link
                                href={`/teacher/sessions/${session._id}`}
                                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-100 text-slate-600 py-2.5 text-[10px] font-black uppercase hover:bg-slate-200 transition-all active:scale-95"
                              >
                                จัดการ
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {timeToTeachCourses.length > 0 && (
                  <section className="space-y-6">
                    <header className="flex items-center gap-3 px-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-500 animate-pulse"></div>
                      <h3 className="text-2xl font-black tracking-tight uppercase text-[#0f172a]">วิชาที่ถึงเวลาสอนแล้ว</h3>
                    </header>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {timeToTeachCourses.map((course, index) => (
                        <div key={index} className="group relative rounded-[3rem] bg-yellow-50/80 border-2 border-yellow-300 p-8 shadow-lg">
                          <div className="mb-8">
                            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600 mb-1 block">รอเปิดเช็คชื่อ</span>
                            <h4 className="text-3xl font-black leading-tight tracking-tight text-[#130f2a] min-h-[3rem]">{course.courseCode}</h4>
                          </div>
                          <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-tight">
                              <Clock size={14} className="text-yellow-600" /> วัน{course.day} {course.time}
                            </div>
                          </div>
                          <Link 
                            href="/sessions"
                            className="w-full flex items-center justify-center gap-3 rounded-xl bg-yellow-400 py-4 text-xs font-black text-yellow-900 hover:bg-yellow-500 transition-colors shadow-sm active:scale-95"
                          >
                            ไปหน้าเปิดเช็คชื่อ <ChevronRight size={16} />
                          </Link>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {activeSessions.length === 0 && timeToTeachCourses.length === 0 && (
                  <div className="py-12 text-center bg-white/40 rounded-[3rem] border border-dashed border-slate-300">
                    <p className="text-slate-500 font-bold">ไม่มีวิชาที่กำลังเปิด หรือถึงเวลาสอนในขณะนี้</p>
                  </div>
                )}
              </div>

              {/* คอลัมน์ขวา: ปุ่มสร้าง QR Code */}
              <div className="w-full xl:w-[280px] shrink-0 xl:sticky xl:top-[100px]">
                <button
                  onClick={() => { setSelectedSession(null); setShowQrModal(true); }}
                  className="w-full group relative bg-[#130f2a] rounded-[3rem] p-8 shadow-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-95 text-left flex flex-col justify-center min-h-[220px]"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-indigo-500/20 transition-all duration-700" />
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="h-16 w-16 bg-white/10 rounded-[1.5rem] flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform">
                      <QrCode size={34} />
                    </div>
                    <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2">สร้าง QR Code</h4>
                    <p className="text-indigo-300 font-bold text-xs">ดึง QR จากวิชาที่กำลังเปิดเช็คชื่ออยู่</p>
                  </div>
                  <div className="absolute bottom-6 right-6 text-white/10 group-hover:text-white/30 transition-colors">
                    <Sparkles size={32} />
                  </div>
                </button>
              </div>

            </div>

            <section className="space-y-6">
              <header className="px-2 pt-4 flex items-center gap-3">
                <LayoutGrid size={20} className="text-slate-500" />
                <h3 className="text-2xl font-black tracking-tight uppercase text-[#0f172a]">รายวิชาอื่นๆ ในตารางสอน</h3>
              </header>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                {otherCourses.length > 0 ? (
                  otherCourses.map((course, index) => (
                    <div key={index} className="group relative rounded-[3.2rem] bg-white/70 border border-slate-300/60 p-10 shadow-lg transition-all hover:border-[#130f2a]">
                      <div className="mb-12">
                        <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 mb-2 block">วิชาในตาราง</span>
                        <h4 className="text-4xl font-black leading-tight tracking-tight text-[#130f2a] min-h-[4rem]">{course.courseCode}</h4>
                      </div>
                      <div className="space-y-4 mb-12">
                        <div className="flex items-center gap-3 text-sm font-bold text-slate-500 uppercase tracking-tight">
                          <Clock size={16} className="text-indigo-500" /> วัน{course.day} {course.time}
                        </div>
                      </div>
                      <button disabled className="w-full flex items-center justify-center gap-3 rounded-2xl bg-slate-200 py-5 text-sm font-black text-slate-400 cursor-not-allowed">
                        ยังไม่ถึงเวลาเรียน
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full py-10 text-center text-slate-500">
                    <p>ไม่มีรายวิชาอื่นในตารางสอน หรือเปิดสอนครบแล้ว</p>
                  </div>
                )}
              </div>
            </section>

            <div className="rounded-[3rem] border border-slate-300 bg-white/80 p-12 backdrop-blur-md relative overflow-hidden shadow-lg mt-10">
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                <div className="h-16 w-16 flex items-center justify-center rounded-3xl bg-[#130f2a] text-white shadow-xl animate-pulse shrink-0">
                  <Bell size={28} />
                </div>
                <div className="flex-1 text-[#130f2a]">
                  <h4 className="font-black text-xl uppercase tracking-tighter mb-2">การแจ้งเตือนระบบ</h4>
                  <p className="text-sm font-semibold text-slate-600 leading-relaxed">
                    ข้อมูลตารางสอนอัปเดตล่าสุดสำหรับอาจารย์ {profile?.fullName || ""} ระบบจะแจ้งเตือนเมื่อถึงเวลาเปิดเซสชันในรายวิชาต่างๆ
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- QR CODE MODAL --- */}
      {showQrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#130f2a]/90 backdrop-blur-xl" onClick={() => setShowQrModal(false)} />
          <div className="relative bg-white w-full max-w-xl rounded-[4rem] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-2xl font-black text-[#130f2a] uppercase tracking-tighter">
                {selectedSession ? "ระบบ QR พร้อมใช้งาน" : "เลือกวิชาที่เปิดอยู่"}
              </h3>
              <button
                onClick={() => setShowQrModal(false)}
                className="h-12 w-12 rounded-3xl bg-slate-50 text-slate-400 hover:text-red-500 transition-all flex items-center justify-center active:scale-90"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-10">
              {!selectedSession ? (
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {activeSessions.length > 0 ? (
                    activeSessions.map((session) => (
                      <button
                        key={session._id}
                        onClick={() => {
                          setIsGenerating(true);
                          setSelectedSession(session);
                          setTimeout(() => setIsGenerating(false), 1000);
                        }}
                        className="w-full text-left p-8 rounded-[2.5rem] border-2 border-slate-50 bg-slate-50 hover:border-[#130f2a] hover:bg-white transition-all group flex items-center justify-between"
                      >
                        <div>
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">{session.courseId?.courseCode}</p>
                          <h4 className="text-xl font-black text-[#130f2a]">{session.title || session.courseId?.courseName}</h4>
                        </div>
                        <div className="h-12 w-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-[#130f2a] group-hover:border-[#130f2a] transition-all">
                          <QrCode size={24} />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-slate-400 font-bold text-lg">ไม่มีวิชาที่กำลังเปิดเช็คชื่อ</p>
                      <p className="text-slate-400 text-sm mt-2">กรุณากดเปิดวิชาในส่วน "วิชาที่ถึงเวลาสอนแล้ว" ก่อนสร้าง QR Code</p>
                    </div>
                  )}
                </div>
              ) : isGenerating ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="relative h-24 w-24 mb-8">
                    <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-[#130f2a] rounded-full border-t-transparent animate-spin"></div>
                    <QrCode className="absolute inset-0 m-auto text-[#130f2a]" size={36} />
                  </div>
                  <p className="text-2xl font-black text-[#130f2a] animate-pulse">กำลังสร้าง QR Code...</p>
                </div>
              ) : (
                <div className="text-center space-y-8 py-4">
                  <div className="bg-white p-8 rounded-[3.5rem] border-4 border-[#130f2a] inline-block shadow-2xl relative group">
                    <div className="absolute -top-6 -right-6 bg-green-500 text-white h-12 w-12 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <Sparkles size={24} />
                    </div>
                    <div className="h-56 w-56 bg-[#130f2a] rounded-3xl flex items-center justify-center relative overflow-hidden">
                      <QrCode size={160} className="text-white opacity-90" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl">
                          <ClipboardCheck size={32} className="text-[#130f2a]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-3xl font-black text-[#130f2a] tracking-tighter uppercase">{selectedSession.courseId?.courseCode}</h4>
                    <p className="text-slate-500 font-bold text-sm">ให้นักศึกษาสแกน QR Code นี้เพื่อเช็คชื่อเข้าเรียน</p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => setSelectedSession(null)}
                      className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-black text-xs uppercase hover:bg-slate-200 transition-all active:scale-95"
                    >
                      ย้อนกลับ
                    </button>
                    <button
                      onClick={() => router.push(`/teacher/sessions/${selectedSession._id}`)}
                      className="flex-[2] py-5 bg-[#130f2a] text-white rounded-[2rem] font-black text-xs uppercase shadow-xl hover:shadow-indigo-500/20 transition-all active:scale-95"
                    >
                      ดูรายชื่อนักศึกษา
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #CBD5E1; }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-scale {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(34,197,94,0.2); }
          50% { transform: scale(1.02); box-shadow: 0 0 35px rgba(34,197,94,0.35); }
        }
        .animate-bounce-slow { animation: bounce-slow 12s ease-in-out infinite; }
        .animate-pulse-scale { animation: pulse-scale 2s ease-in-out infinite; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </main>
  );
}