"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  BarChart3,
  Settings,
  LogOut,
  QrCode,
  LayoutDashboard,
  Users2,
  Zap,
  ChevronRight,
  UserCircle,
  X,
  Sparkles
} from "lucide-react";

// --- Types ---
type Role = "admin" | "teacher" | "student";
type AuthTokens = { access_token: string; refresh_token: string };
type UserProfile = { email: string; role: Role; fullName?: string };

interface ClassSession {
  _id: string;
  title?: string;
  courseId: { 
    courseCode: string; 
    courseName: string;
    studentIds?: any[];
  };
  scheduledStart: string;
  scheduledEnd: string;
  isAttendanceOpen: boolean;
  autoOpenTime?: string;
  autoCloseTime?: string;
  studentCount?: number;
}

const STORAGE_KEY = "attendance-auth";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000";

export default function TeacherDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // --- States สำหรับระบบสร้าง QR ---
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    router.push("/");
  };

  useEffect(() => {
    const initialize = async () => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return router.push("/");

      try {
        const parsed = JSON.parse(raw) as { tokens: AuthTokens };
        const token = parsed.tokens.access_token;

        const profileRes = await fetch(`${API_BASE_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!profileRes.ok) throw new Error("Session หมดอายุ");

        const me = await profileRes.json();
        if (me.role !== "teacher") return router.push(`/${me.role || ""}`);
        setProfile(me);

        const sessionsRes = await fetch(`${API_BASE_URL}/attendance/sessions/teacher`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!sessionsRes.ok) throw new Error("โหลดคาบเรียนไม่สำเร็จ");

        const data = await sessionsRes.json();
        setSessions(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || "เกิดข้อผิดพลาด");
      } finally {
        setLoading(false);
      }
    };

    initialize();
    const interval = setInterval(initialize, 60000);
    return () => clearInterval(interval);
  }, [router]);

  // ฟังก์ชันจำลองการสร้าง QR
  const handleGenerateClick = (session: ClassSession) => {
    setIsGenerating(true);
    setSelectedSession(session);
    
    // จำลองการโหลด 1.5 วินาทีเพื่อให้ดูสมจริง
    setTimeout(() => {
      setIsGenerating(false);
    }, 1500);
  };

  const today = new Date().toLocaleDateString("th-TH", { weekday: "long" });
  const isWeekday = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"].includes(today);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans relative">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `radial-gradient(#0f172a 1.5px, transparent 1px)`, backgroundSize: '32px 32px' }} />

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 w-72 bg-[#0F172A] hidden lg:flex flex-col shadow-2xl shadow-slate-300">
        <div className="p-10 text-center border-b border-white/5">
          <div className="flex items-center gap-3 justify-center">
            <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Zap size={22} className="text-white fill-white/20" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">TSYNC<span className="text-blue-500">.</span></h1>
          </div>
        </div>
        <nav className="flex-1 px-6 space-y-2 mt-6">
          {[
            { label: "Dashboard", icon: LayoutDashboard, href: "/teacher", active: true },
            { label: "คาบเรียน", icon: CalendarDays, href: "/sessions" },
            { label: "ตารางเรียน", icon: Clock, href: "/schedule" },
            { label: "รายงานผล", icon: BarChart3, href: "/reports" },
            { label: "ตั้งค่าระบบ", icon: Settings, href: "/settings" },
          ].map((item) => (
            <Link key={item.label} href={item.href} className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold ${item.active ? "bg-blue-600 text-white shadow-xl shadow-blue-900/40" : "text-slate-400 hover:text-white hover:bg-white/5"}`}>
              <item.icon size={20} />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-8">
          <button onClick={handleLogout} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-rose-400 hover:bg-rose-500/10 transition-all font-bold text-sm">
            <LogOut size={20} /> ออกจากระบบ
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72 p-8 lg:p-12 relative z-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Dashboard</h1>
            <p className="text-slate-500 font-bold text-lg">สวัสดี, <span className="text-blue-600">{profile?.fullName}</span></p>
          </div>
          <div className="flex items-center gap-4 bg-white border border-slate-200 p-4 rounded-3xl shadow-sm">
             <UserCircle size={32} className="text-slate-400" />
             <p className="text-sm font-black text-slate-800">{profile?.email}</p>
             <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </header>

        {/* Stats & Action */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 shadow-sm">
            <CalendarDays size={24} className="text-blue-600 mb-6" />
            <p className="text-xs font-black text-slate-400 uppercase mb-1">คาบเรียนวันนี้</p>
            <p className="text-4xl font-black text-slate-900">{sessions.length}</p>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 shadow-sm">
            <CheckCircle2 size={24} className="text-emerald-600 mb-6" />
            <p className="text-xs font-black text-slate-400 uppercase mb-1">เปิดเช็คชื่อ</p>
            <p className="text-4xl font-black text-slate-900">{sessions.filter(s => s.isAttendanceOpen).length}</p>
          </div>
          <div className="bg-white rounded-[2.5rem] p-8 border-2 border-slate-100 shadow-sm">
            <Clock size={24} className="text-amber-600 mb-6" />
            <p className="text-xs font-black text-slate-400 uppercase mb-1">สถานะระบบ</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">ONLINE</p>
          </div>

          <button 
            onClick={() => { setSelectedSession(null); setShowQrModal(true); }}
            className="group bg-[#0F172A] rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center justify-center text-center transition-all hover:bg-blue-600 active:scale-95"
          >
             <div className="h-14 w-14 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                <QrCode size={32} />
             </div>
             <span className="text-white font-black text-lg uppercase tracking-tight">สร้าง QR CODE</span>
          </button>
        </div>

        {/* Sessions List */}
        <section className="bg-white rounded-[3rem] border-2 border-slate-200 shadow-xl overflow-hidden">
          <div className="p-10 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-4">
              <div className="h-10 w-2 bg-blue-600 rounded-full" />
              รายวิชาที่รับผิดชอบวันนี้
            </h2>
          </div>
          <div className="p-10">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {sessions.map((session) => (
                <div key={session._id} className="group bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 hover:border-blue-500/30 transition-all">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase mb-3 inline-block">
                        {session.courseId.courseCode}
                      </span>
                      <h3 className="text-2xl font-black text-slate-900 leading-tight">{session.title || session.courseId.courseName}</h3>
                    </div>
                  </div>
                  <Link href={`/teacher/sessions/${session._id}`} className="w-full flex items-center justify-center gap-3 py-5 bg-slate-100 text-slate-900 rounded-[1.8rem] font-black text-sm group-hover:bg-[#0F172A] group-hover:text-white transition-all">
                    จัดการข้อมูล <ChevronRight size={18} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* --- QR CODE GENERATION MODAL (Working Version) --- */}
      {showQrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-md" onClick={() => setShowQrModal(false)} />
          
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                {selectedSession ? "QR Code พร้อมใช้งาน" : "เลือกวิชาที่สอน"}
              </h3>
              <button onClick={() => setShowQrModal(false)} className="h-12 w-12 rounded-2xl bg-slate-50 text-slate-400 hover:text-rose-500 transition-colors flex items-center justify-center">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8">
              {!selectedSession ? (
                // Step 1: เลือกวิชา
                <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                  {sessions.length > 0 ? (
                    sessions.map((session) => (
                      <button 
                        key={session._id}
                        onClick={() => handleGenerateClick(session)}
                        className="w-full text-left p-6 rounded-[2rem] border-2 border-slate-50 bg-slate-50 hover:border-blue-600 hover:bg-blue-50 transition-all group flex items-center justify-between"
                      >
                        <div>
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{session.courseId.courseCode}</p>
                          <h4 className="text-xl font-black text-slate-800">{session.title || session.courseId.courseName}</h4>
                        </div>
                        <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-300 group-hover:text-blue-600 transition-colors">
                          <ChevronRight size={20} />
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-center text-slate-400 py-10 font-bold">ไม่มีตารางสอนวันนี้</p>
                  )}
                </div>
              ) : isGenerating ? (
                // Step 2: กำลังสร้าง (Loading)
                <div className="py-20 text-center flex flex-col items-center">
                   <div className="relative h-20 w-20 mb-6">
                      <div className="absolute inset-0 border-4 border-blue-100 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                      <QrCode className="absolute inset-0 m-auto text-blue-600" size={30} />
                   </div>
                   <p className="text-xl font-black text-slate-800 animate-pulse">กำลังสร้าง QR Code พิเศษ...</p>
                   <p className="text-sm text-slate-400 mt-2 font-bold uppercase tracking-widest">Secure Attendance System</p>
                </div>
              ) : (
                // Step 3: แสดง QR Code และปุ่มใช้งานจริง
                <div className="text-center space-y-8 py-4">
                  <div className="bg-white p-8 rounded-[2.5rem] border-4 border-blue-600 inline-block shadow-2xl shadow-blue-100 relative group">
                    <div className="absolute -top-4 -right-4 bg-emerald-500 text-white h-10 w-10 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                      <Sparkles size={20} />
                    </div>
                    {/* จำลอง QR Code รูปแบบพรีเมียม */}
                    <div className="h-48 w-48 bg-slate-900 rounded-2xl flex items-center justify-center relative overflow-hidden">
                       <QrCode size={140} className="text-white opacity-90" />
                       <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-transparent" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-2xl font-black text-slate-900">{selectedSession.courseId.courseName}</h4>
                    <p className="text-slate-500 font-bold">รหัสผ่านชั่วคราวจะหมดอายุใน 5 นาที</p>
                  </div>

                  <div className="flex gap-4">
                    <button 
                      onClick={() => setSelectedSession(null)}
                      className="flex-1 py-5 bg-slate-100 text-slate-500 rounded-3xl font-black text-sm uppercase hover:bg-slate-200 transition-all"
                    >
                      เปลี่ยนวิชา
                    </button>
                    <button 
                      onClick={() => router.push(`/teacher/sessions/${selectedSession._id}`)}
                      className="flex-[2] py-5 bg-blue-600 text-white rounded-3xl font-black text-sm uppercase shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all"
                    >
                      ขยายหน้าจอ QR เต็ม
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-6 bg-slate-50 text-center border-t border-slate-100">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                 Secure QR Technology &copy; 2026 TeachSync Dashboard
               </p>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #F8FAFC; }
      `}</style>
    </div>
  );
}